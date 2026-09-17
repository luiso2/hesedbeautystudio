# Hesed Beauty Studio — guía del proyecto

Web premium de una sola página para **Hesed Beauty Studio** (Miami, FL), estética facial y corporal de **Maria Hesed**.
Instagram del negocio: https://www.instagram.com/hesedbeautystudio · WhatsApp: +1 (786) 709-5791.
Referencia de calidad que pidió el cliente: https://clinicyolystudiofit.com/es.

## URLs y despliegue

| Qué | Dónde |
|---|---|
| Código local | `D:\02_Proyectos\hesedbeautystudio` |
| GitHub | https://github.com/luiso2/hesedbeautystudio (rama `main`) |
| Producción | https://hesedbeautystudio.odd-forest-9504.workers.dev |
| Cloudflare | cuenta `e79469132f614c7f418a0e7a65466e88`, Worker `hesedbeautystudio` con static assets |

**Importante:** wrangler convirtió el `pages deploy` inicial al flujo "Pages sobre Workers". No existe un proyecto Pages clásico ni dominio `pages.dev`; el sitio es un Worker que sirve `dist/` como assets estáticos. Para volver al Pages clásico habría que redeployar con `wrangler pages deploy dist --force` (solo si el cliente lo pide).

```bash
npm install
npm run dev              # desarrollo en http://localhost:5173
npm run build            # genera dist/ (Vite + @cloudflare/vite-plugin)
npx wrangler deploy      # publica. Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno
```

La config real del Worker la genera el plugin de Vite en `dist/wrangler.json` a partir de `wrangler.jsonc`; `.wrangler/deploy/config.json` redirige a ella. No editar `dist/` a mano.

Los tokens de Cloudflare **nunca** van en el repo. El token usado en la primera publicación se pegó en un chat: conviene rotarlo en el panel de Cloudflare.

## Stack

- **Vite 6** + HTML/CSS/JS vanilla (sin framework).
- **GSAP 3 + ScrollTrigger**: preloader, split-text del hero, reveals, contadores, sección horizontal pinned, parallax, acordeón.
- **Lenis**: smooth scroll (se desactiva con `prefers-reduced-motion`).
- **Google Fonts**: Cormorant Garamond (display), Jost (cuerpo), Pinyon Script (firma "by Maria Hesed").
- Vídeos H.264 en `public/videos/`, transcodificados con `ffmpeg-static` desde los reels del Instagram.

## Estructura

```
index.html          Toda la página. Copy en ESPAÑOL (fuente de verdad) con atributos data-i18n
src/style.css       Sistema de diseño (variables en :root), secciones, responsive al final
src/main.js         i18n, Lenis, preloader, nav, menú móvil, magnetic, reveals, tabs, vídeos, ritual, FAQ
src/i18n.js         Diccionario EN (claves = data-i18n). El ES se captura del DOM en runtime
public/videos/      8 clips (15 s, 720p, ≤1.3 MB c/u). Nombres: slimbody, lipo4d, drenaje, drenaje2, moldeo, reafirmante, piedras, firmup
public/img/         Pósters *-poster.jpg (frame de cada vídeo) y maria.jpg (150 px, del IG)
public/_headers     Cache inmutable para videos/img/assets, nosniff, referrer-policy
public/robots.txt
wrangler.jsonc      Config base del Worker (assets SPA)
vite.config.js      Plugin de Cloudflare (lo añadió wrangler)
```

## Secciones de la página (orden)

1. Preloader (monograma H + "HESED")
2. Nav fija con selector ES/EN, CTA WhatsApp, burger en móvil
3. Hero con vídeo `drenaje.mp4`, título split-text, firma script
4. Marquee de tratamientos
5. Manifiesto "Hesed = bondad, gracia y cuidado" + contadores + 2 vídeos
6. Tratamientos en pestañas: Corporal (6), Facial (4), Fibroblast (2), Cejas (3). Cada tarjeta enlaza a WhatsApp con mensaje prellenado
7. El Ritual: 4 pasos con scroll horizontal pinned en escritorio, vertical en móvil
8. Resultados: grid de vídeos + cita
9. La fundadora (Maria Hesed)
10. Reels (6, enlazan a los reels originales en IG)
11. FAQ (5 preguntas, acordeón animado)
12. CTA de reserva con vídeo de fondo
13. Footer + botón flotante WhatsApp

## Decisiones de diseño y branding

- Paleta del Instagram: negro/onyx, marfil y dorado champán. Variables `--ink`, `--onyx`, `--ivory`, `--sand`, `--gold`, `--gold-2`.
- El cliente pidió quitar "brillos de IA" (partículas), el grano animado y el cursor personalizado porque parpadeaban. **No volver a añadirlos.**
- Botones con superficie 3D (degradado + relieve + sombra). Efecto magnético suave (`strength = 0.18`).
- El retrato de Maria lleva anillo sólido fino; el cliente rechazó el anillo punteado giratorio.
- Idioma por defecto: español siempre. Solo cambia si el usuario pulsa EN (se guarda en `localStorage["hesed-lang"]`).
- Ningún vídeo salvo el hero tiene `autoplay`; los de fondo usan `data-autoplay` + `preload="none"` y se reproducen al entrar en vista (ScrollTrigger). Las tarjetas reproducen al hover (escritorio) o al entrar en vista (táctil).

## Cómo editar contenido

- **Texto**: cambia el español en `index.html` y la clave equivalente en `src/i18n.js`. Si añades un elemento nuevo con texto, dale `data-i18n="seccion.clave"` y añade la clave al diccionario EN.
- **Tratamiento nuevo**: copia un `<article class="card">` dentro del `<div class="panel" data-panel="...">` correspondiente. Actualiza el `card__num`.
- **Precios**: no se inventaron. Los `card__meta` muestran duración orientativa y "Sesión o paquete". Cambiar cuando el cliente confirme.
- **Vídeo nuevo**: H.264 (yuv420p, faststart), ≤15 s, 720p, sin audio necesario (van en `muted`). Genera su póster con ffmpeg (`-ss 1 -frames:v 1`).
- **Dominio propio**: al conectarlo, cambiar las URLs absolutas en `index.html` (canonical, og:image, og:url y el JSON-LD `url`/`image`).

## Pendiente de confirmar con la clienta

- Dirección postal exacta (ahora solo "Miami, Florida").
- Precios y duraciones reales de cada tratamiento.
- Testimonios reales (no hay sección de reseñas para no inventar ninguna).
- Foto de Maria en alta resolución (la actual es la miniatura de 150 px del IG).
- Dominio definitivo.

## Verificación antes de publicar

1. `npm run build` sin errores.
2. Abrir `npx vite preview` y comprobar hero, pestañas, ritual (escritorio y móvil), FAQ y selector de idioma.
3. Sin errores en consola. Última auditoría (17 sep 2026): 0 errores JS, 0 violaciones axe WCAG 2 AA, carga 0,75 s, vídeo total 5,7 MB.
4. `git push` y `npx wrangler deploy`.
