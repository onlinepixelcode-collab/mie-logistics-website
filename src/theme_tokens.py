#!/usr/bin/env python3
"""One-off: convert hard-coded dark-only colours in site.css to theme tokens."""
import pathlib, re
p = pathlib.Path(__file__).resolve().parent.parent / "assets" / "css" / "site.css"
s = p.read_text()

s = s.replace("color:#aab3bd", "color:var(--text-2)")
for c in ("#c9d0d8", "#d5dbe2", "#e3e8ee", "#cfe0ff"):
    s = s.replace("color:" + c, "color:var(--soft)")
s = s.replace("color:#fff", "color:var(--strong)")
s = re.sub(r"-webkit-text-stroke:(1(?:\.\d)?px) rgba\(255,255,255,\.(?:4|45|5|55)\)", r"-webkit-text-stroke:\1 var(--stroke)", s)
s = re.sub(r"-webkit-text-stroke:(1(?:\.\d)?px) rgba\(255,255,255,\.(?:12|14|35)\)", r"-webkit-text-stroke:\1 var(--stroke-soft)", s)
s = s.replace(".nav.is-solid{background:rgba(8,9,11,.72)", ".nav.is-solid{background:var(--nav-bg)")
s = s.replace("background:rgba(255,255,255,.04);transition:border-color .2s,background-color .2s;color-scheme:dark", "background:var(--field-bg);transition:border-color .2s,background-color .2s;color-scheme:var(--scheme)")
s = s.replace(".form{background:rgba(16,20,25,.82)", ".form{background:var(--glass)")
s = s.replace(".bk{background:rgba(16,20,25,.8)", ".bk{background:var(--glass)")
s = s.replace("body::after{content:\"\";position:fixed;inset:-50%;z-index:250;pointer-events:none;opacity:.05;", "body::after{content:\"\";position:fixed;inset:-50%;z-index:250;pointer-events:none;opacity:var(--grain);")
p.write_text(s)
print("done")
