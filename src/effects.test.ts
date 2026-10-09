import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const EFFECTS = ["black-and-white", "blur", "opacity"];

const readEffect = (name: string): string =>
  readFileSync(
    path.join(import.meta.dirname, "effects", `${name}.css`),
    "utf-8"
  );

describe("effect styles", () => {
  it.each(EFFECTS)("keeps the %s selectors and timing", (name) => {
    const css = readEffect(name);

    expect(css).toContain(`.lazy-load-image-background.${name}`);
    expect(css).toContain(
      `.lazy-load-image-background.${name}.lazy-load-image-loaded`
    );
    expect(css).toMatch(/transition: \w+ 0\.3s;/u);
  });

  it.each(EFFECTS)(
    "turns off the %s transitions for reduced motion",
    (name) => {
      const [, reducedMotion = ""] = readEffect(name).split(
        "@media (prefers-reduced-motion: reduce)"
      );

      expect(reducedMotion).toContain(
        `.lazy-load-image-background.${name}.lazy-load-image-loaded`
      );
      expect(reducedMotion).toContain("transition: none;");
    }
  );
});
