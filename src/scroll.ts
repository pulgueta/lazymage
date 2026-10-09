export interface ScrollPosition {
  x: number;
  y: number;
}

export type DelayMethod = "debounce" | "throttle";

export interface DelayOptions {
  delayMethod: DelayMethod;
  delayTime: number;
}

export interface DelayedFunction {
  (): void;
  /** Drop the pending call, if any. */
  cancel: () => void;
}

/**
 * Run `fn` at once, then at most once per `wait` ms. A call that arrives
 * during the wait runs at the end of it.
 */
export const throttle = (fn: () => void, wait: number): DelayedFunction => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hasPendingCall = false;

  const endWait = (): void => {
    if (!hasPendingCall) {
      timer = undefined;
      return;
    }

    hasPendingCall = false;
    fn();
    timer = setTimeout(endWait, wait);
  };

  const throttled = (): void => {
    if (timer !== undefined) {
      hasPendingCall = true;
      return;
    }

    fn();
    timer = setTimeout(endWait, wait);
  };

  return Object.assign(throttled, {
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
      hasPendingCall = false;
    },
  });
};

/** Run `fn` once, `wait` ms after the last call. */
export const debounce = (fn: () => void, wait: number): DelayedFunction => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (): void => {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };

  return Object.assign(debounced, {
    cancel: () => {
      clearTimeout(timer);
      timer = undefined;
    },
  });
};

const SCROLLABLE_OVERFLOW = /(?:scroll|auto)/u;

const getOverflowValues = (element: HTMLElement): string => {
  const style = getComputedStyle(element);

  return (
    style.getPropertyValue("overflow") +
    style.getPropertyValue("overflow-y") +
    style.getPropertyValue("overflow-x")
  );
};

/**
 * Find the nearest element (the element itself included) that scrolls its
 * content. Adapted from loktar00/react-lazy-load.
 */
export const getScrollAncestor = (
  element: Element | null
): HTMLElement | Window => {
  let current: Node | null = element;

  // Start from any element, like an SVG shape, but only HTML elements can
  // be the scroll container.
  while (current instanceof Element) {
    if (
      current instanceof HTMLElement &&
      SCROLLABLE_OVERFLOW.test(getOverflowValues(current))
    ) {
      return current;
    }

    current = current.parentNode;
  }

  return window;
};

const getInlineMargin = (element: Element, property: string): number => {
  if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
    return 0;
  }

  // oxlint-disable-next-line unicorn/prefer-number-coercion -- Number("10px") is NaN; parseFloat reads the leading number.
  return Number.parseFloat(element.style.getPropertyValue(property)) || 0;
};

/**
 * Tell if `element` is inside the viewport, extended by `threshold` px on
 * every side. `scrollPosition` is the window scroll position.
 */
export const isInViewport = (
  element: Element,
  scrollPosition: ScrollPosition,
  threshold: number
): boolean => {
  const rect = element.getBoundingClientRect();
  const marginLeft = getInlineMargin(element, "margin-left");
  const marginTop = getInlineMargin(element, "margin-top");

  const box = {
    bottom: scrollPosition.y + rect.bottom + marginTop,
    left: scrollPosition.x + rect.left + marginLeft,
    right: scrollPosition.x + rect.right + marginLeft,
    top: scrollPosition.y + rect.top + marginTop,
  };
  const viewport = {
    bottom: scrollPosition.y + window.innerHeight,
    left: scrollPosition.x,
    right: scrollPosition.x + window.innerWidth,
    top: scrollPosition.y,
  };

  return (
    viewport.top - threshold <= box.bottom &&
    viewport.bottom + threshold >= box.top &&
    viewport.left - threshold <= box.right &&
    viewport.right + threshold >= box.left
  );
};

/** Read the window scroll position. Returns the origin on the server. */
export const getScrollPosition = (): ScrollPosition => {
  if (!("window" in globalThis)) {
    return { x: 0, y: 0 };
  }

  return { x: window.scrollX, y: window.scrollY };
};

/**
 * Call `onChange` with the window scroll position when the scroll ancestor
 * of `element` or the window scrolls, or when the window resizes. The calls
 * are throttled or debounced. The returned function removes the listeners.
 */
export const subscribeToScrollPosition = (
  element: Element | null,
  { delayMethod, delayTime }: DelayOptions,
  onChange: (position: ScrollPosition) => void
): (() => void) => {
  const delay = delayMethod === "debounce" ? debounce : throttle;
  const handleChange = delay(() => {
    onChange(getScrollPosition());
  }, delayTime);
  const scrollAncestor = getScrollAncestor(element);
  const listenerOptions = { passive: true };

  scrollAncestor.addEventListener("scroll", handleChange, listenerOptions);
  window.addEventListener("resize", handleChange, listenerOptions);
  if (scrollAncestor !== window) {
    window.addEventListener("scroll", handleChange, listenerOptions);
  }

  return () => {
    handleChange.cancel();
    scrollAncestor.removeEventListener("scroll", handleChange);
    window.removeEventListener("resize", handleChange);
    window.removeEventListener("scroll", handleChange);
  };
};
