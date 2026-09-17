# Hesed Beauty Studio — Website

Sitio web premium para **Hesed Beauty Studio** (Miami) · [@hesedbeautystudio](https://www.instagram.com/hesedbeautystudio)

- Vite + vanilla JS
- GSAP + ScrollTrigger (motion graphics, reveals, sección horizontal pinned)
- Lenis (smooth scroll)
- Bilingüe ES / EN (`src/i18n.js`)
- Vídeos del Instagram del studio transcodificados a H.264 (`public/videos`)

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # genera /dist
```

## Deploy (Cloudflare Pages)

```bash
npx wrangler pages deploy dist --project-name hesedbeautystudio
```

Requiere `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en el entorno.
