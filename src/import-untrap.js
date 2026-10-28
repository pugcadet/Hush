/*
 * Hush for YouTube — import settings from an UnTrap for YouTube export.
 *
 * UnTrap's Import/Export screen produces a text code: base64-encoded JSON, a list
 * of sections like { id: "untrap_options_state", value: { <optionId>: <value> } }.
 * This file only reads that data and translates it; nothing from it is executed.
 * Every result still goes through SW.sanitizeConfig before it is saved.
 */
(() => {
  "use strict";
  const SW = (globalThis.SW = globalThis.SW || {});

  // Hush option  <-  UnTrap option(s). If any listed UnTrap option is on, the Hush option is on.
  const TOGGLES = {
    hide_all_shorts: ["untrap_global_hide_all_shorts"],
    hide_ads: ["untrap_global_hide_all_ads", "untrap_home_hide_ads_first_slot", "untrap_video_page_hide_suggestions_ads"],
    skip_ads: ["untrap_global_skip_video_ads"],
    hide_popups: ["untrap_global_hide_pop_ups"],
    disable_autoplay: ["untrap_global_disable_video_autoplay", "untrap_video_page_disable_autoplay"],
    disable_hover_preview: ["untrap_video_card_disable_play_on_hover"],
    hide_view_counts: ["untrap_metrics_hide_views"],

    home_hide_feed: ["untrap_home_hide_suggestions"],
    home_hide_chips: ["untrap_home_hide_header_with_categories"],
    home_hide_shorts_shelf: ["untrap_home_hide_shorts_row", "untrap_home_hide_shorts_trending_etc"],
    home_hide_sections: ["untrap_home_hide_trending_etc", "untrap_home_hide_shorts_trending_etc"],
    home_hide_mixes: ["untrap_home_hide_suggestion_mixes"],
    home_hide_watched: ["untrap_home_hide_watched_videos"],
    home_no_infinite: ["untrap_home_disable_infinity_scroll"],
    home_hide_banners: ["untrap_home_hide_banners_ads_with_close"],

    shorts_redirect: ["untrap_redirect_shorts_to_exclude_player"],
    shorts_no_scroll: ["untrap_shorts_page_disable_exclude_scrolling"],
    shorts_hide_comments_btn: ["untrap_shorts_page_hide_comments_exclude_button"],
    shorts_hide_like_btns: ["untrap_shorts_page_hide_like_exclude_button", "untrap_shorts_page_hide_dislike_exclude_button"],
    shorts_hide_share_btn: ["untrap_shorts_page_hide_share_exclude_button"],
    shorts_hide_channel: ["untrap_shorts_page_hide_channel_exclude_avatar", "untrap_shorts_page_hide_channel_user_exclude_name", "untrap_shorts_page_hide_subscribe_exclude_button"],
    shorts_hide_description: ["untrap_shorts_page_hide_exclude_description"],
    shorts_hide_sound: ["untrap_shorts_page_hide_sound_exclude_button"],

    watch_hide_related: ["untrap_video_page_hide_related_videos"],
    watch_related_no_infinite: ["untrap_video_page_sidebar_disable_infinite_scrolling"],
    watch_hide_related_chips: ["untrap_video_page_hide_related_categories"],
    watch_hide_related_playlists: ["untrap_video_page_hide_related_playlists"],
    watch_hide_related_watched: ["untrap_video_page_hide_related_watched_videos"],
    watch_hide_live_chat: ["untrap_video_page_hide_live_chat"],
    watch_hide_playlist_panel: ["untrap_video_page_hide_playlist_panel"],
    watch_hide_title: ["untrap_video_page_hide_video_title"],
    watch_hide_description: ["untrap_video_page_hide_description"],
    watch_hide_views_date: ["untrap_video_page_hide_video_views_and_published"],
    watch_hide_hashtags: ["untrap_video_page_hide_video_description_hashtags"],
    watch_hide_actions: ["untrap_video_page_hide_all_buttons_under_player"],
    watch_hide_like: ["untrap_video_page_hide_button_like_dislike"],
    watch_hide_subscribe: ["untrap_video_page_hide_button_subscribe", "untrap_video_page_hide_button_join"],
    watch_hide_owner_avatar: ["untrap_video_page_hide_creator_avatar"],
    watch_hide_sub_count: ["untrap_video_page_hide_creator_subscribers_counter"],
    watch_hide_merch: ["untrap_video_page_hide_merch_shelf"],
    watch_hide_fundraiser: ["untrap_video_page_hide_fundraiser"],
    watch_hide_info_panels: ["untrap_video_page_hide_metadata_row"],
    watch_hide_desc_shorts: ["untrap_video_page_hide_shorts_in_description"],
    watch_auto_theater: ["untrap_video_page_auto_theater_mode"],
    watch_auto_expand_desc: ["untrap_video_page_auto_expand_description"],
    watch_grayscale_video: ["untrap_video_page_grayscale_video_player"],
    watch_center: ["untrap_video_page_center_content"],

    comments_hide: ["untrap_video_page_hide_comments"],
    comments_hide_teaser: ["untrap_video_page_hide_comment_teaser"],
    comments_hide_avatars: ["untrap_video_page_hide_comments_profile_pictures"],
    comments_hide_replies: ["untrap_video_page_hide_comments_replies"],
    comments_hide_likes: ["untrap_video_page_hide_comment_action_buttons"],
    comments_hide_box: ["untrap_video_page_hide_comment_add_textfield"],
    comments_hide_sort: ["untrap_video_page_hide_comments_sort_button"],

    player_hide_endscreen: ["untrap_video_player_hide_end_screen_suggestions"],
    player_hide_cards: ["untrap_video_player_hide_end_screen_infos"],
    player_hide_next_prev: ["untrap_video_player_hide_play_next_button", "untrap_video_player_hide_play_previous_button"],
    player_hide_autoplay_toggle: ["untrap_video_player_hide_autoplay_button"],
    player_hide_miniplayer: ["untrap_video_player_hide_miniplayer_button"],
    player_hide_theater_btn: ["untrap_video_player_hide_theater_mode_button"],
    player_hide_captions_btn: ["untrap_video_player_hide_subtitles_button"],
    player_hide_settings_btn: ["untrap_video_player_hide_settings_button"],
    player_hide_fullscreen_btn: ["untrap_video_player_hide_full_screen_button"],
    player_hide_volume: ["untrap_video_player_hide_volume_button"],
    player_hide_time: ["untrap_video_player_hide_video_time"],
    player_hide_chapters_btn: ["untrap_video_player_hide_chapters_button"],
    player_hide_heatmap: ["untrap_video_player_hide_most_replayed_on_hover"],
    player_hide_watermark: ["untrap_video_player_hide_video_watermark"],
    player_hide_paid_promo: ["untrap_video_page_hide_includes_paid_promotion"],
    player_hide_gradients: ["untrap_video_player_hide_shadow_around_player_bar"],
    player_square: ["untrap_video_player_remove_corner_radius"],

    search_hide_shorts: ["untrap_search_hide_results_shorts"],
    search_hide_channels: ["untrap_search_hide_results_channels"],
    search_hide_playlists: ["untrap_search_hide_results_playlists", "untrap_search_hide_results_mixes"],
    search_hide_shelves: ["untrap_search_hide_results_for_you", "untrap_search_hide_results_people_also_search"],
    search_hide_promoted: ["untrap_search_hide_ads_promoted_videos", "untrap_search_hide_ads_promoted_websites", "untrap_search_hide_ads_suggested_products"],
    search_hide_watched: ["untrap_search_hide_watched_videos"],
    search_no_infinite: ["untrap_search_page_disable_infinite_scrolling"],
    search_hide_filters: ["untrap_search_page_hide_filters", "untrap_search_page_hide_search_categories"],
    search_hide_snippets: ["untrap_hide_video_card_description"],
    search_hide_right_sidebar: ["untrap_search_page_hide_right_sidebar"],

    subs_hide_shorts: ["untrap_subscriptions_hide_shorts"],
    subs_hide_watched: ["untrap_subscriptions_hide_watched_videos"],
    subs_hide_live: ["untrap_subscriptions_hide_live_videos"],
    subs_hide_upcoming: ["untrap_subscriptions_hide_upcoming_videos"],

    channel_hide_banner: ["untrap_channel_hide_channel_banner"],
    channel_grayscale_banner: ["untrap_channel_grayscale_channel_banner"],
    channel_hide_subscribe: ["untrap_channel_hide_button_subscribe", "untrap_channel_hide_button_join"],
    channel_hide_counts: ["untrap_channel_hide_channel_subscribers_counter", "untrap_channel_hide_channel_videos_counter"],
    channel_hide_links: ["untrap_channel_hide_links", "untrap_channel_hide_tagline"],
    channel_hide_tab_home: ["untrap_channel_hide_channel_menu_button_home"],
    channel_hide_tab_live: ["untrap_channel_hide_channel_menu_button_live"],
    channel_hide_tab_podcasts: ["untrap_channel_hide_channel_menu_button_podcasts"],
    channel_hide_tab_playlists: ["untrap_channel_hide_channel_menu_button_playlists"],
    channel_hide_tab_posts: ["untrap_channel_hide_channel_menu_button_community"],
    channel_hide_tab_store: ["untrap_channel_hide_channel_menu_button_store"],
    channel_hide_tab_releases: ["untrap_channel_hide_channel_menu_button_releases"],
    channel_hide_shelves: ["untrap_channel_hide_home_tab_section_featured_channels", "untrap_channel_hide_home_tab_section_for_you"],

    sidebar_hide_all: ["untrap_sidebar_hide_entire_sidebar"],
    sidebar_hide_home: ["untrap_sidebar_hide_button_home"],
    sidebar_hide_subscriptions_link: ["untrap_sidebar_hide_button_subscriptions"],
    sidebar_hide_you: ["untrap_sidebar_hide_button_you"],
    sidebar_hide_history: ["untrap_sidebar_hide_button_history"],
    sidebar_hide_subscriptions: ["untrap_sidebar_hide_section_subscriptions"],
    sidebar_grayscale_avatars: ["untrap_sidebar_grayscale_subscriptions_icons"],
    sidebar_hide_dots: ["untrap_sidebar_hide_subscriptionns_notifications_dots", "untrap_sidebar_hide_subscriptionns_live_icon"],
    sidebar_hide_explore: ["untrap_sidebar_hide_section_explore"],
    sidebar_hide_more: ["untrap_sidebar_hide_section_more_from_youtube"],
    sidebar_hide_report_history: ["untrap_sidebar_helper_buttons_hide_report_history_button"],
    sidebar_hide_settings: ["untrap_sidebar_hide_section_helper_buttons"],
    sidebar_hide_footer: ["untrap_sidebar_hide_section_footer"],

    header_hide_all: ["untrap_header_hide_top_header"],
    header_hide_bell: ["untrap_header_hide_notifications_bell"],
    header_hide_bell_count: ["untrap_header_hide_notifications_counter"],
    header_hide_create: ["untrap_header_hide_create_button", "untrap_header_hide_upload_button"],
    header_hide_voice: ["untrap_header_hide_voice_search_button"],
    header_hide_search_suggestions: ["untrap_search_bar_hide_suggestions", "untrap_search_bar_hide_previous_searches"],
    header_hide_logo: ["untrap_header_hide_logo"],
    header_grayscale_logo: ["untrap_header_grayscale_logo"],
    header_logo_no_link: ["untrap_header_disable_logo_link"],
    header_hide_country: ["untrap_header_hide_logo_country_code"],
    header_hide_search: ["untrap_header_hide_search_bar"],

    cards_hide_thumbs: ["untrap_video_card_hide_thumbnail"],
    cards_blur_thumbs: ["untrap_video_card_blur_thumbnail"],
    cards_grayscale_thumbs: ["untrap_video_card_grayscale_thumbnail"],
    cards_hide_duration: ["untrap_video_card_hide_video_duration"],
    cards_hide_meta: ["untrap_metrics_hide_time_since_video_published"],
    cards_hide_avatar: ["untrap_hide_video_card_hide_author_avatar"],
    cards_hide_channel: ["untrap_hide_video_card_author_name"],
    cards_hide_badges: ["untrap_hide_video_card_badges", "untrap_hide_video_card_live_badges"],
    cards_hide_menu: ["untrap_video_card_hide_menu_button"],
    cards_full_title: ["untrap_video_card_display_full_title"],
    cards_square: ["untrap_video_card_remove_corner_radius"],

    you_hide_history: ["untrap_you_page_hide_section_history"],
    you_hide_playlists: ["untrap_you_page_hide_section_playlists"],
    you_hide_watch_later: ["untrap_you_page_hide_section_watch_later"],
    you_hide_liked: ["untrap_you_page_hide_section_liked_videos"],
    you_hide_account: ["untrap_you_page_hide_my_info"],

    embed_hide_endscreen: ["untrap_embed_hide_end_screen_suggestions"],
    embed_hide_pause_overlay: ["untrap_embed_player_hide_pause_recommenndations"],
    embed_hide_title: ["untrap_embed_player_hide_video_title"],
    embed_hide_yt_button: ["untrap_embed_player_hide_watch_on_youtube_button", "untrap_embed_player_hide_button_youtube", "untrap_embed_player_hide_video_watermark"],
    embed_hide_share: ["untrap_embed_hide_button_share"],

    look_hide_like_animation: ["untrap_video_page_disable_like_animation"],
  };

  // Hush select  <-  UnTrap option, with value translation.
  const SELECTS = {
    redirect_home: ["untrap_redirect_home_to", { home: "none", subscriptions: "subscriptions", watch_later: "watchlater", history: "history", library: "you" }],
    search_sort: ["untrap_search_page_sort_by", { relevance: "relevance", uploadDate: "date", viewCount: "views", rating: "rating" }],
    cards_title_case: ["untrap_video_card_title_case", { default: "none", lowerCase: "lower", capitalize: "capitalize" }],
    video_quality: ["untrap_global_video_quality", {
      auto: "auto", highres: "hd2160", hd2880: "hd2160", hd2160: "hd2160", hd1440: "hd1440", hd1080: "hd1080",
      hd720: "hd720", large: "large", medium: "medium", small: "small", tiny: "small",
    }],
  };

  // String values that mean "not changed" in UnTrap (so they aren't reported as lost settings).
  const UNTRAP_DEFAULT_STRINGS = new Set(["default", "auto", "home", "relevance", "0", "hqdefault"]);

  const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  const MAX_INPUT = 2_000_000;

  /** Turn pasted text (base64 code or raw JSON) into UnTrap's list of sections. */
  const decode = (text) => {
    if (typeof text !== "string") throw new Error("not text");
    const raw = text.trim();
    if (!raw || raw.length > MAX_INPUT) throw new Error("empty or too large");
    let json = raw;
    if (!/^[[{]/.test(raw)) {
      const bin = atob(raw.replace(/\s+/g, ""));
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    if (isObj(parsed) && parsed.format === "untrap-settings" && Array.isArray(parsed.entries)) return parsed.entries;
    throw new Error("not an UnTrap export");
  };

  /**
   * Read an UnTrap export and return { opts, enabled, filter, report }.
   * Throws if the text is not an UnTrap export.
   */
  SW.importUntrap = (text) => {
    const sections = decode(text);
    let options = null;
    const pageStates = [];
    for (const s of sections) {
      if (!isObj(s) || typeof s.id !== "string" || !isObj(s.value)) continue;
      if (s.id === "untrap_options_state") options = s.value;
      else if (s.id === "untrap_system_config" && isObj(s.value.untrap_youtube_page_state)) pageStates.push(s.value.untrap_youtube_page_state);
      else if (s.id === "untrap_youtube_page_state") pageStates.push(s.value);
    }
    if (!options && !pageStates.length) throw new Error("no UnTrap settings found");
    options = options || {};

    const opts = {};
    const report = { mapped: 0, untrapOn: 0, notCarried: [], filters: { channels: 0, keywords: 0, regex: 0, skipped: [] } };
    const used = new Set();

    for (const [hushId, sources] of Object.entries(TOGGLES)) {
      const present = sources.filter((k) => typeof options[k] === "boolean");
      if (!present.length) continue;
      present.forEach((k) => used.add(k));
      opts[hushId] = present.some((k) => options[k] === true);
      report.mapped++;
    }
    for (const [hushId, [src, table]] of Object.entries(SELECTS)) {
      if (!(src in options)) continue;
      used.add(src);
      const v = table[String(options[src])];
      if (v !== undefined) { opts[hushId] = v; report.mapped++; }
      else report.notCarried.push(src);
    }
    if ("untrap_redirect_channel_to" in options) {
      used.add("untrap_redirect_channel_to");
      opts.channel_open_videos = options.untrap_redirect_channel_to === "videos";
      report.mapped++;
    }
    if ("untrap_home_suggestions_columns_count" in options) {
      used.add("untrap_home_suggestions_columns_count");
      const n = Number(options.untrap_home_suggestions_columns_count);
      opts.home_columns = Number.isFinite(n) ? String(Math.min(6, Math.max(2, n))) : "default";
      report.mapped++;
    }
    if ("untrap_video_card_opacity_thumbnail" in options) {
      used.add("untrap_video_card_opacity_thumbnail");
      const n = Number(options.untrap_video_card_opacity_thumbnail) || 0;
      opts.cards_thumb_opacity = n <= 0 ? "100" : n <= 3 ? "75" : n <= 6 ? "50" : "25";
      report.mapped++;
    }
    const color = options.untrap_appearance_color;
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) { opts.look_accent = color; used.add("untrap_appearance_color"); report.mapped++; }

    // Options that were switched on in UnTrap but have no Hush equivalent.
    for (const [k, v] of Object.entries(options)) {
      if (v === true || (typeof v === "string" && !UNTRAP_DEFAULT_STRINGS.has(v))) {
        if (k.startsWith("untrap_global_enable") || k === "untrap_global_get_testers_release") continue;
        report.untrapOn++;
        if (!used.has(k)) report.notCarried.push(k);
      }
    }

    const enabled = typeof options.untrap_global_enable === "boolean" ? options.untrap_global_enable : undefined;

    // Content-filter rules. UnTrap writes a regex as /pattern/flags.
    const filter = { channels: [], keywords: [], regex: [] };
    const asRegex = (rule) => {
      const m = rule.match(/^\/(.+)\/([a-z]*)$/);
      return m ? m[1] : null;
    };
    const strings = (key) => pageStates.flatMap((p) => (Array.isArray(p[key]) ? p[key].filter((r) => typeof r === "string") : []));
    for (const rule of strings("untrap_filterChannelsRulesData3")) {
      const r = rule.trim();
      if (!r) continue;
      if (asRegex(r) !== null) { report.filters.skipped.push(r); continue; }
      const url = r.match(/(?:youtube\.com)?\/(@[^/?#\s]+)/i);
      if (url) { filter.channels.push(decodeURIComponent(url[1])); continue; }
      if (/^UC[\w-]{10,}$/.test(r) || /\/channel\//i.test(r)) { report.filters.skipped.push(r); continue; }
      filter.channels.push(r);
    }
    for (const rule of [...strings("untrap_videosFilterRulesData3"), ...strings("untrap_filterCommentsRulesData3")]) {
      const r = rule.trim();
      if (!r) continue;
      const re = asRegex(r);
      if (re !== null) {
        if (SW.safeRegex(re)) filter.regex.push(re);
        else report.filters.skipped.push(r);
      } else filter.keywords.push(r);
    }
    const uniq = (a) => [...new Set(a)];
    filter.channels = uniq(filter.channels);
    filter.keywords = uniq(filter.keywords);
    filter.regex = uniq(filter.regex);
    report.filters.channels = filter.channels.length;
    report.filters.keywords = filter.keywords.length;
    report.filters.regex = filter.regex.length;
    report.notCarried = uniq(report.notCarried);

    return { opts, enabled, filter, report };
  };

  /** Apply an import result onto a Hush config (returns a new, sanitized config). */
  SW.applyUntrapImport = (cfg, result) => {
    const next = JSON.parse(JSON.stringify(cfg));
    Object.assign(next.opts, result.opts);
    if (result.enabled !== undefined) next.enabled = result.enabled;
    next.filter.channels = [...new Set([...next.filter.channels, ...result.filter.channels])];
    next.filter.keywords = [...new Set([...next.filter.keywords, ...result.filter.keywords])];
    next.filter.regex = [...new Set([...next.filter.regex, ...result.filter.regex])];
    return SW.sanitizeConfig(next);
  };
})();
