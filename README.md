# M.I.E. Logistics — website

Multi-page site for M.I.E. Logistics (car carrier transport, Durban, South Africa).

- Pages: `index.html`, `services.html`, `routes.html`, `about.html`, `contact.html`, `book.html`
- Edit content in `src/pages/*.html` and the shared header/footer in `src/partials/`, then run `python3 src/bump.py` (rebuilds every page and refreshes cache-busting versions).
- `api/chat.js` is a Vercel serverless function for the AI chat (needs `ANTHROPIC_API_KEY`). On static hosting such as GitHub Pages the chat falls back to built-in answers.
