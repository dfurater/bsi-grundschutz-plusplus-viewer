# Hosting Security Headers (Static CSR)

Dieses Projekt liefert Header-Policy-Dateien fuer statisches Hosting:

- `public/_headers` (Cloudflare Pages / Netlify kompatibel)
- `netlify.toml` (Netlify-spezifische Alternative)

## Warum

Die App ist rein clientseitig. Browser-Schutzmassnahmen muessen daher ueber den statischen Host erfolgen.

## Erwartete Header

- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options und `frame-ancestors`
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

## GitHub Pages Hinweis

GitHub Pages erlaubt ohne zusaetzlichen Reverse-Proxy/CDN keine frei konfigurierbaren Security-Header pro Response.
Fuer Public Release mit harter Header-Policy wird daher Cloudflare Pages oder Netlify empfohlen.

## Lokale Verifikation

```bash
npm run build
npm run preview
curl -I http://127.0.0.1:4173/
```

Bei lokalem `vite preview` werden `_headers` nicht automatisch als Response-Header ausgespielt.
Die echte Header-Pruefung erfolgt auf dem Ziel-Hosting (oder Preview-Deployment) mit:

```bash
SECURITY_HEADERS_URL="https://deine-preview-url" npm run check:headers
```
