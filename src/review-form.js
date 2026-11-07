const $ = (s) => document.querySelector(s);
let lang = 'es';
try { lang = localStorage.getItem('hesed-lang') === 'en' ? 'en' : 'es'; } catch {}
const token = location.hash.slice(1);
const validToken = /^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token);
$('#review-form').hidden = !validToken;
$('#review-invitation').hidden = validToken;
$('#year').textContent = new Date().getFullYear();
function translate(next) {
  lang = next;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-review-es]').forEach((el) => { el.textContent = lang === 'en' ? el.dataset.reviewEn : el.dataset.reviewEs; });
  document.querySelectorAll('[data-lang]').forEach((el) => { el.classList.toggle('is-active', el.dataset.lang === lang); el.setAttribute('aria-pressed', String(el.dataset.lang === lang)); });
  $('.booking-close').textContent = lang === 'en' ? 'Close' : 'Cerrar';
  try { localStorage.setItem('hesed-lang', lang); } catch {}
}
document.querySelectorAll('[data-lang]').forEach((el) => el.addEventListener('click', () => translate(el.dataset.lang)));
translate(lang);
$('#review-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('[type="submit"]');
  const data = new FormData(form);
  button.disabled = true;
  $('#review-message').textContent = '';
  try {
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      token, name: data.get('name'), comment: data.get('comment'), rating: Number(data.get('rating')), consent: data.get('consent') === 'on', website: data.get('website'),
    }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    form.hidden = true;
    $('#review-message').textContent = lang === 'en' ? 'Thank you. Your review has been received and is awaiting content review before publication.' : 'Gracias. Recibimos tu opinión y está pendiente de revisión de contenido antes de publicarse.';
  } catch (error) {
    $('#review-message').textContent = error.message === 'already_reviewed' ? (lang === 'en' ? 'We already received a review for this visit. Thank you.' : 'Ya recibimos una opinión para esta visita. Gracias.') : error.message === 'invalid_invitation' ? (lang === 'en' ? 'This invitation is not valid. Please request your personal link from María.' : 'La invitación no es válida. Pide a María tu enlace personal.') : (lang === 'en' ? 'We could not save your review. Please try again.' : 'No pudimos guardar tu opinión. Inténtalo de nuevo.');
  } finally { button.disabled = false; }
});
