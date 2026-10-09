import { act, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  installIntersectionObserver,
  installLegacyIntersectionObserver,
} from "../test/intersection-observer";
import type { UseLazyLoadOptions } from "./use-lazy-load";
import { useLazyLoad } from "./use-lazy-load";

const FAR_BELOW = 5000;

const Probe = (options: UseLazyLoadOptions) => {
  const { isVisible, ref } = useLazyLoad(options);

  return <div data-testid="probe" data-visible={isVisible} ref={ref} />;
};

const getProbe = (): HTMLElement => screen.getByTestId("probe");

const isProbeVisible = (): boolean => getProbe().dataset.visible === "true";

const placeEveryElementAt = (top: number): void => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, top, 100, 100)
  );
};

describe(useLazyLoad, () => {
  it("observes the element and becomes visible when it intersects", () => {
    const io = installIntersectionObserver();
    const onVisible = vi.fn<() => void>();
    render(<Probe onVisible={onVisible} />);

    expect(isProbeVisible()).toBeFalsy();
    expect(io.observers[0]?.options.rootMargin).toBe("100px");

    act(() => {
      io.intersect(getProbe());
    });

    expect(isProbeVisible()).toBeTruthy();
    expect(onVisible).toHaveBeenCalledOnce();
    expect(io.observersOf(getProbe())).toHaveLength(0);
  });

  it("maps threshold, root, and scrollMargin to the observer options", () => {
    const io = installIntersectionObserver();
    const root = document.createElement("div");
    render(<Probe root={root} scrollMargin={50} threshold={300} />);

    expect(io.observers[0]?.options).toMatchObject({
      root,
      rootMargin: "300px",
      scrollMargin: "50px",
    });
  });

  it("accepts scrollMargin as a CSS string", () => {
    const io = installIntersectionObserver();
    render(<Probe scrollMargin="10% 0px" />);

    expect(io.observers[0]?.options.scrollMargin).toBe("10% 0px");
  });

  it("is visible at once and observes nothing with visibleByDefault", () => {
    const io = installIntersectionObserver();
    const onVisible = vi.fn<() => void>();
    render(<Probe onVisible={onVisible} visibleByDefault />);

    expect(isProbeVisible()).toBeTruthy();
    expect(io.observers).toHaveLength(0);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("calls onVisible once in StrictMode", () => {
    const io = installIntersectionObserver();
    const onVisible = vi.fn<() => void>();
    render(
      <StrictMode>
        <Probe onVisible={onVisible} />
      </StrictMode>
    );

    expect(io.observersOf(getProbe())).toHaveLength(1);

    act(() => {
      io.intersect(getProbe());
    });

    expect(isProbeVisible()).toBeTruthy();
    expect(onVisible).toHaveBeenCalledOnce();
  });

  it("stops observing on unmount", () => {
    const io = installIntersectionObserver();
    const { unmount } = render(<Probe />);
    const probe = getProbe();

    unmount();

    expect(io.observersOf(probe)).toHaveLength(0);
  });

  it("uses the scroll position from the parent instead of an observer", () => {
    const io = installIntersectionObserver();
    placeEveryElementAt(FAR_BELOW);
    const { rerender } = render(<Probe scrollPosition={{ x: 0, y: 0 }} />);

    expect(isProbeVisible()).toBeFalsy();
    expect(io.observers).toHaveLength(0);

    // After the scroll, the element is at the top of the viewport.
    placeEveryElementAt(0);
    rerender(<Probe scrollPosition={{ x: 0, y: FAR_BELOW }} />);

    expect(isProbeVisible()).toBeTruthy();
  });

  it("ignores an invalid scroll position and uses the observer", () => {
    const io = installIntersectionObserver();
    render(<Probe scrollPosition={{ x: -1, y: Number.NaN }} />);

    expect(io.observersOf(getProbe())).toHaveLength(1);
  });

  it("tracks the scroll when useIntersectionObserver is false", () => {
    vi.useFakeTimers();
    const io = installIntersectionObserver();
    placeEveryElementAt(FAR_BELOW);
    render(<Probe useIntersectionObserver={false} />);

    expect(isProbeVisible()).toBeFalsy();
    expect(io.observers).toHaveLength(0);

    placeEveryElementAt(0);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(isProbeVisible()).toBeTruthy();
  });

  it("tracks the scroll when IntersectionObserver is not usable", () => {
    installLegacyIntersectionObserver();
    render(<Probe />);

    expect(isProbeVisible()).toBeTruthy();
  });

  it("debounces the scroll tracking when asked", () => {
    vi.useFakeTimers();
    installLegacyIntersectionObserver();
    placeEveryElementAt(FAR_BELOW);
    render(<Probe delayMethod="debounce" delayTime={200} />);

    placeEveryElementAt(0);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(isProbeVisible()).toBeFalsy();

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(isProbeVisible()).toBeTruthy();
  });

  it("renders visibleByDefault on the server", () => {
    expect(renderToString(<Probe />)).toContain('data-visible="false"');
    expect(renderToString(<Probe visibleByDefault />)).toContain(
      'data-visible="true"'
    );
  });
});
