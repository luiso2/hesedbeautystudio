import catalog from "./booking-catalog.json";

const byId = new Map(catalog.map((service) => [service.id, service]));
const $ = (selector, root = document) => root.querySelector(selector);

function miamiToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function priceLabel(entry, lang) {
  if (!entry || entry.price == null)
    return lang === "en" ? "Ask for pricing" : "Consultar el precio";
  if (entry.from)
    return lang === "en" ? `From US$${entry.price}` : `Desde US$${entry.price}`;
  return `US$${entry.price}`;
}

export function initBooking(getLang) {
  const panel = $("#booking");
  const form = $("#booking-form");
  const serviceSelect = $("#booking-service");
  const optionSelect = $("#booking-option");
  const optionWrap = $("#booking-option-wrap");
  const price = $("#booking-price");
  const date = $("#booking-date");
  const submit = $(".booking-submit");
  const message = $("#booking-message");
  const success = $("#booking-success");
  const reference = $("#booking-reference");
  const whatsapp = $("#booking-whatsapp");
  new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("booking-in-view", entry.isIntersecting);
  }, { threshold: 0.08 }).observe(panel);

  const say = (es, en) => getLang() === "en" ? en : es;
  const currentService = () => byId.get(serviceSelect.value);
  const currentOption = () => currentService()?.options?.find((item) => item.id === optionSelect.value);

  function refreshPrice() {
    const service = currentService();
    const selected = service?.options?.length ? currentOption() : service;
    price.hidden = !service;
    price.textContent = service
      ? `${say("Precio", "Price")}: ${priceLabel(selected, getLang())}`
      : "";
  }

  function refreshOptions(previous = "") {
    const service = currentService();
    const options = service?.options || [];
    optionWrap.hidden = !options.length;
    optionSelect.required = !!options.length;
    optionSelect.replaceChildren(new Option(say("Seleccionar zona", "Select an area"), ""));
    options.forEach((item) => {
      optionSelect.add(new Option(`${item.name[getLang()]} · ${priceLabel(item, getLang())}`, item.id));
    });
    optionSelect.value = options.some((item) => item.id === previous) ? previous : "";
    refreshPrice();
  }

  function refresh() {
    const selected = serviceSelect.value;
    const option = optionSelect.value;
    serviceSelect.replaceChildren(new Option(say("Seleccionar tratamiento", "Select a treatment"), ""));
    for (const service of catalog)
      serviceSelect.add(new Option(service.name[getLang()], service.id));
    serviceSelect.value = byId.has(selected) ? selected : "";
    refreshOptions(option);
  }

  function open(serviceId = "") {
    if (serviceId && byId.has(serviceId)) {
      serviceSelect.value = serviceId;
      refreshOptions();
    }
    form.hidden = false;
    success.hidden = true;
    message.hidden = true;
    history.pushState(null, "", "#booking");
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    panel.scrollIntoView({ behavior: "auto", block: "start" });
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    panel.focus({ preventScroll: true });
  }

  document.querySelectorAll(".panel .card").forEach((card) => {
    const link = $(".card__link", card);
    if (!link || !byId.has(card.dataset.bookingId)) return;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      open(card.dataset.bookingId);
    });
  });
  document.querySelectorAll("[data-booking-open]").forEach((link) =>
    link.addEventListener("click", (event) => { event.preventDefault(); open(); }),
  );

  serviceSelect.addEventListener("change", () => refreshOptions());
  optionSelect.addEventListener("change", refreshPrice);
  const today = miamiToday();
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 180);
  date.min = today;
  date.max = limit.toISOString().slice(0, 10);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.hidden = true;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const payload = Object.fromEntries(values.entries());
    const service = currentService();
    const option = currentOption();
    submit.disabled = true;
    submit.textContent = say("Enviando…", "Sending…");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error === "rate_limited" ? "rate_limited" : "request_failed");
      }
      form.hidden = true;
      success.hidden = false;
      reference.textContent = `${say("Referencia", "Reference")}: ${result.id}`;
      const details = [
        say("Hola María, envié una solicitud de cita.", "Hello María, I submitted an appointment request."),
        `${say("Servicio", "Treatment")}: ${service.name[getLang()]}${option ? ` · ${option.name[getLang()]}` : ""}`,
        `${say("Fecha y hora preferidas", "Preferred date and time")}: ${payload.date} ${payload.time} (Miami)`,
        `${say("Referencia", "Reference")}: ${result.id}`,
      ].join("\n");
      whatsapp.href = `https://wa.me/17867095791?text=${encodeURIComponent(details)}`;
      success.focus({ preventScroll: true });
    } catch (error) {
      message.textContent = error.message === "rate_limited"
        ? say("Has enviado varias solicitudes. Espera una hora antes de volver a intentarlo.", "You have sent several requests. Please wait an hour before trying again.")
        : say("No pudimos guardar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.", "We couldn't save your request. Please try again or contact us on WhatsApp.");
      message.hidden = false;
      message.focus?.();
    } finally {
      submit.disabled = false;
      submit.textContent = say("Enviar solicitud", "Send request");
    }
  });

  $("#booking-again").addEventListener("click", () => {
    form.reset();
    serviceSelect.value = "";
    refreshOptions();
    form.hidden = false;
    success.hidden = true;
    serviceSelect.focus();
  });

  refresh();
  const initialService = new URLSearchParams(location.search).get("service");
  if (initialService && byId.has(initialService)) {
    serviceSelect.value = initialService;
    refreshOptions();
  }
  return { refresh };
}
