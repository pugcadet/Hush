/*
 * Hush for YouTube — content script.
 *
 * Performance rules this file follows:
 *  - All hiding is plain CSS: the browser does it while rendering, no JS per element.
 *  - No page-wide DOM observer unless the content filter actually has rules,
 *    and even then work is batched into idle time.
 *  - Player tweaks (autoplay, theater, ad skip) run on YouTube's own navigation
 *    events with short, bounded retries — never a permanent polling loop.
 *  - Time tracking only runs when a time limit or check-in is configured.
 *  - Nothing runs inside YouTube's internal frames (live chat etc.).
 * No network access.
 */
(() => {
  "use strict";
  if (window.__hushLoaded) return;
  window.__hushLoaded = true;

  const isTop = window === window.top;
  const isEmbed = location.pathname.startsWith("/embed/");
  if (!isTop && !isEmbed) return; // live chat and other internal frames: do nothing

  const SW = globalThis.SW;
  let cfg = null;

  // ------------------------------------------------------------------ CSS
  const style = document.createElement("style");
  style.id = "hush-style";
  const mountStyle = () => {
    const parent = document.head || document.documentElement;
    if (parent && style.parentNode !== parent) parent.appendChild(style);
  };

  const applyCss = () => {
    style.textContent = SW.buildCss(cfg);
    mountStyle();
    document.documentElement.setAttribute("data-hush-quality", cfg.enabled ? SW.opt(cfg, "video_quality") : "auto");
    if (isEmbed) {
      const mark = () => document.body && document.body.classList.add("sw-embed");
      document.body ? mark() : document.addEventListener("DOMContentLoaded", mark, { once: true });
    }
  };
  document.addEventListener("DOMContentLoaded", mountStyle, { once: true });

  const on = (id) => cfg && cfg.enabled && SW.opt(cfg, id) === true;

  // Theater marker: settings take a few ms to read, but the first frame can be drawn before that.
  // A tiny flag in YouTube's own localStorage lets us set the layout synchronously at load.
  //   "wide" = reshape the normal layout (no YouTube switch at all)   "yt" = YouTube's own theater
  const THEATER_FLAG = "hush:theater";
  try {
    const tvResume = location.pathname === "/watch" && sessionStorage.getItem("ytv:session"); // YTV (the TV extension) is coming back on this page
    const flag = isTop && !isEmbed && !tvResume ? localStorage.getItem(THEATER_FLAG) : null;
    if (flag === "wide" || ((flag === "yt" || flag === "1") && location.pathname === "/watch")) {
      document.documentElement.classList.add(flag === "wide" ? "hush-wide" : "hush-theater-pending");
      style.textContent = SW.OPTION_INDEX.watch_auto_theater.css;
      mountStyle();
      if (flag !== "wide") setTimeout(() => document.documentElement.classList.remove("hush-theater-pending"), 2500);
    }
  } catch {}

  // ------------------------------------------------------------ redirects
  const HOME_TARGETS = { subscriptions: "/feed/subscriptions", you: "/feed/you", history: "/feed/history", watchlater: "/playlist?list=WL" };
  const SORT_PARAM = { date: "CAI%3D", views: "CAM%3D", rating: "CAE%3D" };
  const CHANNEL_ROOT = /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)(\/featured)?\/?$/;

  // YTV (the separate TV extension) marks the page while it opens or runs.
  const ytvBusy = () => { const h = document.documentElement; return h.hasAttribute("data-ytv") || h.hasAttribute("data-ytv-opening"); };
  const redirectFor = (url) => {
    if (!cfg || !cfg.enabled || isEmbed) return null;
    let u;
    try { u = new URL(url, location.origin); } catch { return null; }
    if (u.hash.startsWith("#ytv") || ytvBusy()) return null; // YTV is opening / running on this page: leave it alone
    const path = u.pathname;
    const home = SW.opt(cfg, "redirect_home");
    if (path === "/" && HOME_TARGETS[home]) return u.origin + HOME_TARGETS[home];
    if (on("shorts_redirect")) {
      const m = path.match(/^\/shorts\/([\w-]{6,})/);
      if (m) return `${u.origin}/watch?v=${m[1]}`;
    }
    if (on("channel_open_videos")) {
      const m = path.match(CHANNEL_ROOT);
      if (m) return `${u.origin}/${m[1]}/videos`;
    }
    const sort = SW.opt(cfg, "search_sort");
    if (path === "/results" && SORT_PARAM[sort] && u.searchParams.get("search_query") && !u.searchParams.has("sp")) {
      return `${u.href}&sp=${SORT_PARAM[sort]}`;
    }
    return null;
  };

  // ------------------------------------------------------- page behaviours
  // Each behaviour retries briefly after a navigation, then stops.
  let navToken = 0;
  const retry = (fn, tries = 20, gap = 250) => {
    const token = navToken;
    const attempt = (n) => {
      if (token !== navToken || n <= 0) return;
      let done = false;
      try { done = fn() === true; } catch {}
      if (!done) setTimeout(() => attempt(n - 1), gap);
    };
    attempt(tries);
  };

  // Done only once the toggle really reads "off"; clicks at most once per second.
  let lastAutoplayClick = 0;
  const autoplayOff = () => {
    const t = document.querySelector('.ytp-autonav-toggle-button[aria-checked]');
    if (!t) return false;
    if (t.getAttribute("aria-checked") !== "true") return true;
    if (Date.now() - lastAutoplayClick > 1000) {
      lastAutoplayClick = Date.now();
      (t.closest("button") || t).click();
    }
    return false;
  };
  // Theater mode: YouTube remembers it in its own "wide" cookie, so setting that makes pages
  // open in theater natively (no click, no flicker). The click is only a fallback, and only
  // after theater has been confirmed off for ~1.2s, so we never fight YouTube applying it late.
  // YouTube may hold its own older "wide=0" copy (host-only or domain-wide); the oldest copy wins,
  // so overwrite both forms on every visit. Rewriting also keeps it alive in Brave, which expires
  // script-set cookies after 7 days.
  const setWideCookie = (value = "1") => {
    if (location.hostname !== "www.youtube.com") return;
    const attrs = "path=/; max-age=31536000; secure; samesite=lax";
    document.cookie = `wide=${value}; ${attrs}`;
    document.cookie = `wide=${value}; domain=.youtube.com; ${attrs}`;
  };
  const theaterMethod = () => (on("watch_auto_theater") ? (SW.opt(cfg, "watch_theater_method") === "youtube" ? "yt" : "wide") : null);
  let theaterMisses = 0;
  let theaterClicked = false;
  // "Pending" keeps the watch area invisible (via CSS) until theater is on, so YouTube's own
  // normal-then-theater switch is never seen. A timer always reveals the page, whatever happens.
  let pendingTimer = 0;
  const endTheaterPending = () => {
    clearTimeout(pendingTimer);
    document.documentElement.classList.remove("hush-theater-pending");
  };
  const startTheaterPending = () => {
    const flexy = document.querySelector("ytd-watch-flexy");
    if (flexy && flexy.hasAttribute("theater")) return;
    document.documentElement.classList.add("hush-theater-pending");
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(endTheaterPending, 2500);
  };
  const theaterOn = () => {
    const flexy = document.querySelector("ytd-watch-flexy");
    const btn = document.querySelector(".ytp-size-button");
    if (flexy && (flexy.hasAttribute("theater") || flexy.hasAttribute("fullscreen") || document.fullscreenElement)) { endTheaterPending(); return true; }
    if (!flexy || !btn) return false;
    if (theaterClicked) return false; // one click per video; keep waiting for YouTube to apply it
    if (++theaterMisses < 7) return false; // ~1.4s: well after YouTube normally applies it itself
    theaterClicked = true;
    btn.click();
    return false;
  };
  const expandDescription = () => {
    const ex = document.querySelector("ytd-watch-metadata #description-inner #expand, ytd-text-inline-expander #expand");
    if (!ex || ex.offsetParent === null) return false;
    ex.click();
    return true;
  };

  // Ad skip: watch only the player's class attribute, not the page.
  let adObserver = null;
  let adTimer = 0;
  const trySkip = () => {
    const p = document.getElementById("movie_player");
    if (!p || !p.classList.contains("ad-showing")) { clearInterval(adTimer); adTimer = 0; return; }
    const btn = p.querySelector(".ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern");
    if (btn) btn.click();
  };
  const watchAds = () => {
    if (!on("skip_ads")) { if (adObserver) { adObserver.disconnect(); adObserver = null; } return true; }
    const p = document.getElementById("movie_player");
    if (!p) return false;
    if (adObserver && adObserver.__target === p) return true;
    if (adObserver) adObserver.disconnect();
    adObserver = new MutationObserver(() => {
      if (p.classList.contains("ad-showing") && !adTimer) { trySkip(); adTimer = setInterval(trySkip, 300); }
    });
    adObserver.__target = p;
    adObserver.observe(p, { attributes: true, attributeFilter: ["class"] });
    if (p.classList.contains("ad-showing") && !adTimer) adTimer = setInterval(trySkip, 300);
    return true;
  };

  const pageBehaviours = () => {
    if (!cfg || !cfg.enabled) return;
    navToken++;
    const watch = location.pathname === "/watch" || isEmbed;
    if (on("skip_ads") || adObserver) retry(watchAds, 40, 250);
    if (!watch) return;
    if (on("disable_autoplay")) retry(autoplayOff, 40, 250);
    if (isEmbed) return;
    if (theaterMethod() === "yt") { setWideCookie("1"); theaterMisses = 0; theaterClicked = false; retry(theaterOn, 12, 200); }
    if (on("watch_auto_expand_desc")) retry(expandDescription, 40, 250);
  };

  // Shorts: block wheel / arrow navigation when "disable scrolling" is on.
  const shortsGuard = (e) => {
    if (!on("shorts_no_scroll") || !location.pathname.startsWith("/shorts/")) return;
    if (e.type === "keydown") {
      if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp"].includes(e.key)) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  let guardsOn = false;
  const syncShortsGuards = () => {
    const want = on("shorts_no_scroll") && !isEmbed;
    if (want === guardsOn) return;
    guardsOn = want;
    const fn = want ? "addEventListener" : "removeEventListener";
    window[fn]("wheel", shortsGuard, { capture: true, passive: false });
    window[fn]("keydown", shortsGuard, { capture: true });
    window[fn]("touchmove", shortsGuard, { capture: true, passive: false });
  };

  // Hover previews: YouTube starts them from hover events on the thumbnail (old and new card
  // types play them in different ways). Stopping those events before YouTube sees them
  // prevents every kind of hover playback. Clicks are untouched.
  const THUMB_SEL = "ytd-thumbnail, yt-thumbnail-view-model, .yt-lockup-view-model__content-image, ytd-playlist-thumbnail, " +
    "a#thumbnail, ytd-moving-thumbnail-renderer, ytd-video-preview, #video-preview, ytm-shorts-lockup-view-model a";
  const HOVER_EVENTS = ["mouseover", "mouseenter", "pointerover", "pointerenter", "mousemove", "pointermove"];
  const hoverGuard = (e) => {
    const t = e.target;
    if (t && t.nodeType === 1 && t.closest(THUMB_SEL)) e.stopImmediatePropagation();
  };
  let hoverGuardOn = false;
  const syncHoverGuard = () => {
    const want = on("disable_hover_preview");
    if (want === hoverGuardOn) return;
    hoverGuardOn = want;
    for (const type of HOVER_EVENTS) window[want ? "addEventListener" : "removeEventListener"](type, hoverGuard, { capture: true, passive: true });
  };

  // ------------------------------------------------------- Watch Later button on thumbnails
  // A small button in the top-right corner of each thumbnail that adds the video to your YouTube Watch Later list.
  // Only active while the option is on; it scans in idle time and never runs in embeds.
  // one shared, debounced page observer for both features (cheaper than two)
  const pageHooks = new Set(); let pageObs = null, pageTimer = 0;
  const addPageHook = (fn) => {
    pageHooks.add(fn);
    if (pageObs) return;
    pageObs = new MutationObserver(() => { if (pageTimer) return; pageTimer = setTimeout(() => { pageTimer = 0; for (const h of pageHooks) { try { h(); } catch {} } }, 300); });
    pageObs.observe(document.documentElement, { childList: true, subtree: true });
  };
  const removePageHook = (fn) => { pageHooks.delete(fn); if (!pageHooks.size && pageObs) { pageObs.disconnect(); pageObs = null; } };
  const THUMBS = "ytd-thumbnail:not([data-hush-wl]), yt-thumbnail-view-model:not([data-hush-wl])";
  let wlTimer = 0;
  const videoIdOf = (thumb) => {
    const a = thumb.matches("a") ? thumb : thumb.querySelector('a[href*="watch?v="]') || thumb.closest('a[href*="watch?v="]');
    if (!a) return "";
    try { const u = new URL(a.getAttribute("href"), location.origin); return u.pathname === "/watch" && SW.yt.ID_RE.test(u.searchParams.get("v") || "") ? u.searchParams.get("v") : ""; } catch { return ""; }
  };
  const svgIcon = (cls, ...paths) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("class", cls);
    for (const d of paths) { const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); svg.appendChild(p); }
    return svg;
  };
  const addWlButtons = () => {
    wlTimer = 0;
    if (!on("cards_wl_button")) return;
    for (const thumb of document.querySelectorAll(THUMBS)) {
      thumb.setAttribute("data-hush-wl", "1");
      if (!videoIdOf(thumb)) continue;
      const b = document.createElement("button");
      b.type = "button"; b.className = "hush-wl"; b.title = "Add to Watch Later"; b.setAttribute("aria-label", "Add to Watch Later");
      b.append(svgIcon("clk", "M12 7v5l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"), svgIcon("ok", "M5 13l4 4L19 7"), svgIcon("bad", "M6 6l12 12", "M18 6L6 18"));
      thumb.appendChild(b);
    }
  };
  const queueWl = () => { if (!wlTimer) wlTimer = setTimeout(() => ("requestIdleCallback" in window ? requestIdleCallback(addWlButtons, { timeout: 800 }) : addWlButtons()), 250); };
  const onWlClick = async (e) => {
    const b = e.target && e.target.closest && e.target.closest(".hush-wl");
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); // don't open the video
    if (b.classList.contains("done") || b.dataset.busy) return;
    const thumb = b.parentElement, id = thumb && videoIdOf(thumb);
    if (!id) return;
    b.dataset.busy = "1"; b.classList.remove("fail");
    let added = [];
    try { added = await SW.yt.addToWatchLater([id]); } catch {}
    delete b.dataset.busy;
    if (added.length) { b.classList.add("done"); b.title = "Added to Watch Later"; }
    else { b.classList.add("fail"); b.title = "YouTube didn’t accept that — click to try again"; }
  };
  let wlOn = false;
  const syncWlButtons = () => {
    const want = on("cards_wl_button") && isTop && !isEmbed;
    if (want === wlOn) { if (want) queueWl(); return; }
    wlOn = want;
    if (want) {
      window.addEventListener("click", onWlClick, true);
      addPageHook(addWlButtons);
      queueWl();
    } else {
      window.removeEventListener("click", onWlClick, true);
      removePageHook(addWlButtons);
      for (const b of document.querySelectorAll(".hush-wl")) b.remove();
      for (const t of document.querySelectorAll("[data-hush-wl]")) t.removeAttribute("data-hush-wl");
    }
  };

  // ------------------------------------------------------- Watch Later link in the left sidebar
  let guideTimer = 0;
  const addGuideWl = () => {
    guideTimer = 0;
    if (!on("sidebar_show_watch_later")) return;
    const LABELS = { nl: ["Abonnementen", "Bekijk later"], de: ["Abos", "Sp\u00e4ter ansehen"], fr: ["Abonnements", "\u00c0 regarder plus tard"], es: ["Suscripciones", "Ver m\u00e1s tarde"], pt: ["Inscri\u00e7\u00f5es", "Assistir mais tarde"], it: ["Iscrizioni", "Guarda pi\u00f9 tardi"] };
    const lang = LABELS[(document.documentElement.lang || navigator.language || "en").slice(0, 2).toLowerCase()] || ["Subscriptions", "Watch later"];
    const nativeLabel = (sel) => { const n = document.querySelector(sel); return n ? (n.getAttribute("title") || n.getAttribute("aria-label") || "").trim() : ""; };
    const names = {
      subs: nativeLabel('ytd-mini-guide-renderer a[href^="/feed/subscriptions"]') || lang[0],
      wl: nativeLabel('ytd-guide-renderer a[href*="list=WL"]') || lang[1],
    };
    const ICONS = {
      subs: ["M4 8.5h16V20H4z", "M7 4.5h10", "M10.5 12v5l4.5-2.5z"],
      wl: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
    };
    const make = (kind, mini) => {
      const a = document.createElement("a");
      a.className = "hush-guide-wl" + (mini ? " mini" : ""); a.href = kind === "subs" ? "/feed/subscriptions" : "/playlist?list=WL"; a.title = names[kind];
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 24 24");
      for (const d of ICONS[kind]) { const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); svg.appendChild(p); }
      const label = document.createElement("span"); label.textContent = names[kind];
      a.append(svg, label);
      return a;
    };
    // Wide sidebar: "Subscriptions" and "Watch later" directly under Home, styled like Home.
    const wide = [];
    for (const g of document.querySelectorAll("ytd-guide-renderer")) {
      const home = g.querySelector('ytd-guide-entry-renderer:has(a[href="/"])');
      const list = home && home.parentElement;
      if (!list || list.querySelector(":scope > .hush-guide-wl")) continue;
      const subs = make("subs", false), wl = make("wl", false);
      home.after(subs, wl);
      wide.push([home, subs, wl]);
    }
    // line the new icons up with Home's icon (YouTube's own entries have their own inner spacing)
    if (wide.length) requestAnimationFrame(() => {
      for (const [home, ...mine] of wide) {
        const ref = home.querySelector("yt-icon, svg"), r = ref && ref.getBoundingClientRect();
        if (!r || !r.width) continue;
        for (const a of mine) {
          const m = a.querySelector("svg").getBoundingClientRect();
          const d = Math.round(r.left - m.left);
          if (Math.abs(d) > 1 && Math.abs(d) < 80) { a.style.marginLeft = d + "px"; a.style.marginRight = d + "px"; }
        }
      }
    });
    // Narrow sidebar: YouTube's own Subscriptions icon is there already; add Watch later after it.
    for (const entry of document.querySelectorAll('ytd-mini-guide-entry-renderer:has(a[href^="/feed/subscriptions"])')) {
      const list = entry.parentElement;
      if (list && !list.querySelector(":scope > .hush-guide-wl")) entry.after(make("wl", true));
    }
    if (!document.querySelector("ytd-guide-renderer .hush-guide-wl") && document.querySelector("ytd-guide-renderer")) { // couldn't find Home: end of the first section
      for (const g of document.querySelectorAll("ytd-guide-renderer")) {
        const sec = g.querySelector("ytd-guide-section-renderer");
        const box = sec && (sec.querySelector("#items") || sec);
        if (box) box.append(make("subs", false), make("wl", false));
      }
    }
    // YouTube's own Subscriptions / Watch later entries are only hidden once ours are really on the page.
    document.documentElement.classList.toggle("hush-guide-wl-on", !!document.querySelector(".hush-guide-wl"));
  };
  const queueGuideWl = () => { if (!guideTimer) guideTimer = setTimeout(() => ("requestIdleCallback" in window ? requestIdleCallback(addGuideWl, { timeout: 800 }) : addGuideWl()), 300); };
  let guideWlOn = false;
  const syncGuideWl = () => {
    const want = on("sidebar_show_watch_later") && isTop && !isEmbed;
    if (want === guideWlOn) { if (want) queueGuideWl(); return; }
    guideWlOn = want;
    if (want) {
      addPageHook(addGuideWl);
      queueGuideWl();
    } else {
      removePageHook(addGuideWl);
      for (const a of document.querySelectorAll(".hush-guide-wl")) a.remove();
      document.documentElement.classList.remove("hush-guide-wl-on");
    }
  };

  // ------------------------------------------------------- content filter
  const CARD_SEL = [
    "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer", "ytd-grid-video-renderer",
    "ytd-playlist-renderer", "ytd-channel-renderer", "ytd-reel-item-renderer", "yt-lockup-view-model",
    "ytm-shorts-lockup-view-model", "ytm-shorts-lockup-view-model-v2", "ytd-comment-thread-renderer",
    "ytd-post-renderer", "ytd-backstage-post-thread-renderer",
  ].join(",");
  let matcher = null;
  let filterObserver = null;
  let filterQueued = false;

  const buildMatcher = () => {
    const f = cfg.filter;
    matcher = null;
    if (!cfg.enabled || !f.enabled || isEmbed) return;
    const channels = new Set(f.channels.map((c) => c.toLowerCase().replace(/^@/, "")));
    const keywords = f.keywords.map((k) => k.toLowerCase());
    const regex = f.regex.map(SW.safeRegex).filter(Boolean);
    if (channels.size || keywords.length || regex.length) matcher = { channels, keywords, regex };
  };

  const textOf = (el, sel) => {
    const n = el.querySelector(sel);
    return n ? n.textContent.trim() : "";
  };
  const cardInfo = (el) => {
    if (el.tagName === "YTD-POST-RENDERER" || el.tagName === "YTD-BACKSTAGE-POST-THREAD-RENDERER") {
      // Community post: text, author name and @handle (from the author link).
      const author = el.querySelector("#author-text");
      const href = author ? author.getAttribute("href") || "" : "";
      let handle = "";
      if (href.startsWith("/@")) { try { handle = decodeURIComponent(href.slice(2).split("/")[0]); } catch {} }
      return { title: textOf(el, "#content-text, #home-content-text"), channel: author ? author.textContent.trim() : "", handle };
    }
    if (el.tagName === "YTD-COMMENT-THREAD-RENDERER") {
      return { title: textOf(el, "#content-text"), channel: textOf(el, "#author-text"), handle: "" };
    }
    const title = textOf(el, "#video-title, .yt-lockup-metadata-view-model__title, h3, #channel-title");
    const link = el.querySelector('ytd-channel-name a, a[href^="/@"], .yt-content-metadata-view-model__metadata-row a');
    const channel = textOf(el, "ytd-channel-name #text, ytd-channel-name a, .yt-content-metadata-view-model__metadata-row:first-child") ||
      (link ? link.textContent.trim() : "");
    const href = link ? link.getAttribute("href") || "" : "";
    let handle = "";
    if (href.startsWith("/@")) { try { handle = decodeURIComponent(href.slice(2).split("/")[0]); } catch {} }
    return { title, channel, handle };
  };
  const isBlocked = ({ title, channel, handle }) => {
    const m = matcher;
    const c = channel.toLowerCase().replace(/^@/, "");
    if (c && m.channels.has(c)) return true;
    if (handle && m.channels.has(handle.toLowerCase())) return true;
    const t = title.toLowerCase();
    if (t && m.keywords.some((k) => t.includes(k))) return true;
    return Boolean(title) && m.regex.some((r) => r.test(title));
  };

  // Only cards that actually changed are re-checked ("dirty" set), in idle time.
  const dirty = new Set();
  let fullScan = false;
  const checkCard = (el) => {
    if (!el.isConnected) return;
    const info = cardInfo(el);
    const sig = info.title + "\u0001" + info.channel + "\u0001" + info.handle;
    if (el.__hushSig === sig) return; // unchanged
    el.__hushSig = sig;
    (el.closest("ytd-rich-item-renderer") || el).toggleAttribute("data-sw-hidden", isBlocked(info));
  };
  const runFilter = () => {
    filterQueued = false;
    if (!matcher) { dirty.clear(); return; }
    if (fullScan) {
      fullScan = false;
      dirty.clear();
      for (const el of document.querySelectorAll(CARD_SEL)) checkCard(el);
      return;
    }
    for (const el of dirty) checkCard(el);
    dirty.clear();
  };
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
  const queueFilter = () => {
    if (filterQueued) return;
    filterQueued = true;
    setTimeout(() => idle(runFilter, { timeout: 500 }), 150);
  };
  const onMutations = (records) => {
    if (fullScan) return queueFilter();
    for (const r of records) {
      const t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
      if (t) {
        const c = t.closest(CARD_SEL);
        if (c) dirty.add(c);
      }
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.matches(CARD_SEL)) dirty.add(n);
        if (n.firstElementChild) for (const c of n.querySelectorAll(CARD_SEL)) dirty.add(c);
      }
      if (dirty.size > 400) { fullScan = true; dirty.clear(); break; } // cheaper to rescan once
    }
    if (dirty.size || fullScan) queueFilter();
  };
  const syncFilter = () => {
    for (const el of document.querySelectorAll("[data-sw-hidden]")) el.removeAttribute("data-sw-hidden");
    for (const el of document.querySelectorAll(CARD_SEL)) el.__hushSig = undefined;
    if (matcher) {
      if (!filterObserver) {
        filterObserver = new MutationObserver(onMutations);
        filterObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      }
      fullScan = true;
      queueFilter();
    } else if (filterObserver) {
      filterObserver.disconnect();
      filterObserver = null;
    }
  };

  // ------------------------------------------------------- navigation
  let lastUrl = "";
  const onUrl = () => {
    if (!cfg || !isTop) return;
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;
    const target = redirectFor(url);
    if (target && target !== url) return location.replace(target);
    pageBehaviours();
  };
  // Redirect before YouTube renders the page, when it announces where it is going.
  document.addEventListener("yt-navigate-start", (e) => {
    const url = e.detail && e.detail.url;
    const target = url ? redirectFor(url) : null;
    if (target) return location.replace(target);
    if (url && theaterMethod() === "yt" && /^\/watch\b/.test(new URL(url, location.origin).pathname)) startTheaterPending();
  });
  document.addEventListener("yt-navigate-finish", onUrl);
  window.addEventListener("popstate", onUrl);

  // ------------------------------------------------------------ startup
  let lastCss = null;
  const apply = () => {
    const method = isTop && !isEmbed && !ytvBusy() ? theaterMethod() : null; // YTV handles its own layout
    try { method ? localStorage.setItem(THEATER_FLAG, method) : localStorage.removeItem(THEATER_FLAG); } catch {}
    document.documentElement.classList.toggle("hush-wide", method === "wide");
    if (method === "wide") {
      // Keep YouTube's own theater switch off, so it never fights the wide layout.
      setWideCookie("0");
      endTheaterPending();
    } else if (method === "yt") {
      setWideCookie("1");
      if (location.pathname === "/watch") startTheaterPending();
    } else endTheaterPending();
    applyCss();
    // Some changes (videos per row, theater view, fonts) need YouTube to redo its layout: nudge it.
    if (lastCss !== null && lastCss !== style.textContent) setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    lastCss = style.textContent;
    buildMatcher();
    syncFilter();
    syncShortsGuards();
    syncHoverGuard();
    syncWlButtons();
    syncGuideWl();
    lastUrl = "";
    onUrl();
    if (isEmbed) pageBehaviours();
  };

  const load = async () => {
    try {
      ({ cfg } = await SW.load());
    } catch {
      return;
    }
    apply();
  };

  document.addEventListener("ytv-closed", () => { if (cfg) { lastUrl = ""; apply(); } }); // YTV left this page: put the normal layout back
  // Hush TV became its own extension, YTV. Hand your old channels to it once, through this page's storage
  // (the only place both can read); YTV picks them up on its first run and removes them.
  if (isTop && !isEmbed) chrome.storage.local.get(["ytvExport", "ytvExportCopied"]).then((r) => {
    if (!r.ytvExport || r.ytvExportCopied) return;
    try { localStorage.setItem("ytv:import", JSON.stringify({ tv: r.ytvExport })); chrome.storage.local.set({ ytvExportCopied: true }); } catch {}
  }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.cfg) {
      cfg = SW.sanitizeConfig(changes.cfg.newValue);
      apply();
    }
  });

  // Cheap safety net for navigations YouTube doesn't announce (a string compare).
  if (isTop && !isEmbed) setInterval(onUrl, 1500);
  load();
})();
