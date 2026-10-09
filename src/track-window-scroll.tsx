import type { ComponentType, Ref, RefCallback } from "react";
import { useCallback, useEffect, useState } from "react";

import { mergeRefs } from "./merge-refs";
import { isIntersectionObserverAvailable } from "./observer";
import type { DelayMethod, ScrollPosition } from "./scroll";
import { getScrollPosition, subscribeToScrollPosition } from "./scroll";

export interface TrackWindowScrollProps {
  /** How to limit the scroll and resize updates. */
  delayMethod?: DelayMethod;
  /** Time in ms for `delayMethod`. */
  delayTime?: number;
  /** Use IntersectionObserver when the browser supports it. Forwarded to the component. */
  useIntersectionObserver?: boolean;
  /**
   * Forwarded to the component. When the component attaches it to an
   * element, the HOC also tracks the scroll container of that element.
   */
  ref?: Ref<Element>;
}

/** The props that `trackWindowScroll` gives to the wrapped component. */
export interface ScrollPositionProps {
  /** The window scroll position, or `null` when IntersectionObserver is used. */
  scrollPosition: ScrollPosition | null;
}

export type WithScrollPositionProps<P extends ScrollPositionProps> = Omit<
  P,
  "scrollPosition"
> &
  TrackWindowScrollProps;

/** The props that the tracker gives to the wrapped component. */
type TrackedProps<F> = F &
  ScrollPositionProps & {
    ref: RefCallback<Element>;
    useIntersectionObserver?: boolean;
  };

interface ScrollTrackerProps<F> extends TrackWindowScrollProps {
  component: ComponentType<TrackedProps<F>>;
  forwardedProps: F;
}

const DEFAULT_DELAY_TIME = 300;

const ScrollTracker = <F,>({
  component: Component,
  delayMethod = "throttle",
  delayTime = DEFAULT_DELAY_TIME,
  forwardedProps,
  ref,
  useIntersectionObserver = true,
}: ScrollTrackerProps<F>) => {
  const isObserverUsed =
    useIntersectionObserver && isIntersectionObserverAvailable();
  const [scrollPosition, setScrollPosition] =
    useState<ScrollPosition>(getScrollPosition);
  const [scrollTarget, setScrollTarget] = useState<Element | null>(null);

  const trackScrollTarget = useCallback<RefCallback<Element>>((node) => {
    setScrollTarget(node);

    return () => {
      setScrollTarget(null);
    };
  }, []);
  // A class component gives its instance to the ref, not an element. Give
  // `null` in its place, so that the HOC tracks the window and the ref of
  // the user gets only an `Element`, as its type says.
  const componentRef = useCallback<RefCallback<unknown>>(
    (node) =>
      mergeRefs(ref, trackScrollTarget)(node instanceof Element ? node : null),
    [ref, trackScrollTarget]
  );

  useEffect(
    () =>
      isObserverUsed
        ? undefined
        : subscribeToScrollPosition(
            scrollTarget,
            { delayMethod, delayTime },
            setScrollPosition
          ),
    [delayMethod, delayTime, isObserverUsed, scrollTarget]
  );

  return (
    <Component
      scrollPosition={isObserverUsed ? null : scrollPosition}
      {...forwardedProps}
      ref={componentRef}
      useIntersectionObserver={useIntersectionObserver}
    />
  );
};

/**
 * Track the window scroll in one place and pass `scrollPosition` to the
 * component. Give that position to each lazy component inside it, so that
 * they do not each listen to scroll events. When IntersectionObserver is
 * used, `scrollPosition` is `null` and the HOC adds no listeners.
 *
 * Unlike the upstream class HOC, this one finds the scroll container through
 * the `ref` it passes to the component (no `findDOMNode`). Without an
 * attached ref, it tracks the window.
 */
export function trackWindowScroll<P extends ScrollPositionProps>(
  Component: ComponentType<P>
): ComponentType<WithScrollPositionProps<P>>;
// The implementation cannot name `P`: TypeScript cannot rebuild a generic
// `P` from `Omit<P, "scrollPosition">` and a `scrollPosition`. The public
// signature above keeps the types for callers.
export function trackWindowScroll(
  Component: ComponentType<TrackedProps<object>>
): ComponentType<TrackWindowScrollProps> {
  const WithScrollPosition = ({
    delayMethod,
    delayTime,
    ref,
    useIntersectionObserver,
    ...forwardedProps
  }: TrackWindowScrollProps) => (
    <ScrollTracker
      component={Component}
      delayMethod={delayMethod}
      delayTime={delayTime}
      forwardedProps={forwardedProps}
      ref={ref}
      useIntersectionObserver={useIntersectionObserver}
    />
  );

  return WithScrollPosition;
}
