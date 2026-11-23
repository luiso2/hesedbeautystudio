import { translations } from "./booking-translations.js";
import { servicePricing, discountPercent } from './promotion.js';
import { bookingTerms, TERMS_VERSION } from "./booking-terms.js";
import catalog from "./booking-catalog.json";
import { resolveCart, cartTotals, itemKey, MAX_ITEMS, STANDARD_DEPOSIT_CENTS } from "./booking-cart.js";

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

let lang = document.documentElement.lang;
let step = 1;
let activeCategory = "corporal";
let serviceId = byId.has(new URLSearchParams(location.search).get("service"))
  ? new URLSearchParams(location.search).get("service") : "";
let selectedItems = [];
let lastReviewSelection = null;
let pickerOpen = false;
let pickerReturnFocus = null;
let searchQuery = "";
const tr = (key) => translations[lang][key];
function priceText(entry) {
  if (entry?.massagePackage) return bookingTerms[lang].packagePrice;
  if (entry?.price == null) return tr('askPrice');
  const quote = entry.serviceId ? entry : servicePricing(entry.price);
  const prefix = entry.from ? tr('from') + ' ' : '';
  return prefix + 'US$' + quote.price + (quote.promotion
    ? ` (−${discountPercent}% · ${lang === 'en' ? 'was' : 'antes'} US$${quote.basePrice})` : '');
}
const money = (cents) => `US$${(cents / 100).toLocaleString(lang === 'en' ? 'en-US' : 'es-US', { maximumFractionDigits: 2 })}`;
const totals = () => cartTotals(selectedItems);
const depositRequired = () => selectedItems.length > 0 && !totals().policyPending;
// The "n × US$40" breakdown only holds when every service pays the standard deposit.
const depositText = () => money(totals().depositCents) +
  (totals().depositCents === selectedItems.length * STANDARD_DEPOSIT_CENTS ? ` (${selectedItems.length} × US$40)` : '');
const fullName = (item) => item.name[lang] + (item.optionName ? ` · ${item.optionName[lang]}` : '');
const totalText = () => totals().hasUnknown ? (totals().knownCents ? `${money(totals().knownCents)} + ${tr('askPrice')}` : tr('askPrice')) : `${totals().estimated ? tr('from') + ' ' : ''}${money(totals().knownCents)}`;


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
      summary.textContent = `${item.name[lang]} · ${tr(item.optionType === 'duration' ? 'durations' : 'areas')}`;
      group.append(summary);
      item.options.forEach((option) => group.append(serviceButton(item, option)));
      root.append(group);
    } else root.append(serviceButton(item));
  });
}
function packageChoice(item, inPicker = false) {
  const label = document.createElement('label');
  label.className = 'booking-package-choice';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!item.massagePackage;
  input.dataset.packageFor = item.serviceId;
  input.setAttribute('aria-label', item.name[lang] + ' · ' + bookingTerms[lang].choosePackage);
  label.append(input, document.createTextNode(bookingTerms[lang].choosePackage));
  input.addEventListener('change', () => {
    const index = selectedItems.findIndex(entry => itemKey(entry) === itemKey(item));
    if (index < 0) return;
    selectedItems[index] = resolveCart([{ serviceId: item.serviceId, massagePackage: input.checked }])[0];
    updateSummary();
    if (inPicker) renderServices();
    const scope = inPicker ? $('#booking-services') : $('#booking-selection-inline');
    scope.querySelector(`[data-package-for="${item.serviceId}"]`)?.focus({ preventScroll: true });
  });
  return label;
}

function serviceButton(item, option) {
  const key = itemKey({ serviceId: item.id, optionId: option?.id });
  const selected = selectedItems.find((entry) => itemKey(entry) === key);
  const row = document.createElement('div');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `booking-service${selected ? ' is-selected' : ''}`;
  button.dataset.id = key;
  button.setAttribute('aria-pressed', String(!!selected));
  const mark = document.createElement('span'); mark.className = 'booking-service__mark'; mark.textContent = selected ? '✓' : '+'; mark.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span'); name.className = 'booking-service__name'; name.textContent = (option || item).name[lang];
  const price = document.createElement('span'); price.className = 'booking-service__price'; price.textContent = priceText(selected || option || item);
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
    row.replaceWith(replacement); replacement.querySelector('button').focus({ preventScroll: true });
    updateSummary();
  });
  row.append(button);
  if (selected && item.offersMassagePackage) row.append(packageChoice(selected, true));
  return row;
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
    root.append(empty); inline.append(empty.cloneNode(true));
    if (step === 4) renderReview();
    return;
  }
  selectedItems.forEach((item) => {
    const row = document.createElement('article'); row.className = 'booking-cart-item';
    const text = document.createElement('div');
    const name = document.createElement('h3'); name.textContent = fullName(item);
    const price = document.createElement('p'); price.textContent = priceText(item);
    text.append(name, price);
    if (byId.get(item.serviceId).offersMassagePackage) text.append(packageChoice(item));
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
  const deposit = document.createElement('p'); deposit.className = 'booking-summary__deposit'; deposit.textContent = `${tr('depositLabel')}: ${depositText()}`; root.append(deposit);
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
  node.textContent = tr(key) ?? bookingTerms[lang][key];
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
  const packages = selectedItems.filter(item => item.massagePackage);
  const signature = JSON.stringify([lang, $("#booking-name").value.trim(),
    selectedItems.map(item => [itemKey(item), !!item.massagePackage, item.price])]);
  if (lastReviewSelection !== signature) {
    $("#terms-general").checked = false;
    $("#terms-package").checked = false;
    lastReviewSelection = signature;
  }
  $("#terms-package-section").hidden = packages.length === 0;
  $("#terms-package").disabled = packages.length === 0;
  $("#terms-package").required = packages.length > 0;
  $("#terms-package-services").textContent = packages.map(item => item.name[lang]).join(" · ");
  const deposit = depositRequired();
  $("[data-t='step4lead']").textContent = tr(deposit ? "depositLead" : "step4lead");
  $("[data-step='4'] [data-t='pending']").textContent = tr(deposit ? "depositPending" : "pending");
  $("#booking-submit").innerHTML = `${tr(deposit ? "depositSubmit" : "submit")} <span aria-hidden="true">→</span>`;
  const rows = [
    ...selectedItems.map((item) => [fullName(item), priceText(item)]),
    [tr('total'), totalText()],
    [tr('depositLabel'), depositText()],
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
  if (save) {
    const destination = new URL(document.querySelector(`link[hreflang="${lang}"]`).href);
    history.replaceState(history.state, "", destination.pathname + location.search + location.hash);
    document.querySelector('link[rel="canonical"]').href = destination.href;
    document.title = translations[lang].pageTitle;
    document.querySelectorAll('.booking-brand, .booking-close, a[data-t="home"]').forEach(link => {
      link.href = lang === "en" ? "/en/" : "/";
    });
  }
  $$("[data-t]").forEach((item) => {
    if (item.dataset.t === "title") {
      item.innerHTML = lang === "en" ? "Book your <em>moment.</em>" : "Reserva tu <em>momento.</em>";
    } else if (item.id === "booking-next" || item.id === "booking-submit") {
      item.innerHTML = `${tr(item.dataset.t)} <span aria-hidden="true">→</span>`;
    } else {
      item.textContent = tr(item.dataset.t);
    }
  });
  $$("[data-terms]").forEach(node => { node.textContent = bookingTerms[lang][node.dataset.terms]; });
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
  const missing = $(".booking-terms input:required:not(:checked)");
  if (missing) {
    showError("required");
    missing.focus();
    return;
  }
  const button = $("#booking-submit");
  button.disabled = true;
  button.textContent = tr("sending");
  clearError();
  const payload = {
    quotedTotalCents: totals().knownCents,
    items: selectedItems.map(({serviceId, optionId, massagePackage}) => ({serviceId, optionId, massagePackage})), date: $("#booking-date").value, time: $("#booking-time").value,
    name: $("#booking-name").value.trim(), phone: $("#booking-phone").value.trim(),
    email: $("#booking-email").value.trim(), note: $("#booking-note").value.trim(),
    terms: { version: TERMS_VERSION, language: lang, general: $("#terms-general").checked, massagePackage: $("#terms-package").checked },
    consent: $("#booking-consent").checked ? "on" : "", website: $('[name="website"]').value,
  };
  try {
    const response = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (result.error === 'price_changed') {
      selectedItems = resolveCart(selectedItems);
      updateSummary();
      showError('priceChanged');
      return;
    }
    if (!response.ok) throw new Error(result.error === "rate_limited" ? "rateLimited" :
      result.error === "payment_unavailable" ? "paymentUnavailable" :
      result.error === "terms_version" ? "updated" : result.error === "terms_required" ? "required" : "serverError");
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
    success.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    success.focus({ preventScroll: true });
  } catch (error) {
    showError(["rateLimited", "paymentUnavailable", "required", "updated"].includes(error.message) ? error.message : "serverError");
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
