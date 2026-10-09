import type {
  ComponentProps,
  CSSProperties,
  ReactNode,
  SyntheticEvent,
} from "react";
import { useMemo, useState } from "react";
import { preload } from "react-dom";

import { LazyLoadComponent } from "./lazy-load-component";
import { mergeRefs } from "./merge-refs";
import { useImageStatus } from "./use-image-status";
import type { UseLazyLoadOptions } from "./use-lazy-load";

export interface LazyLoadImageProps
  extends ComponentProps<"img">, Omit<UseLazyLoadOptions, "onVisible"> {
  /**
   * Called after the image loads.
   * @deprecated Use `onLoad` instead.
   */
  afterLoad?: () => void;
  /** Called right before the image element renders. */
  beforeLoad?: () => void;
  /** Effect class name, like `blur`. Import the matching CSS file. */
  effect?: string;
  /** Shown until the image is visible. */
  placeholder?: ReactNode;
  /** Image shown as the wrapper background until the image loads. */
  placeholderSrc?: string;
  /** Class name of the wrapper span. */
  wrapperClassName?: string;
  /** Props of the wrapper span. They override the default wrapper props. */
  wrapperProps?: ComponentProps<"span">;
  /** Shown once, when `src` fails to load. */
  fallbackSrc?: string;
  /** Called when the image is loaded and decoded. */
  onReady?: (image: HTMLImageElement) => void;
  /** Ask the browser to fetch the image early, with `react-dom` `preload()`. */
  preload?: boolean;
}

interface WrapperStyleOptions {
  height: number | string | undefined;
  isLoaded: boolean;
  placeholderSrc: string | undefined;
  width: number | string | undefined;
}

const createWrapperStyle = ({
  height,
  isLoaded,
  placeholderSrc,
  width,
}: WrapperStyleOptions): CSSProperties => {
  const style: CSSProperties = {
    color: "transparent",
    display: "inline-block",
    height,
    width,
  };

  if (!isLoaded && placeholderSrc !== undefined && placeholderSrc !== "") {
    style.backgroundImage = `url(${placeholderSrc})`;
    style.backgroundSize = "100% 100%";
  }

  return style;
};

const joinClassNames = (...names: (string | false)[]): string =>
  names.filter((name) => name !== false && name !== "").join(" ");

/**
 * An `<img>` that renders only after it enters the viewport. It shows an
 * optional placeholder and effect until the image is loaded and decoded.
 */
export const LazyLoadImage = ({
  // oxlint-disable-next-line typescript/no-deprecated -- kept for upstream compatibility; it must still run.
  afterLoad,
  alt,
  beforeLoad,
  decoding = "async",
  delayMethod,
  delayTime,
  effect = "",
  fallbackSrc,
  onError,
  onLoad,
  onReady,
  placeholder,
  placeholderSrc,
  preload: shouldPreload = false,
  ref,
  root,
  scrollMargin,
  scrollPosition,
  threshold,
  useIntersectionObserver,
  visibleByDefault = false,
  wrapperClassName = "",
  wrapperProps,
  ...imageProps
}: LazyLoadImageProps) => {
  const { className, fetchPriority, height, sizes, src, srcSet, style, width } =
    imageProps;
  const [isVisible, setIsVisible] = useState(visibleByDefault);
  const status = useImageStatus({ fallbackSrc, onReady, src });
  const imageRef = useMemo(() => mergeRefs(ref, status.ref), [ref, status.ref]);

  if (shouldPreload && src !== undefined) {
    preload(src, {
      as: "image",
      fetchPriority,
      imageSizes: sizes,
      imageSrcSet: srcSet,
    });
  }

  const isLoaded = status.state === "loaded";

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    onLoad?.(event);
    afterLoad?.();
    status.onLoad(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>): void => {
    onError?.(event);
    status.onError(event);
  };

  const lazyImage = (
    <LazyLoadComponent
      beforeLoad={() => {
        setIsVisible(true);
        beforeLoad?.();
      }}
      className={className}
      delayMethod={delayMethod}
      delayTime={delayTime}
      height={height}
      placeholder={placeholder}
      root={root}
      scrollMargin={scrollMargin}
      scrollPosition={scrollPosition}
      style={style}
      threshold={threshold}
      useIntersectionObserver={useIntersectionObserver}
      visibleByDefault={visibleByDefault}
      width={width}
    >
      <img
        {...imageProps}
        alt={alt}
        data-state={status.state}
        decoding={decoding}
        onError={handleError}
        onLoad={isLoaded ? undefined : handleLoad}
        ref={imageRef}
        src={status.src}
      />
    </LazyLoadComponent>
  );

  const hasEffect = effect !== "" || Boolean(placeholderSrc);
  const needsWrapper = hasEffect && !visibleByDefault;
  if (!needsWrapper && wrapperClassName === "" && wrapperProps === undefined) {
    return lazyImage;
  }

  return (
    <span
      className={joinClassNames(
        wrapperClassName,
        "lazy-load-image-background",
        effect,
        isLoaded && "lazy-load-image-loaded"
      )}
      data-state={isVisible ? status.state : "idle"}
      style={createWrapperStyle({ height, isLoaded, placeholderSrc, width })}
      {...wrapperProps}
    >
      {lazyImage}
    </span>
  );
};
