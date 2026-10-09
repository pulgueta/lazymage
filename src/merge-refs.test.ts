import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { mergeRefs } from "./merge-refs";

describe(mergeRefs, () => {
  it("sets object refs and calls callback refs", () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
    const node = document.createElement("div");

    const cleanup = mergeRefs(objectRef, callbackRef)(node);

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledWith(node);

    cleanup?.();

    expect(objectRef.current).toBeNull();
    expect(callbackRef).toHaveBeenLastCalledWith(null);
  });

  it("runs the cleanup that a callback ref returns", () => {
    const cleanupSpy = vi.fn<() => void>();
    const callbackRef = vi.fn<(node: HTMLDivElement | null) => () => void>(
      () => cleanupSpy
    );

    const cleanup = mergeRefs(callbackRef)(document.createElement("div"));
    cleanup?.();

    expect(cleanupSpy).toHaveBeenCalledOnce();
    expect(callbackRef).toHaveBeenCalledOnce();
  });
});
