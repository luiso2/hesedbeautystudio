# María Hesed · Estética Avanzada

Sitio bilingüe de estética facial y corporal en Miami, con diseño editorial en marfil, tinta y dorado. HTML, CSS y JavaScript sobre Vite, desplegado como assets estáticos en Cloudflare Workers.

## Desarrollo

```sh
npm ci
npm run dev
npm run build
```

La configuración de despliegue se genera en `dist/wrangler.json`. `npm run deploy` compila y publica con las credenciales de Cloudflare configuradas en el entorno.

## Experiencia

- Portada con material real del estudio y reserva de valoración por WhatsApp.
- Cuatro categorías de tratamientos con pestañas accesibles (flechas, Home y End).
- Tres tratamientos iniciales por categoría; botón para explorar el catálogo completo.
- Navegación móvil con Escape, control de foco y contenido de fondo inerte.
- Español por defecto; inglés seleccionable y preferencia persistida.
- Videos visibles con reproducción automática en móvil y escritorio, pausa global persistente y animaciones que respetan movimiento reducido.
- Acordeones nativos y contenido visible sin depender de animaciones.

## Contenido

`index.html` contiene el español; `src/i18n.js`, las traducciones inglesas. Las imágenes y videos del estudio están en `public/`. Se conservan los enlaces a WhatsApp e Instagram. No se añaden precios, testimonios ni una dirección postal no confirmados.

Producción: https://hesedbeautystudio.odd-forest-9504.workers.dev

Marca vigente: María Hesed · Estética Avanzada. Monograma M | H; lema Ciencia · Belleza · Bienestar. Conservar los URLs técnicos y el Instagram existente hasta que la clienta indique nuevos. Precios confirmados: drenaje linfático US$85, maderoterapia US$80 y metaloterapia US$80. Brazilian Body Sculpt es diferente de Brazilian Slim Body y no se añade sin material propio.
