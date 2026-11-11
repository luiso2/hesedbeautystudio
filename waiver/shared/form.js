// Keep published consent versions immutable so offline submissions and archived copies
// always refer to the wording the client actually saw.
export const version = "MH-2026-11-10.1";
export const title = [
  "Consentimiento informado del cliente",
  "Client Waiver & Informed Consent",
];
export const sections = [
  ["Información del cliente", "Client information"],
  ["Servicio seleccionado", "Selected service"],
  ["Historial de salud", "Health history"],
  ["Consentimiento informado", "Informed consent"],
  ["Responsabilidades y seguridad", "Client responsibilities & safety"],
  ["Reconocimiento y responsabilidad", "Acknowledgment & liability"],
  [
    "Autorización de fotos y videos · opcional",
    "Photo / video release · optional",
  ],
  ["Declaración y firma", "Client acknowledgment & signature"],
];
export const clauses = [
  [
    "Entiendo que el servicio seleccionado es un servicio cosmético o de cuidado personal, no un diagnóstico ni tratamiento médico. El proveedor me ha explicado la naturaleza general, el procedimiento, las limitaciones y los riesgos previsibles del servicio específico. Entiendo que los resultados varían y no están garantizados. Según el servicio, pueden presentarse enrojecimiento, sensibilidad, inflamación, hematomas, irritación o molestias temporales. Tuve la oportunidad de hacer preguntas y recibí respuestas que comprendo.",
    "I understand that the selected service is a cosmetic or personal-care service, not a medical diagnosis or treatment. The provider has explained the general nature, expected process, limitations, and reasonably foreseeable risks of the specific service. I understand that results vary and are not guaranteed. Depending on the service, temporary redness, sensitivity, swelling, bruising, irritation, or discomfort may occur. I have had the opportunity to ask questions and received answers I understand.",
  ],
  [
    "Confirmo que la información de salud que proporciono es completa y correcta según mi leal saber y entender. Comunicaré cualquier cambio antes de cada cita, incluidos embarazo, medicamentos, condiciones médicas, procedimientos o cirugías recientes. Seguiré las instrucciones previas y posteriores al servicio. Entiendo que el proveedor puede posponer o rechazar el servicio si identifica un riesgo, contraindicación o asunto fuera de su ámbito profesional. Consultaré a un profesional de salud cuando corresponda.",
    "I confirm that the health information I provide is complete and accurate to the best of my knowledge. I will disclose changes before each appointment, including pregnancy, medication, medical conditions, recent procedures, or surgery. I will follow the pre- and post-service instructions provided. I understand the provider may postpone or decline a service if a safety concern, contraindication, or scope-of-practice issue is identified. I will seek advice from a qualified healthcare professional when appropriate.",
  ],
  [
    "Otorgo voluntariamente mi consentimiento para el servicio específico seleccionado después de recibir información sobre su naturaleza, limitaciones y posibles riesgos. Ninguna disposición de este formulario pretende hacerme renunciar a derechos que legalmente no puedan renunciarse ni liberar a ninguna persona o empresa de responsabilidad en la medida en que la ley aplicable lo prohíba. Este formulario no sustituye la obligación del proveedor de cumplir las leyes, normas profesionales y requisitos de seguridad aplicables.",
    "I voluntarily consent to the specific service selected after receiving information about its nature, limitations, and potential risks. Nothing in this form is intended to waive rights that cannot legally be waived or release any person or business from liability to the extent such release is prohibited by applicable law. This form does not replace the provider’s duty to follow applicable laws, professional standards, and safety requirements.",
  ],
  [
    "Pueden tomarse fotos o videos para documentar el servicio. Se requiere autorización separada para utilizarlos en publicidad, mercadeo, página web o redes sociales. Elegir “No” no afectará mi posibilidad de recibir servicios.",
    "Photos or videos may be taken for treatment documentation. Separate permission is required for marketing, advertising, website, or social media use. Choosing “No” will not affect my ability to receive services.",
  ],
  [
    "He leído y comprendido este formulario, mis preguntas han sido respondidas y otorgo voluntariamente mi consentimiento para el servicio seleccionado.",
    "I have read and understood this form, my questions have been answered, and I voluntarily consent to the service selected above.",
  ],
];
export const services = {
  facial: ["Tratamiento facial", "Facial treatment"],
  drainage: ["Drenaje linfático manual", "Manual lymphatic drainage"],
  brazilian: ["Brazilian Lymphatic", "Brazilian Lymphatic"],
  slim: ["Brazilian Slim", "Brazilian Slim"],
  contour: ["Moldeado corporal", "Body contouring"],
  wood: ["Maderoterapia", "Wood therapy"],
  metal: ["Metalterapia Sculpt", "Metalterapia Sculpt"],
  rf: ["Radiofrecuencia", "Radiofrequency"],
  cavitation: ["Cavitación ultrasónica", "Ultrasonic cavitation"],
  other: ["Otro", "Other"],
};
export const conditions = {
  pregnancy: ["Embarazo", "Pregnancy"],
  surgery: ["Cirugía reciente", "Recent surgery"],
  heart: ["Problema cardíaco", "Heart condition"],
  pressure: ["Presión alta", "High blood pressure"],
  diabetes: ["Diabetes", "Diabetes"],
  cancer: ["Cáncer o antecedentes", "Cancer or history"],
  clots: ["Coágulos o trombosis", "Blood clots or thrombosis"],
  veins: ["Várices", "Varicose veins"],
  skin: ["Condición o infección cutánea", "Skin condition or infection"],
  allergies: ["Alergias", "Allergies"],
  implants: ["Implantes o marcapasos", "Medical implants or pacemaker"],
  other: ["Otro", "Other"],
  none: ["Ninguna de las anteriores", "None of the above"],
};
export const photos = {
  yes: ["Sí, autorizo el uso publicitario.", "Yes, I authorize marketing use."],
  no: [
    "No, no autorizo el uso publicitario.",
    "No, I do not authorize marketing use.",
  ],
  unset: ["Sin autorización otorgada", "No authorization given"],
};
export const fields = {
  name: ["Nombre completo", "Full name"],
  dob: ["Fecha de nacimiento", "Date of birth"],
  phone: ["Teléfono", "Phone"],
  email: ["Correo electrónico", "Email"],
  emergency: ["Contacto de emergencia", "Emergency contact"],
  provider: ["Profesional", "Provider"],
  date: ["Fecha del servicio", "Service date"],
  serviceOther: ["Otro servicio", "Other service"],
  healthOther: ["Otra condición", "Other condition"],
  meds: ["Medicamentos actuales", "Current medications"],
  notes: ["Información adicional", "Additional information"],
};
export const eSign = [
  "Acepto firmar electrónicamente y recibir una copia de este documento por correo.",
  "I agree to sign electronically and receive a copy of this document by email.",
];
export function validEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[\x21-\x7e]+$/.test(value) &&
    /^[^\s@<>,;:"]+@(?:[a-z\d-]+\.)+[a-z]{2,}$/i.test(value)
  );
}
function validDay(value) {
  if (!/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const t = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value;
}
function validChoices(values, options) {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.length <= Object.keys(options).length &&
    new Set(values).size === values.length &&
    values.every((x) => typeof x === "string" && Object.hasOwn(options, x))
  );
}
export function validInk(ink) {
  return (
    Array.isArray(ink) &&
    ink.length > 0 &&
    ink.length <= 80 &&
    ink.every(
      (stroke) =>
        Array.isArray(stroke) &&
        stroke.length >= 1 &&
        stroke.length <= 1000 &&
        stroke.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000),
        ),
    ) &&
    ink.some((stroke) =>
      stroke.some(
        (p) =>
          Math.abs(p[0] - stroke[0][0]) + Math.abs(p[1] - stroke[0][1]) > 5,
      ),
    )
  );
}
export function validForm(d) {
  if (
    !d ||
    d.version !== version ||
    !["en", "es"].includes(d.lang) ||
    !d.ack ||
    d.ack !== true ||
    d.eSign !== true
  )
    return false;
  if (
    !Object.keys(fields).every(
      (k) =>
        typeof d[k] === "string" &&
        d[k].length <= (["meds", "notes"].includes(k) ? 1200 : 254),
    )
  )
    return false;
  if (
    ![d.name, d.phone, d.provider].every((x) => x.trim()) ||
    !validDay(d.dob) ||
    !validDay(d.date) ||
    !validEmail(d.email)
  )
    return false;
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(d.signedAt) ||
    !Number.isFinite(Date.parse(d.signedAt)) ||
    d.dob > d.signedAt.slice(0, 10)
  )
    return false;
  if (
    !validChoices(d.services, services) ||
    !validChoices(d.health, conditions) ||
    (d.health.includes("none") && d.health.length > 1)
  )
    return false;
  if (
    (d.services.includes("other") && !d.serviceOther.trim()) ||
    (d.health.includes("other") && !d.healthOther.trim()) ||
    !Object.hasOwn(photos, d.photo)
  )
    return false;
  if (d.method === "typed")
    return (
      typeof d.typed === "string" &&
      d.typed.trim().length >= 2 &&
      d.typed.length <= 160
    );
  return d.method === "drawn" && validInk(d.ink);
}

export async function emailFingerprint(token, email) {
  const bytes = new TextEncoder().encode(
    token + "|" + email.trim().toLowerCase(),
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
