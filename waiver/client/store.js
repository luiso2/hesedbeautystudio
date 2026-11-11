const db = () =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open("mh-consents", 1);
    r.onupgradeneeded = () => {
      for (const name of ["device", "tickets", "pending"])
        r.result.createObjectStore(name);
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function tx(store, mode, run) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const t = database.transaction(store, mode),
      s = t.objectStore(store);
    let result;
    t.oncomplete = () => {
      database.close();
      resolve(result);
    };
    t.onabort = () => {
      database.close();
      reject(t.error || new Error("storage"));
    };
    run(s, (value) => {
      result = value;
    });
  });
}
export const pendingRows = () =>
  tx("pending", "readonly", (s, set) => {
    const r = s.getAll();
    r.onsuccess = () => set(r.result);
  });
const remove = (store, id) => tx(store, "readwrite", (s) => s.delete(id));
async function deviceKey() {
  const candidate = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return tx("device", "readwrite", (s, set) => {
    const r = s.get("key");
    r.onsuccess = () => {
      if (!r.result) s.put(candidate, "key");
      set(r.result || candidate);
    };
  });
}
export async function addTickets(tickets) {
  await deviceKey();
  await tx("tickets", "readwrite", (s) =>
    tickets.forEach((t) => s.put(t, t.id)),
  );
}
export function takeTicket() {
  return tx("tickets", "readwrite", (s, set) => {
    const r = s.openCursor();
    r.onsuccess = () => {
      const c = r.result;
      if (!c) return;
      c.delete();
      if (c.value.expires * 1000 > Date.now()) {
        set(c.value);
        return;
      }
      c.continue();
    };
  });
}
export const ticketCount = () =>
  tx("tickets", "readonly", (s, set) => {
    const r = s.getAll();
    r.onsuccess = () =>
      set(r.result.filter((x) => x.expires * 1000 > Date.now()).length);
  });
export async function enqueue(ticket, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    key = await deviceKey();
  const bytes = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode(ticket.id),
    },
    key,
    new TextEncoder().encode(JSON.stringify({ ticket, data })),
  );
  await tx("pending", "readwrite", (s) =>
    s.put({ id: ticket.id, bytes, iv }, ticket.id),
  );
}
export async function readPending(row) {
  const bytes = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: row.iv,
      additionalData: new TextEncoder().encode(row.id),
    },
    await deviceKey(),
    row.bytes,
  );
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function sendPending(row) {
  const { ticket, data } = await readPending(row);
  const response = await fetch("/api/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Waiver-Key": ticket.token,
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    let error;
    try {
      error = (await response.json()).error;
    } catch {}
    throw Object.assign(new Error(error || "network"), {
      status: response.status,
    });
  }
  await remove("pending", row.id);
  return true;
}
export const dropPending = (id) => remove("pending", id);
let syncing;
export function sync() {
  if (!syncing)
    syncing = (async () => {
      for (const row of await pendingRows()) {
        try {
          await sendPending(row);
        } catch {
          /* Keep each record until acknowledged. */
        }
      }
    })().finally(() => {
      syncing = null;
    });
  return syncing;
}
