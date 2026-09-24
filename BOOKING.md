# Reservas de María Hesed

El catálogo tiene 32 tratamientos con identificadores estables en `data-booking-id`. `src/booking-catalog.json` es la lista que usa el formulario y valida el Worker. Los precios confirmados se muestran en dólares; si no hay importe confirmado, el formulario muestra «Consultar el precio». Fibroblast por zona y depilación con cera requieren elegir un área.

Al pulsar «Reservar este servicio», se abre el formulario con ese servicio seleccionado. El cliente indica fecha y hora **preferidas**, nombre, teléfono y correo opcional. La solicitud se guarda en D1 con estado `pending` y recibe una referencia. La fecha no es un hueco confirmado: María revisa disponibilidad y contacta al cliente. No se cobra nada todavía. El enlace a WhatsApp de la pantalla de éxito es opcional y requiere que el cliente envíe el mensaje.

Panel privado: `https://mariahesed.com/admin-reservas.html`. La clave de administración se guarda como secreto `BOOKING_ADMIN_TOKEN` en Cloudflare y en el archivo local ignorado por Git `.secrets/booking-admin-key.txt`; no pertenece al repositorio. El panel permite filtrar solicitudes y marcarlas como confirmadas, rechazadas, canceladas o pendientes. Cambiar un estado no envía una notificación automáticamente: hay un botón para abrir la conversación de WhatsApp con un borrador de respuesta. Una restricción de base de datos impide confirmar dos solicitudes con la misma fecha y hora; todavía no hay duraciones/horarios configurados para detectar sesiones que se solapen.

Base de datos: `mariahesed-bookings`, binding `BOOKINGS_DB`. Aplicar migraciones con `npx wrangler d1 migrations apply mariahesed-bookings --local` o `--remote`. El desarrollo local usa `.dev.vars` para `BOOKING_ADMIN_TOKEN`; ese archivo está ignorado por Git.

Antes de ofrecer confirmación automática o horarios disponibles al público, obtener de María los días y horas de atención, duraciones y tiempos de preparación de los tratamientos, cierres y política de cancelación. Para cobrar una reserva, integrar después la app/cuenta de Stripe que proporcionará el cliente; nunca confiar en precios enviados desde el navegador.
