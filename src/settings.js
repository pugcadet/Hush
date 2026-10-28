/* Hush for YouTube — settings page. Builds every control with DOM APIs (no innerHTML). */
(() => {
  "use strict";
  const SW = globalThis.SW;
  const $ = (id) => document.getElementById(id);
  let cfg;
  let current = "global";
  let lastSaved = "";
  let flash = null; // one-time message shown after a re-render

  // ------------------------------------------------------------ helpers
  const h = (tag, props = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  };
  // Save a cleaned copy, but keep editing the same in-memory object: replacing it would leave
  // editors (e.g. the filter lists) holding a stale copy whose later changes never get saved.
  const save = async () => {
    const clean = SW.sanitizeConfig(cfg);
    lastSaved = SW.stableStringify(clean);
    await chrome.storage.local.set({ cfg: clean });
    refreshCounts();
  };
  // Keep the "x of y on" counts current without rebuilding the page (keeps keyboard focus).
  const refreshCounts = () => {
    if (!$("nav-list").childElementCount) return;
    renderNav();
    renderMaster();
    drawPreview();
    const cat = SW.CATEGORIES.find((c) => c.id === current);
    const lead = document.querySelector(".main .lead");
    if (cat && lead && !$("search").value.trim()) {
      const opts = SW.OPTIONS.filter((o) => o.cat === cat.id);
      lead.textContent = `${onCount(opts)} of ${opts.length} options on` + (cat.id === "embed" ? " · applies to videos embedded on other websites" : "");
    }
  };
  const switchEl = (checked, onchange, label) => {
    const input = h("input", { type: "checkbox", "aria-label": label });
    input.checked = checked;
    input.addEventListener("change", () => onchange(input.checked));
    return h("span", { class: "switch" }, input, h("span"));
  };
  const numberEl = (value, min, max, onchange, label) => {
    const input = h("input", { type: "number", min, max, step: 1, value, "aria-label": label });
    input.addEventListener("change", () => onchange(Number(input.value)));
    return input;
  };
  // A row that is a <label> is tied to its switch explicitly (for=…), so clicking the text toggles
  // the option.
  const row = (label, control, hint, asLabel = false, optId = null) =>
    h(asLabel ? "label" : "div", { class: "row", "data-opt": optId, for: asLabel && optId ? "opt-" + optId : null }, h("span", { class: "label" }, h("span", { text: label }), hint ? h("span", { class: "hint", text: hint }) : null), control);
  const onCount = (opts) => opts.filter((o) => o.type === "toggle" ? SW.opt(cfg, o.id) === true : SW.opt(cfg, o.id) !== o.def).length;
  const card = (title, intro, ...rows) => h("div", { class: "card" }, title ? h("h2", { text: title }) : null, intro ? h("p", { text: intro }) : null, ...rows);
  const page = (title, lead, ...content) => {
    let actions = null;
    if (content[0] && content[0].classList && content[0].classList.contains("actions")) actions = content.shift();
    const head = h("div", { class: "titlebar" }, h("div", {}, h("h1", { text: title }), lead ? h("p", { class: "lead", text: lead }) : null), actions);
    $("main").replaceChildren(...[head, ...content].filter((x) => x != null));
    const key = current + "|" + $("search").value.trim();
    if (key !== lastPageKey) { window.scrollTo(0, 0); lastPageKey = key; } // only jump when the section changes
    const showPreview = Boolean(SW.CATEGORIES.find((c) => c.id === current)) || Boolean($("search").value.trim());
    $("preview").classList.toggle("hidden", !showPreview);
    previewFocus = null;
    if (showPreview) drawPreview();
  };
  // --- live preview
  let lastPageKey = "";
  let previewFocus = null;
  const drawPreview = () => {
    if ($("preview").classList.contains("hidden")) return;
    const q = $("search").value.trim();
    const first = q ? document.querySelector(".main .row[data-opt]") : null;
    const scene = q ? (first ? SW.OPTION_INDEX[first.dataset.opt].cat : "home") : current;
    SW.renderPreview($("preview"), SW.previewSceneFor(scene), cfg, previewFocus);
  };
  const setPreviewFocus = (id) => {
    if (id === previewFocus) return;
    previewFocus = id;
    drawPreview();
  };
  $("main").addEventListener("mouseover", (e) => { const r = e.target.closest && e.target.closest(".row[data-opt]"); if (r) setPreviewFocus(r.dataset.opt); });
  $("main").addEventListener("mouseleave", () => setPreviewFocus(null));
  $("main").addEventListener("focusin", (e) => { const r = e.target.closest && e.target.closest(".row[data-opt]"); setPreviewFocus(r ? r.dataset.opt : null); });
  const group = (title, ...kids) => [h("div", { class: "eyebrow group-title", text: title }), card(null, null, ...kids)];

  // ------------------------------------------------------------- options
  const optionControl = (o) => {
    const val = SW.opt(cfg, o.id);
    if (o.type === "toggle") {
      const sw = switchEl(val === true, async (v) => { cfg.opts[o.id] = v; await save(); }, o.label);
      sw.querySelector("input").id = "opt-" + o.id;
      return sw;
    }
    if (o.type === "select") {
      const sel = h("select", { "aria-label": o.label }, o.choices.map(([v, l]) => h("option", { value: v, text: l })));
      sel.value = val;
      sel.addEventListener("change", async () => { cfg.opts[o.id] = sel.value; await save(); });
      return sel;
    }
    if (o.type === "color") {
      const wrap = h("span", { class: "inline" });
      const input = h("input", { type: "color", value: val, "aria-label": o.label });
      input.addEventListener("change", async () => { cfg.opts[o.id] = input.value; await save(); });
      const reset = h("button", { type: "button", text: "Reset", onclick: async () => { delete cfg.opts[o.id]; await save(); render(); } });
      wrap.append(input, reset);
      return wrap;
    }
    return h("span");
  };
  // Font picker: a card per font showing a sample in that font.
  const fontPicker = (o) => {
    const current = SW.opt(cfg, o.id);
    const grid = h("div", { class: "fonts", role: "radiogroup", "aria-label": "Font" });
    for (const f of SW.FONTS) {
      const input = h("input", { type: "radio", name: "hush-font", value: f.id, "aria-label": f.label });
      input.checked = f.id === current;
      input.addEventListener("change", async () => { cfg.opts[o.id] = f.id; await save(); render(); });
      const title = h("span", { class: "sample-title", text: "A quiet walk through the Dutch dunes" });
      const meta = h("span", { class: "sample-meta", text: "Natuur Kanaal · 12K views · 3 days ago" });
      const fam = f.family || "Roboto, Arial, sans-serif";
      title.style.fontFamily = fam;
      meta.style.fontFamily = fam;
      grid.append(h("label", { class: "font-card" }, input,
        h("span", { class: "fname" }, f.label, f.id === current ? h("i", { text: "In use" }) : null),
        title, meta, h("span", { class: "fnote", text: f.note })));
    }
    return h("div", { "data-opt": o.id }, h("div", { class: "row" }, h("span", { class: "label" }, h("span", { text: o.label }),
      h("span", { class: "hint", text: "Bundled with Hush — nothing is downloaded. Applies to YouTube’s text, not the video player." }))), grid);
  };

  // Pin: shows the option in the toolbar quick menu.
  const optionRow = (o, showCat) => o.id === "look_font" ? fontPicker(o) :
    row(o.label, h("span", { class: "ctl" }, optionControl(o)),
      showCat ? SW.CATEGORIES.find((c) => c.id === o.cat).label : null, o.type === "toggle", o.id);

  const renderCategory = (catId) => {
    const cat = SW.CATEGORIES.find((c) => c.id === catId);
    const opts = SW.OPTIONS.filter((o) => o.cat === catId);
    const toggles = opts.filter((o) => o.type === "toggle");
    const setAll = async (v) => {
      for (const o of toggles) cfg.opts[o.id] = v;
      await save();
      render();
    };
    const lead = `${onCount(opts)} of ${opts.length} options on` + (catId === "embed" ? " · applies to videos embedded on other websites" : "");
    const behaviour = opts.filter((o) => o.behavior || o.type !== "toggle");
    const tidy = opts.filter((o) => !(o.behavior || o.type !== "toggle"));
    page(cat.label, lead,
      h("div", { class: "actions" },
        h("button", { type: "button", text: "Turn all on", onclick: () => setAll(true) }),
        h("button", { type: "button", text: "Turn all off", onclick: () => setAll(false) })),
      ...(behaviour.length ? group("Behaviour", ...behaviour.map((o) => optionRow(o, false))) : []),
      ...(tidy.length ? group("Hide & tidy", ...tidy.map((o) => optionRow(o, false))) : []));
  };

  const renderSearch = (q) => {
    const needle = q.toLowerCase();
    const hits = SW.OPTIONS.filter((o) => o.label.toLowerCase().includes(needle));
    page(`Search: “${q}”`, `${hits.length} option${hits.length === 1 ? "" : "s"} found.`,
      ...(hits.length ? group("Results", ...hits.map((o) => optionRow(o, true))) : []));
  };

  // -------------------------------------------------------------- filter
  const listEditor = (label, hint, key) => {
    const ta = h("textarea", { spellcheck: "false", "aria-label": label });
    ta.value = cfg.filter[key].join("\n");
    const err = h("p", { class: "error hidden" });
    ta.addEventListener("change", async () => {
      const lines = ta.value.split("\n").map((s) => s.trim()).filter(Boolean);
      if (key === "regex") {
        const bad = lines.filter((p) => SW.safeRegex(p) === null);
        err.textContent = bad.length ? `Ignored invalid pattern${bad.length > 1 ? "s" : ""}: ${bad.join(", ")}` : "";
        err.classList.toggle("hidden", !bad.length);
      }
      cfg.filter[key] = lines;
      await save();
    });
    return h("div", { class: "list-editor" }, h("label", { text: label }), h("p", { class: "muted", text: hint }), ta, err);
  };
  const renderFilter = () =>
    page("Content filter", "Hide videos, Shorts and comments by channel, keyword or pattern. One entry per line. Matching is not case-sensitive.",
      card(null, null, row("Content filter on", switchEl(cfg.filter.enabled, async (v) => { cfg.filter.enabled = v; await save(); }, "Content filter on"), null, true)),
      card("Blocked channels", null, listEditor("Channels", "Channel name as shown, or @handle.", "channels")),
      card("Blocked keywords", null, listEditor("Keywords", "Hides any video whose title contains the word or phrase.", "keywords")),
      card("Advanced patterns", null, listEditor("Regular expressions", "Matched against titles, e.g. \\b(prank|reaction)s?\\b", "regex")));

  // ------------------------------------------------------------- presets
  const BUILTIN = {
    "Recommended": () => Object.fromEntries(SW.OPTIONS.filter((o) => o.type === "toggle").map((o) => [o.id, Boolean(o.recommended)])),
    "Everything off": () => Object.fromEntries(SW.OPTIONS.filter((o) => o.type === "toggle").map((o) => [o.id, false])),
    "Deep focus": () => {
      const ids = ["hide_all_shorts", "hide_ads", "hide_popups", "disable_autoplay", "disable_hover_preview", "home_hide_feed",
        "shorts_redirect", "watch_hide_related", "comments_hide", "player_hide_endscreen", "player_hide_cards", "player_hide_pause_overlay",
        "search_hide_shelves", "search_hide_shorts", "header_hide_bell", "header_hide_search_suggestions", "sidebar_hide_explore",
        "sidebar_hide_more", "sidebar_hide_dots", "cards_grayscale_thumbs", "watch_hide_live_chat"];
      return Object.fromEntries(SW.OPTIONS.filter((o) => o.type === "toggle").map((o) => [o.id, ids.includes(o.id)]));
    },
  };
  const applyPreset = async (opts) => {
    cfg.opts = { ...cfg.opts, ...opts };
    await save();
    render();
  };
  const renderPresets = () => {
    const name = h("input", { type: "text", placeholder: "Preset name", maxlength: 40, "aria-label": "Preset name" });
    const saved = Object.keys(cfg.presets);
    page("Presets", "Save sets of options and switch between them. Presets cover the page options, not time limits or the filter.",
      card("Built-in", null, ...Object.entries(BUILTIN).map(([n, fn]) =>
        h("div", { class: "preset" }, h("span", { class: "name", text: n }), h("button", { type: "button", text: "Apply", onclick: () => applyPreset(fn()) })))),
      card("Your presets", saved.length ? null : "None yet.",
        ...saved.map((n) => h("div", { class: "preset" }, h("span", { class: "name", text: n }),
          h("button", { type: "button", text: "Apply", onclick: () => applyPreset(cfg.presets[n]) }),
          h("button", { type: "button", text: "Update", onclick: async () => { cfg.presets[n] = { ...cfg.opts }; await save(); render(); } }),
          h("button", { type: "button", class: "danger", text: "Delete", onclick: async () => { delete cfg.presets[n]; await save(); render(); } }))),
        h("div", { class: "inline" }, name, h("button", { type: "button", class: "primary", text: "Save current options", onclick: async () => {
          const n = name.value.trim();
          if (!n) return name.focus();
          cfg.presets[n] = { ...cfg.opts };
          await save();
          render();
        } }))));
  };

  // ---------------------------------------------------------- protection
  const renderProtect = () => {
    const p = cfg.protect;
    const pw1 = h("input", { type: "password", placeholder: "New password", autocomplete: "new-password", "aria-label": "New password" });
    const pw2 = h("input", { type: "password", placeholder: "Repeat password", autocomplete: "new-password", "aria-label": "Repeat password" });
    const msg = h("p", { class: "hidden" });
    const say = (text, ok) => { msg.textContent = text; msg.className = ok ? "ok" : "error"; };
    if (flash) { say(flash, true); flash = null; }
    page("Settings protection",
      "Make it harder to switch things off on impulse. This is a speed bump, not a vault: anyone with access to the browser can still remove the extension.",
      card("Password", p.hash ? "A password is set." : "No password set.",
        h("div", { class: "inline" }, pw1, pw2,
          h("button", { type: "button", class: "primary", text: p.hash ? "Change password" : "Set password", onclick: async () => {
            if (pw1.value.length < 4) return say("Use at least 4 characters.");
            if (pw1.value !== pw2.value) return say("The passwords don’t match.");
            const salt = SW.newSalt();
            cfg.protect.hash = await SW.hashPassword(pw1.value, salt);
            cfg.protect.salt = salt;
            await save();
            await SW.setUnlocked(15);
            flash = "Password saved. Settings stay unlocked for 15 minutes.";
            render();
          } }),
          p.hash ? h("button", { type: "button", class: "danger", text: "Remove password", onclick: async () => {
            cfg.protect.hash = ""; cfg.protect.salt = ""; await save(); flash = "Password removed."; render();
          } }) : null),
        msg),
      card("Unlock delay", "After the password (if any), wait this long before settings open.",
        row("Delay (seconds)", numberEl(p.unlockDelaySec, 0, 3600, async (v) => {
          const wasProtected = SW.isProtected(cfg);
          cfg.protect.unlockDelaySec = v;
          await save();
          if (!wasProtected && SW.isProtected(cfg)) await SW.setUnlocked(15);
          render();
        }, "Unlock delay"))),
      SW.isProtected(cfg) ? card(null, null, h("div", { class: "inline" },
        h("button", { type: "button", text: "Lock now", onclick: async () => { await SW.setUnlocked(0); boot(); } }))) : null);
  };

  // -------------------------------------------------------------- backup
  const renderBackup = () => {
    const status = h("p", { class: "hidden" });
    const file = h("input", { type: "file", accept: "application/json,.json", class: "hidden" });
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      try {
        if (f.size > 2_000_000) throw new Error("too large");
        const data = JSON.parse(await f.text());
        const protect = cfg.protect;
        cfg = SW.sanitizeConfig(data.cfg || data, { keepProtect: false });
        cfg.protect = protect; // never import a password from a file
        await save();
        status.textContent = "Settings imported. They’re active now on every YouTube tab.";
        status.className = "ok";
      } catch {
        status.textContent = "That file couldn’t be read as Hush settings.";
        status.className = "error";
      }
    });
    page("Backup & import", "Hush keeps settings only in this browser. To use the same settings elsewhere, carry them over in a small file.",
      card("Copy your settings", null,
        h("ol", { class: "steps" },
          h("li", { text: "Click Export settings here. A file named hush-settings-….json is saved." }),
          h("li", { text: "Move the file to the other PC (USB stick, cloud drive, email to yourself)." }),
          h("li", { text: "Install Hush there, open these settings, choose Backup & import → Import settings, and pick the file." })),
        h("div", { class: "inline" },
          h("button", { type: "button", class: "primary", text: "Export settings", onclick: () => {
            const { protect, ...rest } = cfg; // the password hash is never exported
            const blob = new Blob([JSON.stringify({ app: "hush", version: SW.VERSION, cfg: rest }, null, 2)], { type: "application/json" });
            const a = h("a", { href: URL.createObjectURL(blob), download: `hush-settings-${SW.dayKey(Date.now())}.json` });
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          } }),
          h("button", { type: "button", text: "Import settings…", onclick: () => file.click() }), file),
        status),
      untrapCard(),
      card("Reset", "Turns every option back to its default. Your password stays.",
        h("div", { class: "inline" }, h("button", { type: "button", class: "danger", text: "Reset all settings", onclick: async () => {
          if (!confirm("Reset all Hush settings to defaults?")) return;
          const protect = cfg.protect;
          cfg = SW.sanitizeConfig({});
          for (const o of SW.OPTIONS) if (o.recommended) cfg.opts[o.id] = true;
          cfg.protect = protect;
          await save();
          render();
        } }))));
  };

  // --------------------------------------------------- import from UnTrap
  const untrapCard = () => {
    const ta = h("textarea", { rows: 4, spellcheck: "false", placeholder: "Paste the settings code from UnTrap here", "aria-label": "UnTrap settings code" });
    ta.classList.add("code");
    const file = h("input", { type: "file", accept: ".txt,.json,text/plain,application/json", class: "hidden" });
    const out = h("div", { class: "hidden" });
    let pending = null;
    const showError = () => {
      pending = null;
      out.className = "error";
      out.replaceChildren("That doesn’t look like an UnTrap settings code. Copy the whole code from UnTrap’s Import/Export screen and try again.");
    };
    const preview = (text) => {
      try { pending = SW.importUntrap(text); } catch { return showError(); }
      const r = pending.report;
      const f = r.filters;
      const filterCount = f.channels + f.keywords + f.regex;
      out.className = "import-preview";
      const lines = [
        h("p", { class: "strong", text: `Ready to import ${r.mapped} settings${filterCount ? ` and ${filterCount} filter rule${filterCount === 1 ? "" : "s"}` : ""}.` }),
        h("p", { class: "muted", text: "Matching Hush options will be set the way you had them in UnTrap. Filter rules are added to any you already have." }),
      ];
      if (r.notCarried.length) {
        lines.push(h("details", {}, h("summary", { text: `${r.notCarried.length} UnTrap setting${r.notCarried.length === 1 ? "" : "s"} have no Hush equivalent` }),
          h("ul", {}, r.notCarried.slice(0, 60).map((k) => h("li", { text: k.replace(/^untrap_/, "").replaceAll("_", " ") })))));
      }
      if (f.skipped.length) {
        lines.push(h("details", {}, h("summary", { text: `${f.skipped.length} filter rule${f.skipped.length === 1 ? "" : "s"} can’t be carried over (channel IDs or channel-name patterns)` }),
          h("ul", {}, f.skipped.slice(0, 60).map((x) => h("li", { text: x })))));
      }
      lines.push(h("div", { class: "inline" },
        h("button", { type: "button", class: "primary", text: "Apply import", onclick: async () => {
          if (!pending) return;
          cfg = SW.applyUntrapImport(cfg, pending);
          pending = null;
          await save();
          flash = "UnTrap settings imported. They’re active now on every YouTube tab.";
          render();
        } }),
        h("button", { type: "button", text: "Cancel", onclick: () => { pending = null; out.className = "hidden"; out.replaceChildren(); } })));
      out.replaceChildren(...lines);
    };
    file.addEventListener("change", async () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > 2_000_000) return showError();
      preview(await f.text());
      file.value = "";
    });
    const msg = flash ? h("p", { class: "ok", text: flash }) : null;
    flash = null;
    return card("Import from UnTrap", null,
      h("ol", { class: "steps" },
        h("li", { text: "In UnTrap, open its menu and go to Import / Export." }),
        h("li", { text: "Choose Export and copy the settings code." }),
        h("li", { text: "Paste it below and click Check code. You’ll see what will change before anything is applied." })),
      ta,
      h("div", { class: "inline" },
        h("button", { type: "button", class: "primary", text: "Check code", onclick: () => preview(ta.value) }),
        h("button", { type: "button", text: "Or choose a file…", onclick: () => file.click() }), file),
      out, msg);
  };

  const renderAbout = () =>
    page("About & privacy", null,
      h("div", { class: "card prose" },
        h("h2", { text: `Hush for YouTube ${SW.VERSION}` }),
        h("p", { text: "A local-only extension for a calmer YouTube." }),
        h("ul", {},
          h("li", { text: "It only ever talks to youtube.com (for the optional Watch Later button). Nothing is sent anywhere else." }),
          h("li", { text: "No accounts, analytics, ads or tracking." }),
          h("li", { text: "Settings and usage time are stored only in this browser (chrome.storage.local)." }),
          h("li", { text: "It can only run on youtube.com and youtube-nocookie.com pages." })),
        h("p", { text: "Looking for Hush TV? It’s now its own extension, YTV. Install YTV and your channels come along on your next YouTube visit." }),
        h("p", { class: "muted", text: "Keyboard shortcut: Alt+Shift+Y turns Hush on or off (change it at chrome://extensions/shortcuts)." })));

  // ---------------------------------------------------------- navigation
  // Grouped by where you are on YouTube, then Hush's own tools.
  const cat = (id) => { const c = SW.CATEGORIES.find((x) => x.id === id); return { id: c.id, label: c.label, cat: c.id, fn: () => renderCategory(c.id) }; };
  const SECTIONS = [
    { group: "General" }, cat("global"), cat("look"), { id: "filter", label: "Content filter", fn: renderFilter },
    { group: "Finding videos" }, cat("home"), cat("subs"), cat("search"), cat("channel"), cat("shorts"), cat("you"),
    { group: "Watching" }, cat("watch"), cat("player"), cat("comments"), cat("embed"),
    { group: "Around the page" }, cat("header"), cat("sidebar"), cat("cards"),
    { group: "Hush" },
    { id: "presets", label: "Presets", fn: renderPresets },
    { id: "protect", label: "Settings protection", fn: renderProtect },
    { id: "backup", label: "Backup & import", fn: renderBackup },
    { id: "about", label: "About & privacy", fn: renderAbout },
  ];

  const renderNav = () => {
    $("nav-list").replaceChildren(...SECTIONS.map((s) => s.group
      ? h("div", { class: "nav-group", text: s.group })
      : h("a", { "aria-current": s.id === current ? "page" : false, onclick: () => { current = s.id; $("search").value = ""; location.hash = s.id; render(); } },
          h("span", { text: s.label }), s.cat ? h("span", { class: "count", text: (() => { const o = SW.OPTIONS.filter((x) => x.cat === s.cat); return `${onCount(o)}/${o.length}`; })() }) : null)));
  };
  const renderMaster = () => {
    $("master").checked = cfg.enabled;
    $("master-text").textContent = cfg.enabled ? "Hush is on" : "Hush is off";
  };
  $("master").addEventListener("change", async () => { cfg.enabled = $("master").checked; await save(); renderMaster(); });
  const render = () => {
    renderNav();
    renderMaster();
    const q = $("search").value.trim();
    if (q) return renderSearch(q);
    (SECTIONS.find((s) => s.id === current) || SECTIONS[1]).fn();
  };
  $("search").addEventListener("input", render);
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (!SECTIONS.some((s) => s.id === id) || $("app").classList.contains("hidden")) return;
    current = id;
    $("search").value = "";
    render();
  });

  // ---------------------------------------------------------------- lock
  const showLock = () => {
    $("app").classList.add("hidden");
    $("lock").classList.remove("hidden");
    const p = cfg.protect;
    $("lock-pw").classList.toggle("hidden", !p.hash);
    $("lock-msg").textContent = p.hash ? "Enter your password to change settings." : "Settings open after a short wait.";
    $("lock-go").textContent = p.hash ? "Unlock" : "Start waiting";
    $("lock-go").onclick = async () => {
      $("lock-error").classList.add("hidden");
      if (p.hash) {
        const attempt = await SW.hashPassword($("lock-pw").value, p.salt);
        if (!SW.sameHex(attempt, p.hash)) {
          $("lock-error").textContent = "That password isn’t right.";
          $("lock-error").classList.remove("hidden");
          return;
        }
      }
      $("lock-go").disabled = true;
      $("lock-pw").disabled = true;
      const end = Date.now() + p.unlockDelaySec * 1000;
      const tickLock = async () => {
        const left = end - Date.now();
        $("lock-countdown").classList.toggle("hidden", left <= 0);
        $("lock-countdown").textContent = SW.fmtDuration(left);
        if (left > 0) return setTimeout(tickLock, 250);
        await SW.setUnlocked(15);
        boot();
      };
      tickLock();
    };
    $("lock-pw").onkeydown = (e) => { if (e.key === "Enter") $("lock-go").click(); };
    if (p.hash) $("lock-pw").focus();
  };

  const boot = async () => {
    ({ cfg } = await SW.load());
    lastSaved = SW.stableStringify(cfg);
    if (!(await SW.isUnlocked(cfg))) return showLock();
    $("lock").classList.add("hidden");
    $("app").classList.remove("hidden");
    const fromHash = location.hash.slice(1);
    if (SECTIONS.some((s) => s.id === fromHash)) current = fromHash;
    render();
  };

  // Re-render if settings change elsewhere (popup, another tab), but not for our own writes.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.cfg) return;
    if (SW.stableStringify(SW.sanitizeConfig(changes.cfg.newValue)) === lastSaved) return;
    boot();
  });
  // Re-lock when the 15-minute unlock runs out while the page is open.
  setInterval(async () => {
    if (cfg && !$("app").classList.contains("hidden") && !(await SW.isUnlocked(cfg))) boot();
  }, 15000);
  boot();
})();
