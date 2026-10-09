import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { hydrateFromServer } from "../test/hydrate";
import { setImageState } from "../test/image";
import type { IntersectionObserverController } from "../test/intersection-observer";
import { installIntersectionObserver } from "../test/intersection-observer";
import { LazyLoadImage } from "./lazy-load-image";

// Decorative images (`alt=""`) have no `img` role, so query the element.
const queryImage = (): HTMLImageElement | null =>
  document.body.querySelector("img");

const getImage = (): HTMLImageElement => {
  const image = queryImage();
  if (!image) {
    throw new Error("No <img> element is rendered.");
  }
  return image;
};

/** Make every observed element visible. */
const revealAll = (io: IntersectionObserverController): void => {
  act(() => {
    for (const observer of io.observers) {
      for (const target of observer.targets) {
        observer.trigger(target);
      }
    }
  });
};

/** Fire `load` on the image and wait for `img.decode()`. */
const loadImage = async (): Promise<void> => {
  fireEvent.load(getImage());
  await act(async () => {
    await Promise.resolve();
  });
};

describe(LazyLoadImage, () => {
  it("renders the image with its props only after it is visible", () => {
    const io = installIntersectionObserver();
    render(
      <LazyLoadImage
        alt="A cat"
        className="photo"
        height={200}
        sizes="50vw"
        src="/cat.jpg"
        srcSet="/cat-2x.jpg 2x"
        width={300}
      />
    );

    expect(queryImage()).toBeNull();

    revealAll(io);

    expect(getImage()).toMatchObject({
      alt: "A cat",
      className: "photo",
      decoding: "async",
      sizes: "50vw",
      srcset: "/cat-2x.jpg 2x",
    });
    expect(getImage()).toHaveAttribute("src", "/cat.jpg");
  });

  it("keeps the decoding value of the user", () => {
    installIntersectionObserver();
    render(
      <LazyLoadImage alt="" decoding="sync" src="/a.jpg" visibleByDefault />
    );

    expect(getImage()).toHaveAttribute("decoding", "sync");
  });

  it("renders no wrapper without effect, placeholderSrc, or wrapper props", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage alt="" src="/a.jpg" visibleByDefault />
    );

    expect(container.firstElementChild).toBe(getImage());
  });

  it("moves the wrapper from idle to loaded with the effect classes", async () => {
    const io = installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage alt="" effect="blur" height={50} src="/a.jpg" width={80} />
    );
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass("lazy-load-image-background blur", {
      exact: true,
    });
    expect(wrapper).toHaveAttribute("data-state", "idle");

    revealAll(io);

    expect(wrapper).toHaveAttribute("data-state", "loading");

    await loadImage();

    expect(wrapper).toHaveClass(
      "lazy-load-image-background blur lazy-load-image-loaded",
      { exact: true }
    );
    expect(getImage()).toHaveAttribute("data-state", "loaded");
  });

  it("shows placeholderSrc as the wrapper background until the image loads", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage
        alt=""
        height={50}
        placeholderSrc="/tiny.jpg"
        src="/a.jpg"
        width={80}
        wrapperClassName="frame"
      />
    );
    const wrapper = container.querySelector<HTMLElement>("span.frame");

    expect(wrapper).toHaveStyle({
      backgroundImage: "url(/tiny.jpg)",
      backgroundSize: "100% 100%",
      color: "transparent",
      display: "inline-block",
      height: "50px",
      width: "80px",
    });
  });

  it("removes the placeholderSrc background once the image is loaded", async () => {
    const io = installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage alt="" placeholderSrc="/tiny.jpg" src="/a.jpg" />
    );
    revealAll(io);

    await loadImage();

    expect(
      container.querySelector<HTMLElement>("span")?.style.backgroundImage
    ).toBe("");
  });

  it("renders no wrapper with visibleByDefault, even with an effect", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage alt="" effect="opacity" src="/a.jpg" visibleByDefault />
    );

    expect(container.firstElementChild).toBe(getImage());
  });

  it("lets wrapperProps override the wrapper attributes", () => {
    installIntersectionObserver();
    const { container } = render(
      <LazyLoadImage
        alt=""
        src="/a.jpg"
        visibleByDefault
        wrapperProps={{ "aria-busy": true, style: { color: "blue" } }}
      />
    );
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("style", "color: blue;");
  });

  it("calls onLoad, afterLoad, then onReady after the decode", async () => {
    const io = installIntersectionObserver();
    const calls: string[] = [];
    render(
      <LazyLoadImage
        // oxlint-disable-next-line typescript/no-deprecated -- the test covers the deprecated prop.
        afterLoad={() => {
          calls.push("afterLoad");
        }}
        alt=""
        beforeLoad={() => {
          calls.push("beforeLoad");
        }}
        onLoad={(event) => {
          calls.push(`onLoad:${event.type}`);
        }}
        onReady={() => {
          calls.push("onReady");
        }}
        src="/a.jpg"
      />
    );
    revealAll(io);

    await loadImage();

    expect(calls).toStrictEqual([
      "beforeLoad",
      "onLoad:load",
      "afterLoad",
      "onReady",
    ]);
  });

  it("switches to fallbackSrc on error and calls onError", () => {
    installIntersectionObserver();
    const onError = vi.fn<() => void>();
    render(
      <LazyLoadImage
        alt=""
        fallbackSrc="/fallback.jpg"
        onError={onError}
        src="/broken.jpg"
        visibleByDefault
      />
    );

    fireEvent.error(getImage());

    expect(onError).toHaveBeenCalledOnce();
    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
  });

  it("gives the image element to the ref of the user", () => {
    installIntersectionObserver();
    const ref = createRef<HTMLImageElement>();
    render(<LazyLoadImage alt="" ref={ref} src="/a.jpg" visibleByDefault />);

    expect(ref.current).toBe(getImage());
  });

  it("is loaded without a load event when the image is already in the cache", async () => {
    setImageState({ complete: true, naturalWidth: 640 });
    const io = installIntersectionObserver();
    render(<LazyLoadImage alt="" src="/cached.jpg" />);

    revealAll(io);
    await act(async () => {
      await Promise.resolve();
    });

    expect(getImage()).toHaveAttribute("data-state", "loaded");
  });

  it("preloads the image when preload is set", () => {
    installIntersectionObserver();
    render(
      <LazyLoadImage
        alt=""
        fetchPriority="high"
        preload
        sizes="100vw"
        src="/hero.jpg"
        srcSet="/hero-2x.jpg 2x"
      />
    );
    const link = document.head.querySelector('link[rel="preload"][as="image"]');

    expect(link).toHaveAttribute("imagesrcset", "/hero-2x.jpg 2x");
    expect(link).toHaveAttribute("fetchpriority", "high");
  });

  it.each([false, true])(
    "hydrates the server HTML without a mismatch (visibleByDefault: %s)",
    (visibleByDefault) => {
      installIntersectionObserver();
      const { consoleError, onRecoverableError } = hydrateFromServer(
        <LazyLoadImage
          alt=""
          effect="blur"
          src="/a.jpg"
          visibleByDefault={visibleByDefault}
        />
      );

      expect(queryImage() !== null).toBe(visibleByDefault);
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    }
  );

  it("uses fallbackSrc when the image failed before hydration", () => {
    installIntersectionObserver();
    setImageState({ complete: true, naturalWidth: 0 });
    const { consoleError, onRecoverableError } = hydrateFromServer(
      <LazyLoadImage
        alt=""
        fallbackSrc="/fallback.jpg"
        src="/broken.jpg"
        visibleByDefault
      />
    );

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
    expect(getImage()).toHaveAttribute("data-state", "loading");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
