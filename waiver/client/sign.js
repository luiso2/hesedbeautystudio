import {
  title,
  sections,
  fields,
  services,
  conditions,
  photos,
  clauses,
  version,
  validForm,
  emailFingerprint,
  validInk,
  eSign,
} from "../shared/form.js";
import { makePdf } from "../shared/pdf.js";
import {
  app,
  lang,
  tr,
  node,
  copy,
  labelText,
  button,
  panel,
  intro,
  status,
  field,
  option,
  api,
  go,
  saveFile,
  errorText,
} from "./ui.js";
import { enqueue, pendingRows, sendPending, dropPending } from "./store.js";

function capture() {
  const canvas = node("canvas", "pad");
  canvas.width = 1000;
  canvas.height = 300;
  canvas.setAttribute("aria-label", "Firma con el dedo / Draw your signature");
  const ctx = canvas.getContext("2d"),
    ink = [];
  let active = null,
    pen = null;
  function point(e) {
    const b = canvas.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top].map((v, i) =>
      Math.max(
        0,
        Math.min(1000, Math.round((1000 * v) / (i ? b.height : b.width))),
      ),
    );
  }
  canvas.onpointerdown = (e) => {
    if (active || ink.length >= 80) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pen = e.pointerId;
    active = [point(e)];
    ink.push(active);
  };
  canvas.onpointermove = (e) => {
    if (!active || pen !== e.pointerId || active.length >= 1000) return;
    const p = point(e),
      last = active.at(-1);
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.moveTo(last[0], last[1] * 0.3);
    ctx.lineTo(p[0], p[1] * 0.3);
    ctx.stroke();
    active.push(p);
  };
  canvas.onlostpointercapture = () => {
    active = null;
    pen = null;
  };
  return {
    canvas,
    ink,
    clear() {
      ctx.clearRect(0, 0, 1000, 300);
      ink.length = 0;
    },
  };
}
export function signForm(ticket, tablet) {
  intro(title, [
    "Completa tus datos, revisa el consentimiento y firma para guardar tu copia.",
    "Enter your details, review the consent and sign to save your copy.",
  ]);
  const form = node("form");
  form.autocomplete = "off";
  form.noValidate = true;
  app.append(form);
  const info = panel(null, form),
    medical = panel(null, form),
    terms = panel(null, form),
    pages = [info, medical, terms],
    inputs = {};
  const progress = copy("p", "", "", "muted");
  form.before(progress);
  let step = 0;
  const heading = (p, i) => p.append(labelText(node("h2"), sections[i]));
  function add(parent, k, type = "text", required = false) {
    const control = field(
      fields[k],
      type,
      required,
      ["meds", "notes"].includes(k) ? 1200 : 254,
    );
    inputs[k] = control.input;
    control.input.name = k;
    parent.append(control.label);
    return control;
  }
  function grid(parent, cls = "row") {
    const g = node("div", cls);
    parent.append(g);
    return g;
  }
  heading(info, 0);
  let row = grid(info);
  add(row, "name", "text", true);
  add(row, "dob", "date", true).input.max = new Date()
    .toISOString()
    .slice(0, 10);
  row = grid(info);
  add(row, "phone", "tel", true);
  add(row, "email", "email", true);
  const repeat = field(
    ["Confirma tu correo", "Confirm your email"],
    "email",
    true,
  );
  info.append(repeat.label);
  add(info, "emergency");
  heading(info, 1);
  function group(parent, options, name) {
    const fs = node("fieldset"),
      g = node("div", "choices");
    fs.append(
      copy(
        "legend",
        "Marca las opciones que correspondan.",
        "Select all that apply.",
      ),
      g,
    );
    parent.append(fs);
    const opts = {};
    for (const [k, pair] of Object.entries(options)) {
      const op = option(pair, "checkbox", name, k);
      g.append(op.label);
      opts[k] = op.input;
    }
    return opts;
  }
  const serviceBoxes = group(info, services, "services"),
    otherService = add(info, "serviceOther");
  row = grid(info);
  add(row, "provider", "text", true).input.value = "María Hesed";
  add(row, "date", "date", true);
  heading(medical, 2);
  const healthBoxes = group(medical, conditions, "health"),
    otherHealth = add(medical, "healthOther");
  add(medical, "meds", "textarea");
  add(medical, "notes", "textarea");
  function toggleOther(box, f) {
    const change = () => {
      f.label.hidden = !box.checked;
      f.input.required = box.checked;
      if (!box.checked) f.input.value = "";
    };
    box.addEventListener("change", change);
    change();
  }
  toggleOther(serviceBoxes.other, otherService);
  toggleOther(healthBoxes.other, otherHealth);
  for (const [id, b] of Object.entries(healthBoxes))
    b.addEventListener("change", () => {
      if (!b.checked) return;
      if (id === "none") {
        for (const [k, other] of Object.entries(healthBoxes))
          if (k !== "none") other.checked = false;
        healthBoxes.other.dispatchEvent(new Event("change"));
      } else healthBoxes.none.checked = false;
    });
  let photoBoxes = {},
    ack,
    electronic;
  for (let i = 0; i < clauses.length; i++) {
    heading(terms, i + 3);
    if (i === 4) {
      ack = option(clauses[i], "checkbox", "ack", "yes");
      terms.append(ack.label);
    } else terms.append(labelText(node("p"), clauses[i]));
    if (i === 3) {
      const g = grid(terms, "single");
      for (const k of ["yes", "no"]) {
        const o = option(photos[k], "radio", "photo", k);
        g.append(o.label);
        photoBoxes[k] = o.input;
      }
      g.append(
        button(
          ["Borrar elección", "Clear choice"],
          () => Object.values(photoBoxes).forEach((b) => (b.checked = false)),
          "text",
        ),
      );
    }
  }
  electronic = option(eSign, "checkbox", "electronic", "yes");
  terms.append(electronic.label);
  const sig = node("div", "signature");
  terms.append(sig);
  const method = field(["Firma del cliente", "Client signature"], "text");
  const select = node("select");
  method.label.firstElementChild.id = "signature-method";
  select.setAttribute("aria-labelledby", "signature-method");
  method.input.replaceWith(select);
  sig.append(method.label);
  for (const [k, pair] of [
    ["drawn", ["Dibujar firma", "Draw signature"]],
    ["typed", ["Escribir firma", "Type signature"]],
  ]) {
    const o = labelText(node("option"), pair);
    o.value = k;
    select.append(o);
  }
  const pad = capture(),
    draw = node("div");
  draw.append(
    pad.canvas,
    button(["Borrar firma", "Clear signature"], () => pad.clear(), "text"),
  );
  sig.append(draw);
  const typed = field(
    ["Escribe tu nombre como firma", "Type your name as your signature"],
    "text",
    false,
    160,
  );
  sig.append(typed.label);
  typed.label.hidden = true;
  select.onchange = () => {
    draw.hidden = select.value !== "drawn";
    typed.label.hidden = !draw.hidden;
  };
  const selected = (boxes) =>
    Object.entries(boxes)
      .filter(([, b]) => b.checked)
      .map(([k]) => k);
  const actions = grid(form, "actions");
  function show(n, scroll = true) {
    step = n;
    pages.forEach((p, i) => {
      p.hidden = i !== n;
      p.inert = i !== n;
    });
    back.hidden = n === 0;
    next.hidden = n === 2;
    submit.hidden = n !== 2;
    labelText(progress, [
      "Paso " + (n + 1) + " de 3",
      "Step " + (n + 1) + " of 3",
    ]);
    document.querySelector("#message")?.remove();
    if (scroll) progress.scrollIntoView({ block: "start" });
  }
  function valid(n) {
    for (const el of pages[n].querySelectorAll("input,textarea"))
      if (!el.closest("[hidden]") && !el.reportValidity()) return false;
    if (n === 0) {
      if (
        inputs.email.value.trim().toLowerCase() !==
        repeat.input.value.trim().toLowerCase()
      ) {
        status([
          "Los correos deben coincidir.",
          "The email addresses must match.",
        ]);
        repeat.input.focus();
        return false;
      }
      if (!selected(serviceBoxes).length) {
        status([
          "Selecciona el servicio que vas a recibir.",
          "Select the service you will receive.",
        ]);
        serviceBoxes.facial.focus();
        return false;
      }
    } else if (n === 1 && !selected(healthBoxes).length) {
      status([
        "Indica las condiciones que correspondan o selecciona «Ninguna de las anteriores».",
        "Check any conditions that apply or select “None of the above”.",
      ]);
      healthBoxes.pregnancy.focus();
      return false;
    }
    return true;
  }
  let fallback;
  async function finish() {
    if (!valid(2)) return;
    const data = {
      id: ticket.id,
      version,
      lang,
      signedAt: new Date().toISOString(),
      ...Object.fromEntries(
        Object.entries(inputs).map(([k, input]) => [k, input.value.trim()]),
      ),
      services: selected(serviceBoxes),
      health: selected(healthBoxes),
      photo: selected(photoBoxes)[0] || "unset",
      ack: ack.input.checked,
      eSign: electronic.input.checked,
      method: select.value,
      typed: select.value === "typed" ? typed.input.value.trim() : "",
      ink: select.value === "drawn" ? pad.ink : [],
    };
    if (!data.ack || !data.eSign) {
      status([
        "Confirma la declaración y la firma electrónica para terminar.",
        "Confirm the acknowledgment and electronic signature to finish.",
      ]);
      return;
    }
    if (
      (data.method === "drawn" && !validInk(data.ink)) ||
      (data.method === "typed" && data.typed.length < 2)
    ) {
      status([
        "Añade tu firma o elige escribirla.",
        "Add your signature or choose to type it.",
      ]);
      return;
    }
    if (!validForm(data)) {
      status(errorText(new Error("invalid_form")));
      return;
    }
    const pdf = await makePdf(data, ticket.id);
    let saved = false,
      queued = false,
      refused = null;
    try {
      await enqueue(ticket, data);
      queued = true;
    } catch {
      /* Try submitting online if local storage is unavailable. */
    }
    try {
      if (queued) {
        const row = (await pendingRows()).find((r) => r.id === ticket.id);
        if (row) await sendPending(row);
      } else
        await api("sign", {
          method: "POST",
          headers: {
            "X-Waiver-Key": ticket.token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      saved = true;
    } catch (e) {
      if (["email_mismatch", "invalid_form"].includes(e.message)) {
        if (queued) await dropPending(ticket.id);
        show(0);
        status(errorText(e));
        return;
      }
      if (["expired", "already_signed", "invalid_link"].includes(e.message))
        refused = e;
      if (!queued) {
        fallback?.remove();
        fallback = button(["Descargar PDF", "Download PDF"], () =>
          saveFile(pdf, ticket.id),
        );
        actions.append(fallback);
        status(errorText(new Error("local_storage")));
        return;
      }
    }
    sessionStorage.removeItem("active-waiver");
    history.replaceState(null, "", location.pathname);
    intro(
      refused
        ? ["Copia local de la firma", "Local signature copy"]
        : ["Consentimiento firmado", "Consent signed"],
      refused
        ? [
            "El estudio no pudo aceptar esta firma con el enlace utilizado. Descarga tu PDF y comunícate con María para entregarlo.",
            "The studio could not accept the signature using this link. Download your PDF and contact María to provide it.",
          ]
        : saved
          ? [
              "Tu documento se guardó en el estudio. Las copias por correo se envían por separado a ti y a María.",
              "Your document was saved by the studio. Email copies are sent separately to you and María.",
            ]
          : [
              "Tu firma está guardada en este dispositivo. Descarga el PDF ahora. Vuelve a abrir esta página con internet para sincronizarlo y enviar las copias.",
              "Your signature is saved on this device. Download the PDF now. Reopen this page with internet access to sync and send the copies.",
            ],
    );
    const p = panel(null);
    const ref = node("p", "ref");
    ref.textContent = "Ref. " + ticket.id;
    p.append(ref);
    const a = grid(p, "actions");
    a.append(
      button(
        ["Descargar PDF firmado", "Download signed PDF"],
        () => saveFile(pdf, ticket.id),
        "btn primary",
      ),
      button(["Terminar", "Finish"], () => go(tablet ? "#tablet" : "")),
    );
    fallback = null;
  }
  const back = button(["Volver", "Back"], () => show(step - 1)),
    next = button(
      ["Continuar", "Continue"],
      async () => {
        if (!valid(step)) return;
        if (
          step === 0 &&
          ticket.emailHash &&
          (await emailFingerprint(ticket.token, inputs.email.value)) !==
            ticket.emailHash
        ) {
          status(errorText(new Error("email_mismatch")));
          inputs.email.focus();
          return;
        }
        show(step + 1);
      },
      "btn primary",
    ),
    submit = button(
      ["Firmar y terminar", "Sign and finish"],
      finish,
      "btn primary",
    );
  actions.append(back, next, submit);
  form.onsubmit = (e) => {
    e.preventDefault();
    (step === 2 ? submit : next).click();
  };
  show(0, false);
}
