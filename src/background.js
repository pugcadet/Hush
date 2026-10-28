/*
 * Hush for YouTube — background service worker.
 * Initialises settings on install, handles the on/off keyboard shortcut,
 * and shows an "OFF" badge. No network access.
 */
"use strict";
importScripts("common.js", "options-data.js");

const SW = globalThis.SW;

const refreshBadge = async () => {
  const { cfg } = await SW.load();
  await chrome.action.setBadgeText({ text: cfg.enabled ? "" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
};

// After an update, YouTube tabs that were already open still run the old, disconnected copy of
// Hush, so setting changes wouldn't reach them. Refresh those tabs — but never one playing sound.
const refreshYouTubeTabs = async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ["https://www.youtube.com/*", "https://m.youtube.com/*"] });
    const quiet = tabs.filter((t) => !t.audible && !t.discarded);
    await Promise.all(quiet.map((t) => chrome.tabs.reload(t.id)));
    return quiet.length;
  } catch {
    return 0;
  }
};
self.refreshYouTubeTabs = refreshYouTubeTabs; // also used by the test suite

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Hush TV moved to its own extension, YTV. Before the old TV settings are cleaned away, keep a copy so
  // YTV can pick up your channels (Hush hands it over on your next YouTube visit).
  try {
    const raw = await chrome.storage.local.get(["cfg", "ytvExport"]);
    if (!raw.ytvExport && raw.cfg && raw.cfg.tv && typeof raw.cfg.tv === "object") await chrome.storage.local.set({ ytvExport: raw.cfg.tv });
  } catch {}
  const { cfg, state } = await SW.load();
  // Recommended options start on for new installs.
  if (reason === "install") {
    for (const o of SW.OPTIONS) if (o.recommended && cfg.opts[o.id] === undefined) cfg.opts[o.id] = true;
  }
  await chrome.storage.local.set({ cfg: SW.sanitizeConfig(cfg), state: SW.sanitizeState(state) });
  if (chrome.storage.session.setAccessLevel) {
    // Keep the unlock flag out of reach of content scripts.
    await chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
  }
  if (reason === "install") chrome.runtime.openOptionsPage();
  if (reason === "update") refreshYouTubeTabs();
  refreshBadge();
});

chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.cfg) refreshBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-enabled") return;
  const { cfg } = await SW.load();
  if (!(await SW.isUnlocked(cfg))) return chrome.runtime.openOptionsPage(); // locked: ask for unlock instead
  cfg.enabled = !cfg.enabled;
  await SW.saveCfg(cfg);
});
