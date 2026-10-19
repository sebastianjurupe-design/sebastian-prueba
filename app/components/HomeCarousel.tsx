import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";

import type { CarouselImage, CarouselSlide } from "~/lib/home-carousel";
import { responsiveImageProps } from "~/lib/image";

const AUTOPLAY_DELAY_MS = 6000;
const MOBILE_MEDIA = "(max-width: 767px)";

function ratio(image: CarouselImage | null, fallback: string) {
  return image?.width && image.height ? `${image.width} / ${image.height}` : fallback;
}

// Controls are styled in app.css (.home-carousel, .carousel-arrow, .carousel-dot).
export function HomeCarousel({ slides }: { slides: readonly CarouselSlide[] }) {
  const hasMultiple = slides.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, active: hasMultiple }, [
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      playOnInit: false,
      stopOnInteraction: false,
      stopOnMouseEnter: false,
      stopOnFocusIn: false,
    }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    // An inactive carousel (a single slide) initializes no plugins.
    const autoplay = emblaApi.plugins()?.autoplay;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (hasMultiple && !reducedMotion) autoplay?.play();

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, hasMultiple]);

  // The first slide sets the frame's shape on each breakpoint; other slides fill
  // it with object-cover.
  const first = slides[0];
  const frameStyle = {
    "--carousel-ratio-desktop": ratio(first?.image ?? null, "19 / 6"),
    "--carousel-ratio-mobile": ratio(first?.imageMobile ?? first?.image ?? null, "7 / 9"),
  } as CSSProperties;

  return (
    <section
      className="home-carousel max-w-page px-margin mx-auto w-full"
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      <div className="bleed-full bg-surface-secondary relative overflow-hidden">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex touch-pan-y">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}`}
                className="min-w-0 shrink-0 grow-0 basis-full"
              >
                <SlideLink slide={slide}>
                  <div
                    style={frameStyle}
                    className="aspect-(--carousel-ratio-mobile) md:aspect-(--carousel-ratio-desktop) relative w-full"
                  >
                    <SlidePicture slide={slide} priority={index === 0} />
                  </div>
                </SlideLink>
              </div>
            ))}
          </div>
        </div>

        {/* {hasMultiple ? (
          <div className="carousel-controls">
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => emblaApi?.scrollPrev()}
              className="carousel-arrow"
            >
              <ChevronIcon direction="left" />
            </button>
            <div role="group" aria-label="Choose slide" className="carousel-dots">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className="carousel-dot"
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => emblaApi?.scrollNext()}
              className="carousel-arrow"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        ) : null} */}
      </div>
    </section>
  );
}

function SlideLink({ slide, children }: { slide: CarouselSlide; children: ReactNode }) {
  const className =
    "focus-visible:outline-accent block focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2";
  const label = slide.label ?? undefined;

  if (!slide.href) return <div>{children}</div>;
  if (slide.external) {
    return (
      <a href={slide.href} aria-label={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={slide.href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

// Desktop and mobile artwork are different crops, so <picture> swaps the file by
// breakpoint instead of letting CSS crop a single image.
function SlidePicture({ slide, priority }: { slide: CarouselSlide; priority: boolean }) {
  const { image, imageMobile } = slide;
  const desktop = responsiveImageProps(image.url, {
    sizes: "100vw",
    originalWidth: image.width,
  });
  const mobile = imageMobile
    ? responsiveImageProps(imageMobile.url, {
        sizes: "100vw",
        originalWidth: imageMobile.width,
      })
    : null;

  return (
    <picture>
      {mobile ? (
        <source
          media={MOBILE_MEDIA}
          srcSet={mobile.srcSet ?? mobile.src}
          sizes={mobile.sizes}
          width={imageMobile?.width ?? undefined}
          height={imageMobile?.height ?? undefined}
        />
      ) : null}
      <img
        {...desktop}
        alt={image.altText ?? ""}
        width={image.width ?? undefined}
        height={image.height ?? undefined}
        className="absolute inset-0 h-full w-full object-cover"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </picture>
  );
}

// Inline (not <img>) so the arrow takes its color from CSS `color`.
function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 8 12" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M6.5 11L1.5 6L6.5 1" : "M1.5 1L6.5 6L1.5 11"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
