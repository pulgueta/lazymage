import { act, render, screen } from "@testing-library/react";
import type { Ref } from "react";
import { createRef, forwardRef, StrictMode, useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { hydrateFromServer } from "../test/hydrate";
import {
  installIntersectionObserver,
  installLegacyIntersectionObserver,
} from "../test/intersection-observer";
import { LazyLoadComponent } from "./lazy-load-component";

const Content = () => <p>Lorem Ipsum</p>;

const Skeleton = () => <em>Loading</em>;

// Libraries like MUI and styled-components still export forwardRef objects.
interface RefSkeletonProps {
  className?: string;
}
const renderRefSkeleton = (
  _props: RefSkeletonProps,
  ref: Ref<HTMLDivElement>
) => <div className="ref-skeleton" ref={ref} />;
const RefSkeleton = forwardRef(renderRefSkeleton);
RefSkeleton.displayName = "RefSkeleton";

/** Runs its callback once, in the layout phase after the earlier siblings. */
const LayoutProbe = ({ onLayout }: { onLayout: () => void }) => {
  useLayoutEffect(() => {
    onLayout();
  }, [onLayout]);

  return null;
};

const queryContent = (): HTMLElement | null =>
  screen.queryByText("Lorem Ipsum");

describe(LazyLoadComponent, () => {
  it("renders a placeholder span until the content is visible", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadComponent
        className="slot"
        height={200}
        style={{ color: "red" }}
        width={300}
      >
        <Content />
      </LazyLoadComponent>
    );
    const placeholder = container.querySelector("span.slot");

    expect(queryContent()).toBeNull();
    expect(placeholder).toHaveStyle({
      color: "red",
      display: "inline-block",
      height: "200px",
      width: "300px",
    });
  });

  it("sets no width or height on the placeholder when they are not given", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadComponent>
        <Content />
      </LazyLoadComponent>
    );
    const placeholder = container.querySelector("span");

    expect(placeholder?.style.width).toBe("");
    expect(placeholder?.style.height).toBe("");
  });

  it("calls beforeLoad before and afterLoad after the content renders", () => {
    const io = installIntersectionObserver();
    const calls: string[] = [];
    const beforeLoad = vi.fn<() => void>(() => {
      calls.push(`before:${queryContent() === null ? "hidden" : "shown"}`);
    });
    const afterLoad = vi.fn<() => void>(() => {
      calls.push(`after:${queryContent() === null ? "hidden" : "shown"}`);
    });
    const { container } = render(
      <LazyLoadComponent afterLoad={afterLoad} beforeLoad={beforeLoad}>
        <Content />
      </LazyLoadComponent>
    );

    expect(calls).toStrictEqual([]);

    act(() => {
      io.intersect(container.querySelector("span") ?? document.body);
    });

    expect(queryContent()).toBeInTheDocument();
    expect(calls).toStrictEqual(["before:hidden", "after:shown"]);
  });

  it("calls beforeLoad and afterLoad once after mount with visibleByDefault", () => {
    installIntersectionObserver();
    const calls: string[] = [];
    render(
      <StrictMode>
        <LazyLoadComponent
          afterLoad={() => {
            calls.push("after");
          }}
          beforeLoad={() => {
            calls.push("before");
          }}
          visibleByDefault
        >
          <Content />
        </LazyLoadComponent>
      </StrictMode>
    );

    expect(queryContent()).toBeInTheDocument();
    expect(calls).toStrictEqual(["before", "after"]);
  });

  it("calls beforeLoad and afterLoad in the layout phase with visibleByDefault", () => {
    installIntersectionObserver();
    const calls: string[] = [];
    const recordLayout = (): void => {
      // StrictMode runs the layout effect again; record the first run only.
      if (!calls.includes("sibling layout")) {
        calls.push("sibling layout");
      }
    };
    render(
      <StrictMode>
        <LazyLoadComponent
          afterLoad={() => {
            calls.push("after");
          }}
          beforeLoad={() => {
            calls.push("before");
          }}
          visibleByDefault
        >
          <Content />
        </LazyLoadComponent>
        <LayoutProbe onLayout={recordLayout} />
      </StrictMode>
    );

    // A passive effect runs too late: a cached image can fire `load` first.
    expect(calls).toStrictEqual(["before", "after", "sibling layout"]);
  });

  it("observes a host element placeholder directly and keeps its ref", () => {
    const io = installIntersectionObserver();
    const placeholderRef = createRef<HTMLDivElement>();
    const { container } = render(
      <LazyLoadComponent
        placeholder={<div className="skeleton" ref={placeholderRef} />}
      >
        <Content />
      </LazyLoadComponent>
    );
    const placeholder = container.querySelector("div.skeleton");

    expect(container.querySelector("span")).toBeNull();
    expect(placeholderRef.current).toBe(placeholder);
    expect(io.observersOf(placeholder ?? document.body)).toHaveLength(1);
  });

  it("observes a forwardRef placeholder directly and keeps its ref", () => {
    const io = installIntersectionObserver();
    const placeholderRef: Ref<HTMLDivElement> = createRef<HTMLDivElement>();
    const { container } = render(
      <LazyLoadComponent placeholder={<RefSkeleton ref={placeholderRef} />}>
        <Content />
      </LazyLoadComponent>
    );
    const placeholder = container.querySelector("div.ref-skeleton");

    expect(container.querySelector("span")).toBeNull();
    expect(placeholderRef.current).toBe(placeholder);
    expect(io.observersOf(placeholder ?? document.body)).toHaveLength(1);
  });

  it("wraps a component placeholder in the placeholder span", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadComponent placeholder={<Skeleton />}>
        <Content />
      </LazyLoadComponent>
    );

    expect(container.querySelector("span > em")).toHaveTextContent("Loading");
  });

  it("tracks the scroll when IntersectionObserver is not usable", () => {
    installLegacyIntersectionObserver();
    render(
      <LazyLoadComponent>
        <Content />
      </LazyLoadComponent>
    );

    expect(queryContent()).toBeInTheDocument();
  });

  it.each([false, true])(
    "hydrates the server HTML without a mismatch (visibleByDefault: %s)",
    (visibleByDefault) => {
      installIntersectionObserver();
      const { consoleError, onRecoverableError } = hydrateFromServer(
        <LazyLoadComponent
          placeholder={<Skeleton />}
          visibleByDefault={visibleByDefault}
        >
          <Content />
        </LazyLoadComponent>
      );

      expect(queryContent() !== null).toBe(visibleByDefault);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    }
  );
});
