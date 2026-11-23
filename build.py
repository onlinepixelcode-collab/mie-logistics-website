#!/usr/bin/env python3
"""Assemble the M.I.E. Logistics pages from src/partials + src/pages,
generate one page per route from src/routes.json + src/templates/route.html,
and write sitemap.xml + robots.txt.

Each page in src/pages starts with a front-matter block:
<!--
title: ...
desc: ...
top: dark        (optional: the page opens on a dark section)
-->
Run:  python3 build.py   (or python3 src/bump.py to also refresh cache-busting versions)
"""
import html, json, pathlib, re, urllib.parse

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
P = SRC / "partials"
# Public address of the site, used in sitemap.xml. Change to https://www.mielogistics.co.za/ at launch.
BASE = "https://onlinepixelcode-collab.github.io/mie-logistics-website/"

head = (P / "head.html").read_text()
header = (P / "header.html").read_text()
footer = (P / "footer.html").read_text()
built = []


def page(name, title, desc, body, top="light", nav_key=None):
    nav = header
    if nav_key:
        nav = nav.replace(f'data-nav="{nav_key}"', f'data-nav="{nav_key}" aria-current="page"')
    out = (head.replace("{{TITLE}}", html.escape(title, quote=True)).replace("{{DESC}}", html.escape(desc, quote=True))
           .replace("{{PAGE}}", name).replace("{{TOP}}", top)
           + nav + '\n<main id="main">\n' + body + "\n" + footer)
    (ROOT / f"{name}.html").write_text(out)
    built.append(name)
    print("built", f"{name}.html")


# ---------- hand-written pages ----------
for f in sorted((SRC / "pages").glob("*.html")):
    src = f.read_text()
    m = re.match(r"<!--\s*(.*?)-->\s*", src, re.S)
    meta = {k.strip(): v.strip() for k, v in (line.split(":", 1) for line in m.group(1).strip().splitlines())}
    page(f.stem, meta["title"], meta["desc"], src[m.end():], meta.get("top", "light"), f.stem)

# ---------- route pages (both directions) ----------
import sys
sys.path.insert(0, str(SRC))
from routes_gen import build_routes
build_routes(json.loads((SRC / "routes.json").read_text()),
             json.loads((SRC / "routes_back.json").read_text()),
             (SRC / "templates" / "route.html").read_text(), BASE, page)

# ---------- sitemap + robots ----------
order = ["index", "services", "routes", "book", "track", "about", "contact"]
names = sorted(built, key=lambda n: (order.index(n) if n in order else len(order), n))
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for n in names:
    loc = BASE if n == "index" else BASE + n + ".html"
    pr = "1.0" if n == "index" else ("0.8" if n.startswith("car-transport-") or n in ("book", "services", "routes") else "0.6")
    sm.append(f"  <url><loc>{loc}</loc><priority>{pr}</priority></url>")
sm.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n")
(ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n")
print("wrote sitemap.xml + robots.txt")
