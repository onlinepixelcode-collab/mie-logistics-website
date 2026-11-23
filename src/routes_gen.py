"""Route page generator, imported by build.py. Builds every route in both directions:
Durban -> city (copy in routes.json) and city -> Durban (copy in routes_back.json)."""
import html, json, urllib.parse

DURBAN = {"name": "Durban", "province": "KwaZulu-Natal", "lon": 31.03, "lat": -29.86}


def slug_of(frm, to):
    s = lambda x: x.lower().replace(" ", "-")
    return f"car-transport-{s(frm)}-to-{s(to)}"


def flip_road(road):
    parts = road.split(" and ")
    return " and ".join(reversed(parts)) if len(parts) == 2 and all(p.strip().startswith("N") for p in parts) else road


def faqs(frm, to):
    return [
        (f"How long does car transport from {frm} to {to} take?",
         "It depends on your collection date and how the loads are scheduled. When you book, our team confirms the collection and delivery dates with you."),
        (f"How much does it cost to transport a car from {frm} to {to}?",
         "The price depends on the car, how many cars you're moving and the date. Book online or WhatsApp us on 073 697 7731 and we'll come back to you with a price."),
        (f"Is my car insured on the way to {to}?",
         "Yes. All our trucks and trailers carry full comprehensive insurance and goods-in-transit (GIT) cover."),
        (f"Do you collect from my home in {frm} and deliver to my door in {to}?",
         f"Yes. It's a door-to-door service: we collect in {frm} and deliver to your home, office or dealership in {to}."),
        ("Can I track my car during the move?",
         "Every truck has 24-hour satellite tracking. Follow your booking on our Track my car page, or WhatsApp us for a live location."),
    ]


def joined(items):
    return ", ".join(items[:-1]) + " and " + items[-1] if len(items) > 1 else items[0]


def build_routes(routes, back, tpl, BASE, page):
    imgs = [r["img"] for r in routes]
    entries = []
    for i, r in enumerate(routes):
        city = {"name": r["to"], "province": r["province"], "lon": r["lon"], "lat": r["lat"]}
        entries.append(dict(frm=DURBAN, to=city, km=r["km"], road=r["road"], img=r["img"],
                            intro=r["intro"], detail=r["detail"], also=r["also"]))
        b = back["routes"][r["slug"]]
        entries.append(dict(frm=city, to=DURBAN, km=r["km"], road=flip_road(r["road"]), img=imgs[(i + 1) % len(imgs)],
                            intro=b["intro"], detail=b["detail"], also=back["durbanAreas"]))

    def link(e):
        return (f'      <a class="rt-link" href="{slug_of(e["frm"]["name"], e["to"]["name"])}.html">'
                f'<span>{html.escape(e["frm"]["name"])} →</span><b>{html.escape(e["to"]["name"])}</b><em>{html.escape(e["km"])}</em></a>')

    for e in entries:
        frm, to = e["frm"]["name"], e["to"]["name"]
        name = slug_of(frm, to)
        url = BASE + name + ".html"
        q = faqs(frm, to)
        faq_html = "\n".join(f'      <details><summary>{html.escape(a)}</summary><p>{html.escape(b)}</p></details>' for a, b in q)
        links_out = "\n".join(link(o) for o in entries if o["frm"] is DURBAN and o is not e)
        links_back = "\n".join(link(o) for o in entries if o["to"] is DURBAN and o is not e)
        jsonld = [
            {"@context": "https://schema.org", "@type": "Service",
             "name": f"Car transport {frm} to {to}", "serviceType": "Car carrier transport",
             "description": e["intro"], "url": url,
             "areaServed": [{"@type": "City", "name": frm}, {"@type": "City", "name": to}],
             "provider": {"@type": "LocalBusiness", "name": "M.I.E. Logistics", "telephone": "+27736977731",
                          "address": {"@type": "PostalAddress", "streetAddress": "80 Hunslet Road, Phoenix Industrial",
                                      "addressLocality": "Durban", "addressRegion": "KwaZulu-Natal", "addressCountry": "ZA"}}},
            {"@context": "https://schema.org", "@type": "FAQPage",
             "mainEntity": [{"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in q]},
            {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
                {"@type": "ListItem", "position": 2, "name": "Routes", "item": BASE + "routes.html"},
                {"@type": "ListItem", "position": 3, "name": f"{frm} to {to}", "item": url}]},
        ]
        km_short = e["km"].replace("about ", "±")
        road_short = e["road"] if len(e["road"]) <= 10 else "National routes"
        rep = {
            "{{JSONLD}}": json.dumps(jsonld, ensure_ascii=False).replace("</", "<\\/"),
            "{{FROM_URL}}": urllib.parse.quote(frm), "{{TO_URL}}": urllib.parse.quote(to),
            "{{WA_TEXT}}": urllib.parse.quote(f"Hi M.I.E., I'd like a quote to move a car from {frm} to {to}."),
            "{{KM_SHORT}}": html.escape(km_short), "{{ROAD_SHORT}}": html.escape(road_short),
            "{{KM}}": html.escape(e["km"]), "{{ROAD}}": html.escape(e["road"]),
            "{{INTRO}}": html.escape(e["intro"]), "{{DETAIL}}": html.escape(e["detail"]),
            "{{ALSO}}": html.escape(joined(e["also"])),
            "{{FROM_PROVINCE}}": html.escape(e["frm"]["province"]), "{{TO_PROVINCE}}": html.escape(e["to"]["province"]),
            "{{FROM_LON}}": str(e["frm"]["lon"]), "{{FROM_LAT}}": str(e["frm"]["lat"]),
            "{{TO_LON}}": str(e["to"]["lon"]), "{{TO_LAT}}": str(e["to"]["lat"]),
            "{{IMG}}": e["img"], "{{FAQ_HTML}}": faq_html,
            "{{LINKS_OUT}}": links_out, "{{LINKS_BACK}}": links_back,
            "{{REVERSE_HREF}}": slug_of(to, frm) + ".html",
            "{{FROM}}": html.escape(frm), "{{TO}}": html.escape(to),
        }
        body = tpl
        for k, v in rep.items():
            body = body.replace(k, v)
        page(name, f"Car Transport {frm} to {to} | Door to Door | M.I.E. Logistics",
             f"Car transport from {frm} to {to} on dedicated car carriers: door-to-door collection and delivery, "
             f"24-hour satellite tracking and full GIT cover. {e['km'].capitalize()} via the {e['road']}. Book online.",
             body, "dark", "routes")
