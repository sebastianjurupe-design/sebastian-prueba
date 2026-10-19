import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

import { responsiveImageProps } from "~/lib/image";
import { compareMoney, formatPrice } from "~/lib/money";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    handle
    title
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
        width
      }
    }
    availableForSale
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`);

const PRODUCT_CARD_SHAPE_QUERY = gql(
  `query ProductCardShape { products(first: 1) { nodes { ...ProductCard } } }`,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductCardData = StorefrontApi.ResultOf<
  typeof PRODUCT_CARD_SHAPE_QUERY
>["products"]["nodes"][number];

// Default grid: 1 column on phones, 2 on tablets, 4 on desktop (page caps at 80rem).
const DEFAULT_CARD_SIZES = "(min-width: 1280px) 320px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw";

// Collection and search grids: 2 columns, then 3 beside a 15rem filter sidebar.
export const FILTERED_GRID_SIZES = "(min-width: 1280px) 340px, (min-width: 1024px) 28vw, 50vw";

type ProductCardProps = {
  product: ProductCardData;
  priority?: boolean;
  // How wide the card renders in its grid; see `responsiveImageProps`.
  sizes?: string;
};

export function ProductCard({
  product,
  priority = false,
  sizes = DEFAULT_CARD_SIZES,
}: ProductCardProps) {
  const primaryImage = product.featuredImage ?? product.images.nodes[0] ?? null;
  const hoverImage = product.images.nodes[1] ?? null;
  const price = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange.minVariantPrice;
  const onSale = compareMoney(compareAt, price) > 0;
  const badge = !product.availableForSale ? "Sold out" : onSale ? "Sale" : null;
  const badgeClass = !product.availableForSale ? "badge-soldout" : "badge-sale";

  return (
    <article
      className="group card flex flex-col gap-2"
      aria-label={product.title}
      data-testid="product-card"
    >
      <div className="rounded-card bg-surface-secondary relative block aspect-square overflow-hidden">
        {primaryImage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
            <img
              {...responsiveImageProps(primaryImage.url, {
                sizes,
                originalWidth: primaryImage.width,
              })}
              alt={primaryImage.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : null}
        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100">
            <img
              {...responsiveImageProps(hoverImage.url, { sizes, originalWidth: hoverImage.width })}
              alt={hoverImage.altText ?? ""}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        {badge ? (
          <span
            className={`${badgeClass} absolute start-2 top-2 inline-flex items-center rounded-full font-medium`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 text-left">
        <h3 className="type-body-sm text-on-surface line-clamp-2 font-medium">
          <Link to={`/products/${product.handle}`} className="card-link text-on-surface">
            {product.title}
          </Link>
        </h3>
        <div className="inline-flex flex-wrap items-baseline gap-2 text-sm">
          {onSale ? (
            <>
              <span className="text-sale font-medium">
                <span className="sr-only">Sale price: </span>
                {formatPrice(price)}
              </span>
              <s className="text-compare text-sm">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAt)}
              </s>
            </>
          ) : (
            <span className="text-on-surface font-medium">
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
