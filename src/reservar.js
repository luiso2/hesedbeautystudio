import catalog from "./booking-catalog.json";
import { resolveCart, cartTotals, itemKey, MAX_ITEMS } from "./booking-cart.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const byId = new Map(catalog.map((item) => [item.id, item]));
const categories = [
  ["all", "Todos", "All"],
  ["corporal", "Corporal", "Body"],
  ["facial", "Facial", "Facial"],
  ["fibroblast", "Fibroblast", "Fibroblast"],
  ["cejas", "Cejas y depilación", "Brows & waxing"],
];
const translations = {
  es: {
    skip: "Saltar a la reserva", close: "Cerrar", eyebrow: "MARÍA HESED · RESERVAS",
    title: "Reserva tu momento.", intro: "Elige tu tratamiento, consulta el precio y dinos cuándo prefieres venir. María confirmará tu cita personalmente.",
    progressService: "Servicio", progressDate: "Fecha", progressDetails: "Tus datos", progressReview: "Revisión",
    step1count: "PASO 01 / 04", step1title: "Elige tu tratamiento", step1lead: "Busca tu tratamiento o elige una categoría. Toca el servicio que prefieras para continuar.",
    searchService: "Buscar un servicio", searchPlaceholder: "Ej. facial, maderoterapia…", clearSearch: "Borrar búsqueda",
    noResults: "No encontramos ese tratamiento. Prueba otro nombre o mira todos los servicios.", viewAll: "Ver todos los servicios",
    selectedService: "Servicio seleccionado", changeService: "Cambiar servicio", returnSelection: "Volver a mi selección",
    selectionLead: "Comprueba tu elección. Puedes cambiar el servicio antes de continuar.",
    serviceCount: "servicios", oneService: "servicio", chooseArea: "Selecciona la zona", areas: "Precios por zona",
    step2count: "PASO 02 / 04", step2title: "¿Cuándo te gustaría venir?", step2lead: "Indica una fecha y hora preferidas en Miami. Te confirmaremos la disponibilidad antes de fijar la cita.",
    date: "Fecha preferida", time: "Hora preferida · Miami", noLiveAvailability: "Todavía no mostramos horarios disponibles en tiempo real. Esta fecha y hora son una solicitud, no una cita confirmada.",
    step3count: "PASO 03 / 04", step3title: "Tus datos de contacto", step3lead: "María usará estos datos para confirmar la disponibilidad y los detalles de tu tratamiento.",
    name: "Nombre completo", phone: "WhatsApp o teléfono", email: "Correo electrónico · opcional", note: "Algo que debamos saber · opcional",
    consent: "Acepto que María Hesed use estos datos para contactarme sobre esta solicitud.",
    step4count: "PASO 04 / 04", step4title: "Revisa tu solicitud", step4lead: "Comprueba los detalles antes de enviarlos. No se realizará ningún cobro ahora.",
    depositLead: "Revisa tu solicitud. Al continuar irás a Merktop para pagar US$40 de depósito. María confirmará la disponibilidad y el saldo del tratamiento.",
    depositLabel: "Depósito ahora", depositValue: "US$40", depositSubmit: "Continuar al pago",
    depositPending: "Tu fecha y hora son una preferencia. María confirmará la disponibilidad después del pago.",
    paymentUnavailable: "El pago no está disponible en este momento. Inténtalo más tarde o contacta a María por WhatsApp.",
    pending: "Tu cita quedará pendiente hasta que María confirme la disponibilidad. Los tratamientos sin precio publicado se cotizarán personalmente.",
    back: "Volver", continue: "Continuar", submit: "Enviar solicitud", sending: "Enviando…",
    summaryEyebrow: "TU SELECCIÓN", summaryTitle: "Tu cita, a tu medida.", summaryFoot: "Cuidado personal en Miami",
    summaryEmpty: "Selecciona un tratamiento para ver su precio y continuar.", price: "Precio", askPrice: "Consultar el precio",
    from: "Desde", service: "Tratamiento", area: "Zona", preferred: "Fecha y hora preferidas", contact: "Contacto",
    successKicker: "SOLICITUD ENVIADA", successTitle: "Tu solicitud está en manos de María.",
    successText: "La cita todavía no está confirmada. María revisará tu horario preferido y te contactará para confirmar los detalles.",
    whatsapp: "Enviar también por WhatsApp", home: "Volver al inicio", help: "¿Tienes preguntas?",
    reference: "Referencia", selectServiceError: "Selecciona un tratamiento para continuar.",
    selectAreaError: "Selecciona una zona para ver su precio y continuar.",
    dateError: "Elige una fecha y hora válidas.", detailsError: "Revisa tu nombre, teléfono y correo electrónico.",
    consentError: "Acepta el uso de tus datos para que María pueda contactarte.",
    rateLimited: "Has enviado varias solicitudes. Espera una hora antes de volver a intentarlo.",
    serverError: "No pudimos guardar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.",
  },
  en: {
    skip: "Skip to booking", close: "Close", eyebrow: "MARÍA HESED · BOOKINGS",
    title: "Book your moment.", intro: "Choose your treatment, see its price and tell us when you would like to visit. María will confirm your appointment personally.",
    progressService: "Service", progressDate: "Date", progressDetails: "Your details", progressReview: "Review",
    step1count: "STEP 01 / 04", step1title: "Choose your treatment", step1lead: "Search for a treatment or choose a category. Tap the service you would like to continue.",
    searchService: "Search for a service", searchPlaceholder: "E.g. facial, wood therapy…", clearSearch: "Clear search",
    noResults: "We couldn't find that treatment. Try another name or view all services.", viewAll: "View all services",
    selectedService: "Selected service", changeService: "Change service", returnSelection: "Back to my selection",
    selectionLead: "Check your selection. You can change your service before continuing.",
    serviceCount: "services", oneService: "service", chooseArea: "Choose an area", areas: "Prices by area",
    step2count: "STEP 02 / 04", step2title: "When would you like to visit?", step2lead: "Choose your preferred date and time in Miami. We will confirm availability before setting the appointment.",
    date: "Preferred date", time: "Preferred time · Miami", noLiveAvailability: "Live availability is not shown yet. Your date and time are a request, not a confirmed appointment.",
    step3count: "STEP 03 / 04", step3title: "Your contact details", step3lead: "María will use these details to confirm availability and your treatment.",
    name: "Full name", phone: "WhatsApp or phone", email: "Email · optional", note: "Anything we should know · optional",
    consent: "I agree that María Hesed may use these details to contact me about this request.",
    step4count: "STEP 04 / 04", step4title: "Review your request", step4lead: "Check the details before sending them. No payment is taken now.",
    depositLead: "Review your request. Continue to Merktop to pay a US$40 deposit. María will confirm availability and the remaining treatment balance.",
    depositLabel: "Deposit now", depositValue: "US$40", depositSubmit: "Continue to payment",
    depositPending: "Your date and time are a preference. María will confirm availability after payment.",
    paymentUnavailable: "Payment is unavailable right now. Please try again later or contact María on WhatsApp.",
    pending: "Your appointment remains pending until María confirms availability. Treatments without a published price will be quoted personally.",
    back: "Back", continue: "Continue", submit: "Send request", sending: "Sending…",
    summaryEyebrow: "YOUR SELECTION", summaryTitle: "Care made for you.", summaryFoot: "Personal care in Miami",
    summaryEmpty: "Select a treatment to see its price and continue.", price: "Price", askPrice: "Ask for pricing",
    from: "From", service: "Treatment", area: "Area", preferred: "Preferred date and time", contact: "Contact",
    successKicker: "REQUEST SENT", successTitle: "María has received your request.",
    successText: "Your appointment is not confirmed yet. María will review your preferred time and contact you to confirm the details.",
    whatsapp: "Also send via WhatsApp", home: "Back to home", help: "Questions?",
    reference: "Reference", selectServiceError: "Choose a treatment to continue.",
    selectAreaError: "Choose an area to see its price and continue.",
    dateError: "Choose a valid date and time.", detailsError: "Check your name, phone number and email.",
    consentError: "Agree to the use of your details so María can contact you.",
    rateLimited: "You have sent several requests. Please wait an hour before trying again.",
    serverError: "We couldn't save your request. Please try again or contact us on WhatsApp.",
  },
};

let lang = "es";
try { lang = localStorage.getItem("hesed-lang") === "en" ? "en" : "es"; } catch {}
let step = 1;
let activeCategory = "corporal";
let serviceId = byId.has(new URLSearchParams(location.search).get("service"))
  ? new URLSearchParams(location.search).get("service") : "";
let selectedItems = [];
let pickerOpen = false;
let pickerReturnFocus = null;
let searchQuery = "";
const tr = (key) => translations[lang][key];
const priceText = (entry) => entry?.price == null ? tr("askPrice") : entry.from ? `${tr("from")} US$${entry.price}` : `US$${entry.price}`;
const money = (cents) => `US$${(cents / 100).toLocaleString(lang === 'en' ? 'en-US' : 'es-US', { maximumFractionDigits: 2 })}`;
const totals = () => cartTotals(selectedItems);
const depositRequired = () => selectedItems.length > 0 && !totals().policyPending;
const fullName = (item) => item.name[lang] + (item.optionName ? ` · ${item.optionName[lang]}` : '');
const totalText = () => totals().hasUnknown ? (totals().knownCents ? `${money(totals().knownCents)} + ${tr('askPrice')}` : tr('askPrice')) : `${totals().estimated ? tr('from') + ' ' : ''}${money(totals().knownCents)}`;
Object.assign(translations.es, {
  step1title: 'Tu selección de tratamientos', step1lead: 'Combina los servicios que quieras en una misma cita. Agrega o quita tratamientos aquí.',
  addService: '+ Agregar servicio', remove: 'Quitar', added: 'Agregado', done: 'Listo', total: 'Total de tratamientos',
  perService: 'Depósito de US$40 por cada servicio. Verás el total antes de pagar.',
  depositLead: 'Revisa tu selección. Continuarás a Merktop para pagar el depósito de los servicios elegidos. María confirmará tu horario personalmente.',
  lowPricePending: 'El depósito de los servicios con precio inferior a US$40 está pendiente de confirmación. Consulta con María por WhatsApp antes de reservarlos.',
  maxItems: 'Puedes agregar hasta 12 servicios por solicitud.',
});
Object.assign(translations.en, {
  step1title: 'Your treatment selection', step1lead: 'Combine services in one appointment. Add or remove treatments here.',
  addService: '+ Add service', remove: 'Remove', added: 'Added', done: 'Done', total: 'Treatment total',
  perService: 'US$40 deposit per service. You will see the total before paying.',
  depositLead: 'Review your selection. Continue to Merktop to pay the deposit for your selected services. María will personally confirm your time.',
  lowPricePending: 'The deposit for services priced below US$40 is awaiting confirmation. Please contact María on WhatsApp before booking these services.',
  maxItems: 'You can add up to 12 services per request.',
});

function miamiToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
const today = miamiToday();
const latest = new Date(`${today}T12:00:00Z`);
latest.setUTCDate(latest.getUTCDate() + 180);
$("#booking-date").min = today;
$("#booking-date").max = latest.toISOString().slice(0, 10);
$("#year").textContent = new Date().getFullYear();

function renderCategories(focusActive = false) {
  const root = $("#booking-categories");
  root.replaceChildren();
  categories.forEach(([key, es, en]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = lang === "en" ? en : es;
    button.className = key === activeCategory ? "is-active" : "";
    button.setAttribute("aria-pressed", String(key === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = key;
      searchQuery = "";
      $("#booking-search").value = "";
      renderCategories(true);
      renderServices();
    });
    root.append(button);
  });
  if (focusActive) $(".is-active", root)?.focus({ preventScroll: true });
}

const normalizeSearch = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function renderServices() {
  const root = $("#booking-services");
  root.replaceChildren();
  const words = normalizeSearch(searchQuery.trim()).split(/\s+/).filter(Boolean);
  const matches = catalog.filter((item) => {
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    const category = categories.find(([key]) => key === item.category);
    const text = normalizeSearch([item.name.es, item.name.en, ...category.slice(1),
      ...(item.options || []).flatMap((entry) => [entry.name.es, entry.name.en])].join(" "));
    return words.every((word) => text.includes(word));
  });
  $("#booking-search-clear").hidden = !searchQuery;
  $("#booking-search-empty").hidden = matches.length > 0;
  $("#booking-results-count").textContent = `${matches.length} ${tr(matches.length === 1 ? "oneService" : "serviceCount")}`;
  matches.forEach((item) => {
    if (item.options?.length) {
      const group = document.createElement('details');
      group.className = 'picker-areas';
      group.open = item.id === serviceId || !!searchQuery;
      const summary = document.createElement('summary');
      summary.textContent = `${item.name[lang]} · ${tr('areas')}`;
      group.append(summary);
      item.options.forEach((option) => group.append(serviceButton(item, option)));
      root.append(group);
    } else root.append(serviceButton(item));
  });
}
function serviceButton(item, option) {
  const key = itemKey({ serviceId: item.id, optionId: option?.id });
  const selected = selectedItems.some((entry) => itemKey(entry) === key);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `booking-service${selected ? ' is-selected' : ''}`;
  button.dataset.id = key;
  button.setAttribute('aria-pressed', String(selected));
  const mark = document.createElement('span'); mark.className = 'booking-service__mark'; mark.textContent = selected ? '✓' : '+'; mark.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.className = 'booking-service__name'; name.textContent = (option || item).name[lang];
  const price = document.createElement('span'); price.className = 'booking-service__price'; price.textContent = priceText(option || item);
  button.append(mark, name, price);
  button.setAttribute('aria-label', `${selected ? tr('remove') : tr('addService')} ${item.name[lang]}${option ? ' · ' + option.name[lang] : ''}, ${price.textContent}`);
  button.addEventListener('click', () => {
    if (selected) selectedItems = selectedItems.filter((entry) => itemKey(entry) !== key);
    else {
      if (selectedItems.length >= MAX_ITEMS) { $('#picker-count').textContent = tr('maxItems'); return; }
      selectedItems.push(resolveCart([{ serviceId: item.id, optionId: option?.id }])[0]);
    }
    clearError();
    // Replace only this row, preserving scroll and expanded groups.
    const replacement = serviceButton(item, option);
    button.replaceWith(replacement); replacement.focus({ preventScroll: true });
    updateSummary();
  });
  return button;
}
function setPickerOpen(open, opener = null) {
  pickerOpen = open;
  const dialog = $('#service-picker');
  if (open) {
    pickerReturnFocus = opener || $('#booking-add');
    renderCategories(); renderServices();
    dialog.showModal();
    document.documentElement.classList.add('picker-is-open');
    $('#picker-close').focus({ preventScroll: true });
  } else if (dialog.open) dialog.close();
}
function updateSummary() {
  const root = $('#booking-summary-detail');
  const inline = $('#booking-selection-inline');
  root.replaceChildren(); inline.replaceChildren();
  $('#picker-count').textContent = `${selectedItems.length} ${tr(selectedItems.length === 1 ? 'oneService' : 'serviceCount')} · ${tr('depositLabel')}: ${money(totals().depositCents)}`;
  if (!selectedItems.length) {
    const empty = document.createElement('p'); empty.className = 'booking-summary__empty'; empty.textContent = tr('summaryEmpty');
    root.append(empty); inline.append(empty.cloneNode(true)); return;
  }
  selectedItems.forEach((item) => {
    const row = document.createElement('article'); row.className = 'booking-cart-item';
    const text = document.createElement('div');
    const name = document.createElement('h3'); name.textContent = fullName(item);
    const price = document.createElement('p'); price.textContent = priceText(item);
    text.append(name, price);
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = tr('remove');
    remove.setAttribute('aria-label', `${tr('remove')} ${fullName(item)}`);
    remove.addEventListener('click', () => {
      selectedItems = selectedItems.filter((entry) => itemKey(entry) !== itemKey(item)); updateSummary();
      $('#booking-add').focus({ preventScroll: true });
    });
    row.append(text, remove); inline.append(row);
    const summary = document.createElement('p'); summary.className = 'booking-summary__item'; summary.textContent = `${fullName(item)} · ${priceText(item)}`; root.append(summary);
  });
  const total = document.createElement('p'); total.className = 'booking-summary__price'; total.textContent = `${tr('total')}: ${totalText()}`; root.append(total);
  const deposit = document.createElement('p'); deposit.className = 'booking-summary__deposit'; deposit.textContent = `${tr('depositLabel')}: ${money(totals().depositCents)} (${selectedItems.length} × US$40)`; root.append(deposit);
  const pending = document.createElement('p'); pending.className = 'booking-summary__pending'; pending.textContent = tr(totals().policyPending ? 'lowPricePending' : 'depositPending'); root.append(pending);
  if ($('#booking-date').value && $('#booking-time').value) {
    const when = document.createElement('p'); when.className = 'booking-summary__when'; when.textContent = `${$('#booking-date').value} · ${$('#booking-time').value} (Miami)`; root.append(when);
  }
  if (step === 4) renderReview();
}

function clearError() {
  $("#booking-error").hidden = true;
  $("#booking-error").textContent = "";
}
function showError(key) {
  const node = $("#booking-error");
  node.textContent = tr(key);
  node.hidden = false;
  node.scrollIntoView({ block: "nearest" });
}
function showStep(next, focus = true) {
  step = next;
  clearError();
  $$(".booking-step").forEach((section) => { section.hidden = Number(section.dataset.step) !== step; });
  $$("[data-progress]").forEach((item) => {
    const number = Number(item.dataset.progress);
    item.classList.toggle("is-current", number === step);
    item.classList.toggle("is-complete", number < step);
    if (number === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  $("#booking-back").hidden = step === 1;
  $("#booking-next").hidden = step === 4;
  $("#booking-submit").hidden = step !== 4;
  if (step === 4) renderReview();
  if (focus) {
    $(".booking-wizard").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    $(`[data-step="${step}"] h2`).setAttribute("tabindex", "-1");
    $(`[data-step="${step}"] h2`).focus({ preventScroll: true });
  }
}

function validStep() {
  if (step === 1 && !selectedItems.length) { showError('selectServiceError'); $('#booking-add').focus(); return false; }
  if (step === 1 && totals().policyPending) { showError('lowPricePending'); return false; }
  if (step === 2) {
    const date = $("#booking-date");
    const time = $("#booking-time");
    if (!date.checkValidity() || !time.checkValidity() || date.value < today || date.value > date.max)
      return showError("dateError"), (date.checkValidity() ? time : date).focus(), false;
  }
  if (step === 3) {
    const name = $("#booking-name");
    const phone = $("#booking-phone");
    const email = $("#booking-email");
    const validPhone = /^[+()\d\s.-]{10,30}$/.test(phone.value.trim()) &&
      phone.value.replace(/\D/g, "").length >= 10;
    if (name.value.trim().length < 2 || !validPhone || !email.checkValidity())
      return showError("detailsError"), (name.value.trim().length < 2 ? name : !validPhone ? phone : email).focus(), false;
    if (!$("#booking-consent").checked) return showError("consentError"), $("#booking-consent").focus(), false;
  }
  return true;
}

function renderReview() {
  const deposit = depositRequired();
  $("[data-t='step4lead']").textContent = tr(deposit ? "depositLead" : "step4lead");
  $("[data-step='4'] [data-t='pending']").textContent = tr(deposit ? "depositPending" : "pending");
  $("#booking-submit").innerHTML = `${tr(deposit ? "depositSubmit" : "submit")} <span aria-hidden="true">→</span>`;
  const rows = [
    ...selectedItems.map((item) => [fullName(item), priceText(item)]),
    [tr('total'), totalText()],
    [tr('depositLabel'), `${money(totals().depositCents)} (${selectedItems.length} × US$40)`],
    [tr("preferred"), `${$("#booking-date").value} · ${$("#booking-time").value} (Miami)`],
    [tr("contact"), `${$("#booking-name").value.trim()} · ${$("#booking-phone").value.trim()}`],
  ];
  const root = $("#booking-review");
  root.replaceChildren();
  rows.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    root.append(dt, dd);
  });
}

function setLang(next, save = false) {
  lang = next === "en" ? "en" : "es";
  document.documentElement.lang = lang;
  document.title = lang === "en" ? "Book an appointment · María Hesed" : "Reservar mi cita · María Hesed";
  $$("[data-t]").forEach((item) => {
    if (item.dataset.t === "title") {
      item.innerHTML = lang === "en" ? "Book your <em>moment.</em>" : "Reserva tu <em>momento.</em>";
    } else if (item.id === "booking-next" || item.id === "booking-submit") {
      item.innerHTML = `${tr(item.dataset.t)} <span aria-hidden="true">→</span>`;
    } else {
      item.textContent = tr(item.dataset.t);
    }
  });
  $$("[data-lang]").forEach((button) => {
    const selected = button.dataset.lang === lang;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $(".booking-progress").setAttribute("aria-label",
    lang === "en" ? "Booking steps" : "Pasos de la reserva");
  $("#booking-categories").setAttribute("aria-label",
    lang === "en" ? "Service categories" : "Categorías de servicios");
  $("#booking-services").setAttribute("aria-label",
    lang === "en" ? "Treatments" : "Tratamientos");
  $(".booking-summary").setAttribute("aria-label",
    lang === "en" ? "Booking summary" : "Resumen de la reserva");
  $("#booking-search").placeholder = tr("searchPlaceholder");
  $("#booking-search-clear").setAttribute("aria-label", tr("clearSearch"));
  renderCategories();
  renderServices();
  updateSummary();
  if (step === 4) renderReview();
  if (save) try { localStorage.setItem("hesed-lang", lang); } catch {}
}
$$("[data-lang]").forEach((button) =>
  button.addEventListener("click", () => setLang(button.dataset.lang, true)));
$("#booking-search").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  activeCategory = "all";
  renderCategories();
  renderServices();
});
function resetSearch() {
  searchQuery = "";
  activeCategory = "all";
  $("#booking-search").value = "";
  renderCategories();
  renderServices();
  $("#booking-search").focus({ preventScroll: true });
}
$("#booking-search-clear").addEventListener("click", resetSearch);
$("#booking-search-reset").addEventListener("click", resetSearch);
$('#booking-add').addEventListener('click', (event) => setPickerOpen(true, event.currentTarget));
$('#booking-add-summary').addEventListener('click', (event) => setPickerOpen(true, event.currentTarget));
$('#picker-close').addEventListener('click', () => setPickerOpen(false));
$('#picker-done').addEventListener('click', () => setPickerOpen(false));
$('#service-picker').addEventListener('close', () => {
  pickerOpen = false; document.documentElement.classList.remove('picker-is-open');
  (pickerReturnFocus?.isConnected ? pickerReturnFocus : $('#booking-add')).focus({ preventScroll: true });
});
$('#service-picker').addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); setPickerOpen(false); } });
["#booking-date", "#booking-time"].forEach((selector) =>
  $(selector).addEventListener("change", updateSummary));
$("#booking-back").addEventListener("click", () => showStep(step - 1));
$("#booking-next").addEventListener("click", () => { if (validStep()) showStep(step + 1); });
$("#booking-wizard").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (step !== 4) return;
  if (!selectedItems.length) { showStep(1); showError('selectServiceError'); return; }
  if (totals().policyPending) { showError('lowPricePending'); return; }
  const button = $("#booking-submit");
  button.disabled = true;
  button.textContent = tr("sending");
  clearError();
  const payload = {
    items: selectedItems.map(({serviceId, optionId}) => ({serviceId, optionId})), date: $("#booking-date").value, time: $("#booking-time").value,
    name: $("#booking-name").value.trim(), phone: $("#booking-phone").value.trim(),
    email: $("#booking-email").value.trim(), note: $("#booking-note").value.trim(),
    consent: $("#booking-consent").checked ? "on" : "", website: $('[name="website"]').value,
  };
  try {
    const response = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error === "rate_limited" ? "rateLimited" :
      result.error === "payment_unavailable" ? "paymentUnavailable" : "serverError");
    if (result.payment_url) {
      window.location.assign(result.payment_url);
      return;
    }
    $("#booking-flow").hidden = true;
    const success = $("#booking-success");
    success.hidden = false;
    $("#booking-reference").textContent = `${tr("reference")}: ${result.id}`;
    const message = [
      lang === "en" ? "Hello María, I submitted an appointment request." : "Hola María, envié una solicitud de cita.",
      `${tr("service")}: ${selectedItems.map(fullName).join(", ")}`,
      `${tr("preferred")}: ${payload.date} ${payload.time} (Miami)`,
      `${tr("reference")}: ${result.id}`,
    ].join("\n");
    $("#booking-whatsapp").href = `https://wa.me/17867095791?text=${encodeURIComponent(message)}`;
    success.scrollIntoView({ behavior: "smooth", block: "start" });
    success.focus({ preventScroll: true });
  } catch (error) {
    showError(["rateLimited", "paymentUnavailable"].includes(error.message) ? error.message : "serverError");
  } finally {
    button.disabled = false;
    button.innerHTML = `${tr(depositRequired() ? "depositSubmit" : "submit")} <span aria-hidden="true">→</span>`;
  }
});

// A service link from the home page arrives with its selection and price ready.
if (serviceId) {
  const initial = byId.get(serviceId); activeCategory = initial.category;
  if (!initial.options?.length) selectedItems = resolveCart([{serviceId}]);
}
setLang(lang);
if (serviceId && byId.get(serviceId).options?.length) setPickerOpen(true);
showStep(1, false);
