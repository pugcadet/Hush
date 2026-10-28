/*
 * Hush for YouTube — option catalogue.
 * Each option is pure data: an id, a label, and either CSS (applied when on)
 * or a behaviour handled by content.js. YouTube changes its markup from time
 * to time; if something stops hiding, the selector to fix is in this file.
 */
(() => {
  "use strict";
  const SW = (globalThis.SW = globalThis.SW || {});

  const hide = (...sels) => `${sels.join(",\n")}{display:none!important}`;
  const rule = (sels, body) => `${[].concat(sels).join(",\n")}{${body}}`;

  // Reusable selector groups
  const CARD = [
    "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer",
    "ytd-grid-video-renderer", "ytd-playlist-video-renderer", "yt-lockup-view-model",
  ].join(",");
  const CARDS = (inner) => CARD.split(",").map((c) => `${c} ${inner}`).join(",");
  const THUMB_IMG = "ytd-thumbnail img, yt-thumbnail-view-model img, .yt-lockup-view-model__content-image img, ytd-playlist-thumbnail img";
  const WATCHED = "ytd-thumbnail-overlay-resume-playback-renderer, yt-thumbnail-overlay-progress-bar-view-model";
  const SHORT_LINK = 'a[href^="/shorts/"]';
  const HOME = 'ytd-browse[page-subtype="home"]';
  const SUBS = 'ytd-browse[page-subtype="subscriptions"]';
  const CHANNEL = 'ytd-browse[page-subtype="channels"]';
  const WATCH = "ytd-watch-flexy";
  const META = "ytd-watch-metadata";
  const GUIDE = "ytd-guide-renderer";
  const guideLink = (hrefSel) =>
    `ytd-guide-entry-renderer:has(${hrefSel}), ytd-mini-guide-entry-renderer:has(${hrefSel})`;
  // Channel tabs only expose their visible name, so list it in English and Dutch.
  const channelTab = (...titles) => titles.map((title) => `${CHANNEL} yt-tab-shape[tab-title="${title}"], ${CHANNEL} tp-yt-paper-tab:has(> .tab-content[title="${title}"])`).join(", ");

  SW.CATEGORIES = [
    { id: "global", label: "Everywhere" },
    { id: "home", label: "Home page" },
    { id: "shorts", label: "Shorts" },
    { id: "watch", label: "Video page" },
    { id: "comments", label: "Comments" },
    { id: "player", label: "Video player" },
    { id: "search", label: "Search" },
    { id: "subs", label: "Subscriptions page" },
    { id: "channel", label: "Channel pages" },
    { id: "sidebar", label: "Left sidebar" },
    { id: "header", label: "Header" },
    { id: "cards", label: "Video cards" },
    { id: "you", label: "You / Library page" },
    { id: "embed", label: "Embedded videos" },
    { id: "look", label: "Appearance" },
  ];

  const O = [];
  const T = (cat, id, label, css = "", extra = {}) => O.push({ type: "toggle", cat, id, label, css, def: false, ...extra });
  const S = (cat, id, label, choices, def, extra = {}) => O.push({ type: "select", cat, id, label, choices, def, ...extra });
  const C = (cat, id, label, def, cssTemplate) => O.push({ type: "color", cat, id, label, def, cssTemplate });

  // ------------------------------------------------------------ EVERYWHERE
  T("global", "hide_all_shorts", "Hide all Shorts", hide(
    "ytd-rich-shelf-renderer[is-shorts]", "ytd-reel-shelf-renderer",
    "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])",
    `grid-shelf-view-model:has(${SHORT_LINK})`, "ytm-shorts-lockup-view-model", "ytm-shorts-lockup-view-model-v2",
    `ytd-rich-item-renderer:has(${SHORT_LINK})`, `ytd-video-renderer:has(${SHORT_LINK})`,
    `ytd-grid-video-renderer:has(${SHORT_LINK})`, `ytd-compact-video-renderer:has(${SHORT_LINK})`,
    `yt-lockup-view-model:has(${SHORT_LINK})`,
    guideLink('a[title="Shorts"]'), guideLink('a[href="/shorts/"]'), guideLink('a[href="/shorts"]'), 'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
    channelTab("Shorts"),
  ), { def: true, recommended: true });
  T("global", "hide_ads", "Hide ads, promos and sponsored items", hide(
    "ytd-ad-slot-renderer", "ytd-in-feed-ad-layout-renderer", "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)",
    "ytd-rich-section-renderer:has(ytd-ad-slot-renderer)", "#player-ads", "#masthead-ad", "ytd-banner-promo-renderer",
    "ytd-promoted-sparkles-web-renderer", "ytd-promoted-sparkles-text-search-renderer", "ytd-search-pyv-renderer",
    "ytd-companion-slot-renderer", "ytd-action-companion-ad-renderer", "ytd-player-legacy-desktop-watch-ads-renderer",
    "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
    ".ytp-ad-overlay-container", ".ytp-ad-image-overlay", ".ytp-suggested-action", "ytd-statement-banner-renderer",
  ), { def: true, recommended: true });
  T("global", "skip_ads", "Auto-click “Skip” on video ads", "", { behavior: true });
  // Community posts appear in search results (in a horizontal row), the home feed and subscriptions.
  // Hide the posts and the rows/shelves that only hold posts, so no empty band is left.
  const POST = "ytd-post-renderer, ytd-backstage-post-thread-renderer, ytd-backstage-post-renderer";
  T("global", "hide_posts", "Hide community posts", hide(
    "ytd-post-renderer", "ytd-backstage-post-thread-renderer", "ytd-backstage-post-renderer",
    `yt-horizontal-list-renderer:has(${POST})`, `ytd-shelf-renderer:has(${POST})`, `ytd-horizontal-card-list-renderer:has(${POST})`,
    `ytd-rich-shelf-renderer:has(${POST})`, `ytd-rich-section-renderer:has(${POST})`, `ytd-rich-item-renderer:has(${POST})`,
    `ytd-reel-shelf-renderer:has(${POST})`, `ytd-item-section-renderer:has(> #contents > :is(${POST}):only-child)`,
  ), { recommended: true });
  T("global", "hide_popups", "Hide promo pop-ups (Premium offers, “try this” banners)", hide(
    "ytd-mealbar-promo-renderer", "yt-mealbar-promo-renderer", "ytd-popup-container tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer)",
    "ytd-popup-container tp-yt-paper-dialog:has(yt-mealbar-promo-renderer)", "ytd-background-promo-renderer",
  ), { def: true, recommended: true });
  T("global", "disable_autoplay", "Turn off autoplay of the next video", "", { behavior: true, recommended: true });
  T("global", "disable_hover_preview", "Disable video previews on hover (everywhere, incl. related videos)", hide(
    "ytd-video-preview", "#video-preview", "ytd-moving-thumbnail-renderer", "ytd-thumbnail #mouseover-overlay",
  ) + rule("ytd-video-preview, #video-preview", "pointer-events:none!important"), { recommended: true, behavior: true });
  S("global", "video_quality", "Preferred video quality", [
    ["auto", "Automatic"], ["hd2160", "2160p"], ["hd1440", "1440p"], ["hd1080", "1080p"],
    ["hd720", "720p"], ["large", "480p"], ["medium", "360p"], ["small", "240p"],
  ], "auto", { behavior: true });
  T("global", "grayscale_site", "Whole site in grayscale", rule("html", "filter:grayscale(1)!important"));
  T("global", "hide_watched_everywhere", "Hide videos you’ve already watched (everywhere)", hide(
    CARD.split(",").map((c) => `${c}:has(${WATCHED})`).join(","),
  ));
  T("global", "hide_view_counts", "Hide view counts and likes everywhere", hide(
    "#metadata-line > span:first-of-type", `${META} #info span:first-child`, "ytd-watch-info-text #view-count",
    "like-button-view-model .yt-spec-button-shape-next__button-text-content",
  ));

  // ------------------------------------------------------------------ HOME
  S("home", "redirect_home", "When opening the home page, go to", [
    ["none", "Home page (no redirect)"], ["subscriptions", "Subscriptions"], ["you", "You / Library"],
    ["history", "History"], ["watchlater", "Watch later"],
  ], "none", { behavior: true });
  T("home", "home_hide_feed", "Hide the recommendation feed",
    hide(`${HOME} ytd-rich-grid-renderer`) +
    rule(`${HOME} #primary::before`, 'content:"Recommendations hidden by Hush.";display:block;padding:48px 24px;text-align:center;color:var(--yt-spec-text-secondary,#888);font-size:15px'),
    { recommended: true });
  // Also collapse what sits behind the chips: YouTube's fixed frosted-glass band is made taller
  // when a chips bar exists, and the grid reserves room for it. Without these an empty strip remains.
  T("home", "home_hide_chips", "Hide topic chips at the top (and the empty bar behind them)",
    hide(`${HOME} ytd-feed-filter-chip-bar-renderer`, `${HOME} #chips-wrapper`, `${HOME} ytd-rich-grid-renderer > #header`) +
    rule(`ytd-app:has(${HOME}:not([hidden])) #frosted-glass`, "height:var(--ytd-masthead-height, 56px)!important") +
    rule(`${HOME} ytd-rich-grid-renderer`, "--ytd-rich-grid-chips-bar-height:0px!important;--ytd-rich-grid-chips-bar-width:0px!important") +
    rule(`${HOME} ytd-rich-grid-renderer > #contents`, "margin-top:0!important;padding-top:0!important"));
  T("home", "home_hide_shorts_shelf", "Hide the Shorts shelf", hide(`${HOME} ytd-rich-section-renderer:has([is-shorts])`, `${HOME} ytd-rich-shelf-renderer[is-shorts]`));
  T("home", "home_hide_sections", "Hide extra shelves (news, trending, “explore more”)", hide(`${HOME} ytd-rich-section-renderer`));
  T("home", "home_hide_mixes", "Hide mixes and playlists", hide(
    `${HOME} ytd-rich-item-renderer:has(a[href*="start_radio=1"])`, `${HOME} ytd-rich-item-renderer:has(yt-collection-thumbnail-view-model)`,
    `${HOME} ytd-rich-item-renderer:has(ytd-playlist-thumbnail)`,
  ));
  T("home", "home_hide_watched", "Hide watched videos", hide(`${HOME} ytd-rich-item-renderer:has(${WATCHED})`));
  T("home", "home_no_infinite", "Stop infinite scrolling", hide(`${HOME} ytd-continuation-item-renderer`));
  T("home", "home_hide_banners", "Hide banners (Premium, surveys, “new to you”)", hide(
    `${HOME} ytd-statement-banner-renderer`, `${HOME} ytd-brand-video-singleton-renderer`, `${HOME} ytd-primetime-promo-renderer`,
    `${HOME} ytd-rich-section-renderer:has(ytd-statement-banner-renderer)`, `${HOME} ytd-inline-survey-renderer`,
    `${HOME} ytd-rich-section-renderer:has(ytd-inline-survey-renderer)`,
  ));
  S("home", "home_columns", "Videos per row", [
    ["default", "YouTube default"], ...[2, 3, 4, 5, 6].map((n) => [String(n), `${n}`, rule("ytd-rich-grid-renderer", `--ytd-rich-grid-items-per-row:${n}!important`)]),
  ], "default");

  // ---------------------------------------------------------------- SHORTS
  T("shorts", "shorts_redirect", "Open Shorts in the normal video player", "", { behavior: true, recommended: true });
  T("shorts", "shorts_no_scroll", "Disable scrolling to the next Short",
    hide("ytd-shorts .navigation-container", "#navigation-button-up", "#navigation-button-down"), { behavior: true });
  T("shorts", "shorts_hide_comments_btn", "Hide comments button", hide("ytd-reel-video-renderer #comments-button", "reel-action-bar-view-model button-view-model:has([aria-label*='omment'])", "reel-action-bar-view-model button-view-model:has([aria-label*='eactie'])"));
  T("shorts", "shorts_hide_like_btns", "Hide like / dislike buttons", hide("ytd-reel-video-renderer #like-button", "ytd-reel-video-renderer #dislike-button", "reel-action-bar-view-model like-button-view-model", "reel-action-bar-view-model dislike-button-view-model"));
  T("shorts", "shorts_hide_share_btn", "Hide share and remix buttons", hide("ytd-reel-video-renderer #share-button", "ytd-reel-video-renderer #remix-button"));
  T("shorts", "shorts_hide_channel", "Hide channel info and subscribe button", hide("ytd-reel-video-renderer .metadata-container ytd-reel-channel-bar-view-model", "ytd-reel-video-renderer yt-reel-channel-bar-view-model", "ytd-reel-video-renderer #channel-container"));
  T("shorts", "shorts_hide_description", "Hide title and description", hide("ytd-reel-video-renderer yt-shorts-video-title-view-model", "ytd-reel-video-renderer .metadata-container h2"));
  T("shorts", "shorts_hide_sound", "Hide sound / music link", hide("ytd-reel-video-renderer #pivot-button", "ytd-reel-video-renderer pivot-button-view-model"));

  // ------------------------------------------------------------ VIDEO PAGE
  T("watch", "watch_hide_related", "Hide related videos", hide(`${WATCH} #related`, "ytd-watch-next-secondary-results-renderer"), { recommended: true });
  T("watch", "watch_related_no_infinite", "Stop loading more related videos", hide("#related ytd-continuation-item-renderer"));
  T("watch", "watch_hide_related_chips", "Hide related-video topic chips", hide("#related yt-related-chip-cloud-renderer", "#related ytd-feed-filter-chip-bar-renderer"));
  T("watch", "watch_hide_related_playlists", "Hide playlists and mixes in related videos", hide(
    "#related ytd-compact-radio-renderer", "#related ytd-compact-playlist-renderer", "#related yt-lockup-view-model:has(yt-collection-thumbnail-view-model)",
  ));
  T("watch", "watch_hide_related_watched", "Hide watched videos in related", hide(
    `#related ytd-compact-video-renderer:has(${WATCHED})`, `#related yt-lockup-view-model:has(${WATCHED})`,
  ));
  T("watch", "watch_hide_live_chat", "Hide live chat", hide("ytd-live-chat-frame#chat", `${WATCH} #chat-container`));
  T("watch", "watch_hide_playlist_panel", "Hide playlist panel", hide(`${WATCH} ytd-playlist-panel-renderer#playlist`));
  T("watch", "watch_hide_title", "Hide video title", hide(`${META} #title`));
  T("watch", "watch_hide_description", "Hide description box", hide(`${META} #description`, "#description-inner"));
  T("watch", "watch_hide_views_date", "Hide views and upload date", hide("ytd-watch-info-text", `${META} #info-container`));
  T("watch", "watch_hide_hashtags", "Hide hashtags", hide(`${META} #description a[href^="/hashtag/"]`, `${META} #super-title`));
  T("watch", "watch_hide_actions", "Hide all buttons under the video", hide(`${META} #actions`));
  T("watch", "watch_hide_like", "Hide like / dislike", hide(`${META} segmented-like-dislike-button-view-model`, `${META} ytd-segmented-like-dislike-button-renderer`));
  T("watch", "watch_hide_subscribe", "Hide subscribe and join buttons", hide(`${META} #subscribe-button`, `${META} #sponsor-button`));
  T("watch", "watch_hide_owner_avatar", "Hide channel avatar", hide(`${META} #owner #avatar`));
  T("watch", "watch_hide_sub_count", "Hide subscriber count", hide(`${META} #owner-sub-count`));
  T("watch", "watch_hide_merch", "Hide merch, tickets and offers", hide("ytd-merch-shelf-renderer", "ytd-ticket-shelf-renderer", "ytd-offer-module-renderer"));
  T("watch", "watch_hide_fundraiser", "Hide fundraisers", hide("ytd-donation-shelf-renderer", "ytd-donation-unavailable-renderer"));
  T("watch", "watch_hide_info_panels", "Hide info panels (context notes, licences, etc.)", hide(
    "ytd-info-panel-content-renderer", "ytd-clarification-renderer", "ytd-info-panel-container-renderer", `${META} ytd-metadata-row-container-renderer`,
  ));
  T("watch", "watch_hide_desc_shorts", "Hide Shorts inside the description", hide(`${META} #description ytd-reel-shelf-renderer`));
  // Theater view. YouTube's own theater switch moves the player into another container after the
  // page has drawn (normal → black → theater), in every browser. The "wide" method never uses that
  // switch: it reshapes the normal layout with CSS, so the page is drawn wide from the first frame.
  const WIDE = "html.hush-wide ytd-watch-flexy:not([theater]):not([fullscreen])";
  // Matches YouTube's real theater layout: a full-width black player band directly under the header,
  // height = min(width × 9/16, viewport − 169px), at least 480px; below it the normal centred column
  // (title + comments left, related right) with YouTube's usual 24px margins.
  // ytd-watch-flexy becomes a size container so the band is exactly the page width (no scrollbar overflow).
  const BAND_H = "max(480px, min(calc(100cqw * 9 / 16), calc(100vh - 169px)))";
  T("watch", "watch_auto_theater", "Always use theater view",
    rule("html.hush-wide ytd-watch-flexy:not([theater]):not([fullscreen])", "container-type:inline-size") +
    rule(`${WIDE} #columns`, "display:grid!important;grid-template-columns:minmax(0,1fr) var(--ytd-watch-flexy-sidebar-width,402px);column-gap:24px;align-items:start;" +
      "max-width:calc(var(--ytd-watch-flexy-max-player-width, 1280px) + var(--ytd-watch-flexy-sidebar-width, 402px) + 72px)!important;margin:0 auto!important;padding:0 24px!important;box-sizing:border-box") +
    rule([`${WIDE} #primary`, `${WIDE} #primary-inner`], "display:contents!important") +
    rule(`${WIDE} #player`, `grid-column:1 / -1;grid-row:1;justify-self:start;width:100cqw!important;max-width:none!important;margin:0 0 24px calc(50% - 50cqw)!important;background:#000`) +
    rule(`${WIDE} #player-container-outer`, "max-width:none!important;min-width:0!important;width:100%!important;margin:0!important") +
    rule(`${WIDE} #player-container-inner`, `padding-top:0!important;height:${BAND_H}!important`) +
    rule(`${WIDE} #primary-inner > :not(#player)`, "grid-column:1;min-width:0") +
    rule(`${WIDE} #secondary`, "grid-column:2;grid-row:2 / span 20;padding:0!important;margin:0!important;width:auto!important;min-width:0") +
    rule("html.hush-theater-pending ytd-watch-flexy:not([theater]):not([fullscreen])", "visibility:hidden!important"),
    { behavior: true });
  S("watch", "watch_theater_method", "Theater view method", [
    ["wide", "Wide layout, no flicker (recommended)"],
    ["youtube", "YouTube’s own theater mode (may flicker)"],
  ], "wide", { behavior: true });
  T("watch", "watch_auto_expand_desc", "Auto-expand the description", "", { behavior: true });
  T("watch", "watch_grayscale_video", "Grayscale video", rule("#movie_player video", "filter:grayscale(1)!important"));
  T("watch", "watch_center", "Center content when related videos are hidden", rule(`${WATCH}:not([theater]) #columns`, "justify-content:center!important"));

  // -------------------------------------------------------------- COMMENTS
  T("comments", "comments_hide", "Hide comments", hide(`${WATCH} #comments`, "ytd-comments#comments"), { recommended: true });
  T("comments", "comments_hide_teaser", "Hide comment teaser above the fold", hide("ytd-comments-entry-point-header-renderer", `${WATCH} #below ytd-comments-entry-point-teaser-renderer`));
  T("comments", "comments_hide_avatars", "Hide commenter avatars", hide("ytd-comment-view-model #author-thumbnail", "ytd-comment-renderer #author-thumbnail"));
  T("comments", "comments_hide_replies", "Hide replies", hide("ytd-comment-thread-renderer #replies"));
  T("comments", "comments_hide_likes", "Hide comment likes and actions", hide("ytd-comment-engagement-bar #toolbar", "ytd-comment-view-model #action-buttons"));
  T("comments", "comments_hide_box", "Hide the “Add a comment” box", hide("ytd-comments ytd-comment-simplebox-renderer"));
  T("comments", "comments_hide_translate", "Hide “Translate to English” buttons", hide(
    "ytd-comment-view-model #translate-button", "ytd-comment-renderer #translate-button", "ytd-comments #translate-button",
    "ytd-comment-view-model .translate-button", "ytd-comment-view-model ytd-button-renderer#translate-button",
    "ytd-comment-view-model yt-formatted-string.translate-button",
  ));
  T("comments", "comments_hide_sort", "Hide comment count and sort menu", hide("ytd-comments-header-renderer #title", "ytd-comments-header-renderer #sort-menu"));

  // ---------------------------------------------------------------- PLAYER
  T("player", "player_hide_endscreen", "Hide suggestions at the end of a video", hide(
    ".ytp-endscreen-content", ".html5-endscreen", ".videowall-endscreen", ".ytp-fullscreen-grid", ".ytp-fullscreen-grid-stills-container",
  ), { recommended: true });
  T("player", "player_hide_cards", "Hide end cards and info cards", hide(".ytp-ce-element", ".ytp-cards-teaser", ".ytp-cards-button"), { recommended: true });
  T("player", "player_hide_pause_overlay", "Hide “More videos” when paused", hide(".ytp-pause-overlay", ".ytp-pause-overlay-container"));
  T("player", "player_hide_next_prev", "Hide next / previous buttons", hide(".ytp-next-button", ".ytp-prev-button"));
  T("player", "player_hide_autoplay_toggle", "Hide autoplay toggle", hide(".ytp-autonav-toggle-button-container", '.ytp-button[data-tooltip-target-id="ytp-autonav-toggle-button"]'));
  T("player", "player_hide_miniplayer", "Hide mini-player button", hide(".ytp-miniplayer-button"));
  T("player", "player_hide_theater_btn", "Hide theater-mode button", hide(".ytp-size-button"));
  T("player", "player_hide_captions_btn", "Hide captions button", hide(".ytp-subtitles-button"));
  T("player", "player_hide_settings_btn", "Hide settings button", hide(".ytp-settings-button"));
  T("player", "player_hide_fullscreen_btn", "Hide full-screen button", hide(".ytp-fullscreen-button"));
  T("player", "player_hide_volume", "Hide volume control", hide(".ytp-volume-area"));
  T("player", "player_hide_time", "Hide time display", hide(".ytp-time-display"));
  T("player", "player_hide_chapters_btn", "Hide chapter title", hide(".ytp-chapter-container"));
  T("player", "player_hide_heatmap", "Hide “most replayed” graph", hide(".ytp-heat-map-container"));
  T("player", "player_hide_watermark", "Hide channel watermark", hide(".iv-branding", ".ytp-watermark"));
  T("player", "player_hide_paid_promo", "Hide “includes paid promotion” label", hide(".ytp-paid-content-overlay"));
  T("player", "player_hide_gradients", "Hide dark gradient shadows", hide(".ytp-gradient-bottom", ".ytp-gradient-top"));
  T("player", "player_square", "Remove rounded corners on the player", rule(["#movie_player", "#ytd-player", "#ytd-player #container", ".html5-video-container video"], "border-radius:0!important"));

  // ---------------------------------------------------------------- SEARCH
  S("search", "search_sort", "Sort search results by", [
    ["relevance", "Relevance (YouTube default)"], ["date", "Upload date"], ["views", "View count"], ["rating", "Rating"],
  ], "relevance", { behavior: true });
  T("search", "search_hide_shorts", "Hide Shorts", hide(`ytd-search ytd-reel-shelf-renderer`, `ytd-search grid-shelf-view-model`, `ytd-search ytd-video-renderer:has(${SHORT_LINK})`));
  T("search", "search_hide_channels", "Hide channel results", hide("ytd-search ytd-channel-renderer"));
  T("search", "search_hide_playlists", "Hide playlists and mixes", hide("ytd-search ytd-playlist-renderer", "ytd-search ytd-radio-renderer", "ytd-search yt-lockup-view-model:has(yt-collection-thumbnail-view-model)"));
  T("search", "search_hide_shelves", "Hide “for you”, “people also watched” and similar shelves", hide("ytd-search ytd-shelf-renderer", "ytd-search ytd-horizontal-card-list-renderer"), { recommended: true });
  T("search", "search_hide_promoted", "Hide promoted results and products", hide("ytd-search ytd-ad-slot-renderer", "ytd-search ytd-search-pyv-renderer", "ytd-search ytd-promoted-sparkles-text-search-renderer", "ytd-search ytd-product-details-renderer"));
  T("search", "search_hide_watched", "Hide watched videos", hide(`ytd-search ytd-video-renderer:has(${WATCHED})`));
  T("search", "search_no_infinite", "Stop infinite scrolling of results", hide("ytd-search ytd-continuation-item-renderer"));
  T("search", "search_hide_filters", "Hide filter chips and filter button", hide("ytd-search-header-renderer", "ytd-search #chips-wrapper"));
  T("search", "search_hide_snippets", "Hide description snippets", hide("ytd-search .metadata-snippet-container", "ytd-search #description-text"));
  T("search", "search_hide_right_sidebar", "Hide right-hand side panel", hide("ytd-search #secondary"));

  // ---------------------------------------------------------- SUBSCRIPTIONS
  T("subs", "subs_hide_shorts", "Hide Shorts", hide(`${SUBS} ytd-rich-section-renderer:has([is-shorts])`, `${SUBS} ytd-rich-item-renderer:has(${SHORT_LINK})`));
  T("subs", "subs_hide_watched", "Hide watched videos", hide(`${SUBS} ytd-rich-item-renderer:has(${WATCHED})`));
  T("subs", "subs_hide_live", "Hide live streams", hide(
    `${SUBS} ytd-rich-item-renderer:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="LIVE"])`,
    `${SUBS} ytd-rich-item-renderer:has(.badge-style-type-live-now-alternate)`,
    `${SUBS} ytd-rich-item-renderer:has(badge-shape.yt-badge-shape--thumbnail-live)`,
  ));
  T("subs", "subs_hide_upcoming", "Hide upcoming premieres", hide(
    `${SUBS} ytd-rich-item-renderer:has(ytd-thumbnail-overlay-time-status-renderer[overlay-style="UPCOMING"])`,
  ));
  T("subs", "subs_no_infinite", "Stop infinite scrolling", hide(`${SUBS} ytd-continuation-item-renderer`));

  // --------------------------------------------------------------- CHANNEL
  T("channel", "channel_open_videos", "Open channels on the “Videos” tab", "", { behavior: true });
  T("channel", "channel_hide_banner", "Hide channel banner", hide(`${CHANNEL} #page-header-banner`, `${CHANNEL} yt-image-banner-view-model`, `${CHANNEL} #banner`));
  T("channel", "channel_grayscale_banner", "Grayscale channel banner", rule([`${CHANNEL} yt-image-banner-view-model img`, `${CHANNEL} #page-header-banner img`], "filter:grayscale(1)!important"));
  T("channel", "channel_hide_subscribe", "Hide subscribe / join buttons", hide(`${CHANNEL} #page-header yt-subscribe-button-view-model`, `${CHANNEL} #page-header ytd-subscribe-button-renderer`, `${CHANNEL} #page-header yt-flexible-actions-view-model`));
  T("channel", "channel_hide_counts", "Hide subscriber and video counts", hide(`${CHANNEL} #page-header yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row:last-child`));
  T("channel", "channel_hide_links", "Hide description and links", hide(`${CHANNEL} #page-header yt-description-preview-view-model`, `${CHANNEL} #page-header yt-attribution-view-model`));
  T("channel", "channel_hide_tab_home", "Hide “Home” tab", hide(channelTab("Home", "Startpagina")));
  T("channel", "channel_hide_tab_live", "Hide “Live” tab", hide(channelTab("Live", "Livestreams")));
  T("channel", "channel_hide_tab_podcasts", "Hide “Podcasts” tab", hide(channelTab("Podcasts")));
  T("channel", "channel_hide_tab_playlists", "Hide “Playlists” tab", hide(channelTab("Playlists", "Afspeellijsten")));
  T("channel", "channel_hide_tab_posts", "Hide “Posts / Community” tab", hide(channelTab("Posts", "Community", "Berichten", "Bijdragen")));
  T("channel", "channel_hide_tab_store", "Hide “Store” tab", hide(channelTab("Store", "Winkel")));
  T("channel", "channel_hide_tab_releases", "Hide “Releases” tab", hide(channelTab("Releases", "Uitgaven")));
  T("channel", "channel_hide_shelves", "Hide “For you” and featured-channel shelves", hide(
    `${CHANNEL} ytd-item-section-renderer:has(ytd-grid-channel-renderer)`, `${CHANNEL} ytd-item-section-renderer:has(ytd-channel-renderer)`,
  ));

  // --------------------------------------------------------------- SIDEBAR
  T("sidebar", "sidebar_hide_all", "Hide the whole sidebar", hide("tp-yt-app-drawer#guide", "ytd-mini-guide-renderer", "#guide-button") +
    rule("ytd-app", "--app-drawer-width:0px!important;--ytd-mini-guide-width:0px!important") +
    rule(["ytd-page-manager#page-manager", "ytd-app[mini-guide-visible] ytd-page-manager"], "margin-left:0!important"));
  T("sidebar", "sidebar_show_watch_later", "Show “Subscriptions” and “Watch later” as plain buttons with icons in the sidebar",
    rule(".hush-guide-wl", "display:flex;align-items:center;gap:24px;height:40px;padding:0 12px;margin:0;border-radius:10px;box-sizing:border-box;color:#0f0f0f!important;font:400 14px/20px Roboto,Arial,sans-serif;text-decoration:none;cursor:pointer") +
    rule("html[dark] .hush-guide-wl", "color:#f1f1f1!important") +
    rule(".hush-guide-wl:hover", "background:rgba(128,128,128,.22)") +
    rule(".hush-guide-wl svg", "width:24px;height:24px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round") +
    rule(".hush-guide-wl.mini", "flex-direction:column;justify-content:center;gap:6px;height:74px;padding:16px 0 14px;width:100%;font-size:10px;line-height:12px;text-align:center") +
    hide("html.hush-guide-wl-on ytd-guide-entry-renderer:has(a[href*=\"list=WL\"])", "html.hush-guide-wl-on ytd-mini-guide-entry-renderer:has(a[href*=\"list=WL\"])",
      "html.hush-guide-wl-on ytd-guide-renderer ytd-guide-entry-renderer:has(a[href^=\"/feed/subscriptions\"])"),
    { behavior: true });
  T("sidebar", "sidebar_hide_home", "Hide “Home” link", hide(guideLink('a[href="/"]')));
  T("sidebar", "sidebar_hide_subscriptions_link", "Hide “Subscriptions” link", hide(guideLink('a[href="/feed/subscriptions"]')));
  T("sidebar", "sidebar_hide_you", "Hide “You” link", hide(guideLink('a[href="/feed/you"]')));
  T("sidebar", "sidebar_hide_history", "Hide “History” link", hide(guideLink('a[href="/feed/history"]')));
  // Only the subscriptions section has entries that link to a channel AND show a real channel
  // avatar (loaded from YouTube's yt3 avatar servers). Every guide entry has a hidden image slot,
  // so matching "has an image" alone would hide the whole sidebar.
  const SUB_ENTRY = ['a[href^="/@"] img[src*="yt3."]', 'a[href^="/channel/"] img[src*="yt3."]'];
  // Hides the channel entries (names + avatars) and the "show more" expander; the section
  // header ("Subscriptions" / "Abonnementen", which links to all your subscriptions) stays.
  T("sidebar", "sidebar_hide_subscriptions", "Hide subscribed channels (keeps the Subscriptions header)", hide(
    ...SUB_ENTRY.map((e) => `${GUIDE} ytd-guide-entry-renderer:has(${e})`),
    ...SUB_ENTRY.map((e) => `${GUIDE} ytd-guide-section-renderer:has(${e}) ytd-guide-collapsible-entry-renderer`),
  ));
  T("sidebar", "sidebar_grayscale_avatars", "Grayscale channel avatars", rule(`${GUIDE} ytd-guide-entry-renderer img`, "filter:grayscale(1)!important"));
  T("sidebar", "sidebar_hide_dots", "Hide “new videos” dots and live icons", hide(`${GUIDE} #newness-dot`, `${GUIDE} ytd-guide-entry-renderer [line-end-style]`, `${GUIDE} .guide-entry-badge`));
  T("sidebar", "sidebar_hide_explore", "Hide “Explore” section", hide(
    `${GUIDE} ytd-guide-section-renderer:has(a[href^="/feed/trending"])`, `${GUIDE} ytd-guide-section-renderer:has(a[href="/gaming"])`,
    `${GUIDE} ytd-guide-section-renderer:has(a[href^="/feed/storefront"])`,
  ));
  T("sidebar", "sidebar_hide_more", "Hide “More from YouTube” section", hide(
    `${GUIDE} ytd-guide-section-renderer:has(a[href^="https://studio.youtube.com"])`, `${GUIDE} ytd-guide-section-renderer:has(a[href^="https://music.youtube.com"])`,
  ));
  T("sidebar", "sidebar_hide_report_history", "Hide “Report history” link (flag icon)", hide(guideLink('a[href="/reporthistory"]'), guideLink('a[href^="/reporthistory"]')));
  T("sidebar", "sidebar_hide_settings", "Hide settings / help section", hide(`${GUIDE} ytd-guide-section-renderer:has(a[href="/account"])`));
  T("sidebar", "sidebar_hide_footer", "Hide footer links", hide(`${GUIDE} #footer`));

  // ---------------------------------------------------------------- HEADER
  T("header", "header_hide_all", "Hide the whole header", hide("#masthead-container") +
    rule("ytd-app", "--ytd-masthead-height:0px!important") + rule(["ytd-page-manager#page-manager", "#guide-content"], "margin-top:0!important;padding-top:0!important"));
  T("header", "header_hide_bell", "Hide notifications bell", hide("ytd-notification-topbar-button-renderer"), { recommended: true });
  T("header", "header_hide_bell_count", "Hide notification count only", hide("ytd-notification-topbar-button-renderer .yt-spec-icon-badge-shape__badge", "ytd-notification-topbar-button-renderer #notification-count"));
  // Language-independent: the Create button is the masthead button that isn't Sign-in, the bell or your avatar.
  T("header", "header_hide_create", "Hide “Create” / upload button", hide(
    "ytd-masthead #buttons > ytd-button-renderer:not(:has(a[href*='ServiceLogin'])):not(:has(a[href*='accounts.google']))",
    "ytd-masthead #buttons > yt-button-view-model", "ytd-masthead #buttons > div > ytd-button-renderer:not(:has(a[href*='ServiceLogin']))",
    "ytd-masthead #buttons > ytd-topbar-menu-button-renderer:not(:has(#avatar-btn)):not(:has(img))",
    "ytd-masthead ytd-button-renderer:has(a[href*='upload'])",
  ));
  T("header", "header_hide_voice", "Hide voice search", hide("#voice-search-button"));
  T("header", "header_hide_search_suggestions", "Hide search suggestions and history", hide(
    ".ytSearchboxComponentSuggestionsContainer", ".sbdd_a", ".sbdd_b", ".gstl_50.sbdd_a", "ytd-searchbox-spt",
  ), { recommended: true });
  T("header", "header_hide_logo", "Hide YouTube logo", hide("ytd-masthead #logo", "ytd-masthead ytd-topbar-logo-renderer"));
  T("header", "header_grayscale_logo", "Grayscale logo", rule("ytd-masthead #logo", "filter:grayscale(1)!important"));
  T("header", "header_logo_no_link", "Make the logo unclickable", rule("ytd-masthead #logo a", "pointer-events:none!important"));
  T("header", "header_hide_country", "Hide country code next to logo", hide("ytd-masthead #country-code"));
  T("header", "header_hide_search", "Hide the search bar", hide("ytd-masthead #center"));

  // ----------------------------------------------------------------- CARDS
  T("cards", "cards_hide_thumbs", "Hide thumbnails", hide(
    "ytd-thumbnail", "yt-thumbnail-view-model", ".yt-lockup-view-model__content-image", "ytd-playlist-thumbnail",
  ));
  T("cards", "cards_blur_thumbs", "Blur thumbnails", rule(THUMB_IMG.split(", "), "filter:blur(10px)!important"));
  T("cards", "cards_grayscale_thumbs", "Grayscale thumbnails", rule(THUMB_IMG.split(", "), "filter:grayscale(1)!important"));
  S("cards", "cards_thumb_opacity", "Thumbnail transparency", [
    ["100", "Normal"], ...[75, 50, 25].map((n) => [String(n), `${n}% visible`, rule(THUMB_IMG.split(", "), `opacity:${n / 100}!important`)]),
  ], "100");
  T("cards", "cards_wl_button", "Add a small Watch Later button on thumbnails (top right)",
    rule(".hush-wl", "position:absolute;top:6px;right:6px;z-index:60;width:26px;height:26px;padding:0;margin:0;border:0;border-radius:6px;background:rgba(0,0,0,.72);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:.92") +
    rule(".hush-wl:hover", "background:rgba(0,0,0,.92);opacity:1") +
    rule(".hush-wl svg", "width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;pointer-events:none") +
    rule(".hush-wl .ok, .hush-wl .bad", "display:none") +
    rule(".hush-wl.done .clk, .hush-wl.fail .clk", "display:none") + rule(".hush-wl.done .ok", "display:block") + rule(".hush-wl.fail .bad", "display:block") +
    rule(".hush-wl.done", "background:#1f8f4e") + rule(".hush-wl.fail", "background:#b3261e") +
    rule("ytd-thumbnail, yt-thumbnail-view-model", "position:relative") +
    hide("ytd-thumbnail-overlay-toggle-button-renderer", "ytd-thumbnail-hover-overlay-toggle-actions-view-model", "yt-thumbnail-hover-overlay-toggle-actions-view-model"),
    { behavior: true });
  T("cards", "cards_wl_hover", "…and only show that button while hovering the thumbnail",
    rule(".hush-wl", "opacity:0;transition:opacity .12s") +
    rule("ytd-thumbnail:hover .hush-wl, yt-thumbnail-view-model:hover .hush-wl, .hush-wl:focus-visible, .hush-wl.done, .hush-wl.fail", "opacity:1"), { behavior: true });
  T("cards", "cards_hide_duration", "Hide video length", hide("ytd-thumbnail-overlay-time-status-renderer", "yt-thumbnail-overlay-badge-view-model", "yt-thumbnail-badge-view-model"));
  T("cards", "cards_hide_meta", "Hide views and upload date", hide(CARDS("#metadata-line"), "yt-content-metadata-view-model .yt-content-metadata-view-model__metadata-row:nth-child(n+2)"));
  T("cards", "cards_hide_avatar", "Hide channel avatars", hide(CARDS("#avatar-link"), CARDS("#channel-thumbnail"), ".yt-lockup-metadata-view-model__avatar"));
  T("cards", "cards_hide_channel", "Hide channel names", hide(CARDS("ytd-channel-name"), "yt-lockup-view-model .yt-content-metadata-view-model__metadata-row:first-child"));
  T("cards", "cards_hide_badges", "Hide badges (New, 4K, CC, Live)", hide(CARDS("ytd-badge-supported-renderer"), CARDS("#badges"), "yt-lockup-view-model badge-shape:not(.yt-badge-shape--thumbnail-default)"));
  T("cards", "cards_hide_menu", "Hide ⋮ menu buttons", hide(CARDS("ytd-menu-renderer"), ".yt-lockup-metadata-view-model__menu-button"));
  T("cards", "cards_full_title", "Show full titles (no “…”)", rule([CARDS("#video-title"), ".yt-lockup-metadata-view-model__title"], "-webkit-line-clamp:unset!important;max-height:none!important;line-clamp:unset!important"));
  S("cards", "cards_title_case", "Title capitalization", [
    ["none", "As written"],
    ["lower", "lowercase", rule([CARDS("#video-title"), ".yt-lockup-metadata-view-model__title", `${META} #title h1`], "text-transform:lowercase!important")],
    ["capitalize", "Capitalize Words", rule([CARDS("#video-title"), ".yt-lockup-metadata-view-model__title", `${META} #title h1`], "text-transform:capitalize!important")],
  ], "none");
  T("cards", "cards_square", "Remove rounded corners", rule(["ytd-thumbnail", "yt-thumbnail-view-model", THUMB_IMG], "border-radius:0!important"));

  // ------------------------------------------------------------------- YOU
  T("you", "you_hide_history", "Hide “History” shelf", hide('ytd-browse[page-subtype="you"] ytd-rich-section-renderer:has(a[href="/feed/history"])', 'ytd-browse[page-subtype="you"] ytd-shelf-renderer:has(a[href="/feed/history"])'));
  T("you", "you_hide_playlists", "Hide “Playlists” shelf", hide('ytd-browse[page-subtype="you"] ytd-rich-section-renderer:has(a[href="/feed/playlists"])', 'ytd-browse[page-subtype="you"] ytd-shelf-renderer:has(a[href="/feed/playlists"])'));
  T("you", "you_hide_watch_later", "Hide “Watch later” shelf", hide('ytd-browse[page-subtype="you"] ytd-rich-section-renderer:has(a[href*="list=WL"])', 'ytd-browse[page-subtype="you"] ytd-shelf-renderer:has(a[href*="list=WL"])'));
  T("you", "you_hide_liked", "Hide “Liked videos” shelf", hide('ytd-browse[page-subtype="you"] ytd-rich-section-renderer:has(a[href*="list=LL"])', 'ytd-browse[page-subtype="you"] ytd-shelf-renderer:has(a[href*="list=LL"])'));
  T("you", "you_hide_account", "Hide account header", hide('ytd-browse[page-subtype="you"] yt-page-header-renderer', 'ytd-browse[page-subtype="you"] #page-header'));

  // ----------------------------------------------------------------- EMBED
  const EMB = "body.sw-embed";
  T("embed", "embed_hide_endscreen", "Hide suggestions at the end", hide(`${EMB} .ytp-endscreen-content`, `${EMB} .html5-endscreen`, `${EMB} .videowall-endscreen`));
  T("embed", "embed_hide_pause_overlay", "Hide “More videos” when paused", hide(`${EMB} .ytp-pause-overlay`, `${EMB} .ytp-pause-overlay-container`));
  T("embed", "embed_hide_title", "Hide title and channel bar", hide(`${EMB} .ytp-chrome-top`, `${EMB} .ytp-title`));
  T("embed", "embed_hide_yt_button", "Hide “Watch on YouTube” / logo button", hide(`${EMB} .ytp-youtube-button`, `${EMB} .ytp-watermark`, `${EMB} .ytp-impression-link`));
  T("embed", "embed_hide_share", "Hide share and “more” buttons", hide(`${EMB} .ytp-share-button`, `${EMB} .ytp-overflow-button`, `${EMB} .ytp-button.ytp-copylink-button`));

  // ------------------------------------------------------------ APPEARANCE
  C("look", "look_accent", "Progress-bar accent color", "#ff0033",
    rule([".ytp-play-progress", ".ytp-swatch-background-color", ".ytp-volume-slider-handle", ".ytp-volume-slider-handle::before", "ytd-thumbnail-overlay-resume-playback-renderer #progress", ".ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment"], "background:{v}!important"));
  // Fonts: bundled inside Hush (open-licence, no downloads). Applied to all of YouTube's text,
  // except the video player and icons. {url:file} is filled in at runtime with the extension URL.
  SW.FONTS = [
    { id: "default", label: "YouTube default", family: "", note: "YouTube’s own font" },
    { id: "system", label: "System", family: "system-ui, -apple-system, 'Segoe UI', sans-serif", note: "Your computer’s interface font" },
    { id: "inter", label: "Inter", family: "'Hush Inter'", files: [["inter.woff2", "100 900"]], note: "Clean and neutral" },
    { id: "atkinson", label: "Atkinson Hyperlegible", family: "'Hush Atkinson'", files: [["atkinson-400.woff2", "400"], ["atkinson-700.woff2", "700"]], note: "Designed for easy reading" },
    { id: "lexend", label: "Lexend", family: "'Hush Lexend'", files: [["lexend.woff2", "100 900"]], note: "Wide and relaxed" },
    { id: "nunito", label: "Nunito", family: "'Hush Nunito'", files: [["nunito.woff2", "200 1000"]], note: "Soft and rounded" },
    { id: "outfit", label: "Outfit", family: "'Hush Outfit'", files: [["outfit.woff2", "100 900"]], note: "Modern and geometric" },
    { id: "literata", label: "Literata", family: "'Hush Literata'", files: [["literata.woff2", "200 900"]], note: "Book-style serif" },
    { id: "lora", label: "Lora", family: "'Hush Lora'", files: [["lora.woff2", "400 700"]], note: "Elegant serif" },
    { id: "serif", label: "Georgia", family: "Georgia, 'Times New Roman', serif", note: "Classic serif" },
    { id: "jetbrains", label: "JetBrains Mono", family: "'Hush JetBrains Mono'", files: [["jetbrains-mono.woff2", "100 800"]], note: "Monospace" },
  ];
  const fontCss = (f) => {
    if (!f.family) return "";
    const faces = (f.files || []).map(([file, weight]) =>
      `@font-face{font-family:${f.family.split(",")[0]};src:url("{url:${file}}") format("woff2");font-weight:${weight};font-style:normal;font-display:swap}`).join("");
    const stack = `${f.family}, system-ui, sans-serif`;
    return faces + rule(["html", "body", "ytd-app"], `--ytd-font-family:${stack}!important;--yt-font-family:${stack}!important`) +
      rule("ytd-app *:not(.html5-video-player, .html5-video-player *, yt-icon, yt-icon *, svg, svg *)", `font-family:${stack}!important`);
  };
  S("look", "look_font", "Font", SW.FONTS.map((f) => [f.id, f.label, fontCss(f)]), "default");
  T("look", "look_hide_like_animation", "Disable like-button animation", hide("like-button-view-model lottie-player", "#like-button lottie-player"));

  SW.OPTIONS = O;
  SW.OPTION_INDEX = Object.fromEntries(O.map((o) => [o.id, o]));

  /** Build the stylesheet for a config. Pure function, easy to test. */
  SW.buildCss = (cfg) => {
    if (!cfg.enabled) return "";
    const parts = ["[data-sw-hidden]{display:none!important}"];
    for (const o of O) {
      const v = SW.opt(cfg, o.id);
      if (o.type === "toggle" && v && o.css) parts.push(o.css);
      else if (o.type === "select") {
        const choice = o.choices.find((c) => c[0] === v);
        if (choice && choice[2]) parts.push(choice[2].replace(/\{url:([\w.-]+)\}/g, (_, f) => SW.fontUrl(f)));
      } else if (o.type === "color" && v && v.toLowerCase() !== o.def.toLowerCase() && /^#[0-9a-f]{6}$/i.test(v)) {
        parts.push(o.cssTemplate.replaceAll("{v}", v));
      }
    }
    return parts.join("\n");
  };
})();
