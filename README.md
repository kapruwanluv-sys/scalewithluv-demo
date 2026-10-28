# scalewithluv demo

A shareable demo of the whole system with made-up data: landing page, owner dashboard, manager app and console.
"Pinewood Stays" (Manali, Kasol, Shimla) plus two smaller clients in the console.

## How it works
- `src/sheet.js` becomes `site/demo-sheet.js`. It runs the **real** Register script (Code.gs) in the visitor's
  browser over an in-memory sheet. Every app's requests to `https://script.google.com/macros/s/DEMOn/exec` are
  answered there, so nothing reaches Google or any real client.
- All three apps share one demo sheet per browser (localStorage). A change in one app shows in the others.
  The **Reset** button on every page starts again.
- `src/make_seed.py` writes the made-up data around a fixed day. The page shifts every date to the visitor's
  today, so the demo never looks old.
- Google sign-in is replaced by a "Continue as … (demo)" button. Geotag is off, so visitors are never asked
  for their location.
- Manager app login: `asha` / `pinewood123` (Manali stays) or `karan` / `pinewood123` (Kasol).

## Build and preview
```bash
python -I tools/build.py      # needs ../host-dashboard, ../scalewithluv-console, ../whatsapp-ai-engine
node tools/serve.js 8780      # http://localhost:8780
```
Rebuild after a dashboard, console or Code.gs release so the demo shows the latest version. Bump `VERSION` in
`src/sheet.js` when the seed changes, so returning visitors get fresh data.

## Publishing
`site/` is a static site. It ships Code.gs to the browser, so anyone with the link can read that script. There are
no keys or client data in it.
