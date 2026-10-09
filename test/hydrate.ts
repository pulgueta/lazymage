import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import type { HydrationOptions, Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { Mock, MockInstance } from "vitest";
import { onTestFinished, vi } from "vitest";

type RecoverableErrorHandler = NonNullable<
  HydrationOptions["onRecoverableError"]
>;

export interface HydrationResult {
  container: HTMLElement;
  /** `console.error`: React logs hydration mismatches here. */
  consoleError: MockInstance<typeof console.error>;
  /** Called by React when it must render again on the client. */
  onRecoverableError: Mock<RecoverableErrorHandler>;
}

/**
 * Render `element` to HTML like a server, put that HTML in the document, and
 * hydrate it on the client.
 */
export const hydrateFromServer = (element: ReactNode): HydrationResult => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.append(container);
  const consoleError = vi.spyOn(console, "error");
  const onRecoverableError = vi.fn<RecoverableErrorHandler>();

  let root: Root | undefined;
  act(() => {
    root = hydrateRoot(container, element, { onRecoverableError });
  });
  onTestFinished(() => {
    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  return { consoleError, container, onRecoverableError };
};
