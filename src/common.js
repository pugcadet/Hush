/*
 * Hush for YouTube — shared core.
 * Loaded by the content script, popup, settings page, gate page and service worker.
 * Contains no network code. All data lives in chrome.storage.local on this device.
 */
(() => {
  "use strict";
  const SW = (globalThis.SW = globalThis.SW || {});

  SW.VERSION = "5.0.0";
  SW.ALLOWED_HOSTS = ["www.youtube.com", "m.youtube.com", "youtube.com"];

  // ---------------------------------------------------------------- defaults
  SW.DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    opts: {}, // option id -> value; missing ids fall back to the option's default
    filter: { enabled: true, channels: [], keywords: [], regex: [] },
    pins: [], // option ids shown in the toolbar quick menu
    protect: { hash: "", salt: "", unlockDelaySec: 0 },
    presets: {},
  });

  SW.DEFAULT_STATE = Object.freeze({});

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const clampInt = (v, min, max, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const strList = (v, maxItems, maxLen) =>
    (Array.isArray(v) ? v : [])
      .filter((s) => typeof s === "string")
      .map((s) => s.trim().slice(0, maxLen))
      .filter(Boolean)
      .slice(0, maxItems);
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const HEX_RE = /^[0-9a-f]*$/i;

  /** Validate one option value against its definition. Returns undefined if invalid. */
  SW.validOptValue = (def, v) => {
    if (!def) return undefined;
    if (def.type === "toggle") return typeof v === "boolean" ? v : undefined;
    if (def.type === "select") return def.choices.some((c) => c[0] === v) ? v : undefined;
    if (def.type === "color") return typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined;
    return undefined;
  };

  /**
   * Turn any object (stored data or an imported file) into a safe, complete config.
   * Unknown keys are dropped, every value is type-checked and clamped.
   */
  SW.sanitizeConfig = (raw, { keepProtect = true } = {}) => {
    const d = clone(SW.DEFAULT_CONFIG);
    const r = isObj(raw) ? raw : {};
    const out = d;
    out.enabled = typeof r.enabled === "boolean" ? r.enabled : d.enabled;

    out.opts = {};
    const defs = SW.OPTION_INDEX || {};
    if (isObj(r.opts) && r.opts.look_font === "mono") r.opts = { ...r.opts, look_font: "jetbrains" }; // renamed in 2.4
    if (isObj(r.opts)) {
      for (const [id, v] of Object.entries(r.opts)) {
        const ok = SW.validOptValue(defs[id], v);
        if (ok !== undefined) out.opts[id] = ok;
      }
    }

    const f = isObj(r.filter) ? r.filter : {};
    out.filter = {
      enabled: typeof f.enabled === "boolean" ? f.enabled : true,
      channels: strList(f.channels, 2000, 120),
      keywords: strList(f.keywords, 2000, 120),
      regex: strList(f.regex, 200, 200).filter((p) => SW.safeRegex(p) !== null),
    };

    out.pins = [...new Set((Array.isArray(r.pins) ? r.pins : []).filter((id) => typeof id === "string" && defs[id]))].slice(0, 12);

    const p = keepProtect && isObj(r.protect) ? r.protect : {};
    out.protect = {
      hash: typeof p.hash === "string" && HEX_RE.test(p.hash) ? p.hash.slice(0, 128) : "",
      salt: typeof p.salt === "string" && HEX_RE.test(p.salt) ? p.salt.slice(0, 64) : "",
      unlockDelaySec: clampInt(p.unlockDelaySec, 0, 3600, 0),
    };

    out.presets = {};
    if (isObj(r.presets)) {
      for (const [name, opts] of Object.entries(r.presets).slice(0, 50)) {
        if (!isObj(opts)) continue;
        const clean = {};
        for (const [id, v] of Object.entries(opts)) {
          const ok = SW.validOptValue(defs[id], v);
          if (ok !== undefined) clean[id] = ok;
        }
        out.presets[String(name).slice(0, 40)] = clean;
      }
    }
    return out;
  };

  SW.sanitizeState = () => ({});

  /** JSON with object keys sorted, so equal configs compare equal regardless of key order
   *  (chrome.storage hands objects back with keys in a different order than they were saved). */
  SW.stableStringify = (v) => JSON.stringify(v, (_, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);

  /** Effective value of an option (stored value or default). */
  SW.opt = (cfg, id) => {
    const v = cfg.opts[id];
    if (v !== undefined) return v;
    const def = SW.OPTION_INDEX && SW.OPTION_INDEX[id];
    return def ? def.def : undefined;
  };

  /** URL of a bundled font file (extension URL in the browser, relative path elsewhere). */
  SW.fontUrl = (file) =>
    typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL("fonts/yt/" + file) : "fonts/yt/" + file;

  /** Compile a user regex safely; returns null when invalid. */
  SW.safeRegex = (pattern) => {
    if (typeof pattern !== "string" || !pattern || pattern.length > 200) return null;
    try {
      return new RegExp(pattern, "i");
    } catch {
      return null;
    }
  };

  // ------------------------------------------------------------------- misc
  SW.dayKey = (now) => {
    const d = new Date(now);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  SW.fmtDuration = (ms) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m) return `${m}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
  };

  /** Only ever send people back to YouTube itself. */
  SW.safeReturnUrl = (raw) => {
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && SW.ALLOWED_HOSTS.includes(u.hostname)) return u.href;
    } catch {}
    return "https://www.youtube.com/";
  };

  // ----------------------------------------------------------------- crypto
  const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  SW.newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));
  SW.hashPassword = async (password, saltHex) => {
    const enc = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, key, 256);
    return toHex(bits);
  };
  /** Constant-time-ish comparison of two hex strings. */
  SW.sameHex = (a, b) => {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  };
  /**
   * Video ids from pasted links, one per line (also accepts spaces, commas, youtu.be, /shorts/, /live/, /embed/,
   * and bare 11-character ids). Returns { ids, skipped } — skipped = entries that weren't a video link.
   */
  SW.parseVideoLinks = (text) => {
    const ids = [], skipped = [], seen = new Set();
    for (const raw of String(text || "").split(/[\s,;]+/)) {
      const tok = raw.trim();
      if (!tok) continue;
      let id = "";
      if (/^[\w-]{11}$/.test(tok)) id = tok;
      else {
        try {
          const u = new URL(/^https?:\/\//i.test(tok) ? tok : "https://" + tok);
          const host = u.hostname.replace(/^(www|m|music)\./, "");
          if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
          else if (host === "youtube.com" || host === "youtube-nocookie.com") {
            const m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/);
            id = m ? m[1] : u.pathname === "/watch" ? u.searchParams.get("v") || "" : "";
          }
        } catch {}
      }
      if (!/^[\w-]{11}$/.test(id)) { skipped.push(tok); continue; }
      if (!seen.has(id)) { seen.add(id); ids.push(id); }
    }
    return { ids, skipped };
  };
  SW.isProtected = (cfg) => Boolean(cfg.protect.hash) || cfg.protect.unlockDelaySec > 0;

  // ---------------------------------------------------------------- storage
  // Only available in extension contexts (not in plain Node tests).
  if (typeof chrome !== "undefined" && chrome.storage) {
    SW.load = async () => {
      const raw = await chrome.storage.local.get("cfg");
      return { cfg: SW.sanitizeConfig(raw.cfg), state: {} };
    };
    SW.saveCfg = (cfg) => chrome.storage.local.set({ cfg: SW.sanitizeConfig(cfg) });
    /** Settings unlock lives in session storage: cleared when the browser closes. */
    SW.isUnlocked = async (cfg) => {
      if (!SW.isProtected(cfg)) return true;
      try {
        const { unlockedUntil = 0 } = await chrome.storage.session.get("unlockedUntil");
        return unlockedUntil > Date.now();
      } catch {
        return false;
      }
    };
    SW.setUnlocked = (minutes) => chrome.storage.session.set({ unlockedUntil: minutes ? Date.now() + minutes * 60000 : 0 });
  }
})();
