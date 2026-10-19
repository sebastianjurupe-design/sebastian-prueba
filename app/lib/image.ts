// Responsive sizing for Shopify CDN images. Instead of one fixed size, each image
// gets a `srcSet` of several widths plus a `sizes` hint, so the browser picks the
// smallest file that is still sharp for the rendered size and the screen's pixel
// density. Only `width` is requested (never a crop), so the aspect ratio is kept
// and CSS (`object-cover`) controls the framing exactly as before.

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "mock.shop"];

// Covers phone 1x through desktop 2x/3x screens.
const DEFAULT_WIDTHS = [180, 360, 540, 720, 900, 1080, 1440, 1800, 2160];

function isShopifyImageHost(hostname: string) {
  return SHOPIFY_CDN_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function shopifyImageUrl(url: string, width?: number) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!isShopifyImageHost(parsed.hostname) || !width) return url;

  parsed.searchParams.set("width", String(width));
  return parsed.toString();
}

type ResponsiveImageOptions = {
  // How wide the image renders, e.g. "(min-width: 1024px) 25vw, 100vw".
  sizes: string;
  // The original width, when known. Larger candidates are dropped (the CDN never
  // upscales), and the original itself becomes the largest candidate.
  originalWidth?: number | null;
  widths?: readonly number[];
};

export function responsiveImageProps(
  url: string,
  { sizes, originalWidth, widths = DEFAULT_WIDTHS }: ResponsiveImageOptions,
): { src: string; srcSet?: string; sizes?: string } {
  // Third-party images can't be resized by the Shopify CDN; pass them through.
  if (shopifyImageUrl(url, 1) === url) return { src: url };

  let candidates = [...widths];
  if (originalWidth) {
    candidates = candidates.filter((width) => width < originalWidth);
    candidates.push(originalWidth);
  }

  const srcSet = candidates
    .map((width) => `${shopifyImageUrl(url, width)} ${width}w`)
    .join(", ");

  // `src` is the fallback for browsers without srcset support.
  const fallbackWidth = candidates.find((width) => width >= 720) ?? candidates.at(-1);

  return {
    src: shopifyImageUrl(url, fallbackWidth),
    srcSet,
    sizes,
  };
}
