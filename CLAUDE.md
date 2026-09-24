# María Hesed · Estética Avanzada — guía del proyecto

Website de una página para María Hesed · Estética Avanzada, Miami, de María Hesed.
GitHub: https://github.com/luiso2/hesedbeautystudio
Producción: https://mariahesed.com
Dominio adicional: https://www.mariahesed.com
URL técnica: https://hesedbeautystudio.odd-forest-9504.workers.dev
Instagram: https://www.instagram.com/mariahesed.esthetics
WhatsApp: +1 (786) 709-5791.

## Stack y estructura

- Vite + HTML/CSS/JavaScript nativo; Cloudflare Vite plugin.
- `index.html`: contenido español, semántica y metadatos.
- `src/style.css`: diseño editorial responsive, marfil / tinta / dorado.
- `src/main.js`: idioma, menú accesible, categorías desplegables y reproducción de videos.
- `src/i18n.js`: diccionario inglés. Cada nuevo texto requiere traducción.
- `public/img` y `public/videos`: material real del estudio.
- `wrangler.jsonc`: Worker con assets estáticos. El plugin genera `dist/wrangler.json`.

`npm ci`, `npm run dev`, `npm run build`. `npm run deploy` publica en Cloudflare con credenciales de entorno. Nunca guardar secretos en el repositorio.

## Diseño y comportamiento

Portada dividida, cuatro tarjetas de categoría con acceso a servicios y precios bajo demanda, catálogo, manifiesto, ritual de cuatro pasos, resultados, fundadora, Instagram, FAQ y reserva.

La renovación de septiembre de 2026 elimina GSAP, Lenis, el preloader y el desplazamiento horizontal fijado. No introducir esperas artificiales, partículas, grano animado, cursores personalizados ni anillos giratorios.

Español por defecto. Guardar únicamente la selección explícita de idioma en `hesed-lang`. Mantener el scroll nativo, la navegación por teclado, el foco del menú móvil y `prefers-reduced-motion`. Los videos visibles se reproducen automáticamente en móvil y escritorio. Un control fijo pausa todos los videos y guarda la preferencia explícita; la reproducción es independiente del movimiento reducido de las animaciones. Si el navegador bloquea autoplay, se muestran controles nativos.

El catálogo comienza cerrado. Cada tarjeta de categoría tiene un botón «Ver servicios y precios» que abre todas las tarjetas de esa categoría; pulsarlo otra vez cierra el catálogo. Conservar la imagen o video y el precio confirmado junto al nombre. Para tratamientos sin importe confirmado, mostrar «Consultar precio». Mantener las traducciones y los enlaces a WhatsApp específicos del tratamiento.

## Contenido pendiente de confirmar

Dirección exacta, precios de los tratamientos aún no confirmados, duraciones reales, testimonios y dominio propio. No inventar estos datos ni estadísticas comerciales.

Al cambiar el dominio, actualizar canonical, OG y JSON-LD. El material de video se mantiene H.264, yuv420p, faststart, con póster, muted y playsinline.

## Validación

Compilar sin errores y revisar escritorio y móvil, ES/EN, los cuatro botones de categoría, expansión y cierre del catálogo, menú (Escape y foco), FAQ, enlaces internos, WhatsApp, movimiento reducido y consola. Ejecutar comprobaciones de contraste y accesibilidad tras cambios visuales.

Marca vigente: María Hesed · Estética Avanzada. Monograma M | H; lema Ciencia · Belleza · Bienestar. Conservar la URL técnica. El Instagram oficial indicado por la clienta es @mariahesed.esthetics. Precios confirmados: drenaje linfático US$85, maderoterapia US$80 y metaloterapia US$80. Brazilian Body Sculpt es diferente de Brazilian Slim Body y no se añade sin material propio.

La tipografía de titulares, monograma y nombre de marca usa Italiana, con mayúsculas espaciadas para aproximarse al rótulo M | H enviado por la clienta el 23 de septiembre. Los énfasis en cursiva conservan Bodoni Moda. Los botones de las cuatro categorías muestran solo el texto, sin flechas.
El énfasis «cuidarte.» del título principal usa Bodoni Moda en cursiva serif y dorado suave, como la segunda referencia visual enviada el 24 de septiembre; no usar Allura ni otra letra manuscrita en esa palabra.

La sección de la fundadora usa `public/img/maria-hesed-portrait.jpg`, foto vertical completa suministrada por la clienta. Reemplaza el bloque anterior de retrato circular, firma y credenciales.

El catálogo corporal incluye los 12 servicios con precios legibles de la lista de la clienta: tres ya tenían video y nueve se añadieron con descripción, precio y espacio de media en blanco. La clienta autorizó añadir servicios sin foto/video para completar el material después. Usar `.card__media--empty` hasta recibir su material. No inferir el precio tapado de Brazilian Body Sculpt.

Actualización de medios: las tarjetas sin material propio usan fotos generadas identificadas como Imagen ilustrativa. Los archivos `public/img/illustrative-*.jpg` son provisionales; sustituirlos por material real cuando la clienta lo envíe. No presentar fotos generadas como testimonios o resultados reales.

La clienta exige una imagen específica y diferente por servicio, sin collages de fotos repetidas ni videos duplicados entre tarjetas. Lipotrópicos se ofrece como inyectable (confirmado); no inferir fórmulas, dosis ni vía específica. Los archivos illustrative-*-v2 representan cada servicio por separado.

Kinesiología Linfática usa la foto `public/img/kinesiologia-linfatica-foto.jpg` proporcionada el 23 de septiembre; reemplaza el antiguo video y póster de kinesio.

Los dominios mariahesed.com y www.mariahesed.com están vinculados al mismo Worker mediante routes con custom_domain en wrangler.jsonc. Canonical, Open Graph y JSON-LD usan https://mariahesed.com.

Maderoterapia tiene una sola tarjeta (data-service=maderoterapia), US$80, con video de sesión y fotos originales antes/después enviadas el 22 de septiembre. No crear servicios adicionales para añadir medios. La clienta pidió eliminar Maderoterapia + Metaloterapia y Masaje moldeador + Maderoterapia; conservar únicamente Maderoterapia de US$80.
El video principal de esa tarjeta es `public/videos/maderoterapia-rodillos-abdomen.mp4`, enviado después por la clienta porque prefiere esta toma; su póster corresponde al mismo clip. No restaurar el clip anterior.

La clienta solicitó eliminar la tarjeta individual de Metaloterapia (srv.n7) del catálogo. No volver a añadirla sin indicación.

Instagram vigente: @mariahesed.esthetics. Facial Detox incluye hidratación con ácido hialurónico y el video facial-detox-hialuronico.mp4, sin tarjeta adicional.
El video de Facial Detox es vertical (480×848) y fue grabado desde la cabecera: su tarjeta lo muestra completo, sin recorte y girado 180° mediante CSS. Mantener esta presentación en móvil y escritorio.
El video de Yoga facial y drenaje linfático facial también es vertical (480×768); se encuadra cerca de la parte superior para mantener visibles los ojos y la cara en la tarjeta horizontal.

Facial Deep Clean ocupa la primera tarjeta de Facial y usa `public/img/facial-deep-clean-mascarilla.jpg`, foto de mascarilla en tres etapas enviada el 23 de septiembre. Salmon DNA conserva su video propio en la segunda tarjeta.

Delux Facial sigue siendo un solo servicio de US$185. La clienta lo describió para pieles con flacidez y signos de envejecimiento y envió el video del tratamiento (`delux-facial-flacidez.mp4`).
