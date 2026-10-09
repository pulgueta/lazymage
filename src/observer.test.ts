import { describe, expect, it, vi } from "vitest";

import {
  installIntersectionObserver,
  installLegacyIntersectionObserver,
} from "../test/intersection-observer";
import { isIntersectionObserverAvailable, observeVisibility } from "./observer";

const createTarget = (): HTMLElement => {
  const element = document.createElement("div");
  document.body.append(element);
  return element;
};

describe(isIntersectionObserverAvailable, () => {
  it("is true when entries support isIntersecting", () => {
    installIntersectionObserver();

    expect(isIntersectionObserverAvailable()).toBeTruthy();
  });

  it("is false when entries do not support isIntersecting", () => {
    installLegacyIntersectionObserver();

    expect(isIntersectionObserverAvailable()).toBeFalsy();
  });
});

describe(observeVisibility, () => {
  it("shares one observer for the same root and margins", () => {
    const io = installIntersectionObserver();
    const first = createTarget();
    const second = createTarget();

    const stopFirst = observeVisibility(
      first,
      { rootMargin: "100px" },
      vi.fn<() => void>()
    );
    const stopSecond = observeVisibility(
      second,
      { rootMargin: "100px" },
      vi.fn<() => void>()
    );

    expect(io.observers).toHaveLength(1);
    expect(io.observers[0]?.options.rootMargin).toBe("100px");
    expect(io.observers[0]?.options.root).toBeNull();
    stopFirst();
    stopSecond();
  });

  it("creates one observer per root and per margin", () => {
    const io = installIntersectionObserver();
    const root = createTarget();

    const stops = [
      observeVisibility(
        createTarget(),
        { rootMargin: "100px" },
        vi.fn<() => void>()
      ),
      observeVisibility(
        createTarget(),
        { rootMargin: "200px" },
        vi.fn<() => void>()
      ),
      observeVisibility(
        createTarget(),
        { root, rootMargin: "100px" },
        vi.fn<() => void>()
      ),
      observeVisibility(
        createTarget(),
        { root, rootMargin: "100px" },
        vi.fn<() => void>()
      ),
    ];

    expect(io.observers).toHaveLength(3);
    expect(io.observers[2]?.options.root).toBe(root);
    for (const stop of stops) {
      stop();
    }
  });

  it("calls the callback once when the target intersects, then stops observing it", () => {
    const io = installIntersectionObserver();
    const target = createTarget();
    const onVisible = vi.fn<() => void>();

    const stop = observeVisibility(target, { rootMargin: "0px" }, onVisible);
    io.intersect(target, false);

    expect(onVisible).not.toHaveBeenCalled();

    io.intersect(target);

    expect(onVisible).toHaveBeenCalledOnce();
    expect(io.observersOf(target)).toHaveLength(0);
    expect(stop).not.toThrow();
  });

  it("disconnects the observer when it has no targets", () => {
    const io = installIntersectionObserver();
    const stop = observeVisibility(
      createTarget(),
      { rootMargin: "0px" },
      vi.fn<() => void>()
    );

    stop();

    expect(io.observers[0]?.disconnected).toBeTruthy();

    observeVisibility(
      createTarget(),
      { rootMargin: "0px" },
      vi.fn<() => void>()
    )();

    expect(io.observers).toHaveLength(2);
  });

  it("keeps the newest callback when a stale cleanup runs late", () => {
    const io = installIntersectionObserver();
    const target = createTarget();
    const stale = vi.fn<() => void>();
    const current = vi.fn<() => void>();

    const stopStale = observeVisibility(target, { rootMargin: "0px" }, stale);
    const stopCurrent = observeVisibility(
      target,
      { rootMargin: "0px" },
      current
    );
    stopStale();
    io.intersect(target);

    expect(stale).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
    stopCurrent();
  });

  it("calls every callback that watches the same target", () => {
    const io = installIntersectionObserver();
    const target = createTarget();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();

    observeVisibility(target, { rootMargin: "0px" }, first);
    observeVisibility(target, { rootMargin: "0px" }, second);
    io.intersect(target);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    expect(io.observersOf(target)).toHaveLength(0);
  });

  it("keeps the target observed until its last subscription stops", () => {
    const io = installIntersectionObserver();
    const target = createTarget();
    const onVisible = vi.fn<() => void>();

    const stopFirst = observeVisibility(
      target,
      { rootMargin: "0px" },
      onVisible
    );
    const stopSecond = observeVisibility(
      target,
      { rootMargin: "0px" },
      onVisible
    );
    stopFirst();

    expect(io.observersOf(target)).toHaveLength(1);

    io.intersect(target);

    expect(onVisible).toHaveBeenCalledOnce();
    expect(stopSecond).not.toThrow();
  });

  it("passes scrollMargin only when the browser supports it", () => {
    const supported = installIntersectionObserver();
    observeVisibility(
      createTarget(),
      { rootMargin: "0px", scrollMargin: "50px" },
      vi.fn<() => void>()
    )();

    expect(supported.observers[0]?.options.scrollMargin).toBe("50px");

    const unsupported = installIntersectionObserver({
      supportsScrollMargin: false,
    });
    observeVisibility(
      createTarget(),
      { rootMargin: "0px", scrollMargin: "50px" },
      vi.fn<() => void>()
    )();

    expect(unsupported.observers[0]?.options).not.toHaveProperty(
      "scrollMargin"
    );
  });
});
