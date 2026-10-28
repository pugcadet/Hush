/* Hush for YouTube — toolbar quick menu. */
(() => {
  "use strict";
  const SW = globalThis.SW;
  const $ = (id) => document.getElementById(id);
  let cfg, unlocked;

  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    e.append(...kids.filter((x) => x != null));
    return e;
  };
  const save = () => SW.saveCfg(cfg);
  const setOpt = async (id, v) => { cfg.opts[id] = v; await save(); };

  const renderLayout = () => {
    const cur = SW.opt(cfg, "home_columns");
    $("cols").replaceChildren(...[["default", "Auto"], ...["2", "3", "4", "5", "6"].map((n) => [n, n])].map(([v, label]) =>
      h("button", { type: "button", role: "radio", "aria-checked": String(cur === v), title: v === "default" ? "YouTube decides" : `${v} videos per row`, disabled: !unlocked || !cfg.enabled,
        text: label, onclick: async () => { await setOpt("home_columns", v); renderLayout(); } })));
    $("theater").checked = SW.opt(cfg, "watch_auto_theater") === true;
    $("theater").disabled = !unlocked || !cfg.enabled;
    const sel = $("font");
    sel.replaceChildren(...SW.FONTS.map((f) => {
      const o = h("option", { value: f.id, text: f.label });
      if (f.family) o.style.fontFamily = f.family;
      return o;
    }));
    sel.value = SW.opt(cfg, "look_font");
    sel.disabled = !unlocked || !cfg.enabled;
  };

  const render = () => {
    $("enabled").checked = cfg.enabled;
    $("enabled").disabled = !unlocked;
    $("locked").classList.toggle("hidden", unlocked);
    renderLayout();
  };

  $("enabled").addEventListener("change", async (e) => { if (!unlocked) return; cfg.enabled = e.target.checked; await save(); });
  $("theater").addEventListener("change", (e) => setOpt("watch_auto_theater", e.target.checked));
  $("font").addEventListener("change", (e) => setOpt("look_font", e.target.value));
  $("settings").addEventListener("click", () => { chrome.runtime.openOptionsPage(); window.close(); });

  const load = async () => {
    ({ cfg } = await SW.load());
    unlocked = await SW.isUnlocked(cfg);
    render();
  };
  chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.cfg) load(); });
  load();
})();
