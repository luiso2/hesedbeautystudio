import catalog from "./booking-catalog.json";

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
    step1count: "PASO 01 / 04", step1title: "Elige tu tratamiento", step1lead: "Selecciona un servicio para ver su precio. Si tiene zonas, elige la tuya después.",
    chooseArea: "Selecciona la zona", selectArea: "Seleccionar zona", areas: "Precios por zona",
    step2count: "PASO 02 / 04", step2title: "¿Cuándo te gustaría venir?", step2lead: "Indica una fecha y hora preferidas en Miami. Te confirmaremos la disponibilidad antes de fijar la cita.",
    date: "Fecha preferida", time: "Hora preferida · Miami", noLiveAvailability: "Todavía no mostramos horarios disponibles en tiempo real. Esta fecha y hora son una solicitud, no una cita confirmada.",
    step3count: "PASO 03 / 04", step3title: "Tus datos de contacto", step3lead: "María usará estos datos para confirmar la disponibilidad y los detalles de tu tratamiento.",
    name: "Nombre completo", phone: "WhatsApp o teléfono", email: "Correo electrónico · opcional", note: "Algo que debamos saber · opcional",
    consent: "Acepto que María Hesed use estos datos para contactarme sobre esta solicitud.",
    step4count: "PASO 04 / 04", step4title: "Revisa tu solicitud", step4lead: "Comprueba los detalles antes de enviarlos. No se realizará ningún cobro ahora.",
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
    step1count: "STEP 01 / 04", step1title: "Choose your treatment", step1lead: "Select a service to see its price. If it has treatment areas, choose yours next.",
    chooseArea: "Choose an area", selectArea: "Select an area", areas: "Prices by area",
    step2count: "STEP 02 / 04", step2title: "When would you like to visit?", step2lead: "Choose your preferred date and time in Miami. We will confirm availability before setting the appointment.",
    date: "Preferred date", time: "Preferred time · Miami", noLiveAvailability: "Live availability is not shown yet. Your date and time are a request, not a confirmed appointment.",
    step3count: "STEP 03 / 04", step3title: "Your contact details", step3lead: "María will use these details to confirm availability and your treatment.",
    name: "Full name", phone: "WhatsApp or phone", email: "Email · optional", note: "Anything we should know · optional",
    consent: "I agree that María Hesed may use these details to contact me about this request.",
    step4count: "STEP 04 / 04", step4title: "Review your request", step4lead: "Check the details before sending them. No payment is taken now.",
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
let activeCategory = "all";
let serviceId = byId.has(new URLSearchParams(location.search).get("service"))
  ? new URLSearchParams(location.search).get("service") : "";
let optionId = "";
const tr = (key) => translations[lang][key];
const service = () => byId.get(serviceId);
const option = () => service()?.options?.find((entry) => entry.id === optionId);
const chosenPrice = () => service()?.options?.length ? option() : service();
const priceText = (entry) => entry?.price == null ? tr("askPrice")
  : entry.from ? `${tr("from")} US$${entry.price}` : `US$${entry.price}`;

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
      renderCategories(true);
      renderServices();
    });
    root.append(button);
  });
  if (focusActive) $(".is-active", root)?.focus({ preventScroll: true });
}

function renderOptions() {
  const wrap = $("#booking-option-wrap");
  const select = $("#booking-option");
  const options = service()?.options || [];
  wrap.hidden = !options.length;
  select.replaceChildren(new Option(tr("selectArea"), ""));
  options.forEach((item) => {
    select.add(new Option(`${item.name[lang]} · ${priceText(item)}`, item.id));
  });
  select.value = options.some((item) => item.id === optionId) ? optionId : "";
}

function renderServices(focusSelected = false) {
  const root = $("#booking-services");
  root.replaceChildren();
  catalog.filter((item) => activeCategory === "all" || item.category === activeCategory)
    .forEach((item) => {
      const selected = item.id === serviceId;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `booking-service${selected ? " is-selected" : ""}`;
      button.setAttribute("aria-pressed", String(selected));
      button.dataset.id = item.id;
      const mark = document.createElement("span");
      mark.className = "booking-service__mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = selected ? "✓" : "+";
      const name = document.createElement("span");
      name.className = "booking-service__name";
      name.textContent = item.name[lang];
      const price = document.createElement("span");
      price.className = "booking-service__price";
      price.textContent = item.options?.length ? tr("areas") : priceText(item);
      button.append(mark, name, price);
      button.addEventListener("click", () => {
        serviceId = item.id;
        optionId = "";
        history.replaceState(null, "", `/reservar?service=${encodeURIComponent(serviceId)}`);
        clearError();
        renderServices(true);
        renderOptions();
        updateSummary();
      });
      root.append(button);
    });
  const selected = $(".booking-service.is-selected", root);
  if (selected) {
    root.scrollTop = Math.max(0,
      selected.offsetTop - root.offsetTop - (root.clientHeight - selected.offsetHeight) / 2);
    if (focusSelected) selected.focus({ preventScroll: true });
  }
}

function updateSummary() {
  const root = $("#booking-summary-detail");
  const inline = $("#booking-selection-inline");
  root.replaceChildren();
  inline.replaceChildren();
  inline.hidden = !service();
  if (!service()) {
    const empty = document.createElement("p");
    empty.className = "booking-summary__empty";
    empty.textContent = tr("summaryEmpty");
    root.append(empty);
    return;
  }
  const name = document.createElement("p");
  name.className = "booking-summary__service";
  name.textContent = service().name[lang];
  root.append(name);
  if (option()) {
    const zone = document.createElement("p");
    zone.className = "booking-summary__zone";
    zone.textContent = option().name[lang];
    root.append(zone);
  }
  const price = document.createElement("p");
  price.className = "booking-summary__price";
  price.textContent = service().options?.length && !option() ? tr("areas") : priceText(chosenPrice());
  root.append(price);
  const inlineName = document.createElement("strong");
  inlineName.textContent = service().name[lang] + (option() ? ` · ${option().name[lang]}` : "");
  const inlinePrice = document.createElement("span");
  inlinePrice.textContent = price.textContent;
  inline.append(inlineName, inlinePrice);
  if ($("#booking-date").value && $("#booking-time").value) {
    const when = document.createElement("p");
    when.className = "booking-summary__when";
    when.textContent = `${$("#booking-date").value} · ${$("#booking-time").value} (Miami)`;
    root.append(when);
  }
  const pending = document.createElement("p");
  pending.className = "booking-summary__pending";
  pending.textContent = tr("pending");
  root.append(pending);
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
    $(".booking-wizard").scrollIntoView({ behavior: "smooth", block: "start" });
    $(`[data-step="${step}"] h2`).setAttribute("tabindex", "-1");
    $(`[data-step="${step}"] h2`).focus({ preventScroll: true });
  }
}

function validStep() {
  if (step === 1) {
    if (!service()) return showError("selectServiceError"), false;
    if (service().options?.length && !option()) return showError("selectAreaError"), $("#booking-option").focus(), false;
  }
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
  const rows = [
    [tr("service"), service().name[lang]],
    ...(option() ? [[tr("area"), option().name[lang]]] : []),
    [tr("price"), priceText(chosenPrice())],
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
  renderCategories();
  renderServices();
  renderOptions();
  updateSummary();
  if (step === 4) renderReview();
  if (save) try { localStorage.setItem("hesed-lang", lang); } catch {}
}
$$("[data-lang]").forEach((button) =>
  button.addEventListener("click", () => setLang(button.dataset.lang, true)));
$("#booking-option").addEventListener("change", (event) => {
  optionId = event.target.value;
  clearError();
  updateSummary();
});
["#booking-date", "#booking-time"].forEach((selector) =>
  $(selector).addEventListener("change", updateSummary));
$("#booking-back").addEventListener("click", () => showStep(step - 1));
$("#booking-next").addEventListener("click", () => { if (validStep()) showStep(step + 1); });
$("#booking-wizard").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (step !== 4) return;
  const button = $("#booking-submit");
  button.disabled = true;
  button.textContent = tr("sending");
  clearError();
  const payload = {
    serviceId, optionId, date: $("#booking-date").value, time: $("#booking-time").value,
    name: $("#booking-name").value.trim(), phone: $("#booking-phone").value.trim(),
    email: $("#booking-email").value.trim(), note: $("#booking-note").value.trim(),
    consent: $("#booking-consent").checked ? "on" : "", website: $('[name="website"]').value,
  };
  try {
    const response = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error === "rate_limited" ? "rateLimited" : "serverError");
    $("#booking-flow").hidden = true;
    const success = $("#booking-success");
    success.hidden = false;
    $("#booking-reference").textContent = `${tr("reference")}: ${result.id}`;
    const message = [
      lang === "en" ? "Hello María, I submitted an appointment request." : "Hola María, envié una solicitud de cita.",
      `${tr("service")}: ${service().name[lang]}${option() ? ` · ${option().name[lang]}` : ""}`,
      `${tr("preferred")}: ${payload.date} ${payload.time} (Miami)`,
      `${tr("reference")}: ${result.id}`,
    ].join("\n");
    $("#booking-whatsapp").href = `https://wa.me/17867095791?text=${encodeURIComponent(message)}`;
    success.scrollIntoView({ behavior: "smooth", block: "start" });
    success.focus({ preventScroll: true });
  } catch (error) {
    showError(error.message === "rateLimited" ? "rateLimited" : "serverError");
  } finally {
    button.disabled = false;
    button.innerHTML = `${tr("submit")} <span aria-hidden="true">→</span>`;
  }
});

// A service link from the home page arrives with its selection and price ready.
if (service()) activeCategory = service().category;
setLang(lang);
showStep(1, false);
