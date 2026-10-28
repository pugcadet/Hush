const assert = require("assert");
require(__dirname + "/../src/common.js");
require(__dirname + "/../src/options-data.js");
require(__dirname + "/../src/import-untrap.js");
const SW = globalThis.SW;
let n = 0; const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error("FAIL", name); throw e; } };

// An export in UnTrap's exact wire format: base64 of a JSON list of sections.
const sections = [
  { id: "untrap_options_state", value: {
    untrap_global_enable: true,
    untrap_global_hide_all_shorts: true,
    untrap_global_hide_all_ads: false,
    untrap_home_hide_suggestions: true,
    untrap_home_hide_shorts_trending_etc: true,
    untrap_video_page_hide_comments: true,
    untrap_video_page_hide_button_join: true,          // many-to-one: join -> subscribe group
    untrap_video_page_hide_button_subscribe: false,
    untrap_redirect_home_to: "subscriptions",
    untrap_search_page_sort_by: "uploadDate",
    untrap_global_video_quality: "highres",
    untrap_redirect_channel_to: "videos",
    untrap_home_suggestions_columns_count: "9",
    untrap_video_card_opacity_thumbnail: "5",
    untrap_video_card_title_case: "upperCase",          // no Hush equivalent
    untrap_global_add_summarize_button: true,           // no Hush equivalent
    untrap_appearance_color: "#11aa77",
  } },
  { id: "untrap_system_config", value: { untrap_youtube_page_state: {
    untrap_filterChannelsRulesData3: ["@PrankZone", "https://www.youtube.com/@DramaChan/videos", "Some Channel", "UCabcdefghijklmnopqrstuv", "/^bad.*/i"],
    untrap_videosFilterRulesData3: ["reaction", "/\\b(prank|challenge)s?\\b/i"],
    untrap_filterCommentsRulesData3: ["first!"],
  } } },
  { id: "untrap_not_syncing_state", value: { something: 1 } },
];
const toCode = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
// atob/TextDecoder exist in Node 22 globals.

const r = SW.importUntrap(toCode(sections));
t("toggles map", () => {
  assert.strictEqual(r.opts.hide_all_shorts, true);
  assert.strictEqual(r.opts.hide_ads, false);
  assert.strictEqual(r.opts.home_hide_feed, true);
  assert.strictEqual(r.opts.home_hide_shorts_shelf, true);
  assert.strictEqual(r.opts.home_hide_sections, true);
  assert.strictEqual(r.opts.comments_hide, true);
});
t("many-to-one is on if any source is on", () => assert.strictEqual(r.opts.watch_hide_subscribe, true));
t("absent UnTrap keys leave Hush options untouched", () => assert.strictEqual("watch_hide_related" in r.opts, false));
t("selects translate", () => {
  assert.strictEqual(r.opts.redirect_home, "subscriptions");
  assert.strictEqual(r.opts.search_sort, "date");
  assert.strictEqual(r.opts.video_quality, "hd2160");
  assert.strictEqual(r.opts.channel_open_videos, true);
  assert.strictEqual(r.opts.home_columns, "6");
  assert.strictEqual(r.opts.cards_thumb_opacity, "50");
  assert.strictEqual(r.opts.look_accent, "#11aa77");
});
t("untranslatable values reported, not guessed", () => {
  assert.strictEqual("cards_title_case" in r.opts, false);
  assert(r.report.notCarried.includes("untrap_video_card_title_case"));
  assert(r.report.notCarried.includes("untrap_global_add_summarize_button"));
});
t("master switch carried", () => assert.strictEqual(r.enabled, true));
t("channel rules: handles, URLs and names kept; IDs and patterns reported", () => {
  assert.deepStrictEqual(r.filter.channels, ["@PrankZone", "@DramaChan", "Some Channel"]);
  assert.deepStrictEqual(r.report.filters.skipped, ["UCabcdefghijklmnopqrstuv", "/^bad.*/i"]);
});
t("video and comment rules become keywords / patterns", () => {
  assert.deepStrictEqual(r.filter.keywords, ["reaction", "first!"]);
  assert.deepStrictEqual(r.filter.regex, ["\\b(prank|challenge)s?\\b"]);
});
t("every produced option value is valid for Hush", () => {
  for (const [id, v] of Object.entries(r.opts)) assert.strictEqual(SW.validOptValue(SW.OPTION_INDEX[id], v), v, id);
});
t("apply merges into config and survives sanitizing", () => {
  const base = SW.sanitizeConfig({ filter: { channels: ["Existing"], keywords: [], regex: [] }, opts: { watch_hide_related: true } });
  const next = SW.applyUntrapImport(base, r);
  assert.strictEqual(next.opts.watch_hide_related, true);       // untouched
  assert.strictEqual(next.opts.comments_hide, true);            // imported
  assert.deepStrictEqual(next.filter.channels, ["Existing", "@PrankZone", "@DramaChan", "Some Channel"]);
});
t("versioned envelope accepted", () => {
  const v = SW.importUntrap(toCode({ format: "untrap-settings", version: 1, entries: sections }));
  assert.strictEqual(v.opts.home_hide_feed, true);
});
t("raw JSON accepted", () => assert.strictEqual(SW.importUntrap(JSON.stringify(sections)).opts.hide_all_shorts, true));
t("code with line breaks accepted", () => assert.strictEqual(SW.importUntrap(toCode(sections).replace(/(.{60})/g, "$1\n")).opts.hide_all_shorts, true));
t("garbage rejected", () => {
  for (const bad of ["", "hello world", toCode({ a: 1 }), toCode([{ id: "x", value: {} }]), "{not json", "[1,2,3]"]) {
    assert.throws(() => SW.importUntrap(bad), undefined, bad);
  }
});
t("prototype keys can't pollute", () => {
  const evil = '[{"id":"untrap_options_state","value":{"__proto__":{"polluted":true},"untrap_global_hide_all_shorts":true}}]';
  const res = SW.importUntrap(evil);
  assert.strictEqual(({}).polluted, undefined);
  assert.strictEqual(res.opts.hide_all_shorts, true);
});
t("oversized input rejected", () => assert.throws(() => SW.importUntrap("A".repeat(2_000_001))));
console.log(`${n} import tests passed`);
