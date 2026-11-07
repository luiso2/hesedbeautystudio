// Old personal invitation fragments must never be forwarded to Google.
history.replaceState(null, "", location.pathname);
document.querySelector("#year").textContent = new Date().getFullYear();
const status = document.querySelector("#review-handoff");
async function openGoogleReviews() {
  try {
    const response = await fetch("/api/reviews");
    const settings = response.ok ? await response.json() : {};
    if (settings.review_url) location.replace(settings.review_url);
    else
      status.textContent =
        "El enlace de reseñas de Google todavía no está disponible.";
  } catch {
    status.textContent =
      "No se pudo abrir Google. Vuelve a intentarlo más tarde.";
  }
}
openGoogleReviews();
