export type ObserverRoot = Element | Document | null;

export interface VisibilityObserverOptions {
  /** The scroll container. `null` or `undefined` means the viewport. */
  root?: ObserverRoot;
  rootMargin: string;
  /** Applied only when the browser supports `scrollMargin`. */
  scrollMargin?: string;
}

type VisibleCallback = () => void;

interface PooledObserver {
  observer: IntersectionObserver;
  callbacks: Map<Element, Set<VisibleCallback>>;
}

type PoolsByMargin = Map<string, PooledObserver>;

const viewportPools: PoolsByMargin = new Map();
const rootPools = new WeakMap<Element | Document, PoolsByMargin>();

/**
 * Tell if the browser has a usable IntersectionObserver. Old implementations
 * have no `isIntersecting` on their entries, so they are not usable.
 */
export const isIntersectionObserverAvailable = (): boolean =>
  "window" in globalThis &&
  "IntersectionObserver" in globalThis &&
  "IntersectionObserverEntry" in globalThis &&
  "isIntersecting" in globalThis.IntersectionObserverEntry.prototype;

const supportsScrollMargin = (): boolean =>
  "scrollMargin" in globalThis.IntersectionObserver.prototype;

const getPools = (root: ObserverRoot): PoolsByMargin => {
  if (!root) {
    return viewportPools;
  }

  const existing = rootPools.get(root);
  if (existing) {
    return existing;
  }

  const created: PoolsByMargin = new Map();
  rootPools.set(root, created);
  return created;
};

const createPooledObserver = (
  pools: PoolsByMargin,
  key: string,
  { root = null, rootMargin, scrollMargin }: VisibilityObserverOptions
): PooledObserver => {
  const callbacks = new Map<Element, Set<VisibleCallback>>();
  const init: IntersectionObserverInit = { root, rootMargin };

  if (scrollMargin !== undefined && supportsScrollMargin()) {
    init.scrollMargin = scrollMargin;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const subscribers = entry.isIntersecting
        ? callbacks.get(entry.target)
        : undefined;

      if (subscribers) {
        callbacks.delete(entry.target);
        observer.unobserve(entry.target);
        for (const notifyVisible of subscribers) {
          notifyVisible();
        }
      }
    }

    if (callbacks.size === 0 && pools.get(key)?.observer === observer) {
      observer.disconnect();
      pools.delete(key);
    }
  }, init);

  const pooled = { callbacks, observer };
  pools.set(key, pooled);
  return pooled;
};

/**
 * Call `onVisible` once, the first time `element` intersects the root.
 * Elements with the same root and margins share one IntersectionObserver.
 * Each call is an independent subscription, also for the same element.
 * The returned function stops this subscription.
 */
export const observeVisibility = (
  element: Element,
  options: VisibilityObserverOptions,
  onVisible: VisibleCallback
): (() => void) => {
  const pools = getPools(options.root ?? null);
  const key = `${options.rootMargin}|${options.scrollMargin ?? ""}`;
  const pooled = pools.get(key) ?? createPooledObserver(pools, key, options);

  // A new function for each call, so that two subscriptions with the same
  // `onVisible` stay independent.
  const subscription: VisibleCallback = () => {
    onVisible();
  };
  const subscribers = pooled.callbacks.get(element) ?? new Set();
  subscribers.add(subscription);
  pooled.callbacks.set(element, subscribers);
  pooled.observer.observe(element);

  return () => {
    // Read the set from the map: after a reveal, a new subscription can
    // own a new set for the same element.
    const current = pooled.callbacks.get(element);
    if (current?.delete(subscription) !== true || current.size > 0) {
      return;
    }

    pooled.callbacks.delete(element);
    pooled.observer.unobserve(element);

    if (pooled.callbacks.size === 0) {
      pooled.observer.disconnect();
      pools.delete(key);
    }
  };
};
