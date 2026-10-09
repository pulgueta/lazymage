import { describe, expect, it, vi } from "vitest";

import type { ScrollPosition } from "./scroll";
import {
  debounce,
  getScrollAncestor,
  isInViewport,
  subscribeToScrollPosition,
  throttle,
} from "./scroll";

const VIEWPORT_WIDTH = 1024;
const VIEWPORT_HEIGHT = 768;

const placeAt = (element: Element, top: number, left = 0): void => {
  const rect = new DOMRect(left, top, 100, 100);
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(rect);
};

const setViewport = (): void => {
  vi.stubGlobal("innerWidth", VIEWPORT_WIDTH);
  vi.stubGlobal("innerHeight", VIEWPORT_HEIGHT);
};

describe(throttle, () => {
  it("runs at once, then once more at the end of the wait", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const throttled = throttle(fn, 300);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("drops the pending call on cancel", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const throttled = throttle(fn, 300);

    throttled();
    throttled();
    throttled.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledOnce();
  });
});

describe(debounce, () => {
  it("runs once after the calls stop for the wait time", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 300);

    debounced();
    vi.advanceTimersByTime(200);
    debounced();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("drops the pending call on cancel", () => {
    vi.useFakeTimers();
    const fn = vi.fn<() => void>();
    const debounced = debounce(fn, 300);

    debounced();
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });
});

describe(getScrollAncestor, () => {
  it("returns the nearest ancestor with a scrollable overflow", () => {
    const container = document.createElement("div");
    container.style.overflowY = "auto";
    const child = document.createElement("span");
    container.append(child);
    document.body.append(container);

    expect(getScrollAncestor(child)).toBe(container);
  });

  it("returns window when no ancestor scrolls or there is no element", () => {
    const child = document.createElement("span");
    document.body.append(child);

    expect(getScrollAncestor(child)).toBe(window);
    expect(getScrollAncestor(null)).toBe(window);
  });
});

describe(isInViewport, () => {
  it("is true when the element is inside the viewport plus the threshold", () => {
    setViewport();
    const element = document.createElement("div");
    placeAt(element, VIEWPORT_HEIGHT + 50);

    expect(isInViewport(element, { x: 0, y: 0 }, 100)).toBeTruthy();
    expect(isInViewport(element, { x: 0, y: 0 }, 0)).toBeFalsy();
  });

  it("is false when the element is far below the viewport", () => {
    setViewport();
    const element = document.createElement("div");
    placeAt(element, 5000);

    expect(isInViewport(element, { x: 0, y: 0 }, 100)).toBeFalsy();
  });

  it("adds the inline top margin of the element", () => {
    setViewport();
    const element = document.createElement("div");
    element.style.marginTop = "1000px";
    placeAt(element, 0);

    expect(isInViewport(element, { x: 0, y: 0 }, 100)).toBeFalsy();
  });
});

describe(subscribeToScrollPosition, () => {
  it("reports the window scroll position on scroll and resize", () => {
    vi.useFakeTimers();
    const onChange = vi.fn<(position: ScrollPosition) => void>();
    const element = document.createElement("div");
    document.body.append(element);

    const unsubscribe = subscribeToScrollPosition(
      element,
      { delayMethod: "throttle", delayTime: 300 },
      onChange
    );
    vi.stubGlobal("scrollX", 10);
    vi.stubGlobal("scrollY", 200);
    window.dispatchEvent(new Event("scroll"));

    expect(onChange).toHaveBeenLastCalledWith({ x: 10, y: 200 });

    vi.advanceTimersByTime(300);
    window.dispatchEvent(new Event("resize"));

    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
    vi.advanceTimersByTime(300);
    window.dispatchEvent(new Event("scroll"));

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("listens to the scroll ancestor and debounces when asked", () => {
    vi.useFakeTimers();
    const onChange = vi.fn<(position: ScrollPosition) => void>();
    const container = document.createElement("div");
    container.style.overflow = "scroll";
    const element = document.createElement("div");
    container.append(element);
    document.body.append(container);

    const unsubscribe = subscribeToScrollPosition(
      element,
      { delayMethod: "debounce", delayTime: 100 },
      onChange
    );
    container.dispatchEvent(new Event("scroll"));

    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(onChange).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
