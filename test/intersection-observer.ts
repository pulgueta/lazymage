import { vi } from "vitest";

interface InstallOptions {
  /** Expose `scrollMargin` on the prototype, like browsers that support it. */
  supportsScrollMargin?: boolean;
}

const createEntry = (
  target: Element,
  isIntersecting: boolean
): IntersectionObserverEntry => {
  const rect = target.getBoundingClientRect();

  return {
    boundingClientRect: rect,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: rect,
    isIntersecting,
    rootBounds: null,
    target,
    time: 0,
  };
};

const observers: FakeIntersectionObserver[] = [];

/** The pool only reads the entries, so the fake passes no observer. */
type EntriesCallback = (entries: IntersectionObserverEntry[]) => void;

/**
 * A dependency-free IntersectionObserver for tests. It records the options
 * and the observed targets, and lets a test trigger intersections by hand.
 */
export class FakeIntersectionObserver {
  readonly callback: EntriesCallback;
  readonly options: IntersectionObserverInit;
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(
    callback: EntriesCallback,
    options: IntersectionObserverInit = {}
  ) {
    this.callback = callback;
    this.options = options;
    observers.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    this.disconnected = true;
  }

  trigger(target: Element, isIntersecting = true): void {
    this.callback([createEntry(target, isIntersecting)]);
  }
}

/** Add or remove `scrollMargin` on the prototype, like browser support. */
const setScrollMarginSupport = (isSupported: boolean): void => {
  const { prototype } = FakeIntersectionObserver;

  if (!isSupported) {
    Reflect.deleteProperty(prototype, "scrollMargin");
    return;
  }

  Object.defineProperty(prototype, "scrollMargin", {
    configurable: true,
    get(this: FakeIntersectionObserver): string {
      return this.options.scrollMargin ?? "0px";
    },
  });
};

export interface IntersectionObserverController {
  /** Every observer created since the install, in creation order. */
  readonly observers: readonly FakeIntersectionObserver[];
  /** The observers that currently watch `target`. */
  observersOf: (target: Element) => FakeIntersectionObserver[];
  /** Report `target` as intersecting (or not) to every observer of it. */
  intersect: (target: Element, isIntersecting?: boolean) => void;
}

/** Replace the global IntersectionObserver with the fake. */
export const installIntersectionObserver = ({
  supportsScrollMargin = true,
}: InstallOptions = {}): IntersectionObserverController => {
  observers.length = 0;
  setScrollMarginSupport(supportsScrollMargin);
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("IntersectionObserverEntry", {
    prototype: { isIntersecting: false },
  });

  const observersOf = (target: Element): FakeIntersectionObserver[] =>
    observers.filter((observer) => observer.targets.has(target));

  return {
    intersect: (target, isIntersecting = true) => {
      for (const observer of observersOf(target)) {
        observer.trigger(target, isIntersecting);
      }
    },
    observers,
    observersOf,
  };
};

/**
 * Simulate an old browser: IntersectionObserver exists, but its entries have
 * no `isIntersecting` property, so the library must not use it.
 */
export const installLegacyIntersectionObserver = (): void => {
  observers.length = 0;
  setScrollMarginSupport(false);
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("IntersectionObserverEntry", { prototype: {} });
};
