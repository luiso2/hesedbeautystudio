export async function initReviews() {
  try {
    const response = await fetch("/api/reviews");
    if (!response.ok) return;
    const { review_url } = await response.json();
    if (!review_url) return;
    for (const template of document.querySelectorAll("template[data-google-review]")) {
      const link = template.content.querySelector("a").cloneNode(true);
      link.href = review_url;
      template.replaceWith(link);
    }
  } catch {
    /* Keep the link hidden when the profile is unavailable. */
  }
}
