export interface ImageState {
  complete: boolean;
  naturalWidth: number;
}

const { prototype } = HTMLImageElement;
const originalComplete = Object.getOwnPropertyDescriptor(prototype, "complete");
const originalNaturalWidth = Object.getOwnPropertyDescriptor(
  prototype,
  "naturalWidth"
);

/**
 * Set the `complete` and `naturalWidth` values of every `<img>`. happy-dom
 * reports `complete: true` for every image, so `test/setup.ts` sets a new
 * image as not complete, like a browser that still fetches it.
 */
export const setImageState = ({ complete, naturalWidth }: ImageState): void => {
  Object.defineProperty(prototype, "complete", {
    configurable: true,
    get: () => complete,
  });
  Object.defineProperty(prototype, "naturalWidth", {
    configurable: true,
    get: () => naturalWidth,
  });
};

/** Put back the happy-dom `complete` and `naturalWidth` getters. */
export const restoreImageState = (): void => {
  if (originalComplete) {
    Object.defineProperty(prototype, "complete", originalComplete);
  }
  if (originalNaturalWidth) {
    Object.defineProperty(prototype, "naturalWidth", originalNaturalWidth);
  }
};
