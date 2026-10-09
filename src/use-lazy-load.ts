import type { RefCallback } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { ObserverRoot } from "./observer";
import { isIntersectionObserverAvailable, observeVisibility } from "./observer";
import type { DelayMethod, ScrollPosition } from "./scroll";
import {
  getScrollPosition,
  isInViewport,
  subscribeToScrollPosition,
} from "./scroll";

export interface UseLazyLoadOptions {
  /** Distance in px from the viewport at which the element becomes visible. */
  threshold?: number;
  /** The scroll container for the IntersectionObserver. Defaults to the viewport. */
  root?: ObserverRoot;
  /** Margin for nested scroll containers, in px or as a CSS string. */
  scrollMargin?: number | string;
  /** Make the element visible at once, without observing it. */
  visibleByDefault?: boolean;
  /** Use an IntersectionObserver when the browser supports it. */
  useIntersectionObserver?: boolean;
  /** The scroll position from a parent that tracks the scroll, like `trackWindowScroll`. */
  scrollPosition?: ScrollPosition | null;
  /** How to limit the scroll and resize checks without IntersectionObserver. */
  delayMethod?: DelayMethod;
  /** Time in ms for `delayMethod`. */
  delayTime?: number;
  /** Called once, right before the element becomes visible. */
  onVisible?: () => void;
}

export interface UseLazyLoadResult<T extends Element = Element> {
  /** Attach this ref to the element to observe. */
  ref: RefCallback<T>;
  /** `true` after the element entered the viewport. It never goes back. */
  isVisible: boolean;
}

const DEFAULT_THRESHOLD = 100;
const DEFAULT_DELAY_TIME = 300;

const isTrackedScrollPosition = (
  position: ScrollPosition | null | undefined
): position is ScrollPosition =>
  position !== null &&
  position !== undefined &&
  Number.isFinite(position.x) &&
  position.x >= 0 &&
  Number.isFinite(position.y) &&
  position.y >= 0;

const isPixelCount = (value: number | string): value is number =>
  typeof value === "number";

const toCssLength = (
  value: number | string | undefined
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return isPixelCount(value) ? `${value}px` : value;
};

interface WatchSettings {
  delayMethod: DelayMethod;
  delayTime: number;
  root: ObserverRoot;
  scrollMargin: string | undefined;
  threshold: number;
  useIntersectionObserver: boolean;
}

/**
 * Call `reveal` when `element` enters the viewport: with the shared
 * IntersectionObserver when possible, else with scroll and resize events.
 */
const watchVisibility = (
  element: Element,
  settings: WatchSettings,
  reveal: () => void
): (() => void) => {
  const { delayMethod, delayTime, root, scrollMargin, threshold } = settings;

  if (settings.useIntersectionObserver && isIntersectionObserverAvailable()) {
    return observeVisibility(
      element,
      { root, rootMargin: `${threshold}px`, scrollMargin },
      reveal
    );
  }

  const revealIfInViewport = (position: ScrollPosition): void => {
    if (isInViewport(element, position, threshold)) {
      reveal();
    }
  };

  revealIfInViewport(getScrollPosition());

  return subscribeToScrollPosition(
    element,
    { delayMethod, delayTime },
    revealIfInViewport
  );
};

/**
 * Tell when an element enters the viewport. The result is `isVisible: false`
 * on the server and on the first client render, unless `visibleByDefault`.
 */
export const useLazyLoad = <T extends Element = Element>({
  threshold = DEFAULT_THRESHOLD,
  root = null,
  scrollMargin,
  visibleByDefault = false,
  useIntersectionObserver = true,
  scrollPosition,
  delayMethod = "throttle",
  delayTime = DEFAULT_DELAY_TIME,
  onVisible,
}: UseLazyLoadOptions = {}): UseLazyLoadResult<T> => {
  const [isVisible, setIsVisible] = useState(visibleByDefault);
  const [element, setElement] = useState<T | null>(null);
  const hasRevealedRef = useRef(visibleByDefault);
  const onVisibleRef = useRef(onVisible);

  useLayoutEffect(() => {
    onVisibleRef.current = onVisible;
  });

  const reveal = useCallback(() => {
    if (hasRevealedRef.current) {
      return;
    }

    hasRevealedRef.current = true;
    onVisibleRef.current?.();
    setIsVisible(true);
  }, []);

  const ref = useCallback<RefCallback<T>>((node) => {
    setElement(node);

    return () => {
      setElement(null);
    };
  }, []);

  const trackedPosition = isTrackedScrollPosition(scrollPosition)
    ? scrollPosition
    : null;
  const isScrollTracked = trackedPosition !== null;
  const scrollMarginCss = toCssLength(scrollMargin);

  // A parent tracks the scroll and passes the position down. Each update is
  // a new object, also when only a scroll container scrolled or the window
  // resized, so check again on each new object, not on new x and y only.
  useEffect(() => {
    if (isVisible || !element || trackedPosition === null) {
      return;
    }

    if (isInViewport(element, trackedPosition, threshold)) {
      reveal();
    }
  }, [element, isVisible, reveal, threshold, trackedPosition]);

  // The element tracks its own visibility.
  useEffect(() => {
    const isSelfTracked = !isVisible && !isScrollTracked;

    return isSelfTracked && element
      ? watchVisibility(
          element,
          {
            delayMethod,
            delayTime,
            root,
            scrollMargin: scrollMarginCss,
            threshold,
            useIntersectionObserver,
          },
          reveal
        )
      : undefined;
  }, [
    delayMethod,
    delayTime,
    element,
    isScrollTracked,
    isVisible,
    reveal,
    root,
    scrollMarginCss,
    threshold,
    useIntersectionObserver,
  ]);

  return { isVisible, ref };
};
