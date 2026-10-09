import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { restoreImageState, setImageState } from "./image";

beforeEach(() => {
  setImageState({ complete: false, naturalWidth: 0 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  restoreImageState();
});
