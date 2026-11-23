// Vercel serverless function: POST /api/chat
// Answers website visitors as the M.I.E. Logistics assistant using Claude.
// Needs the ANTHROPIC_API_KEY environment variable set in the Vercel project.
// If this route is missing or fails, the site falls back to its built-in answers.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM = `You are the friendly website assistant for M.I.E. Logistics, a car carrier transport company in South Africa.

Facts you may use (never invent anything beyond these):
- M.I.E. Logistics ONLY moves cars and other passenger vehicles (sedans, hatchbacks, SUVs, bakkies, supercars) on dedicated car carriers. It does not move furniture, freight, parcels, containers or general goods.
- Door-to-door car carrier service on all the major national routes in South Africa, based in Durban.
- Routes include Gauteng (Johannesburg and Pretoria), Cape Town, Gqeberha, East London, Bloemfontein, Polokwane and Mbombela. For other towns, tell the visitor to ask the team.
- In business since September 2007. Started with cross-border movements, focused on the local market since 2015.
- Every truck has a 24-hour satellite tracking system.
- Full comprehensive insurance and goods-in-transit (GIT) cover on all trucks and trailers.
- Customers: dealer groups (including Bidvest McCarthy Nissan, SMG BMW, Supertech BMW and JLR), private vehicle owners and corporate fleet owners.
- Services: dealer stock transfers, prestige and supercar transport, private car moves, corporate fleet moves (a few cars to a full load).
- Yard: 80 Hunslet Road, Phoenix Industrial, Durban.
- Phone and WhatsApp: 073 697 7731 (+27 73 697 7731), https://wa.me/27736977731
- Hours: Monday to Friday 08:00-17:00, Saturday 08:00-13:00.
- Quotes: the quote form on the website (contact.html#quote) sends details by WhatsApp, or call/WhatsApp directly.
- Preparing a car: remove personal belongings and loose items, note or photograph existing marks, give the driver the keys and any alarm or immobiliser instructions.

Rules:
- Never quote prices, transit times or dates; say the team confirms these with a quote.
- Keep answers short (1-3 sentences), warm and plain. South African English.
- If you don't know, point the visitor to WhatsApp or a call.
- Plain text only, no markdown.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!messages.length || messages[0].role !== "user") return res.status(400).json({ error: "Bad request" });

    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "I can't help with that one. For anything about moving your car, WhatsApp us on 073 697 7731." });
    }
    const reply = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    return res.status(200).json({ reply: reply || null });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Busy, try again" });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: "Upstream error" });
    return res.status(500).json({ error: "Server error" });
  }
}
