export async function initReviews() {
  try {
    const response = await fetch("/api/reviews");
    if (!response.ok) return;
    const { review_url } = await response.json();
    if (!review_url) return;
    for (const link of document.querySelectorAll("[data-google-review]")) {
      link.href = review_url;
      link.hidden = false;
    }
  } catch {
    /* Keep the link hidden when the profile is unavailable. */
  }
}
