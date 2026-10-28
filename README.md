# Hush for YouTube

A quieter, distraction-free YouTube for Chrome and Brave. It's fast and 100% local: no accounts, no servers, and no network code.

It was designed using UnTrap's feature list as a spec (see `UNTRAP-FEATURES.md`). All code is written from scratch, and none of it comes from UnTrap.

## Install (Chrome or Brave)

1. Unzip this folder somewhere permanent, such as `Documents/hush`. Don't delete the folder afterwards, because the browser loads the extension from it.
2. Open `chrome://extensions` (or `brave://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the `hush` folder (the one containing `manifest.json`).
5. Pin the extension from the puzzle-piece menu. The settings page opens on first install.

Chrome may show a "developer mode extensions" notice at startup. That's normal for extensions you load yourself.

If you have UnTrap or Stillwater installed, turn them off. Two extensions editing the same page can conflict.

## Features

**163 page options in 15 groups.** Each can be switched on or off, and the groups mirror UnTrap's layout:

- **Everywhere:** hide all Shorts, ads, promo pop-ups and hover previews; turn off autoplay; set a preferred video quality; grayscale mode; hide watched videos.
- **Home page:** hide the feed, chips, Shorts shelf, extra shelves, mixes, watched videos and banners; stop infinite scroll; set videos per row; redirect home to Subscriptions, You, History or Watch Later.
- **Shorts:** open Shorts in the normal player, disable swiping to the next one, and hide the Shorts buttons.
- **Video page and comments:** hide related videos (or only playlists, watched or chips), live chat, description, buttons, merch and info panels; auto theater mode; auto-expand the description; hide comments or parts of them.
- **Player:** hide end-screen suggestions, cards, the pause overlay and individual controls.
- **Search:** sort by date, views or rating; hide Shorts, channels, playlists, shelves, promoted results, watched videos and filters; stop infinite scroll.
- **Subscriptions, channels, sidebar, header, video cards, You page, embeds and appearance.**

**Settings, grouped by where you are:** *General* (everywhere, appearance, content filter), *Finding videos* (home, subscriptions, search, channel pages, Shorts, You), *Watching* (video page, player, comments, embeds), *Around the page* (header, sidebar, video cards), and *Hush* itself (presets, protection, backup & import, about).

**Hush TV is now YTV.** Watching YouTube like TV moved into its own extension, **YTV**, so Hush stays about YouTube's own pages. Install YTV next to Hush and your TV channels and settings come along by themselves on your next YouTube visit (Hush keeps a copy of them when it updates). The two work together: Hush leaves YTV's pages alone while it plays.

- **Sidebar and thumbnails:** optional Subscriptions and Watch later links under Home in the left sidebar, and a thumbnail Watch Later button (optionally only on hover).

**Quick menu (toolbar):** layout controls (videos per row, theater view, font), and any options you pin with the pin button next to them in settings (up to 12).

**Also:** content filter (channels, @handles, keywords, patterns), presets, settings password, 11 bundled fonts with previews, a live preview of every option, import from UnTrap, and a backup file to move settings to another PC.

## Not included, and why

- **AI video summaries:** these need an online AI service, which conflicts with local-only.
- **Accounts and cloud sync:** left out on purpose; use Export and Import to move settings instead.
- **Scheduled preset switching and the "native player" option:** not built yet.
- **Bypass prevention:** no extension can stop itself from being disabled or removed. Protection here is a speed bump against impulses, not a lock.

## Security and privacy

- **Permissions:** only `storage`, and only on `youtube.com`, `m.youtube.com` and `youtube-nocookie.com`. It can't see any other website.
- **No outside network access.** Hush only ever talks to youtube.com, through two functions in `src/yt-data.js`: one reads YouTube pages, and one calls YouTube's own web API on exactly two endpoints (`next` for comments, `browse/edit_playlist` to add or remove Watch Later videos). Both refuse any other address. The audit checks that these are the only requests in the code, and the settings page's security policy allows connections to youtube.com only.
- **Account changes only when you ask.** The only thing that changes your YouTube account is the optional thumbnail Watch Later button (you click it).
- **No remote or dynamic code:** no `eval`, no `innerHTML`, and no scripts or fonts from the internet.
- **No message listeners,** so websites and other extensions can't talk to it.
- **The gate page only ever sends you back to YouTube.** It blocks open redirects.
- **No auto-updates.** Nothing changes unless you replace the files yourself.

### Verify it yourself

```
python3 verify.py          # static audit + SHA-256 of every file
node tests/unit.test.js    # logic tests (needs Node.js)
```

`verify.py` checks the manifest, scans every file for network APIs, dynamic code, raw HTML injection and external URLs and prints a SHA-256 hash for each file. Save that output, and you can later confirm that nothing in the folder has changed.

## Good to know

- **YouTube changes its page markup from time to time.** If an option stops working, the selector to update is in `src/options-data.js`, where every option is a single line of data.
- **Some channel-tab and "Create" button options match YouTube's English labels,** so they may not work in other interface languages.
- **The design targets desktop Chrome and Brave (version 111 or later).** Firefox isn't supported.
