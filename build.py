#!/usr/bin/env python3
"""Assemble the M.I.E. Logistics pages from src/partials + src/pages.

Each page in src/pages starts with a front-matter block:
<!--
title: ...
desc: ...
-->
Run:  python3 build.py
"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
P = ROOT / "src" / "partials"
head = (P / "head.html").read_text()
header = (P / "header.html").read_text()
footer = (P / "footer.html").read_text()

for page in sorted((ROOT / "src" / "pages").glob("*.html")):
    src = page.read_text()
    m = re.match(r"<!--\s*(.*?)-->\s*", src, re.S)
    meta = dict(line.split(":", 1) for line in m.group(1).strip().splitlines())
    meta = {k.strip(): v.strip() for k, v in meta.items()}
    body = src[m.end():]
    name = page.stem
    nav = header.replace(f'data-nav="{name}"', f'data-nav="{name}" aria-current="page"')
    out = (head.replace("{{TITLE}}", meta["title"]).replace("{{DESC}}", meta["desc"]).replace("{{PAGE}}", name)
           .replace("{{TOP}}", meta.get("top", "light"))
           + nav + '\n<main id="main">\n' + body + "\n" + footer)
    (ROOT / f"{name}.html").write_text(out)
    print("built", f"{name}.html")
