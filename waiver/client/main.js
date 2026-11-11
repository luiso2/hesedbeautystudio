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
const deviceKey = "waiver-studio-device";
const accessPost = (path, data, options = {}) => api("access/" + path, {
  method: "POST", headers: { "Content-Type": "application/json", ...options.headers },
  body: JSON.stringify(data), keepalive: true, signal: AbortSignal.timeout(15000),
});
function forgetStudio() {
  const device = localStorage.getItem(deviceKey);
  localStorage.removeItem(deviceKey);
  if (device && navigator.onLine) {
    // Losing the local half also locks this browser immediately while offline.
    return accessPost("logout", {}, { headers: { "X-Waiver-Device": device } }).catch(() => {});
  }
}
window.addEventListener("storage", (event) => {
  if ((event.key === deviceKey || event.key === null) && !localStorage.getItem(deviceKey)
      && document.querySelector("[data-studio-dashboard]")) location.reload();
});
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
      enterTablet,
      "btn primary",
    ),
  );
}
function enterTablet() {
  forgetStudio();
  app.replaceChildren();
  go("#tablet");
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
}
async function dashboard() {
  const session = localStorage.getItem(deviceKey);
  const admin = async (path, opts = {}) => {
    const device = localStorage.getItem(deviceKey);
    try {
      return await api("admin/" + path, {
        ...opts, headers: { ...opts.headers, "X-Waiver-Device": device || "" },
      });
    } catch (error) {
      if (error.message === "unauthorized") {
        localStorage.removeItem(deviceKey);
        login();
      }
      throw error;
    }
  };
  const archivePage = async (cursor) =>
    (await admin("archive" + (cursor ? "?before=" + cursor : ""))).json();
  const first = await archivePage();
  if (!session || session !== localStorage.getItem(deviceKey)) return login();
  intro(
    ["Panel del estudio", "Studio dashboard"],
    [
      "Envía un consentimiento, prepara la tablet o descarga un documento firmado.",
      "Send a consent form, prepare a tablet or download a signed document.",
    ],
  );
  app.querySelector("h1").dataset.studioDashboard = "";
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
      "Prepara esta tablet con internet. El modo presencial cierra tu panel y permite firmar y descargar el PDF incluso sin señal.",
      "Prepare this tablet while online. Tablet mode signs you out of the dashboard and lets clients sign and download their PDF, even without a connection.",
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
    button(["Modo presencial", "Tablet mode"], enterTablet, "text"),
  );
  const waiting = await pendingRows();
  if (waiting.length) {
    kiosk.append(
      button(
        ["Sincronizar firmas pendientes", "Sync pending signatures"],
        async () => {
          await sync();
          await dashboard();
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
            await dashboard();
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
  app.append(button(["Cerrar sesión en este dispositivo", "Sign out on this device"], async () => {
    const closing = forgetStudio();
    home();
    await closing;
    go("");
  }, "text"));
}
function login() {
  intro(["Panel de María", "Studio dashboard"], [
    "Abre el acceso privado de María para entrar al panel.",
    "Open María’s private studio link to access the dashboard.",
  ]);
}
async function enterFromLink(token, endpoint) {
  history.replaceState(null, "", "/estudio");
  try {
    const response = await accessPost(endpoint, { token }, {
      headers: { "X-Waiver-Device": localStorage.getItem(deviceKey) || "" },
    });
    const { device } = await response.json();
    localStorage.setItem(deviceKey, device);
  } catch (error) {
    login();
    status(errorText(error));
    if (error.message !== "access_expired")
      panel(null).append(button(["Volver a intentar", "Try again"], () => enterFromLink(token, endpoint)));
    return;
  }
  await openStudio();
}
async function openStudio() {
  if (!localStorage.getItem(deviceKey)) return login();
  try {
    await dashboard();
  } catch (error) {
    if (error.message === "unauthorized") return;
    intro(["Panel de María", "Studio dashboard"], [
      "Para consultar el archivo necesitas conexión a internet.",
      "Connect to the internet to open the archive.",
    ]);
    const choices = panel(null);
    choices.append(button(["Volver a intentar", "Try again"], openStudio), button(["Firma presencial", "Sign on the tablet"], enterTablet, "text"));
  }
}
async function start() {
  const args = new URLSearchParams(location.hash.slice(1));
  if (args.has("entrada") || args.has("access")) {
    const studioEntry = args.has("entrada");
    sessionStorage.removeItem("active-waiver");
    await enterFromLink(args.get(studioEntry ? "entrada" : "access"), studioEntry ? "studio" : "redeem");
    return;
  }
  if (args.has("sign") || args.has("tablet")) {
    forgetStudio();
  }
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
  if (args.has("admin") || (["/panel", "/estudio"].includes(location.pathname) && !location.hash)) {
    sessionStorage.removeItem("active-waiver");
    await openStudio();
    return;
  }
  const active = JSON.parse(sessionStorage.getItem("active-waiver") || "null");
  if (active) {
    if (active.t.expires * 1000 < Date.now()) {
      sessionStorage.removeItem("active-waiver");
      throw new Error("expired");
    }
    forgetStudio();
    signForm(active.t, active.tablet);
    return;
  }
  if (args.has("tablet")) await tablet();
  else if (localStorage.getItem(deviceKey)) await openStudio();
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
