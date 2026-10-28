/*
 * Hush for YouTube — page-context helper (runs in the YouTube page's own JS world).
 * Its only job: apply the preferred video quality once per video.
 * Event-driven: it wakes up when a video starts playing, never polls.
 * It reads one attribute the content script sets on <html> (data-hush-quality),
 * calls YouTube's own player API, has no extension or storage access, and makes no network requests.
 */
(() => {
  "use strict";
  const ORDER = ["hd2160", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny"];
  let doneFor = "";

  const apply = () => {
    const want = document.documentElement.getAttribute("data-hush-quality");
    if (!want || want === "auto" || !ORDER.includes(want)) return;
    const p = document.getElementById("movie_player");
    if (!p || typeof p.getAvailableQualityLevels !== "function") return;
    const id = (typeof p.getVideoData === "function" && p.getVideoData().video_id) || "";
    const key = id + "|" + want;
    if (!id || key === doneFor) return;
    const levels = p.getAvailableQualityLevels().filter((l) => ORDER.includes(l));
    if (!levels.length) return;
    const wantRank = ORDER.indexOf(want);
    const target = levels.find((l) => ORDER.indexOf(l) >= wantRank) || levels[levels.length - 1];
    if (typeof p.setPlaybackQualityRange === "function") p.setPlaybackQualityRange(target, target);
    if (typeof p.setPlaybackQuality === "function") p.setPlaybackQuality(target);
    doneFor = key;
  };
  const safe = () => { try { apply(); } catch {} };

  // 'playing' doesn't bubble, so listen in the capture phase.
  document.addEventListener("playing", safe, true);
  document.addEventListener("yt-navigate-finish", () => setTimeout(safe, 800));
})();
