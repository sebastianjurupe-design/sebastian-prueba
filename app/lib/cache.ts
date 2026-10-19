import { Cache } from "@shopify/hydrogen";

// Sub-request cache strategies for Storefront API catalog reads. Never pass
// these to buyer-specific reads (cart, customer account).

// Shop name, logo, payment methods: rarely change.
export const SHOP_CACHE = Cache.long();

// Products and collections. Fresh for 1 minute; after that the cached copy is
// still served instantly while a background refresh fetches the latest data, so
// price and stock changes show up on the next visit without anyone waiting.
// The cart and checkout always re-check price and availability with Shopify.
export const CATALOG_CACHE = Cache({
  maxAge: { minutes: 1 },
  staleWhileRevalidate: { days: 1 },
});

// Search results: many distinct terms, so keep them only briefly.
export const SEARCH_CACHE = Cache.short();
