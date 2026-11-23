#!/usr/bin/env python3
"""One-off: mark always-dark sections and pages whose top is dark."""
import pathlib
root = pathlib.Path(__file__).resolve().parent
pages = root / "pages"

def edit(path, pairs):
    s = path.read_text()
    for a, b in pairs:
        if b in s:
            continue
        assert a in s, (path.name, a)
        s = s.replace(a, b, 1)
    path.write_text(s)

edit(pages / "index.html", [
    ('desc: Door-to-door car carrier transport from Durban', 'top: dark\ndesc: Door-to-door car carrier transport from Durban'),
    ('<section class="holo" id="top"', '<section class="holo dark-zone" id="top"'),
    ('<section class="journey" id="journey"', '<section class="journey dark-zone" id="journey"'),
])
edit(pages / "contact.html", [
    ('desc: Get a quote to move your car', 'top: dark\ndesc: Get a quote to move your car'),
    ('<section class="quote" id="quote"', '<section class="quote dark-zone" id="quote"'),
])
edit(pages / "routes.html", [
    ('desc: Door-to-door car carrier routes', 'top: dark\ndesc: Door-to-door car carrier routes'),
    ('<section class="network network--page"', '<section class="network network--page dark-zone"'),
    ('<section class="tracking"', '<section class="tracking dark-zone"'),
])
edit(root / "partials" / "footer.html", [
    ('<section class="cta" aria-labelledby="cta-title">', '<section class="cta dark-zone" aria-labelledby="cta-title">'),
])
print("zones marked")
