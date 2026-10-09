import { act, render, screen } from "@testing-library/react";
import type { Ref } from "react";
import { Component, createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  installIntersectionObserver,
  installLegacyIntersectionObserver,
} from "../test/intersection-observer";
import { LazyLoadImage } from "./lazy-load-image";
import type { ScrollPosition } from "./scroll";
import { trackWindowScroll } from "./track-window-scroll";

interface GalleryProps {
  label?: string;
  ref?: Ref<HTMLDivElement>;
  scrollPosition: ScrollPosition | null;
  useIntersectionObserver?: boolean;
}

const Gallery = ({ label, ref, scrollPosition }: GalleryProps) => (
  <div data-label={label} data-testid="gallery" ref={ref}>
    {JSON.stringify(scrollPosition)}
  </div>
);

const TrackedGallery = trackWindowScroll(Gallery);

// oxlint-disable-next-line react/prefer-function-component -- the test needs a class component, which gives its instance to the ref.
class ClassGallery extends Component<Omit<GalleryProps, "ref">> {
  override render() {
    return <div data-label={this.props.label} data-testid="gallery" />;
  }
}

const TrackedClassGallery = trackWindowScroll(ClassGallery);

const readPosition = (): string | null =>
  screen.getByTestId("gallery").textContent;

const scrollWindowTo = (x: number, y: number): void => {
  vi.stubGlobal("scrollX", x);
  vi.stubGlobal("scrollY", y);
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
};

const placeEveryElementAt = (top: number): void => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, top, 100, 100)
  );
};

describe(trackWindowScroll, () => {
  it("passes a null scroll position and adds no listener when it uses IntersectionObserver", () => {
    installIntersectionObserver();
    const addEventListener = vi.spyOn(window, "addEventListener");
    render(<TrackedGallery label="cats" />);

    expect(readPosition()).toBe("null");
    expect(screen.getByTestId("gallery")).toHaveAttribute("data-label", "cats");
    expect(addEventListener).not.toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      expect.anything()
    );
  });

  it("passes the window scroll position when IntersectionObserver is off", () => {
    vi.useFakeTimers();
    installIntersectionObserver();
    render(<TrackedGallery useIntersectionObserver={false} />);

    expect(readPosition()).toBe('{"x":0,"y":0}');

    scrollWindowTo(0, 400);

    expect(readPosition()).toBe('{"x":0,"y":400}');
  });

  it("tracks the scroll when IntersectionObserver is not usable", () => {
    vi.useFakeTimers();
    installLegacyIntersectionObserver();
    render(<TrackedGallery />);

    scrollWindowTo(10, 20);

    expect(readPosition()).toBe('{"x":10,"y":20}');
  });

  it("debounces the updates when asked", () => {
    vi.useFakeTimers();
    installLegacyIntersectionObserver();
    render(<TrackedGallery delayMethod="debounce" delayTime={100} />);

    scrollWindowTo(0, 50);

    expect(readPosition()).toBe('{"x":0,"y":0}');

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(readPosition()).toBe('{"x":0,"y":50}');
  });

  it("removes its listeners on unmount", () => {
    installLegacyIntersectionObserver();
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<TrackedGallery />);

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function)
    );
  });

  it("listens to the scroll container of the element that gets the ref", () => {
    installLegacyIntersectionObserver();
    const container = document.createElement("div");
    container.style.overflow = "auto";
    document.body.append(container);
    const addEventListener = vi.spyOn(container, "addEventListener");
    const ref = createRef<HTMLDivElement>();
    render(<TrackedGallery ref={ref} />, { container });

    expect(ref.current).toBe(screen.getByTestId("gallery"));
    expect(addEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      { passive: true }
    );
  });

  it("ignores a class instance as the scroll target and for the ref of the user", () => {
    installLegacyIntersectionObserver();
    const ref = createRef<Element>();
    render(<TrackedClassGallery ref={ref} />);

    expect(screen.getByTestId("gallery")).toBeInTheDocument();
    expect(ref.current).toBeNull();
  });

  it("lets LazyLoadImage children load from the tracked position", () => {
    vi.useFakeTimers();
    installLegacyIntersectionObserver();
    const FAR_BELOW = 5000;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, FAR_BELOW, 100, 100)
    );
    const ImageGallery = trackWindowScroll(
      ({ scrollPosition }: { scrollPosition: ScrollPosition | null }) => (
        <LazyLoadImage alt="" scrollPosition={scrollPosition} src="/a.jpg" />
      )
    );
    const { container } = render(<ImageGallery />);

    expect(container.querySelector("img")).toBeNull();

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 100)
    );
    scrollWindowTo(0, FAR_BELOW);

    expect(container.querySelector("img")).toBeInTheDocument();
  });

  describe("without IntersectionObserver", () => {
    const FAR_BELOW = 5000;

    interface ScrollingGalleryProps {
      ref?: Ref<HTMLDivElement>;
      scrollPosition: ScrollPosition | null;
    }

    const ScrollingGallery = trackWindowScroll(
      ({ ref, scrollPosition }: ScrollingGalleryProps) => (
        <div ref={ref} style={{ height: 200, overflow: "auto" }}>
          <LazyLoadImage alt="" scrollPosition={scrollPosition} src="/a.jpg" />
        </div>
      )
    );

    it("loads an image when its scroll container scrolls", () => {
      vi.useFakeTimers();
      installIntersectionObserver();
      placeEveryElementAt(FAR_BELOW);
      const { container } = render(
        <ScrollingGallery useIntersectionObserver={false} />
      );
      const scrollContainer = container.firstElementChild;

      expect(container.querySelector("img")).toBeNull();

      // The window does not scroll, so its x and y stay the same.
      placeEveryElementAt(0);
      act(() => {
        scrollContainer?.dispatchEvent(new Event("scroll"));
      });

      expect(container.querySelector("img")).toBeInTheDocument();
    });

    it("loads an image when the window resizes", () => {
      vi.useFakeTimers();
      installIntersectionObserver();
      placeEveryElementAt(FAR_BELOW);
      const { container } = render(
        <ScrollingGallery useIntersectionObserver={false} />
      );

      placeEveryElementAt(0);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(container.querySelector("img")).toBeInTheDocument();
    });
  });
});
