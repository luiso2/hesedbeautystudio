import {
  app,
  lang,
  chooseLang,
  node,
  copy,
  labelText,
  button,
  panel,
  intro,
  status,
  field,
  api,
  go,
  saveFile,
  errorText,
} from "./ui.js";
import { signForm } from "./sign.js";
import { makePdf } from "../shared/pdf.js";
import {
  addTickets,
  takeTicket,
  ticketCount,
  pendingRows,
  readPending,
  sync,
} from "./store.js";

const origin = location.origin;
const swReady =
  "serviceWorker" in navigator
    ? navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .catch(() => null)
    : Promise.resolve(null);
async function summary() {
  const [count, pending] = await Promise.all([ticketCount(), pendingRows()]);
  return [
    "Formularios disponibles en esta tablet: " +
      count +
      ". Firmas pendientes de sincronizar: " +
      pending.length +
      ".",
    "Available forms on this tablet: " +
      count +
      ". Signatures waiting to sync: " +
      pending.length +
      ".",
  ];
}
function home() {
  intro(
    ["Consentimiento informado", "Informed consent"],
    [
      "Si recibiste una invitación, abre el enlace privado que te envió María para completar y firmar tu documento.",
      "If you received an invitation, open the private link María sent you to complete and sign your form.",
    ],
  );
  const p = panel(["En el estudio", "At the studio"]);
  p.append(
    button(
      ["Firma en la tablet", "Sign on the tablet"],
      () => go("#tablet"),
      "btn primary",
    ),
    button(["Panel de María", "Studio dashboard"], () => go("#admin"), "text"),
  );
}
async function tablet() {
  intro(
    ["Firma presencial", "Sign at the studio"],
    [
      "Completa un formulario individual para esta visita. Al terminar podrás descargar tu copia firmada.",
      "Complete one form for this visit. You can download your signed copy when you finish.",
    ],
  );
  const c = panel(null);
  c.append(labelText(node("p", "muted"), await summary()));
  if (await ticketCount())
    c.append(
      button(
        ["Comenzar formulario", "Start form"],
        async () => {
          const t = await takeTicket();
          if (!t) throw new Error("expired");
          sessionStorage.setItem(
            "active-waiver",
            JSON.stringify({ t, tablet: true }),
          );
          signForm(t, true);
        },
        "btn primary",
      ),
    );
  else
    c.append(
      copy(
        "p",
        "María puede preparar más formularios desde su panel con conexión a internet.",
        "María can prepare more forms in the studio dashboard while online.",
      ),
    );
  c.append(
    button(["Panel de María", "Studio dashboard"], () => go("#admin"), "text"),
  );
}
async function dashboard(key) {
  const headers = { Authorization: "Bearer " + key };
  const admin = (path, opts = {}) =>
    api("admin/" + path, { ...opts, headers: { ...headers, ...opts.headers } });
  const archivePage = async (cursor) =>
    (await admin("archive" + (cursor ? "?before=" + cursor : ""))).json();
  const first = await archivePage();
  intro(
    ["Panel del estudio", "Studio dashboard"],
    [
      "Envía un consentimiento, prepara la tablet o descarga un documento firmado.",
      "Send a consent form, prepare a tablet or download a signed document.",
    ],
  );
  const invite = panel(["Invitar a firmar", "Invite a client"]);
  const mail = field(["Correo del cliente", "Client email"], "email", true);
  const inviteLang = field(["Idioma de la invitación", "Invitation language"]);
  const select = node("select");
  for (const [value, label] of [
    ["es", "Español"],
    ["en", "English"],
  ]) {
    const o = node("option");
    o.value = value;
    o.textContent = label;
    select.append(o);
  }
  select.value = lang;
  inviteLang.label.firstElementChild.id = "invite-language";
  select.setAttribute("aria-labelledby", "invite-language");
  inviteLang.input.replaceWith(select);
  invite.append(mail.label, inviteLang.label);
  const actions = node("div", "actions"),
    result = node("div");
  invite.append(actions, result);
  async function newTickets(mode) {
    return (
      await admin("invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          email: mail.input.value.trim(),
          lang: select.value,
        }),
      })
    ).json();
  }
  async function invitation(mode) {
    if (mode === "email" && !mail.input.reportValidity()) return;
    const {
      tickets: [t],
    } = await newTickets(mode);
    const link =
      origin + "/#sign=" + t.token + "." + t.id + "&lang=" + select.value;
    result.replaceChildren(
      copy(
        "p",
        mode === "email"
          ? "Invitación guardada para envío. También puedes compartir este enlace privado."
          : "Enlace privado para una firma. Válido durante 30 días.",
        mode === "email"
          ? "Invitation queued for email. You can also share this private link."
          : "Private link for one signature. Valid for 30 days.",
      ),
    );
    const box = field(["Enlace del cliente", "Client link"]);
    box.input.readOnly = true;
    box.input.value = link;
    result.append(
      box.label,
      button(["Copiar enlace", "Copy link"], async () => {
        try {
          await navigator.clipboard.writeText(link);
          status(["Enlace copiado.", "Link copied."]);
        } catch {
          box.input.focus();
          box.input.select();
        }
      }),
    );
    if (mode === "email")
      result.append(
        button(
          ["Consultar estado del envío", "Check email status"],
          async () => {
            const { state } = await (await admin("invitation/" + t.id)).json();
            status(
              state === "sent"
                ? [
                    "El proveedor de correo aceptó la invitación.",
                    "The email provider accepted the invitation.",
                  ]
                : [
                    "Envío pendiente. El sistema lo reintentará automáticamente.",
                    "Email pending. The system will retry automatically.",
                  ],
            );
          },
          "text",
        ),
      );
  }
  actions.append(
    button(
      ["Enviar por correo", "Send by email"],
      () => invitation("email"),
      "btn primary",
    ),
    button(["Crear enlace", "Create link"], () => invitation("link")),
  );
  const kiosk = panel(["Tablet sin conexión", "Offline tablet"]);
  kiosk.append(
    copy(
      "p",
      "Prepara esta tablet con internet. Después podrás abrir el modo presencial, firmar y descargar el PDF incluso sin señal.",
      "Prepare this tablet while online. Then open tablet mode to sign and download the PDF, even without a connection.",
    ),
  );
  const stock = labelText(node("p", "muted"), await summary());
  kiosk.append(stock);
  kiosk.append(
    button(["Preparar 10 formularios", "Prepare 10 forms"], async () => {
      if (!(await swReady) || !(await caches.match("/")))
        throw new Error("offline_setup");
      if (navigator.storage?.persist)
        await navigator.storage.persist().catch(() => false);
      const { tickets } = await newTickets("tablet");
      await addTickets(tickets);
      labelText(stock, await summary());
      status([
        "Tablet preparada. Abre «Modo presencial» antes de entregarla.",
        "Tablet ready. Open tablet mode before handing it over.",
      ]);
    }),
    button(["Modo presencial", "Tablet mode"], () => go("#tablet"), "text"),
  );
  const waiting = await pendingRows();
  if (waiting.length) {
    kiosk.append(
      button(
        ["Sincronizar firmas pendientes", "Sync pending signatures"],
        async () => {
          await sync();
          await dashboard(key);
        },
      ),
    );
    for (const row of waiting) {
      const { data } = await readPending(row);
      const b = button(
        [
          "Descargar copia local · " + data.name,
          "Download local copy · " + data.name,
        ],
        async () => saveFile(await makePdf(data, row.id), row.id),
        "text",
      );
      kiosk.append(b);
    }
  }
  const records = panel(["Archivo de consentimientos", "Signed documents"]);
  const list = node("div");
  records.append(list);
  const more = button(["Ver más", "Show more"], async () =>
    render(await archivePage(cursor)),
  );
  let cursor = null;
  function render(data) {
    for (const item of data.records) {
      const row = node("div", "admin-item"),
        name = node("strong");
      name.textContent = item.name;
      row.append(name);
      const date = node("span", "muted");
      date.textContent = item.date;
      row.append(
        date,
        copy(
          "small",
          "Copias aceptadas por el proveedor de correo: " + item.sent + "/2",
          "Copies accepted by the email provider: " + item.sent + "/2",
        ),
      );
      row.append(
        button(["Descargar PDF", "Download PDF"], async () => {
          const r = await admin("record/" + item.id);
          saveFile(await r.arrayBuffer(), item.id);
        }),
      );
      row.append(
        button(
          ["Eliminar del archivo", "Delete from archive"],
          async () => {
            if (
              !confirm(
                lang === "es"
                  ? "¿Eliminar definitivamente el documento de " +
                      item.name +
                      " y sus envíos pendientes?"
                  : "Permanently delete the document for " +
                      item.name +
                      " and any pending emails?",
              )
            )
              return;
            await admin("record/" + item.id, { method: "DELETE" });
            await dashboard(key);
          },
          "text",
        ),
      );
      list.append(row);
    }
    cursor = data.next;
    more.hidden = !cursor;
  }
  render(first);
  records.append(more);
  if (first.records.length === 0)
    list.append(
      copy(
        "p",
        "Los documentos aparecerán aquí cuando alguien firme y se sincronice su formulario.",
        "Signed forms appear here once they sync.",
      ),
    );
  app.append(button(["Salir del panel", "Sign out"], () => go(""), "text"));
}
function login() {
  intro(
    ["Panel de María", "Studio dashboard"],
    [
      "Accede con la misma clave que utilizas en el panel de reservas.",
      "Use the same access key as your booking dashboard.",
    ],
  );
  const p = panel(null),
    f = node("form"),
    key = field(["Clave del panel", "Studio access key"], "password", true);
  key.input.autocomplete = "current-password";
  p.append(f);
  const submit = button(
    ["Entrar", "Sign in"],
    async () => {
      if (key.input.reportValidity()) await dashboard(key.input.value.trim());
    },
    "btn primary",
  );
  f.append(key.label, submit);
  f.onsubmit = (e) => {
    e.preventDefault();
    submit.click();
  };
}
async function start() {
  const args = new URLSearchParams(location.hash.slice(1));
  if (args.has("sign")) {
    const value = args.get("sign"),
      [token, id] = value.split(".");
    sessionStorage.removeItem("active-waiver");
    if (!/^[0-9a-f]{64}$/.test(token) || !id) throw new Error("invalid_link");
    const r = await (
      await api("ticket", { headers: { "X-Waiver-Key": token } })
    ).json();
    if (r.id !== id) throw new Error("invalid_link");
    history.replaceState(null, "", location.pathname);
    const t = { id, token, expires: r.expires, emailHash: r.emailHash };
    sessionStorage.setItem(
      "active-waiver",
      JSON.stringify({ t, tablet: false }),
    );
    signForm(t, false);
    return;
  }
  if (args.has("admin")) {
    sessionStorage.removeItem("active-waiver");
    login();
    return;
  }
  const active = JSON.parse(sessionStorage.getItem("active-waiver") || "null");
  if (active) {
    if (active.t.expires * 1000 < Date.now()) {
      sessionStorage.removeItem("active-waiver");
      throw new Error("expired");
    }
    signForm(active.t, active.tablet);
    return;
  }
  if (args.has("tablet")) await tablet();
  else home();
}
start().catch((e) => {
  home();
  status(errorText(e));
});
const resync = () => {
  if (navigator.onLine) sync().catch(() => {});
};
resync();
window.addEventListener("online", resync);
window.addEventListener("pageshow", resync);
setInterval(resync, 60000);

window.addEventListener("hashchange", () => location.reload());
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
