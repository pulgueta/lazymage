import { describe, expect, it } from "vitest";

import * as entry from "./index";

describe("lazymage entry", () => {
  it("exports the public API", () => {
    expect(Object.keys(entry).toSorted()).toStrictEqual([
      "LazyLoadComponent",
      "LazyLoadImage",
      "trackWindowScroll",
      "useImageStatus",
      "useLazyLoad",
    ]);
  });
});
