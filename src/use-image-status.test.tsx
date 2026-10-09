import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { setImageState } from "../test/image";
import type { UseImageStatusOptions } from "./use-image-status";
import { useImageStatus } from "./use-image-status";

const ImageProbe = (options: UseImageStatusOptions) => {
  const {
    onError: handleError,
    onLoad: handleLoad,
    ref,
    retry: handleRetry,
    src,
    state,
  } = useImageStatus(options);

  return (
    <>
      <img
        alt="probe"
        data-state={state}
        onError={handleError}
        onLoad={handleLoad}
        ref={ref}
        src={src}
      />
      <button onClick={handleRetry} type="button">
        Retry
      </button>
    </>
  );
};

const getImage = (): HTMLImageElement => screen.getByRole("img");

/** Wait for `img.decode()` and the state update after it. */
const flushDecode = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe(useImageStatus, () => {
  it("is loaded after the load event and the decode", async () => {
    const onReady = vi.fn<(image: HTMLImageElement) => void>();
    render(<ImageProbe onReady={onReady} src="/a.jpg" />);

    expect(getImage().dataset.state).toBe("loading");

    fireEvent.load(getImage());
    await flushDecode();

    expect(getImage().dataset.state).toBe("loaded");
    expect(onReady).toHaveBeenCalledExactlyOnceWith(getImage());
  });

  it("is loaded when the decode fails", async () => {
    vi.spyOn(HTMLImageElement.prototype, "decode").mockRejectedValue(
      new Error("decode failed")
    );
    render(<ImageProbe src="/a.jpg" />);

    fireEvent.load(getImage());
    await flushDecode();

    expect(getImage().dataset.state).toBe("loaded");
  });

  it("is loaded at once when the image is already complete", async () => {
    setImageState({ complete: true, naturalWidth: 640 });
    const onReady = vi.fn<(image: HTMLImageElement) => void>();
    render(<ImageProbe onReady={onReady} src="/cached.jpg" />);
    await flushDecode();

    expect(getImage().dataset.state).toBe("loaded");

    // The browser can still fire `load` for a cached image.
    fireEvent.load(getImage());
    await flushDecode();

    expect(onReady).toHaveBeenCalledOnce();
  });

  it("switches to fallbackSrc once, then reports the error", () => {
    render(<ImageProbe fallbackSrc="/fallback.jpg" src="/broken.jpg" />);

    fireEvent.error(getImage());

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
    expect(getImage().dataset.state).toBe("loading");

    fireEvent.error(getImage());

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
    expect(getImage().dataset.state).toBe("error");
  });

  it("reports the error when there is no fallbackSrc", () => {
    render(<ImageProbe src="/broken.jpg" />);

    fireEvent.error(getImage());

    expect(getImage().dataset.state).toBe("error");
  });

  it("restarts the original src on retry", () => {
    render(<ImageProbe fallbackSrc="/fallback.jpg" src="/broken.jpg" />);
    fireEvent.error(getImage());
    fireEvent.error(getImage());

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(getImage()).toHaveAttribute("src", "/broken.jpg");
    expect(getImage().dataset.state).toBe("loading");

    fireEvent.error(getImage());

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
  });

  it("sets the src again on retry when it did not change", () => {
    render(<ImageProbe src="/broken.jpg" />);
    fireEvent.error(getImage());
    const setAttribute = vi.spyOn(getImage(), "setAttribute");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(setAttribute).toHaveBeenCalledWith("src", "/broken.jpg");
    expect(getImage().dataset.state).toBe("loading");
  });

  it("resets when src changes and ignores the old decode", async () => {
    const decodeGate = Promise.withResolvers<string>();
    vi.spyOn(HTMLImageElement.prototype, "decode").mockImplementation(
      async () => {
        await decodeGate.promise;
      }
    );
    const onReady = vi.fn<(image: HTMLImageElement) => void>();
    const { rerender } = render(<ImageProbe onReady={onReady} src="/a.jpg" />);

    fireEvent.load(getImage());
    rerender(<ImageProbe onReady={onReady} src="/b.jpg" />);
    decodeGate.resolve("decoded");
    await flushDecode();

    expect(getImage()).toHaveAttribute("src", "/b.jpg");
    expect(getImage().dataset.state).toBe("loading");
    expect(onReady).not.toHaveBeenCalled();
  });

  it("is loaded when the fallback loads again for a new src", async () => {
    const { rerender } = render(
      <ImageProbe fallbackSrc="/fallback.jpg" src="/a.jpg" />
    );
    fireEvent.error(getImage());
    fireEvent.load(getImage());
    await flushDecode();

    rerender(<ImageProbe fallbackSrc="/fallback.jpg" src="/c.jpg" />);
    fireEvent.error(getImage());
    fireEvent.load(getImage());
    await flushDecode();

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
    expect(getImage().dataset.state).toBe("loaded");
  });

  it("is loaded when src goes back to a source that loaded before", async () => {
    const { rerender } = render(<ImageProbe src="/a.jpg" />);
    fireEvent.load(getImage());
    await flushDecode();

    rerender(<ImageProbe src="/b.jpg" />);
    rerender(<ImageProbe src="/a.jpg" />);
    fireEvent.load(getImage());
    await flushDecode();

    expect(getImage().dataset.state).toBe("loaded");
  });

  it("ignores an error from the handler of an old src", () => {
    const { result, rerender } = renderHook(
      (options: UseImageStatusOptions) => useImageStatus(options),
      { initialProps: { fallbackSrc: "/fallback.jpg", src: "/a.jpg" } }
    );
    const oldOnError = result.current.onError;

    rerender({ fallbackSrc: "/fallback.jpg", src: "/b.jpg" });
    // An image that still has the handler of the old src reports its error.
    render(<img alt="old" onError={oldOnError} />);
    fireEvent.error(screen.getByAltText("old"));

    expect(result.current).toMatchObject({ src: "/b.jpg", state: "loading" });
  });

  it("uses fallbackSrc when the image failed before the ref attached", () => {
    setImageState({ complete: true, naturalWidth: 0 });
    render(<ImageProbe fallbackSrc="/fallback.jpg" src="/broken.jpg" />);

    expect(getImage()).toHaveAttribute("src", "/fallback.jpg");
    expect(getImage().dataset.state).toBe("loading");
  });

  it("reports the error when the image failed before the ref attached", () => {
    setImageState({ complete: true, naturalWidth: 0 });
    render(<ImageProbe src="/broken.jpg" />);

    expect(getImage().dataset.state).toBe("error");
  });

  it("loads the original src on retry after the fallback loaded", async () => {
    render(<ImageProbe fallbackSrc="/fallback.jpg" src="/a.jpg" />);
    fireEvent.error(getImage());
    fireEvent.load(getImage());
    await flushDecode();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(getImage()).toHaveAttribute("src", "/a.jpg");
    expect(getImage().dataset.state).toBe("loading");

    fireEvent.load(getImage());
    await flushDecode();

    expect(getImage().dataset.state).toBe("loaded");
  });
});
