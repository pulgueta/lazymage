import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";

export default defineConfig({
  lib: [
    {
      format: "esm",
      syntax: "esnext",
      banner: {
        js: "use client",
      },
    },
    {
      format: "cjs",
      syntax: "esnext",
      banner: {
        js: "use client",
      },
    },
  ],
  output: {
    target: "web",
    cleanDistPath: true,
    distPath: {
      root: "dist",
    },
  },
  plugins: [pluginReact()],
});
