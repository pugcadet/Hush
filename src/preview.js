/*
 * Hush for YouTube — live preview for the settings page.
 * Draws a simple wireframe of the YouTube page for the current section.
 * Options that are on are shown applied (removed, blurred, greyed…), and the
 * option under the mouse or keyboard focus is outlined so you can see what it touches.
 * Pure drawing code: no network, no page access, builds SVG with DOM APIs.
 */
(() => {
  "use strict";
  const SW = (globalThis.SW = globalThis.SW || {});
  const NS = "http://www.w3.org/2000/svg";

  // Thumbnail tints so blur / grayscale / transparency are visible.
  const T = ["#5b7fd6", "#d6815b", "#4fa88f", "#b85fae", "#c9a640", "#5fa3c9", "#d65b77", "#7c8bd6"];

  // Item: [id, type, x, y, w, h, groups (space separated), extra]
  // types: bar (text line), thumb (picture), box (panel), btn (pill), dot (circle), badge (labelled tag), text
  const header = () => [
    ["h_logo", "thumb", 6, 5, 18, 9, "logo", { c: "#d65b5b" }], ["h_word", "bar", 26, 7, 22, 5, "logo"], ["h_cc", "bar", 50, 5, 6, 3, "country"],
    ["h_search", "box", 96, 4, 118, 11, "search"], ["h_voice", "dot", 222, 4, 11, 11, "voice"],
    ["h_create", "btn", 252, 5, 18, 9, "create"], ["h_bell", "dot", 276, 4, 11, 11, "bell"], ["h_count", "badge", 283, 2, 8, 6, "bellcount", { c: "#d65b5b" }],
    ["h_avatar", "dot", 298, 4, 11, 11, "avatar"],
  ].map((i) => (i[6] = i[6] + " header", i));

  const sidebar = () => [
    ["sb_home", "bar", 6, 26, 38, 5, "sb sb_home"], ["sb_shorts", "bar", 6, 36, 38, 5, "sb sb_shorts shorts"], ["sb_subs", "bar", 6, 46, 38, 5, "sb sb_subslink"],
    ["sb_you", "bar", 6, 60, 38, 5, "sb sb_you"], ["sb_hist", "bar", 6, 70, 38, 5, "sb sb_history"],
    ["sb_l1", "dot", 6, 84, 7, 7, "sb sb_sublist"], ["sb_l1t", "bar", 16, 85.5, 26, 4, "sb sb_sublist"], ["sb_d1", "dot", 44, 86, 3, 3, "sb sb_dots", { c: "#6474ff" }],
    ["sb_l2", "dot", 6, 95, 7, 7, "sb sb_sublist"], ["sb_l2t", "bar", 16, 96.5, 26, 4, "sb sb_sublist"],
    ["sb_l3", "dot", 6, 106, 7, 7, "sb sb_sublist"], ["sb_l3t", "bar", 16, 107.5, 26, 4, "sb sb_sublist"], ["sb_d3", "dot", 44, 108, 3, 3, "sb sb_dots", { c: "#6474ff" }],
    ["sb_ex", "box", 6, 122, 40, 26, "sb sb_explore", { label: "Explore" }],
    ["sb_more", "box", 6, 152, 40, 20, "sb sb_more", { label: "More" }],
    ["sb_set", "box", 6, 176, 40, 14, "sb sb_settings", { label: "Help" }],
    ["sb_rep", "bar", 30, 181, 12, 4, "sb sb_report sb_settings", { c: "#aab3c4" }],
    ["sb_foot", "bar", 6, 196, 36, 3, "sb sb_footer"], ["sb_foot2", "bar", 6, 202, 28, 3, "sb sb_footer"],
  ];

  const card = (id, x, y, w, groups, tint, opts = {}) => {
    const th = opts.tall ? 54 : Math.round(w * 0.56);
    const items = [
      [id + "_t", "thumb", x, y, w, th, groups + " thumbs", { c: tint }],
      [id + "_av", "dot", x, y + th + 4, 8, 8, groups + " avatars"],
      [id + "_ti", "bar", x + 11, y + th + 4, w - 18, 4, groups + " titles"],
      [id + "_ch", "bar", x + 11, y + th + 10, (w - 18) * 0.5, 3, groups + " channel"],
      [id + "_me", "bar", x + 11, y + th + 15, (w - 18) * 0.65, 3, groups + " meta views"],
      [id + "_mn", "bar", x + w - 4, y + th + 4, 2, 8, groups + " menus"],
    ];
    if (!opts.noDuration) items.push([id + "_du", "badge", x + w - 16, y + th - 9, 13, 6, groups + " duration", { c: "#111827" }]);
    if (opts.watched) items.push([id + "_wp", "thumb", x, y + th - 2, w * 0.6, 2, groups + " progress", { c: "#ef4444" }]);
    if (opts.badge) items.push([id + "_bd", "badge", x + 3, y + 3, 18, 7, groups + " " + (opts.badgeGroup || "badges"), { c: opts.badgeColor || "#111827", label: opts.badge }]);
    return items;
  };

  const SCENES = {
    home: () => [
      ...header(), ...sidebar(),
      ["chips", "btn", 56, 22, 258, 8, "feed chips"],
      ["banner", "box", 56, 34, 258, 14, "feed banners", { label: "Premium · survey banner" }],
      ...card("c1", 56, 52, 82, "feed c1", T[0]),
      ...card("c2", 144, 52, 82, "feed mix", T[1], { badge: "Mix", badgeGroup: "mixbadge" }),
      ...card("c3", 232, 52, 82, "feed watched", T[2], { watched: true }),
      ...card("c4", 56, 112, 82, "feed c4", T[3]),
      ...card("c5", 144, 112, 82, "feed ad", T[4], { badge: "Ad", badgeColor: "#c9a640" }),
      ...card("c6", 232, 112, 82, "feed c6", T[5], { badge: "Live", badgeColor: "#d65b5b", badgeGroup: "badges livebadge" }),
      ["shelf_t", "bar", 56, 172, 40, 4, "feed shortsshelf shorts"],
      ...[0, 1, 2, 3, 4].map((i) => ["s" + i, "thumb", 56 + i * 52, 179, 46, 30, "feed shortsshelf shorts thumbs", { c: T[(i + 3) % 8] }]),
      ["trend", "box", 56, 212, 258, 6, "feed sections", { label: "" }],
      ["more", "bar", 170, 216, 30, 2, "feed infinite"],
    ],
    global: () => [
      ...SCENES.home().filter((i) => !i[0].startsWith("trend")),
      ["popup", "box", 214, 176, 100, 30, "popup", { label: "Try Premium free!", c: "#3b4660" }],
      ["hover", "badge", 59, 55, 34, 7, "hover", { c: "#6474ff", label: "▶ preview" }],
    ],
    watch: () => [
      ...header(),
      ["pl", "thumb", 8, 22, 200, 110, "player video", { c: "#3c4b75" }],
      ["pl_bar", "thumb", 14, 124, 188, 2, "player", { c: "#ef4444" }],
      ["ti", "bar", 8, 136, 170, 6, "title"],
      ["ow_av", "dot", 8, 147, 11, 11, "owneravatar"], ["ow_n", "bar", 22, 148, 36, 4, "owner"], ["ow_sc", "bar", 22, 154, 26, 3, "subcount"],
      ["sub", "btn", 62, 148, 26, 9, "subscribe", { c: "#e0ebf6" }], ["join", "btn", 91, 148, 18, 9, "subscribe"],
      ["like", "btn", 128, 148, 30, 9, "actions like"], ["share", "btn", 161, 148, 22, 9, "actions"], ["dots", "btn", 186, 148, 22, 9, "actions"],
      ["desc", "box", 8, 162, 200, 24, "description"], ["vd", "bar", 12, 165, 56, 3, "viewsdate description"], ["tags", "bar", 72, 165, 30, 3, "hashtags description", { c: "#6474ff" }],
      ["dl1", "bar", 12, 171, 180, 3, "description"], ["dl2", "bar", 12, 177, 140, 3, "description"],
      ["info", "box", 8, 189, 64, 10, "infopanels", { label: "Context" }], ["merch", "box", 76, 189, 64, 10, "merch", { label: "Merch" }], ["fund", "box", 144, 189, 64, 10, "fundraiser", { label: "Fundraiser" }],
      ["cm", "box", 8, 203, 200, 16, "comments", { label: "Comments" }],
      ["chat", "box", 214, 22, 100, 30, "chat", { label: "Live chat" }],
      ["rchips", "btn", 214, 56, 100, 7, "related rchips"],
      ...[0, 1, 2, 3].map((i) => [
        ["r" + i + "t", "thumb", 214, 67 + i * 30, 44, 25, "related " + ["", "rplaylist", "rwatched", ""][i] + " thumbs", { c: T[i + 1] }],
        ["r" + i + "a", "bar", 262, 69 + i * 30, 50, 4, "related " + ["", "rplaylist", "rwatched", ""][i] + " titles"],
        ["r" + i + "b", "bar", 262, 76 + i * 30, 34, 3, "related " + ["", "rplaylist", "rwatched", ""][i]],
      ]).flat(),
      ["r1s", "badge", 238, 89, 18, 6, "related rplaylist", { c: "#111827", label: "Mix" }],
      ["r2p", "thumb", 214, 150, 28, 2, "related rwatched", { c: "#ef4444" }],
      ["rmore", "bar", 244, 190, 40, 2, "related rinfinite"],
    ],
    comments: () => [
      ["c_hd", "bar", 10, 10, 60, 6, "sort", { label: "" }], ["c_sort", "btn", 76, 9, 28, 8, "sort"],
      ["c_teaser", "box", 10, 22, 300, 14, "teaser", { label: "Top comment teaser" }],
      ["c_me", "dot", 10, 44, 12, 12, "box avatars"], ["c_in", "bar", 28, 49, 220, 3, "box"],
      ...[0, 1, 2].map((i) => {
        const y = 66 + i * 50;
        return [
          ["c" + i + "a", "dot", 10, y, 12, 12, "avatars"], ["c" + i + "n", "bar", 28, y, 40, 4, "names"],
          ["c" + i + "t", "bar", 28, y + 8, 260, 4, "text"], ["c" + i + "u", "bar", 28, y + 15, 190, 4, "text"],
          ["c" + i + "l", "btn", 28, y + 24, 54, 7, "likes"], ["c" + i + "x", "bar", 88, y + 25.5, 46, 4, "translate", { c: "#6474ff" }], ["c" + i + "r", "bar", 40, y + 36, 40, 4, "replies", { c: "#6474ff" }],
        ];
      }).flat(),
    ],
    player: () => [
      ["pv", "thumb", 10, 10, 300, 176, "video", { c: "#3c4b75" }],
      ["gt", "thumb", 10, 10, 300, 18, "gradients", { c: "#0b0f19", o: 0.55 }], ["gb", "thumb", 10, 150, 300, 36, "gradients", { c: "#0b0f19", o: 0.55 }],
      ["promo", "badge", 18, 16, 70, 9, "paidpromo", { c: "#111827", label: "Includes paid promotion" }],
      ["teaser", "dot", 290, 16, 12, 12, "cards", { c: "#e0ebf6" }],
      ...[0, 1, 2, 3].map((i) => ["es" + i, "thumb", 40 + (i % 2) * 124, 40 + Math.floor(i / 2) * 50, 116, 44, "endscreen", { c: T[i + 2] }]),
      ["ce", "box", 230, 104, 70, 34, "cards", { label: "End card", c: "#3b4660" }],
      ["wm", "dot", 288, 142, 14, 14, "watermark", { c: "#e0ebf6" }],
      ["heat", "thumb", 18, 157, 284, 5, "heatmap", { c: "#e0ebf6", o: 0.5 }],
      ["prog", "thumb", 18, 163, 284, 3, "progress", { c: "#ef4444" }],
      ["prev", "btn", 18, 170, 9, 10, "nextprev"], ["play", "btn", 31, 170, 9, 10, "playbtn"], ["next", "btn", 44, 170, 9, 10, "nextprev"],
      ["vol", "btn", 58, 171, 28, 8, "volume"], ["time", "bar", 90, 173, 32, 4, "time"], ["chap", "bar", 126, 173, 44, 4, "chapters"],
      ["auto", "btn", 206, 171, 16, 8, "autoplay"], ["cc", "btn", 226, 171, 12, 8, "captions"], ["set", "btn", 242, 171, 12, 8, "settings"],
      ["mini", "btn", 258, 171, 12, 8, "miniplayer"], ["thea", "btn", 274, 171, 12, 8, "theater"], ["fs", "btn", 290, 171, 12, 8, "fullscreen"],
    ],
    search: () => [
      ...header(),
      ["filters", "btn", 8, 22, 240, 8, "filters"],
      ...[["v1", 34, "", T[0]], ["v2", 106, "watched", T[2]]].map(([id, y, g, c]) => [
        [id + "t", "thumb", 8, y, 58, 32, "results " + g + " thumbs", { c }], [id + "a", "bar", 72, y + 2, 120, 4, "results " + g], [id + "b", "bar", 72, y + 9, 60, 3, "results " + g],
        [id + "s", "bar", 72, y + 16, 150, 3, "results snippets " + g], [id + "s2", "bar", 72, y + 22, 110, 3, "results snippets " + g],
        ...(g === "watched" ? [[id + "p", "thumb", 8, y + 30, 36, 2, "results watched", { c: "#ef4444" }]] : []),
      ]).flat(),
      ["ad", "box", 8, 70, 240, 16, "promoted", { label: "Sponsored · product" }],
      ["chan", "dot", 20, 90, 14, 14, "channels"], ["chan_n", "bar", 72, 95, 80, 4, "channels"],
      ["shs", "bar", 8, 142, 40, 4, "rshorts shorts"],
      ...[0, 1, 2, 3].map((i) => ["sh" + i, "thumb", 8 + i * 38, 149, 32, 28, "rshorts shorts thumbs", { c: T[i + 4] }]),
      ["pl", "thumb", 166, 149, 58, 28, "playlists thumbs", { c: T[6] }], ["plb", "badge", 196, 169, 26, 6, "playlists", { c: "#111827", label: "Mix" }],
      ["shelf", "box", 8, 182, 240, 16, "shelves", { label: "People also watched" }],
      ["posts", "box", 8, 201, 240, 9, "posts", { label: "Posts" }],
      ["rs", "box", 254, 22, 60, 120, "rightside", { label: "Side panel" }],
      ["more", "bar", 110, 212, 40, 2, "infinite"],
    ],
    shorts: () => [
      ["vid", "thumb", 110, 8, 100, 200, "video", { c: "#4f5f8f" }],
      ["ch_av", "dot", 116, 166, 10, 10, "channel"], ["ch_n", "bar", 129, 168, 34, 4, "channel"], ["ch_sub", "btn", 167, 166, 26, 9, "channel", { c: "#e0ebf6" }],
      ["ti", "bar", 116, 181, 82, 4, "description"], ["ti2", "bar", 116, 188, 60, 3, "description"],
      ["snd", "bar", 116, 197, 50, 3, "sound"],
      ["lk", "dot", 218, 86, 14, 14, "like"], ["dl", "dot", 218, 108, 14, 14, "like"], ["cm", "dot", 218, 130, 14, 14, "commentsbtn"],
      ["sh", "dot", 218, 152, 14, 14, "share"], ["rx", "dot", 218, 174, 14, 14, "share"], ["sp", "thumb", 218, 194, 14, 14, "sound", { c: T[3] }],
      ["up", "dot", 290, 86, 16, 16, "nav"], ["down", "dot", 290, 110, 16, 16, "nav"],
    ],
    subs: () => [
      ...header(), ...sidebar(),
      ...card("u1", 56, 26, 82, "u1", T[0]),
      ...card("u2", 144, 26, 82, "watched", T[1], { watched: true }),
      ...card("u3", 232, 26, 82, "live", T[2], { badge: "LIVE", badgeColor: "#d65b5b", noDuration: true }),
      ...card("u4", 56, 92, 82, "upcoming", T[3], { badge: "Soon", badgeColor: "#3b4660", noDuration: true }),
      ...card("u5", 144, 92, 82, "shorts", T[4], { tall: true, badge: "Short", badgeColor: "#111827", noDuration: true }),
      ...card("u6", 232, 92, 82, "u6", T[5]),
      ["more", "bar", 170, 214, 30, 2, "infinite"],
    ],
    channel: () => [
      ...header(),
      ["banner", "thumb", 8, 22, 304, 34, "banner", { c: T[7] }],
      ["av", "dot", 12, 62, 26, 26, "avatar"], ["nm", "bar", 44, 63, 70, 6, "name"],
      ["cnt", "bar", 44, 73, 90, 3, "counts"], ["lnk", "bar", 44, 79, 130, 3, "links"],
      ["sub", "btn", 44, 87, 32, 9, "subscribe", { c: "#e0ebf6" }], ["jn", "btn", 80, 87, 22, 9, "subscribe"],
      ...["Home", "Videos", "Shorts", "Live", "Podcasts", "Playlists", "Posts", "Store", "Releases"].map((t, i) =>
        ["tab" + i, "badge", 8 + i * 34, 104, 30, 8, "tab_" + t.toLowerCase() + (t === "Shorts" ? " shorts" : ""), { c: "#3b4660", label: t }]),
      ["shelf", "box", 8, 118, 304, 20, "shelves", { label: "For you · featured channels" }],
      ...[0, 1, 2, 3].map((i) => card("v" + i, 8 + i * 77, 144, 71, "videos", T[i])).flat(),
    ],
    sidebar: () => [
      ...header(), ...sidebar(),
      ["content", "box", 56, 22, 258, 196, "content", { label: "", o: 0.35 }],
    ],
    header: () => [
      ["logo", "thumb", 8, 20, 26, 16, "logo", { c: "#d65b5b" }], ["word", "bar", 38, 25, 40, 7, "logo"], ["cc", "bar", 80, 20, 10, 5, "country"],
      ["search", "box", 100, 20, 120, 16, "search", { label: "Search" }], ["voice", "dot", 226, 20, 16, 16, "voice"],
      ["create", "btn", 250, 21, 26, 14, "create", { label: "+ Create" }], ["bell", "dot", 282, 20, 16, 16, "bell"], ["bc", "badge", 292, 16, 12, 8, "bellcount", { c: "#d65b5b", label: "9" }],
      ["avatar", "dot", 304, 20, 0, 0, "avatar"],
      ["sugg", "box", 100, 40, 120, 64, "suggestions", { label: "" }],
      ...[0, 1, 2, 3, 4].map((i) => ["sg" + i, "bar", 108, 48 + i * 11, 90 - i * 8, 4, "suggestions"]),
      ["page", "box", 8, 112, 304, 100, "page", { label: "", o: 0.35 }],
    ],
    cards: () => [
      ...card("big", 30, 18, 170, "one", T[0], { badge: "New · 4K", badgeGroup: "badges" }).map((i) => {
        if (i[0] === "big_av") return ["big_av", "dot", 30, 118, 16, 16, i[6]];
        if (i[0] === "big_ti") return ["big_ti", "bar", 52, 118, 140, 6, i[6]];
        if (i[0] === "big_ch") return ["big_ch", "bar", 52, 129, 70, 4, i[6]];
        if (i[0] === "big_me") return ["big_me", "bar", 52, 137, 100, 4, i[6]];
        if (i[0] === "big_mn") return ["big_mn", "bar", 196, 118, 3, 14, i[6]];
        if (i[0] === "big_du") return ["big_du", "badge", 170, 102, 26, 9, i[6], { c: "#111827", label: "12:34" }];
        return i;
      }),
      ["big_ti2", "bar", 52, 147, 96, 6, "one titles fulltitle"],
      ...card("sm1", 220, 18, 90, "two", T[2], {}),
      ...card("sm2", 220, 104, 90, "three", T[5], {}),
    ],
    you: () => [
      ...header(),
      ["acct", "box", 8, 22, 304, 28, "account", { label: "Your account" }],
      ...[["History", "history", 56], ["Playlists", "playlists", 94], ["Watch later", "watchlater", 132], ["Liked videos", "liked", 170]].map(([t, g, y]) => [
        ["y_" + g, "bar", 8, y, 50, 5, g, { label: "" }],
        ...[0, 1, 2, 3, 4].map((i) => ["y_" + g + i, "thumb", 8 + i * 61, y + 8, 56, 26, g + " thumbs", { c: T[(i + y) % 8] }]),
      ]).flat(),
    ],
    embed: () => [
      ["w1", "bar", 20, 12, 180, 6, "page"], ["w2", "bar", 20, 24, 280, 3, "page"], ["w3", "bar", 20, 30, 250, 3, "page"],
      ["pl", "thumb", 40, 42, 240, 136, "video", { c: "#3c4b75" }],
      ["etitle", "bar", 58, 48, 140, 6, "etitle"], ["eav", "dot", 44, 46, 10, 10, "etitle"],
      ["eshare", "dot", 250, 46, 10, 10, "eshare"], ["emore", "dot", 264, 46, 10, 10, "eshare"],
      ...[0, 1, 2].map((i) => ["ees" + i, "thumb", 56 + i * 72, 70, 64, 36, "eendscreen", { c: T[i + 2] }]),
      ["epause", "box", 44, 136, 232, 22, "epause", { label: "More videos" }],
      ["eyt", "btn", 236, 164, 38, 9, "eyt", { label: "YouTube" }],
      ["w4", "bar", 20, 188, 280, 3, "page"], ["w5", "bar", 20, 194, 230, 3, "page"],
    ],
    look: () => [
      ...card("lk", 20, 16, 150, "look", T[0], {}).filter((i) => !["lk_ch", "lk_me", "lk_av", "lk_mn"].includes(i[0]))
        .map((i) => i[0] === "lk_ti" ? ["lk_ti", "text", 20, 106, 150, 13, "look font", { label: "A calmer video title" }] : i),
      ["lk_meta", "text", 20, 120, 150, 9, "look font", { label: "Natuur Kanaal · 12K views" }],
      ["lk_pl", "thumb", 190, 16, 120, 70, "look", { c: "#3c4b75" }],
      ["lk_pg", "thumb", 196, 78, 108, 3, "look accent", { c: "#ff0033" }],
      ["lk_like", "btn", 190, 96, 40, 12, "likeanim", { label: "👍 1.2K" }],
      ["lk_font", "text", 190, 126, 120, 14, "font", { label: "Aa Bb Cc 123" }],
    ],
  };
  SCENES.global.label = "Home page";

  // option -> [scene (blank = its category), targets, effect, note]
  // effects: hide (default), blur, gray, fade, square, accent, font, redirect, note
  const M = {
    hide_all_shorts: ["global", "shorts"], hide_ads: ["global", "ad banners"], skip_ads: ["player", "video", "note", "Clicks “Skip” on video ads as soon as YouTube allows it."],
    hide_popups: ["global", "popup"], hide_posts: ["search", "posts"], disable_autoplay: ["player", "autoplay", "note", "Switches YouTube’s autoplay toggle off, so the next video doesn’t start by itself."],
    disable_hover_preview: ["global", "hover"], video_quality: ["player", "settings", "note", "Starts every video at the quality you choose (if available)."],
    grayscale_site: ["global", "*", "gray"], hide_watched_everywhere: ["global", "watched"], hide_view_counts: ["global", "views"],

    redirect_home: ["home", "*", "redirect"], home_hide_feed: ["", "feed"], home_hide_chips: ["", "chips"], home_hide_shorts_shelf: ["", "shortsshelf"],
    home_hide_sections: ["", "sections"], home_hide_mixes: ["", "mix"], home_hide_watched: ["", "watched"], home_no_infinite: ["", "infinite", "hide", "Stops YouTube loading more videos when you reach the bottom."],
    home_hide_banners: ["", "banners"], home_columns: ["", "feed", "note", "Sets how many videos sit side by side in the home grid."],

    shorts_redirect: ["", "video", "note", "Opening a Short plays it in the normal video player instead."],
    shorts_no_scroll: ["", "nav", "hide", "Scrolling, swiping and arrow keys no longer move to the next Short."],
    shorts_hide_comments_btn: ["", "commentsbtn"], shorts_hide_like_btns: ["", "like"], shorts_hide_share_btn: ["", "share"],
    shorts_hide_channel: ["", "channel"], shorts_hide_description: ["", "description"], shorts_hide_sound: ["", "sound"],

    watch_hide_related: ["", "related chat"], watch_related_no_infinite: ["", "rinfinite", "hide", "Stops more related videos loading as you scroll."],
    watch_hide_related_chips: ["", "rchips"], watch_hide_related_playlists: ["", "rplaylist"], watch_hide_related_watched: ["", "rwatched"],
    watch_hide_live_chat: ["", "chat"], watch_hide_playlist_panel: ["", "chat", "hide", "Hides the playlist panel that appears in this spot when watching a playlist."],
    watch_hide_title: ["", "title"], watch_hide_description: ["", "description"], watch_hide_views_date: ["", "viewsdate"], watch_hide_hashtags: ["", "hashtags"],
    watch_hide_actions: ["", "actions subscribe"], watch_hide_like: ["", "like"], watch_hide_subscribe: ["", "subscribe"], watch_hide_owner_avatar: ["", "owneravatar"],
    watch_hide_sub_count: ["", "subcount"], watch_hide_merch: ["", "merch"], watch_hide_fundraiser: ["", "fundraiser"], watch_hide_info_panels: ["", "infopanels"],
    watch_hide_desc_shorts: ["", "description", "note", "Hides Shorts shelves that appear inside the description."],
    watch_auto_theater: ["", "player", "note", "Opens videos in a wide theater view."], watch_theater_method: ["", "player", "note", "“Wide layout” reshapes the page so it never switches or flickers. “YouTube’s own” uses YouTube’s theater mode, which can flash normal → black → theater."], watch_auto_expand_desc: ["", "description", "note", "Opens the full description automatically."],
    watch_grayscale_video: ["", "video", "gray"], watch_center: ["", "player", "note", "Centres the video when the related column is hidden."],

    comments_hide: ["comments", "*"], comments_hide_teaser: ["", "teaser"], comments_hide_avatars: ["", "avatars"], comments_hide_replies: ["", "replies"],
    comments_hide_likes: ["", "likes"], comments_hide_box: ["", "box"], comments_hide_sort: ["", "sort"], comments_hide_translate: ["", "translate"],

    player_hide_endscreen: ["", "endscreen"], player_hide_cards: ["", "cards"], player_hide_pause_overlay: ["embed", "epause"], player_hide_next_prev: ["", "nextprev"],
    player_hide_autoplay_toggle: ["", "autoplay"], player_hide_miniplayer: ["", "miniplayer"], player_hide_theater_btn: ["", "theater"], player_hide_captions_btn: ["", "captions"],
    player_hide_settings_btn: ["", "settings"], player_hide_fullscreen_btn: ["", "fullscreen"], player_hide_volume: ["", "volume"], player_hide_time: ["", "time"],
    player_hide_chapters_btn: ["", "chapters"], player_hide_heatmap: ["", "heatmap"], player_hide_watermark: ["", "watermark"], player_hide_paid_promo: ["", "paidpromo"],
    player_hide_gradients: ["", "gradients"], player_square: ["", "video", "square"],

    search_sort: ["", "results", "note", "Search results open sorted the way you choose."], search_hide_shorts: ["", "rshorts"], search_hide_channels: ["", "channels"],
    search_hide_playlists: ["", "playlists"], search_hide_shelves: ["", "shelves"], search_hide_promoted: ["", "promoted"], search_hide_watched: ["", "watched"],
    search_no_infinite: ["", "infinite", "hide", "Stops more results loading as you scroll."], search_hide_filters: ["", "filters"], search_hide_snippets: ["", "snippets"],
    search_hide_right_sidebar: ["", "rightside"],

    subs_hide_shorts: ["", "shorts"], subs_hide_watched: ["", "watched"], subs_hide_live: ["", "live"], subs_hide_upcoming: ["", "upcoming"],
    subs_no_infinite: ["", "infinite", "hide", "Stops more videos loading as you scroll."],

    channel_open_videos: ["", "tab_videos", "note", "Channels open straight on their Videos tab."], channel_hide_banner: ["", "banner"], channel_grayscale_banner: ["", "banner", "gray"],
    channel_hide_subscribe: ["", "subscribe"], channel_hide_counts: ["", "counts"], channel_hide_links: ["", "links"],
    channel_hide_tab_home: ["", "tab_home"], channel_hide_tab_live: ["", "tab_live"], channel_hide_tab_podcasts: ["", "tab_podcasts"], channel_hide_tab_playlists: ["", "tab_playlists"],
    channel_hide_tab_posts: ["", "tab_posts"], channel_hide_tab_store: ["", "tab_store"], channel_hide_tab_releases: ["", "tab_releases"], channel_hide_shelves: ["", "shelves"],

    sidebar_hide_all: ["", "sb"], sidebar_hide_home: ["", "sb_home"], sidebar_hide_subscriptions_link: ["", "sb_subslink"], sidebar_hide_you: ["", "sb_you"],
    sidebar_hide_history: ["", "sb_history"], sidebar_hide_subscriptions: ["", "sb_sublist sb_dots"], sidebar_grayscale_avatars: ["", "sb_sublist", "gray"],
    sidebar_hide_dots: ["", "sb_dots"], sidebar_hide_explore: ["", "sb_explore"], sidebar_hide_more: ["", "sb_more"], sidebar_hide_report_history: ["", "sb_report"], sidebar_hide_settings: ["", "sb_settings"], sidebar_hide_footer: ["", "sb_footer"],

    header_hide_all: ["", "logo country search voice create bell bellcount avatar"], header_hide_bell: ["", "bell bellcount"], header_hide_bell_count: ["", "bellcount"],
    header_hide_create: ["", "create"], header_hide_voice: ["", "voice"], header_hide_search_suggestions: ["", "suggestions"], header_hide_logo: ["", "logo country"],
    header_grayscale_logo: ["", "logo", "gray"], header_logo_no_link: ["", "logo", "note", "The logo stays visible but no longer takes you to the home feed."],
    header_hide_country: ["", "country"], header_hide_search: ["", "search voice suggestions"],

    cards_hide_thumbs: ["", "thumbs duration progress badges"], cards_blur_thumbs: ["", "thumbs", "blur"], cards_grayscale_thumbs: ["", "thumbs", "gray"],
    cards_thumb_opacity: ["", "thumbs", "fade"], cards_hide_duration: ["", "duration"], cards_hide_meta: ["", "meta"], cards_hide_avatar: ["", "avatars"],
    cards_hide_channel: ["", "channel"], cards_hide_badges: ["", "badges"], cards_hide_menu: ["", "menus"],
    cards_full_title: ["", "fulltitle", "note", "Long titles show in full instead of being cut off with “…”."],
    cards_title_case: ["", "titles", "note", "Changes the capitalisation of video titles."], cards_square: ["", "thumbs", "square"],

    you_hide_history: ["", "history"], you_hide_playlists: ["", "playlists"], you_hide_watch_later: ["", "watchlater"], you_hide_liked: ["", "liked"], you_hide_account: ["", "account"],

    embed_hide_endscreen: ["", "eendscreen"], embed_hide_pause_overlay: ["", "epause"], embed_hide_title: ["", "etitle"], embed_hide_yt_button: ["", "eyt"], embed_hide_share: ["", "eshare"],

    look_accent: ["", "accent", "accent"], look_font: ["", "font", "font"], look_hide_like_animation: ["", "likeanim", "note", "The like button no longer plays its animation."],
  };

  // Options that should also show on other page previews: { option: { scene: "targets" } }
  const ALSO = {
    hide_all_shorts: { home: "shortsshelf", search: "rshorts", subs: "shorts", channel: "tab_shorts", sidebar: "sb_shorts" },
    hide_ads: { home: "ad banners", search: "promoted" },
    hide_watched_everywhere: { home: "watched", search: "watched", subs: "watched", watch: "rwatched" },
    hide_view_counts: { home: "views", subs: "views" },
    comments_hide: { watch: "comments" },
    watch_hide_live_chat: {}, player_hide_endscreen: {},
  };
  // Categories whose options apply wherever their targets appear (header, sidebar and video cards are on most pages).
  const CROSS = new Set(["cards", "header", "sidebar"]);

  const sceneOf = (o) => (M[o.id] && M[o.id][0]) || (o.cat === "comments" ? "comments" : o.cat === "global" ? "global" : o.cat);
  const entry = (o) => {
    const m = M[o.id] || ["", ""];
    return { scene: sceneOf(o), targets: (m[1] || "").split(" ").filter(Boolean), effect: m[2] || "hide", note: m[3] || "" };
  };
  SW.previewSceneFor = (catId) => (SCENES[catId] ? catId : "home");
  SW.PREVIEW_SCENE_NAMES = { home: "Home page", global: "Home page", watch: "Video page", comments: "Comments", player: "Video player", search: "Search results",
    shorts: "Shorts", subs: "Subscriptions", channel: "Channel page", sidebar: "Left sidebar", header: "Header", cards: "Video cards", you: "You page", embed: "Embedded video", look: "Appearance" };
  SW.PREVIEW_MAP = M;

  const el = (tag, attrs = {}) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, String(v));
    return e;
  };
  const matches = (item, targets) => targets.includes("*") || targets.some((t) => item[0] === t || (" " + item[6] + " ").includes(" " + t + " "));
  const isOn = (cfg, o) => {
    const v = SW.opt(cfg, o.id);
    return o.type === "toggle" ? v === true : v !== o.def;
  };

  /**
   * Draw the preview into `host` (a div). sceneId: which page; focusId: option to outline.
   * Returns nothing; replaces host content.
   */
  SW.renderPreview = (host, sceneId, cfg, focusId) => {
    const focus0 = focusId && SW.OPTION_INDEX[focusId];
    if (focus0) { const e0 = entry(focus0); if (SCENES[e0.scene]) sceneId = e0.scene; }
    if (!SCENES[sceneId]) sceneId = "home";
    const items = SCENES[sceneId]();
    const fx = new Map(); // item id -> Set(effects)
    const values = {};
    const add = (it, e) => { if (!fx.has(it[0])) fx.set(it[0], new Set()); fx.get(it[0]).add(e); };
    let redirectTo = null;
    if (cfg.enabled) {
      for (const o of SW.OPTIONS) {
        const m = entry(o);
        if (!isOn(cfg, o) || m.effect === "note") continue;
        let targets = null;
        if (m.scene === sceneId) targets = m.targets;
        else if (ALSO[o.id] && ALSO[o.id][sceneId]) targets = ALSO[o.id][sceneId].split(" ");
        else if (CROSS.has(o.cat) || (o.id === "grayscale_site")) targets = m.targets;
        if (!targets) continue;
        if (m.effect === "redirect") { if (m.scene === sceneId) redirectTo = o.choices.find((c) => c[0] === SW.opt(cfg, o.id))[1]; continue; }
        values[m.effect] = SW.opt(cfg, o.id);
        for (const it of items) if (matches(it, targets)) add(it, m.effect);
      }
    }
    const focus = focusId && SW.OPTION_INDEX[focusId];
    const fm = focus ? entry(focus) : null;
    const focusItems = fm && fm.scene === sceneId ? items.filter((it) => matches(it, fm.targets) && it[4] > 0 && it[5] > 0) : [];

    const svg = el("svg", { viewBox: "0 0 320 222", role: "img", "aria-label": focus ? `Preview: ${focus.label}` : "Preview of the YouTube page with your settings" });
    const defs = el("defs");
    const blur = el("filter", { id: "pv-blur", x: "-10%", y: "-10%", width: "120%", height: "120%" });
    blur.appendChild(el("feGaussianBlur", { stdDeviation: "2.4" }));
    const gray = el("filter", { id: "pv-gray" });
    gray.appendChild(el("feColorMatrix", { type: "saturate", values: "0" }));
    const hatch = el("pattern", { id: "pv-hatch", width: "5", height: "5", patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
    hatch.appendChild(el("rect", { width: "5", height: "5", fill: "transparent" }));
    hatch.appendChild(el("line", { x1: "0", y1: "0", x2: "0", y2: "5", stroke: "#7b879b", "stroke-width": "1.2", opacity: "0.55" }));
    defs.append(blur, gray, hatch);
    svg.appendChild(defs);
    svg.appendChild(el("rect", { x: 0, y: 0, width: 320, height: 222, rx: 8, fill: "#1a2030" }));

    const root = el("g");
    if (fx.size && [...items].every((it) => fx.get(it[0])?.has("gray"))) root.setAttribute("filter", "url(#pv-gray)");
    for (const it of items) {
      const [id, type, x, y, w, h, , extra = {}] = it;
      if (w <= 0 || h <= 0) continue;
      const effects = fx.get(id) || new Set();
      const hidden = effects.has("hide");
      const g = el("g", { opacity: hidden ? 0.16 : extra.o ?? 1 });
      let fill = extra.c || (type === "box" ? "#323c52" : type === "thumb" ? T[0] : "#56637b");
      if (effects.has("accent") && /^#[0-9a-f]{6}$/i.test(values.accent || "")) fill = values.accent;
      const radius = effects.has("square") ? 0 : type === "btn" ? h / 2 : type === "thumb" ? 3 : type === "box" ? 4 : 1.5;
      let shape;
      if (type === "dot") shape = el("circle", { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2, fill: extra.c || "#56637b" });
      else if (type === "text") {
        const picked = (SW.FONTS || []).find((f) => f.id === values.font);
        const fam = picked && picked.family ? picked.family : "Hanken Grotesk, system-ui, sans-serif";
        shape = el("text", { x, y: y + h - 2, "font-size": h * 0.85, fill: "#e0ebf6", "font-family": effects.has("font") ? fam : "Hanken Grotesk, system-ui, sans-serif", "font-weight": 600 });
        shape.textContent = extra.label || "";
      } else shape = el("rect", { x, y, width: w, height: h, rx: radius, fill });
      if (effects.has("blur")) shape.setAttribute("filter", "url(#pv-blur)");
      if (effects.has("gray")) shape.setAttribute("filter", "url(#pv-gray)");
      if (effects.has("fade")) shape.setAttribute("opacity", String(Number(values.fade || 100) / 100));
      g.appendChild(shape);
      if (extra.label && type !== "text" && h >= 6 && !hidden) {
        const t = el("text", { x: x + (type === "badge" ? w / 2 : 5), y: y + h / 2 + (type === "badge" ? 2 : 2.5), "font-size": type === "badge" ? Math.min(5, h * 0.75) : 6.5,
          fill: type === "badge" || fill === "#e0ebf6" ? (fill === "#e0ebf6" ? "#20283a" : "#ffffff") : "#aab3c4", "text-anchor": type === "badge" ? "middle" : "start", "font-family": "Hanken Grotesk, system-ui, sans-serif" });
        t.textContent = extra.label;
        g.appendChild(t);
      }
      if (hidden) g.appendChild(el(type === "dot" ? "circle" : "rect", type === "dot"
        ? { cx: x + w / 2, cy: y + h / 2, r: Math.min(w, h) / 2, fill: "url(#pv-hatch)" }
        : { x, y, width: w, height: h, rx: radius, fill: "url(#pv-hatch)" }));
      root.appendChild(g);
    }
    svg.appendChild(root);

    if (redirectTo) {
      const b = el("g");
      b.appendChild(el("rect", { x: 70, y: 92, width: 180, height: 34, rx: 8, fill: "#434891" }));
      const t = el("text", { x: 160, y: 113, "font-size": 9.5, fill: "#fff", "text-anchor": "middle", "font-family": "Hanken Grotesk, system-ui, sans-serif", "font-weight": 700 });
      t.textContent = `Opens: ${redirectTo}`;
      b.appendChild(t);
      svg.appendChild(b);
    }

    if (focusItems.length) {
      const x1 = Math.min(...focusItems.map((i) => i[2])) - 2, y1 = Math.min(...focusItems.map((i) => i[3])) - 2;
      const x2 = Math.max(...focusItems.map((i) => i[2] + i[4])) + 2, y2 = Math.max(...focusItems.map((i) => i[3] + i[5])) + 2;
      if (fm.targets.includes("*")) {
        svg.appendChild(el("rect", { x: 1.5, y: 1.5, width: 317, height: 219, rx: 8, fill: "none", stroke: "#6474ff", "stroke-width": 3 }));
      } else {
        for (const i of focusItems) {
          svg.appendChild(el(i[1] === "dot" ? "circle" : "rect", i[1] === "dot"
            ? { cx: i[2] + i[4] / 2, cy: i[3] + i[5] / 2, r: Math.min(i[4], i[5]) / 2 + 1.5, fill: "none", stroke: "#6474ff", "stroke-width": 1.6 }
            : { x: i[2] - 1, y: i[3] - 1, width: i[4] + 2, height: i[5] + 2, rx: 3, fill: "none", stroke: "#6474ff", "stroke-width": 1.6 }));
        }
        if (focusItems.length > 1) svg.appendChild(el("rect", { x: x1 - 2, y: y1 - 2, width: x2 - x1 + 4, height: y2 - y1 + 4, rx: 5, fill: "none", stroke: "#aab8ff", "stroke-width": 0.8, "stroke-dasharray": "3 2" }));
      }
    }

    // Caption
    const cap = document.createElement("div");
    cap.className = "preview-cap";
    const title = document.createElement("strong");
    const desc = document.createElement("span");
    if (focus) {
      title.textContent = focus.label;
      const on = isOn(cfg, focus);
      const verb = { hide: "Hidden", blur: "Blurred", gray: "Shown in grey", fade: "Faded", square: "Square corners", accent: "Recoloured", font: "Font changed", redirect: "Redirects" }[fm.effect];
      if (fm.note) desc.textContent = fm.note;
      else if (on) desc.textContent = `${verb} — on now (outlined).`;
      else if (fm.effect === "hide" && focusItems.length && focusItems.every((i) => fx.get(i[0])?.has("hide"))) desc.textContent = "Already hidden by another option you have on.";
      else desc.textContent = `Outlined part will be ${verb.toLowerCase()} when you turn this on.`;
    } else {
      title.textContent = "Live preview";
      desc.textContent = "Point at an option to see what it changes. Parts you’ve switched off are shown striped.";
    }
    const where = document.createElement("span");
    where.className = "preview-where";
    where.textContent = SW.PREVIEW_SCENE_NAMES[sceneId] || "";
    cap.append(where, title, desc);
    host.replaceChildren(svg, cap);
  };
})();
