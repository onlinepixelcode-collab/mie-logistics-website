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

# ---------- route pages ----------
routes = json.loads((SRC / "routes.json").read_text())
tpl = (SRC / "templates" / "route.html").read_text()


def faqs(r):
    to = r["to"]
    return [
        (f"How long does car transport from Durban to {to} take?",
         "It depends on your collection date and how the loads are scheduled. When you book, our team confirms the collection and delivery dates with you."),
        (f"How much does it cost to transport a car from Durban to {to}?",
         "The price depends on the car, how many cars you're moving and the date. Book online or WhatsApp us on 073 697 7731 and we'll come back to you with a price."),
        (f"Is my car insured on the way to {to}?",
         "Yes. All our trucks and trailers carry full comprehensive insurance and goods-in-transit (GIT) cover."),
        (f"Do you collect from my home and deliver to my door in {to}?",
         f"Yes. It's a door-to-door service: we collect in Durban and deliver to your home, office or dealership in {to}."),
        ("Can I track my car during the move?",
         "Every truck has 24-hour satellite tracking. Follow your booking on our Track my car page, or WhatsApp us for a live location."),
    ]


for r in routes:
    to = r["to"]
    name = "car-transport-" + r["slug"]
    q = faqs(r)
    faq_html = "\n".join(
        f'      <details><summary>{html.escape(a)}</summary><p>{html.escape(b)}</p></details>' for a, b in q)
    others = "\n".join(
        f'      <a class="rt-link" href="car-transport-{o["slug"]}.html"><span>Durban →</span><b>{html.escape(o["to"])}</b><em>{html.escape(o["km"])}</em></a>'
        for o in routes if o["slug"] != r["slug"])
    also = r["also"]
    also_txt = ", ".join(also[:-1]) + " and " + also[-1] if len(also) > 1 else also[0]
    url = BASE + name + ".html"
    jsonld = [
        {"@context": "https://schema.org", "@type": "Service",
         "name": f"Car transport Durban to {to}", "serviceType": "Car carrier transport",
         "description": r["intro"], "url": url,
         "areaServed": [{"@type": "City", "name": "Durban"}, {"@type": "City", "name": to}],
         "provider": {"@type": "LocalBusiness", "name": "M.I.E. Logistics", "telephone": "+27736977731",
                      "address": {"@type": "PostalAddress", "streetAddress": "80 Hunslet Road, Phoenix Industrial",
                                  "addressLocality": "Durban", "addressRegion": "KwaZulu-Natal", "addressCountry": "ZA"}}},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in q]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": "Routes", "item": BASE + "routes.html"},
            {"@type": "ListItem", "position": 3, "name": f"Durban to {to}", "item": url}]},
    ]
    km_short = r["km"].replace("about ", "±")
    road_short = r["road"] if len(r["road"]) <= 10 else ("National routes")
    body = (tpl.replace("{{JSONLD}}", json.dumps(jsonld, ensure_ascii=False).replace("</", "<\\/"))
            .replace("{{TO_URL}}", urllib.parse.quote(to))
            .replace("{{WA_TEXT}}", urllib.parse.quote(f"Hi M.I.E., I'd like a quote to move a car from Durban to {to}."))
            .replace("{{KM_SHORT}}", html.escape(km_short)).replace("{{ROAD_SHORT}}", html.escape(road_short))
            .replace("{{KM}}", html.escape(r["km"])).replace("{{ROAD}}", html.escape(r["road"]))
            .replace("{{INTRO}}", html.escape(r["intro"])).replace("{{DETAIL}}", html.escape(r["detail"]))
            .replace("{{ALSO}}", html.escape(also_txt)).replace("{{PROVINCE}}", html.escape(r["province"]))
            .replace("{{IMG}}", r["img"]).replace("{{LON}}", str(r["lon"])).replace("{{LAT}}", str(r["lat"]))
            .replace("{{FAQ_HTML}}", faq_html).replace("{{OTHER_ROUTES}}", others)
            .replace("{{TO}}", html.escape(to)))
    page(name, f"Car Transport Durban to {to} | Door to Door | M.I.E. Logistics",
         f"Car transport from Durban to {to} on dedicated car carriers: door-to-door collection and delivery, "
         f"24-hour satellite tracking and full GIT cover. {r['km'].capitalize()} via the {r['road']}. Book online.",
         body, "dark", "routes")

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
