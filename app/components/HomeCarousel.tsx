import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";

import type { CarouselImage, CarouselSlide } from "~/lib/home-carousel";
import { responsiveImageProps } from "~/lib/image";

const AUTOPLAY_DELAY_MS = 6000;
const MOBILE_MEDIA = "(max-width: 767px)";

function ratio(image: CarouselImage | null, fallback: string) {
  return image?.width && image.height ? `${image.width} / ${image.height}` : fallback;
}

export function HomeCarousel({ slides }: { slides: readonly CarouselSlide[] }) {
  const hasMultiple = slides.length > 1;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, active: hasMultiple }, [
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      playOnInit: false,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Set when the shopper presses pause; hover/focus must not resume after that.
  const pausedByUser = useRef(false);

  useEffect(() => {
    if (!emblaApi) return;
    // An inactive carousel (a single slide) initializes no plugins.
    const autoplay = emblaApi.plugins()?.autoplay;

    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    const onPlay = () => {
      if (pausedByUser.current) autoplay?.stop();
      else setIsPlaying(true);
    };
    const onStop = () => setIsPlaying(false);

    emblaApi.on("select", onSelect).on("autoplay:play", onPlay).on("autoplay:stop", onStop);
    onSelect();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (hasMultiple && !reducedMotion) autoplay?.play();

    return () => {
      emblaApi.off("select", onSelect).off("autoplay:play", onPlay).off("autoplay:stop", onStop);
    };
  }, [emblaApi, hasMultiple]);

  const togglePlay = useCallback(() => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;
    if (autoplay.isPlaying()) {
      pausedByUser.current = true;
      autoplay.stop();
    } else {
      pausedByUser.current = false;
      autoplay.play();
    }
  }, [emblaApi]);

  // The first slide sets the frame's shape on each breakpoint; other slides fill
  // it with object-cover.
  const first = slides[0];
  const frameStyle = {
    "--carousel-ratio-desktop": ratio(first?.image ?? null, "19 / 6"),
    "--carousel-ratio-mobile": ratio(first?.imageMobile ?? first?.image ?? null, "7 / 9"),
  } as CSSProperties;

  return (
    <section
      className="max-w-page px-margin mx-auto w-full"
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

        {hasMultiple ? (
          <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
            <CarouselButton label="Previous slide" onClick={() => emblaApi?.scrollPrev()}>
              <img src="/icons/icon-chevron-left.svg" alt="" className="size-4" />
            </CarouselButton>
            <div role="group" aria-label="Choose slide" className="flex items-center gap-1">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className="focus-visible:outline-accent inline-flex size-6 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2"
                >
                  <span
                    className={`block size-2 rounded-full motion-safe:transition-colors ${index === selectedIndex ? "bg-white" : "bg-white/50"}`}
                  />
                </button>
              ))}
            </div>
            <CarouselButton label="Next slide" onClick={() => emblaApi?.scrollNext()}>
              <img src="/icons/icon-chevron-right.svg" alt="" className="size-4" />
            </CarouselButton>
            <CarouselButton
              label={isPlaying ? "Pause slideshow" : "Play slideshow"}
              onClick={togglePlay}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </CarouselButton>
          </div>
        ) : null}
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

function CarouselButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-visible:outline-accent inline-flex size-8 items-center justify-center rounded-full bg-white/80 text-black hover:bg-white focus-visible:outline focus-visible:outline-2 motion-safe:transition-colors"
    >
      {children}
    </button>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-3.5" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}
