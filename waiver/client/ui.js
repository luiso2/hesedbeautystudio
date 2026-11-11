const params = new URLSearchParams(location.hash.slice(1));
export let lang =
  params.has("lang")
    ? (params.get("lang") === "en" ? "en" : "es")
    : sessionStorage.getItem("waiver-lang") === "en"
      ? "en"
      : "es";
export const app = document.querySelector("#app");
export const tr = (pair) => pair[lang === "en" ? 1 : 0];
export const node = (tag, cls) =>
  Object.assign(document.createElement(tag), cls ? { className: cls } : {});
export function labelText(el, pair) {
  el._pair = pair;
  el.textContent = tr(pair);
  return el;
}
export function copy(tag, es, en, cls) {
  return labelText(node(tag, cls), [es, en]);
}
export function button(pair, action, cls = "btn") {
  const b = labelText(node("button", cls), pair);
  b.type = "button";
  b.addEventListener("click", async () => {
    if (b.disabled) return;
    b.disabled = true;
    try {
      await action();
    } catch (e) {
      status(errorText(e));
    } finally {
      b.disabled = false;
    }
  });
  return b;
}
export function intro(title, lead) {
  app.replaceChildren(
    labelText(node("h1"), title),
    labelText(node("p", "intro"), lead),
  );
}
export function panel(pair, parent = app) {
  const p = node("section", "panel");
  if (pair) p.append(labelText(node("h2"), pair));
  parent.append(p);
  return p;
}
export function status(pair) {
  let el = document.querySelector("#message");
  if (!el) {
    el = node("p", "notice");
    el.id = "message";
    el.role = "alert";
    app.append(el);
  }
  labelText(el, pair);
  el.scrollIntoView({ block: "nearest" });
}
export const errors = {
  unauthorized: [
    "Tu sesión ha terminado. Vuelve a abrir tu acceso privado.",
    "Your session has ended. Reopen your private studio link.",
  ],
  access_expired: [
    "Este acceso no es válido. Usa el enlace privado vigente del estudio.",
    "This access link is invalid. Use the studio’s current private link.",
  ],
  invalid_link: [
    "Este enlace no es válido. Pide uno nuevo al estudio.",
    "This link is invalid. Ask the studio for a new link.",
  ],
  expired: [
    "El enlace ha vencido. Solicita uno nuevo al estudio.",
    "This link expired. Please request a new one.",
  ],
  already_signed: [
    "Este enlace ya se utilizó para firmar.",
    "This link was already used to sign.",
  ],
  email_mismatch: [
    "Usa el correo que recibió la invitación para firmar.",
    "Please use the email address that received this invitation.",
  ],
  invalid_form: [
    "Revisa los campos y la firma antes de continuar.",
    "Check your details and signature before continuing.",
  ],
  local_storage: [
    "El navegador no pudo guardar la firma. Descarga tu copia y vuelve a intentar el envío con conexión.",
    "The browser could not save the signature. Download a copy and retry online.",
  ],
};
export const errorText = (e) =>
  errors[e.message] || [
    "No se pudo completar. Comprueba la conexión y vuelve a intentarlo.",
    "Could not complete this action. Check your connection and try again.",
  ];
export function field(pair, type = "text", required = false, max = 254) {
  const label = node("label", "field"),
    caption = labelText(node("span"), pair);
  const input = node(type === "textarea" ? "textarea" : "input");
  if (type !== "textarea") input.type = type;
  input.required = required;
  input.maxLength = max;
  label.append(caption, input);
  return { label, input };
}
export function option(pair, type, name, value) {
  const label = node("label", "option"),
    input = node("input");
  Object.assign(input, { type, name, value });
  label.append(input, labelText(node("span"), pair));
  return { label, input };
}
export function chooseLang(l) {
  lang = l;
  document.documentElement.lang = l;
  sessionStorage.setItem("waiver-lang", l);
  for (const el of app.querySelectorAll("*"))
    if (el._pair) el.textContent = tr(el._pair);
  for (const k of ["es", "en"])
    document
      .querySelector("#" + k)
      .setAttribute("aria-pressed", String(l === k));
}
for (const l of ["es", "en"])
  document.querySelector("#" + l).onclick = () => chooseLang(l);
chooseLang(lang);
export async function api(path, options = {}) {
  const r = await fetch("/api/" + path, { cache: "no-store", ...options });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || "network");
  }
  return r;
}
export function saveFile(bytes, id) {
  const a = node("a");
  const url = URL.createObjectURL(
    new Blob([bytes], { type: "application/pdf" }),
  );
  a.href = url;
  a.download = "Maria-Hesed-" + id + ".pdf";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function go(hash) {
  const target = location.origin + "/" + hash;
  if (location.href === target) location.reload();
  else location.replace(target);
}
