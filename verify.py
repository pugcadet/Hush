#!/usr/bin/env python3
"""
Hush self-audit. Run:  python3 verify.py
Checks the extension folder for anything that could send data out, run remote
or dynamic code, or reach beyond YouTube. Prints PASS/FAIL per check and a
SHA-256 list of every file so you can confirm nothing changed later.
"""
import hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
fails = 0

def check(name, ok, detail=""):
    global fails
    print(("PASS " if ok else "FAIL ") + name + (f"  -> {detail}" if detail and not ok else ""))
    if not ok:
        fails += 1

files = []
for d, _, fs in os.walk(ROOT):
    if "/tests" in d or "/.git" in d:
        continue
    for f in fs:
        files.append(os.path.relpath(os.path.join(d, f), ROOT))
files.sort()
code = {f: open(os.path.join(ROOT, f), encoding="utf-8").read() for f in files if f.endswith((".js", ".html", ".css", ".json"))}
js = {f: c for f, c in code.items() if f.endswith(".js")}

# 1. Manifest
m = json.loads(code["manifest.json"])
check("manifest: only the 'storage' permission", m.get("permissions") == ["storage"], m.get("permissions"))
hosts = m.get("host_permissions", [])
check("manifest: host access limited to YouTube", all(re.fullmatch(r"https://(www\.|m\.)?youtube(-nocookie)?\.com/\*", h) for h in hosts), hosts)
for cs in m.get("content_scripts", []):
    check(f"manifest: content script {cs['js']} runs only on YouTube", all(re.fullmatch(r"https://(www\.|m\.)?youtube(-nocookie)?\.com/\*", u) for u in cs["matches"]))
check("manifest: no optional permissions", "optional_permissions" not in m and "optional_host_permissions" not in m)
check("manifest: not reachable by other sites/extensions (no externally_connectable)", "externally_connectable" not in m)
check("manifest: no auto-update URL (nothing is downloaded later)", "update_url" not in m)
csp = m.get("content_security_policy", {}).get("extension_pages", "")
check("manifest: settings/toolbar pages may only connect to youtube.com", re.search(r"connect-src https://www\.youtube\.com(;|$)", csp) is not None, csp)
check("manifest: images only from Hush itself and YouTube's avatar servers", re.search(r"img-src 'self' blob: data: https://yt3\.ggpht\.com https://yt3\.googleusercontent\.com(;|$)", csp) is not None, csp)
check("manifest: CSP only allows the extension's own fonts", "font-src 'self'" in csp, csp)
check("manifest: CSP only allows the extension's own scripts", re.search(r"script-src 'self'(;|$)", csp) is not None, csp)

# Bundled font must be local and licensed
check("font is bundled locally with its open licence", os.path.exists(os.path.join(ROOT, "fonts/hanken-grotesk.woff2")) and os.path.exists(os.path.join(ROOT, "fonts/OFL-LICENSE.txt")))

# 2. Network APIs
NET = re.compile(r"\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|RTCPeerConnection|WebTransport)\b|navigator\.connection|chrome\.(identity|cookies|webRequest|declarativeNetRequest|downloads|history|tabs\.executeScript)")
# Hush TV may read YouTube pages, but only through ytFetch, which refuses anything but youtube.com.
for f, c in js.items():
    hits = sorted(set(x.group(0) for x in NET.finditer(c)))
    if f == "src/yt-data.js" and hits == ["fetch"]:
        # Exactly two requests exist in Hush: fetchPage (YouTube pages) and apiPost (YouTube's "next"
        # endpoint, for comments). Both must refuse anything that isn't youtube.com.
        calls = re.findall(r"\bfetch\(", c)
        page_ok = re.search(r"const fetchPage = async \(path\) => \{\s*const url = new URL\(path, ORIGIN\);\s*if \(url\.origin !== ORIGIN\) throw", c)
        # apiPost: only YouTube's "next" (comments) and "browse/edit_playlist" (your Watch Later) endpoints
        api_ok = re.search(r'const API_ENDPOINTS = \["next", "browse/edit_playlist"\];[^\n]*\n\s*const apiPost = async \(endpoint, body, headers = \{\}\) => \{\s*if \(!API_ENDPOINTS\.includes\(endpoint\)\) throw[^\n]*\n\s*const url = new URL\(`/youtubei/v1/\$\{endpoint\}\?prettyPrint=false`, ORIGIN\);\s*if \(url\.origin !== ORIGIN\) throw', c)
        check(f"{f}: the only requests in Hush are fetchPage and apiPost, both locked to youtube.com", len(calls) == 2 and bool(page_ok) and bool(api_ok) and 'const ORIGIN = "https://www.youtube.com"' in c, f"{len(calls)} fetch calls, page={bool(page_ok)}, api={bool(api_ok)}")
        continue
    check(f"no network APIs in {f}", not hits, hits)

# 3. Dynamic / remote code
DYN = re.compile(r"\beval\s*\(|new\s+Function\s*\(|set(Timeout|Interval)\s*\(\s*['\"`]|\bimport\s*\(|importScripts\s*\(\s*['\"`]https?:|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write")
for f, c in js.items():
    hits = sorted(set(x.group(0) for x in DYN.finditer(c)))
    check(f"no dynamic code or raw-HTML injection in {f}", not hits, hits)

# 4. External URLs anywhere (only youtube.com references are allowed, used as selectors / return target)
URL = re.compile(r"https?://[^\s\"'`)<>]+")
for f, c in code.items():
    # The SVG namespace is a fixed identifier for creating SVG elements; it is never fetched.
    # Allowed: youtube.com itself, the SVG namespace identifier, and video thumbnails from i.ytimg.com (YouTube's image server).
    bad = sorted({u for u in URL.findall(c) if not re.match(r"https://([a-z]+\.)?youtube(-nocookie)?\.com\b", u)
                  and u != "http://www.w3.org/2000/svg" and not u.startswith("https://i.ytimg.com/vi/")
                  and not re.match(r"https://yt3\.(ggpht|googleusercontent)\.com", u)})
    check(f"no external URLs in {f}", not bad, bad)

# 5. HTML pages load only local scripts and styles
for f, c in code.items():
    if f.endswith(".html"):
        srcs = re.findall(r'<(?:script|link|img)[^>]+(?:src|href)="([^"]+)"', c)
        check(f"{f} loads only local files", all(not re.match(r"[a-z]+:", s) for s in srcs), srcs)
        check(f"{f} has no inline scripts or event handlers", not re.search(r"<script>(?!\s*</script>)|\son[a-z]+=", c))

# 5b. Frame messaging (Hush TV): every window "message" listener must check the sender's origin,
#     and frames may only load YouTube pages.
for f, c in js.items():
    listeners = len(re.findall(r'addEventListener\("message"', c))
    checks = len(re.findall(r'e\.origin !== ORIGIN', c))
    if listeners:
        check(f"every message listener in {f} checks the sender's origin", checks >= listeners, f"{listeners} listeners, {checks} origin checks")
    if 'createElement("iframe")' in c:
        for m in re.finditer(r'\b\w+\.src = ([^;]+);', c):
            if "i.ytimg.com/vi/" in m.group(1): continue  # thumbnail image, not a frame
            check(f"frames in {f} only load YouTube", "ORIGIN" in m.group(1), m.group(1))
    if "postMessage(" in c:
        bad = [line.strip()[:80] for line in c.splitlines() if "postMessage(" in line and not re.search(r",\s*ORIGIN\);", line)]
        check(f"messages from {f} are only sent to YouTube's origin", not bad, bad)

# 6. Message listeners (attack surface)
external = [f for f, c in js.items() if re.search(r"onMessageExternal|onConnectExternal|onConnect\.addListener", c)]
check("no message channels websites or other extensions could use", not external, external)
for f, c in js.items():
    if re.search(r"onMessage\.addListener", c):
        n = len(re.findall(r"onMessage\.addListener", c))
        guards = len(re.findall(r"sender\.id !== chrome\.runtime\.id", c))
        check(f"{f}: every runtime message listener only accepts Hush's own messages", guards >= n, f"{n} listeners, {guards} sender checks")

print()
print("SHA-256 of every file:")
for f in files:
    print(hashlib.sha256(open(os.path.join(ROOT, f), "rb").read()).hexdigest(), f)
print()
print("RESULT:", "ALL CHECKS PASSED" if fails == 0 else f"{fails} CHECK(S) FAILED")
sys.exit(1 if fails else 0)
