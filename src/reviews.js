export async function initReviews() {
  const root = document.querySelector('#customer-reviews');
  if (!root) return;
  try {
    const response = await fetch('/api/reviews');
    if (!response.ok) return;
    const { reviews } = await response.json();
    if (!reviews?.length) return;
    root.replaceChildren();
    reviews.forEach((review) => {
      const card = document.createElement('article'); card.className = 'customer-review';
      const rating = document.createElement('p'); rating.className = 'customer-review__rating';
      rating.textContent = `${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} · ${review.rating}/5`;
      const quote = document.createElement('blockquote'); quote.textContent = review.comment;
      const name = document.createElement('p'); name.className = 'customer-review__name'; name.textContent = review.display_name;
      card.append(rating, quote, name); root.append(card);
    });
  } catch { /* The invitation remains available if the read API is offline. */ }
}
