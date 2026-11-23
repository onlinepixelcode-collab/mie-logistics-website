#!/usr/bin/env python3
"""Bump the ?v= cache-busting numbers on CSS/JS links in the partials, then rebuild."""
import pathlib, re, time, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
v = str(int(time.time()))
for name in ("head.html", "footer.html"):
    f = root / "src" / "partials" / name
    f.write_text(re.sub(r"(\.(?:css|js))\?v=\d+", r"\1?v=" + v, f.read_text()))
subprocess.run(["python3", str(root / "build.py")], check=True)
print("version", v)
