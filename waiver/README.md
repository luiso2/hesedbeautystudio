# Consentimientos de María Hesed

El panel del estudio está en [waiver.mariahesed.com/panel](https://waiver.mariahesed.com/panel). La primera vez en un navegador, pulsa **Enviarme el enlace de acceso** y abre el correo privado del estudio. El enlace dura 15 minutos y sirve una sola vez. Al pulsar **Abrir mi panel**, el navegador queda autorizado durante 30 días. Cerrar sesión o entrar al modo presencial borra el acceso de ese dispositivo. Desde allí se puede enviar una invitación por correo, copiar un enlace de una sola firma y descargar o eliminar un documento archivado.

Para usar la tablet sin conexión, abre el panel en el navegador que se usará para las firmas y pulsa **Preparar 10 formularios**. Después abre **Modo presencial**. Cada formulario puede generar su PDF sin internet. Tras firmar, descarga la copia y pulsa **Terminar** antes de entregar la tablet a otra persona. Vuelve a abrir la página con conexión para sincronizar las firmas pendientes. Conserva los datos del navegador hasta que el panel indique que se sincronizaron.

## Operación

Instala las dependencias desde este directorio con `npm ci`. Ejecuta `npm test` para compilar y probar el Worker con una base D1 local y un transporte de correo simulado. Aplica las migraciones necesarias con `npx wrangler d1 migrations apply mariahesed-waivers --remote` y publica con `npm run deploy`.

El acceso por correo se envía exclusivamente a STUDIO_EMAIL. Requiere una cookie segura HttpOnly y un identificador privado del navegador para consultar el archivo. El binding privado STUDIO sigue validando los accesos de integraciones existentes. D1 guarda cada PDF y las respuestas cifrados con AES-GCM. Configura RECORD_KEY con una clave de 32 bytes en base64, MAIL_KEY con una clave de envío de Resend y STUDIO_EMAIL con el buzón confirmado del estudio. Conserva la clave de cifrado para poder recuperar el archivo. Su sustitución requiere migrar los registros cifrados existentes.

La firma, el archivo y ambas tareas de correo se confirman en una misma transacción. Los reintentos usan una clave de idempotencia por documento y destinatario. El panel indica cuántas copias ha aceptado el proveedor. Los formularios se conservan hasta que el estudio los elimina del archivo. En la tablet, cada registro cifrado pendiente se elimina después de que el servidor confirme su recepción.

El texto de la versión MH-2026-11-10.1 se transcribió de las dos páginas facilitadas por el estudio. La fuente lo identifica como borrador para revisión jurídica. Conserva cada versión publicada para poder sincronizar documentos ya firmados sin conexión.
