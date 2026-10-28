const assert = require("assert");
require(__dirname + "/../src/common.js");
require(__dirname + "/../src/options-data.js");
const SW = globalThis.SW;
let n = 0; const t = (name, fn) => { fn(); n++; };

// option catalogue integrity
const ids = SW.OPTIONS.map(o => o.id);
t("unique ids", () => assert.strictEqual(new Set(ids).size, ids.length));
t("every option has a category", () => SW.OPTIONS.forEach(o => assert(SW.CATEGORIES.some(c => c.id === o.cat), o.id)));
t("toggles have css or behaviour", () => SW.OPTIONS.filter(o=>o.type==="toggle").forEach(o => assert(o.css || o.behavior, o.id)));
t("select defaults valid", () => SW.OPTIONS.filter(o=>o.type==="select").forEach(o => assert(o.choices.some(c=>c[0]===o.def), o.id)));

// sanitize
t("sanitize drops junk", () => {
  const c = SW.sanitizeConfig({ enabled: "yes", opts: { hide_all_shorts: true, nope: true, video_quality: "hd9999", home_columns: "4" },
    filter: { regex: ["(ok)", "([bad"], channels: [1, " Foo "] }, time: { dailyLimitMin: 99999, schedule: { windows: [{from:"25:00",to:"1"}, {from:"22:00",to:"07:00"}] } },
    protect: { hash: "<script>" }, __proto__: { polluted: 1 } });
  assert.strictEqual(c.enabled, true);
  assert.deepStrictEqual(c.opts, { hide_all_shorts: true, home_columns: "4" });
  assert.deepStrictEqual(c.filter.regex, ["(ok)"]);
  assert.deepStrictEqual(c.filter.channels, ["Foo"]);
  assert.strictEqual(c.protect.hash, "");
  assert.strictEqual(({}).polluted, undefined);
});
t("sanitize import strips protection", () => {
  const c = SW.sanitizeConfig({ protect: { hash: "abcd", salt: "ef" } }, { keepProtect: false });
  assert.strictEqual(c.protect.hash, "");
});
t("safeReturnUrl", () => {
  assert.strictEqual(SW.safeReturnUrl("https://www.youtube.com/watch?v=x"), "https://www.youtube.com/watch?v=x");
  assert.strictEqual(SW.safeReturnUrl("https://evil.com/"), "https://www.youtube.com/");
  assert.strictEqual(SW.safeReturnUrl("javascript:alert(1)"), "https://www.youtube.com/");
  assert.strictEqual(SW.safeReturnUrl("https://www.youtube.com.evil.com/"), "https://www.youtube.com/");
});

// TV moved to its own extension (YTV): Hush keeps no TV settings
t("old TV settings are dropped from Hush", () => assert.strictEqual(SW.sanitizeConfig({ tv: { collections: [{ id: "a", name: "A" }] } }).tv, undefined));
t("pins keep only real options, max 12, no duplicates", () => {
  const ids = SW.OPTIONS.map((o) => o.id);
  const c = SW.sanitizeConfig({ pins: ["nope", ids[0], ids[0], ...ids.slice(1, 20)] });
  assert.strictEqual(c.pins.length, 12); assert.strictEqual(c.pins[0], ids[0]); assert(!c.pins.includes("nope"));
});
t("old time settings are dropped", () => assert.strictEqual(SW.sanitizeConfig({ time: { dailyLimitMin: 30 } }).time, undefined));

// css
const base = () => SW.sanitizeConfig({});
t("css empty when disabled", () => { const c=base(); c.enabled=false; c.opts.hide_all_shorts=true; assert.strictEqual(SW.buildCss(c), ""); });
t("css includes chosen", () => { const c=base(); c.opts.home_columns="3"; assert(SW.buildCss(c).includes("items-per-row:3")); });
t("color css only for valid hex", () => { const c=base(); c.opts.look_accent="#00ff00"; assert(SW.buildCss(c).includes("#00ff00")); });

(async () => {
  const salt = SW.newSalt(); const h1 = await SW.hashPassword("hunter2", salt); const h2 = await SW.hashPassword("hunter2", salt); const h3 = await SW.hashPassword("hunter3", salt);
  assert(SW.sameHex(h1,h2)); assert(!SW.sameHex(h1,h3)); assert.strictEqual(h1.length, 64); n++;
  // bulk Watch Later links
t("parseVideoLinks: one per line, many link shapes, dedupe, junk skipped", () => {
  const r = SW.parseVideoLinks("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s\nhttps://youtu.be/aaaaaaaaaaa?si=x\r\nm.youtube.com/shorts/bbbbbbbbbbb\n\ndQw4w9WgXcQ\nhttps://evil.com/watch?v=ccccccccccc\nhttps://www.youtube.com/playlist?list=PL123\nhello");
  assert.deepStrictEqual(r.ids, ["dQw4w9WgXcQ", "aaaaaaaaaaa", "bbbbbbbbbbb"]);
  assert.strictEqual(r.skipped.length, 3);
});

// members-only videos are skipped; "12K views" is never a channel name
require(__dirname + "/../src/yt-data.js");
t("bare counts are not channel names", () => {
  for (const x of ["655K", "1.2M", "1,2 mln.", "12 345", "655K views", "3 days ago"]) assert(SW.yt.isStat(x), x);
  for (const x of ["Linus Tech Tips", "Veritasium", "MKBHD"]) assert(!SW.yt.isStat(x), x);
});
t("button labels such as Watch later are never a channel", () => {
  const lock = { lockupViewModel: { contentId: "ccccccccccc", contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
    contentImage: { overlay: { accessibilityText: "Watch later" } },
    metadata: { lockupMetadataViewModel: { title: { content: "T" }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: "655K" } }, { text: { content: "2 days ago" } }] }] } } } } } };
  assert.strictEqual(SW.yt.extractVideos([lock])[0].channel, "");
  assert(SW.yt.isStat("Watch later") && SW.yt.isStat("Bekijk later") && !SW.yt.isStat("Later Gator"));
});
t("members-only skipped, views never a channel", () => {
  const meta = (rows) => ({ lockupMetadataViewModel: { title: { content: "T" }, metadata: { contentMetadataViewModel: { metadataRows: rows } } } });
  const part = (c) => ({ metadataParts: [{ text: { content: c } }] });
  const v = SW.yt.extractVideos([
    { videoRenderer: { videoId: "aaaaaaaaaaa", title: { runs: [{ text: "x" }] }, ownerText: { runs: [{ text: "A" }] }, badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_MEMBERS_ONLY", label: "Members only" } }] } },
    { videoRenderer: { videoId: "bbbbbbbbbbb", title: { runs: [{ text: "Members only tour" }] }, ownerText: { runs: [{ text: "B" }] } } },
    { lockupViewModel: { contentId: "ccccccccccc", contentType: "LOCKUP_CONTENT_TYPE_VIDEO", metadata: meta([part("12K views")]) } },
    { lockupViewModel: { contentId: "ddddddddddd", contentType: "LOCKUP_CONTENT_TYPE_VIDEO", metadata: meta([part("Some Channel"), part("12K views")]) } },
  ]);
  assert.deepStrictEqual(v.map((x) => [x.id, x.channel]), [["bbbbbbbbbbb", "B"], ["ccccccccccc", ""], ["ddddddddddd", "Some Channel"]]);
});

console.log(`${n} unit tests passed; ${SW.OPTIONS.length} options in ${SW.CATEGORIES.length} categories`);
})();
