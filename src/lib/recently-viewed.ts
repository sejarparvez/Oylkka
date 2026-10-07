// Recently-viewed history (CUST-16). Only the product reference is stored -
// price, stock and name are re-hydrated from the server on the page so a
// stale localStorage snapshot can never be displayed.
const STORAGE_KEY = 'oylkka_recently_viewed';
const MAX_ITEMS = 20;

export type RecentProductRef = {
  id: string;
  slug: string;
  viewedAt: number;
};

export function getRecentProductRefs(): RecentProductRef[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (entry): entry is { id: string; slug: string; viewedAt?: unknown } =>
          !!entry &&
          typeof entry === 'object' &&
          typeof (entry as { id?: unknown }).id === 'string' &&
          typeof (entry as { slug?: unknown }).slug === 'string',
      )
      .map((entry) => ({
        id: entry.id,
        slug: entry.slug,
        viewedAt:
          typeof entry.viewedAt === 'number' ? entry.viewedAt : Date.now(),
      }))
      .slice(0, MAX_ITEMS);
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to parse stored recent products:', error);
    return [];
  }
}

export function trackProductView(product: { id: string; slug: string }) {
  try {
    const items = getRecentProductRefs().filter((p) => p.id !== product.id);
    items.unshift({ ...product, viewedAt: Date.now() });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS)),
    );
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to track product view:', error);
  }
}

export function clearRecentProducts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to clear recent products:', error);
  }
}
