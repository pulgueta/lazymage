import type { Ref, RefCallback } from "react";

type Cleanup = () => void;
type RefCallbackResult = ReturnType<RefCallback<null>>;

const isRefCallback = <T>(ref: Ref<T>): ref is RefCallback<T> =>
  typeof ref === "function";

const isCleanup = (value: RefCallbackResult): value is Cleanup =>
  typeof value === "function";

const attachRef = <T>(ref: Ref<T>, node: T | null): Cleanup => {
  if (isRefCallback(ref)) {
    const result = ref(node);

    return () => {
      if (isCleanup(result)) {
        result();
      } else {
        ref(null);
      }
    };
  }

  if (ref) {
    ref.current = node;
  }

  return () => {
    if (ref) {
      ref.current = null;
    }
  };
};

/**
 * Combine refs into one React 19 ref callback. Callback refs that return a
 * cleanup get it called; other refs get `null` on detach.
 */
export const mergeRefs =
  <T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> =>
  (node) => {
    const cleanups = refs
      .filter((ref) => ref !== undefined)
      .map((ref) => attachRef(ref, node));

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
