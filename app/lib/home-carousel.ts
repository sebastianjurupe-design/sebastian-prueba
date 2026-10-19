import { gql, type StorefrontApi } from "@shopify/hydrogen";

// Homepage carousel, managed in the Shopify admin as metaobjects:
// - `home_carousel` (one entry): `slides_carrusel`, an ordered list of slides.
// - `home_slide`: `imagen` (desktop), `imagen_mobile` (optional), `link`.
// The first `home_carousel` entry is used, so its handle can change freely.
export const HOME_CAROUSEL_FRAGMENT = gql(`
  fragment HomeCarousel on QueryRoot {
    homeCarousel: metaobjects(type: "home_carousel", first: 1) {
      nodes {
        slides: field(key: "slides_carrusel") {
          references(first: 10) {
            nodes {
              ... on Metaobject {
                id
                type
                image: field(key: "imagen") {
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
                imageMobile: field(key: "imagen_mobile") {
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                        width
                        height
                      }
                    }
                  }
                }
                link: field(key: "link") {
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`);

const HOME_CAROUSEL_SHAPE_QUERY = gql(`query HomeCarouselShape { ...HomeCarousel }`, [
  HOME_CAROUSEL_FRAGMENT,
]);

type HomeCarouselResult = StorefrontApi.ResultOf<typeof HOME_CAROUSEL_SHAPE_QUERY>;

export type CarouselImage = {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type CarouselSlide = {
  id: string;
  image: CarouselImage;
  imageMobile: CarouselImage | null;
  // Internal links are paths (client-side navigation); others stay absolute.
  href: string | null;
  external: boolean;
  label: string | null;
};

// A file field can reference any file type; only MediaImage carries `image`.
function imageFrom(reference: object | null | undefined): CarouselImage | null {
  if (!reference || !("image" in reference)) return null;
  return (reference.image as CarouselImage | null) ?? null;
}

// Links that point at this storefront (its own host, or a Shopify-hosted preview
// or admin domain) become paths, so they keep working on any domain.
function resolveLink(rawUrl: string, requestUrl: URL) {
  if (rawUrl.startsWith("/")) return { href: rawUrl, external: false };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const isOwnHost =
    url.host === requestUrl.host ||
    url.hostname.endsWith(".myshopify.dev") ||
    url.hostname.endsWith(".myshopify.com");

  return isOwnHost
    ? { href: `${url.pathname}${url.search}${url.hash}`, external: false }
    : { href: url.toString(), external: true };
}

// The `link` field stores JSON: {"text": "...", "url": "..."}.
function parseLinkField(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { text?: string; url?: string };
    return parsed.url ? { url: parsed.url, text: parsed.text?.trim() || null } : null;
  } catch {
    return null;
  }
}

export function selectCarouselSlides(
  data: HomeCarouselResult | null | undefined,
  requestUrl: URL,
): CarouselSlide[] {
  const nodes = data?.homeCarousel.nodes[0]?.slides?.references?.nodes ?? [];
  const slides: CarouselSlide[] = [];

  for (const node of nodes) {
    // The list field accepts any metaobject; only slides with an image count.
    if (!("type" in node) || node.type !== "home_slide") continue;
    const image = imageFrom(node.image?.reference);
    if (!image) continue;

    const link = parseLinkField(node.link?.value);
    const resolved = link ? resolveLink(link.url, requestUrl) : null;

    slides.push({
      id: node.id,
      image,
      imageMobile: imageFrom(node.imageMobile?.reference),
      href: resolved?.href ?? null,
      external: resolved?.external ?? false,
      label: image.altText || link?.text || null,
    });
  }

  return slides;
}
