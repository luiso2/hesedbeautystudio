import { createGiftCardCheckout, giftAmountToCents } from "./gift-cards.js";

const messages = {
  es: {
    buy: "Comprar Gift Card", busy: "Preparando el pago…",
    redirect: "Tu enlace está listo. Abriendo el pago seguro…",
    presets: "Montos sugeridos",
    amount: "Escribe un monto entre US$5 y US$100,000, con un máximo de dos decimales.",
    details: "Revisa el nombre y los correos electrónicos antes de continuar.",
    rateLimit: "Hay varios intentos recientes. Inténtalo más tarde o escríbenos por WhatsApp.",
    unavailable: "La compra no está disponible por el momento. Escríbenos por WhatsApp.",
    payment: "No pudimos preparar el pago. Inténtalo de nuevo en unos minutos.",
    network: "No pudimos conectar con el pago. Revisa tu conexión e inténtalo de nuevo.",
  },
  en: {
    buy: "Buy Gift Card", busy: "Preparing payment…",
    redirect: "Your link is ready. Opening secure payment…",
    presets: "Suggested amounts",
    amount: "Enter an amount between US$5 and US$100,000, with up to two decimal places.",
    details: "Check the name and email addresses before continuing.",
    rateLimit: "There have been several recent attempts. Try again later or message us on WhatsApp.",
    unavailable: "Gift Card purchases are temporarily unavailable. Please message us on WhatsApp.",
    payment: "We couldn't prepare your payment. Please try again in a few minutes.",
    network: "We couldn't connect to payment. Check your connection and try again.",
  },
};

export function initGiftCardForm(getLanguage) {
  const form = document.querySelector("#gift-form");
  if (!form) return null;
  const amount = form.elements.amount;
  const controls = form.querySelector("#gift-controls");
  const send = form.querySelector("#gift-send");
  const recipient = form.querySelector("#gift-recipient");
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector("[data-gift-submit]");
  const error = form.querySelector("#gift-error");
  const status = form.querySelector("#gift-status");
  const presets = [...form.querySelectorAll("[data-gift-amount]")];
  let busy = false;
  let errorCode = null;
  let redirecting = false;
  const tr = (key) => messages[getLanguage() === "en" ? "en" : "es"][key];

  function updateAmount() {
    const cents = giftAmountToCents(amount.value);
    amount.setCustomValidity(cents == null ? tr("amount") : "");
    const number = cents == null ? "—" : new Intl.NumberFormat(
      getLanguage() === "en" ? "en-US" : "es-US",
      { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 },
    ).format(cents / 100);
    document.querySelector("[data-gift-preview-amount]").textContent = `US$${number}`;
    form.querySelector("[data-gift-total]").textContent = `US$${number}`;
    presets.forEach((button) => button.setAttribute(
      "aria-pressed", String(cents === Number(button.dataset.giftAmount) * 100),
    ));
  }

  function refreshLanguage() {
    updateAmount();
    form.querySelector(".gift-form__presets").setAttribute("aria-label", tr("presets"));
    submitLabel.textContent = tr(busy ? "busy" : "buy");
    error.textContent = errorCode ? tr(errorCode) : "";
    status.textContent = busy ? tr(redirecting ? "redirect" : "busy") : "";
  }

  function clearError() {
    errorCode = null;
    error.hidden = true;
    error.textContent = "";
  }

  function setBusy(next) {
    busy = next;
    controls.disabled = next;
    submit.disabled = next;
    form.setAttribute("aria-busy", String(next));
    refreshLanguage();
  }

  presets.forEach((button) => button.addEventListener("click", () => {
    amount.value = button.dataset.giftAmount;
    clearError();
    updateAmount();
  }));
  amount.addEventListener("input", updateAmount);
  form.addEventListener("input", clearError);
  send.addEventListener("change", () => {
    recipient.hidden = !send.checked;
    recipient.disabled = !send.checked;
    clearError();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    updateAmount();
    if (!form.reportValidity()) return;
    clearError();
    const fields = {
      amount: amount.value,
      buyerName: form.elements.buyer_name.value,
      buyerEmail: form.elements.buyer_email.value,
      sendToRecipient: send.checked,
      recipientName: form.elements.recipient_name.value,
      recipientEmail: form.elements.recipient_email.value,
      message: form.elements.message.value,
    };
    setBusy(true);
    try {
      const url = await createGiftCardCheckout(fields);
      redirecting = true;
      refreshLanguage();
      window.location.assign(url);
    } catch (failure) {
      errorCode = failure.code && messages.es[failure.code] ? failure.code : "payment";
      error.textContent = tr(errorCode);
      error.hidden = false;
      error.setAttribute("tabindex", "-1");
      error.focus();
      setBusy(false);
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      redirecting = false;
      setBusy(false);
      clearError();
    }
  });
  form.hidden = false;
  document.querySelector("#gift-fallback").hidden = true;
  refreshLanguage();
  return { refreshLanguage };
}
