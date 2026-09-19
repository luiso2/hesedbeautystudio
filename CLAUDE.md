# Hesed Beauty Studio — guía del proyecto

Website de una página para Hesed Beauty Studio, Miami, de Maria Hesed.
GitHub: https://github.com/luiso2/hesedbeautystudio
Producción: https://hesedbeautystudio.odd-forest-9504.workers.dev
Instagram: https://www.instagram.com/hesedbeautystudio
WhatsApp: +1 (786) 709-5791.

## Stack y estructura

- Vite + HTML/CSS/JavaScript nativo; Cloudflare Vite plugin.
- `index.html`: contenido español, semántica y metadatos.
- `src/style.css`: diseño editorial responsive, marfil / tinta / dorado.
- `src/main.js`: idioma, menú accesible, pestañas, catálogo progresivo y reproducción de videos.
- `src/i18n.js`: diccionario inglés. Cada nuevo texto requiere traducción.
- `public/img` y `public/videos`: material real del estudio.
- `wrangler.jsonc`: Worker con assets estáticos. El plugin genera `dist/wrangler.json`.

`npm ci`, `npm run dev`, `npm run build`. `npm run deploy` publica en Cloudflare con credenciales de entorno. Nunca guardar secretos en el repositorio.

## Diseño y comportamiento

Portada dividida, acceso directo a las cuatro categorías, catálogo, manifiesto, ritual de cuatro pasos, resultados, fundadora, Instagram, FAQ y reserva.

La renovación de septiembre de 2026 elimina GSAP, Lenis, el preloader y el desplazamiento horizontal fijado. No introducir esperas artificiales, partículas, grano animado, cursores personalizados ni anillos giratorios.

Español por defecto. Guardar únicamente la selección explícita de idioma en `hesed-lang`. Mantener el scroll nativo, la navegación por teclado, el foco del menú móvil y `prefers-reduced-motion`. Las imágenes permanecen visibles cuando los videos no se reproducen. El control de video de portada pausa todos los videos.

Cada categoría muestra inicialmente tres tarjetas si contiene más de tres. Mantener acceso al catálogo completo mediante el botón, traducciones y enlaces a WhatsApp específicos del tratamiento.

## Contenido pendiente de confirmar

Dirección exacta, precios y duraciones reales, testimonios, dominio propio y foto de Maria de alta resolución. El retrato actual tiene 150 px; evitar ampliarlo excesivamente. No inventar estos datos ni estadísticas comerciales.

Al cambiar el dominio, actualizar canonical, OG y JSON-LD. El material de video se mantiene H.264, yuv420p, faststart, con póster, muted y playsinline.

## Validación

Compilar sin errores y revisar escritorio y móvil, ES/EN, las cuatro pestañas, expansión del catálogo, menú (Escape y foco), FAQ, enlaces internos, WhatsApp, movimiento reducido y consola. Ejecutar comprobaciones de contraste y accesibilidad tras cambios visuales.
