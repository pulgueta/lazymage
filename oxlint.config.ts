import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, vitest, antiSlop],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Agent tooling that is managed outside this repository's style.
    ".atl",
    ".claude",
  ],
  options: {
    typeAware: true,
  },
});
