import type { RefCallback, SyntheticEvent } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type ImageLoadState = "loading" | "loaded" | "error";

export interface UseImageStatusOptions {
  /** The image source. A change resets the status. */
  src?: string;
  /** Used once, when `src` fails to load. */
  fallbackSrc?: string;
  /** Called when the image is loaded and decoded. */
  onReady?: (image: HTMLImageElement) => void;
}

export interface UseImageStatusResult {
  /** Attach this ref to the `<img>`. */
  ref: RefCallback<HTMLImageElement>;
  state: ImageLoadState;
  /** The source to give to the `<img>`: `src`, or `fallbackSrc` after an error. */
  src: string | undefined;
  /** Load the original `src` again. */
  retry: () => void;
  /** Give this handler to the `onLoad` prop of the `<img>`. */
  onLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  /** Give this handler to the `onError` prop of the `<img>`. */
  onError: (event: SyntheticEvent<HTMLImageElement>) => void;
}

interface ImageStatus {
  /**
   * Identifies the current load. It increments on each new `src`, fallback,
   * and retry, so that it never repeats in the life of the hook.
   */
  loadId: number;
  currentSrc: string | undefined;
  hasUsedFallback: boolean;
  requestedSrc: string | undefined;
  state: ImageLoadState;
}

const createStatus = (src: string | undefined, loadId = 0): ImageStatus => ({
  currentSrc: src,
  hasUsedFallback: false,
  loadId,
  requestedSrc: src,
  state: "loading",
});

/** Use the fallback once, else report the error. */
const toFailedStatus = (
  current: ImageStatus,
  fallbackSrc: string | undefined
): ImageStatus => {
  if (fallbackSrc === undefined || current.hasUsedFallback) {
    return { ...current, state: "error" };
  }

  return {
    ...current,
    currentSrc: fallbackSrc,
    hasUsedFallback: true,
    loadId: current.loadId + 1,
    state: "loading",
  };
};

const decodeImage = async (image: HTMLImageElement): Promise<void> => {
  try {
    await image.decode();
  } catch {
    // The image loaded, but the browser could not decode it ahead of paint.
    // It still paints, so the image counts as loaded.
  }
};

/** A cached or hydrated image can finish loading before React sees it. */
const isAlreadyLoaded = (image: HTMLImageElement): boolean =>
  image.complete && image.naturalWidth > 0;

/** A hydrated image can fail to load before React sees it. */
const isAlreadyFailed = (image: HTMLImageElement): boolean =>
  image.complete &&
  image.naturalWidth === 0 &&
  (image.getAttribute("src") ?? "") !== "";

/**
 * Track the load of an `<img>`: wait for `decode()` before `loaded`, use a
 * fallback source once on error, and detect images that loaded or failed
 * before the ref attached (cache hits and hydration).
 */
export const useImageStatus = ({
  src,
  fallbackSrc,
  onReady,
}: UseImageStatusOptions = {}): UseImageStatusResult => {
  const [storedStatus, setStoredStatus] = useState(() => createStatus(src));
  // A new `src` resets the status. This render already uses the reset value.
  const status =
    storedStatus.requestedSrc === src
      ? storedStatus
      : createStatus(src, storedStatus.loadId + 1);
  if (status !== storedStatus) {
    setStoredStatus(status);
  }

  const imageRef = useRef<HTMLImageElement | null>(null);
  // An image that attached and was not inspected yet. Only a new image shows
  // a final failed state: after a `src` change, the browser can still show
  // the state of the old request until it starts the new one.
  const newImageRef = useRef<HTMLImageElement | null>(null);
  // The results of an old load (another source, an earlier attempt, or an
  // unmounted image) are ignored.
  const { loadId } = status;
  const loadIdRef = useRef<number | null>(null);
  const readyLoadIdRef = useRef<number | null>(null);
  const onReadyRef = useRef(onReady);
  const fallbackSrcRef = useRef(fallbackSrc);

  useLayoutEffect(() => {
    onReadyRef.current = onReady;
    fallbackSrcRef.current = fallbackSrc;
  });

  const markLoaded = useCallback(async (image: HTMLImageElement) => {
    const id = loadIdRef.current;
    await decodeImage(image);

    if (id === null || id !== loadIdRef.current) {
      return;
    }
    // A cached image can report its load twice: on attach and with `load`.
    if (id === readyLoadIdRef.current) {
      return;
    }

    readyLoadIdRef.current = id;
    setStoredStatus((current) => ({ ...current, state: "loaded" }));
    onReadyRef.current?.(image);
  }, []);

  const markFailed = useCallback((id: number) => {
    const fallback = fallbackSrcRef.current;
    setStoredStatus((current) =>
      current.loadId === id ? toFailedStatus(current, fallback) : current
    );
  }, []);

  const inspectImage = useCallback(
    (image: HTMLImageElement, id: number) => {
      const isNewImage = newImageRef.current === image;
      newImageRef.current = null;

      if (isAlreadyLoaded(image)) {
        void markLoaded(image);
      } else if (isNewImage && isAlreadyFailed(image)) {
        markFailed(id);
      }
    },
    [markFailed, markLoaded]
  );

  useLayoutEffect(() => {
    loadIdRef.current = loadId;
    // The image can attach in the same commit, before this id is set.
    const image = imageRef.current;
    if (image !== null) {
      inspectImage(image, loadId);
    }

    return () => {
      loadIdRef.current = null;
    };
  }, [inspectImage, loadId]);

  const ref = useCallback<RefCallback<HTMLImageElement>>(
    (image) => {
      imageRef.current = image;
      newImageRef.current = image;
      const id = loadIdRef.current;
      if (image !== null && id !== null) {
        inspectImage(image, id);
      }

      return () => {
        imageRef.current = null;
        newImageRef.current = null;
      };
    },
    [inspectImage]
  );

  const onLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      void markLoaded(event.currentTarget);
    },
    [markLoaded]
  );

  // The handler keeps the load id of its render, so an error from an old
  // load does not change the current one.
  const onError = useCallback(() => {
    markFailed(loadId);
  }, [loadId, markFailed]);

  const { currentSrc, requestedSrc } = status;
  const retry = useCallback(() => {
    // React does not touch an unchanged `src`, so set it again to reload.
    const image = imageRef.current;
    if (image && requestedSrc !== undefined && currentSrc === requestedSrc) {
      image.setAttribute("src", requestedSrc);
    }

    setStoredStatus((current) =>
      createStatus(current.requestedSrc, current.loadId + 1)
    );
  }, [currentSrc, requestedSrc]);

  return {
    onError,
    onLoad,
    ref,
    retry,
    src: currentSrc,
    state: status.state,
  };
};
