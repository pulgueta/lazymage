import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rslib/core";

const USE_CLIENT_BANNER = '"use client";';

export default defineConfig({
  lib: [
    {
      banner: { js: USE_CLIENT_BANNER },
      bundle: false,
      dts: true,
      format: "esm",
      output: {
        copy: [{ from: "./src/effects", to: "../effects" }],
        distPath: { root: "./dist/esm" },
      },
    },
    {
      banner: { js: USE_CLIENT_BANNER },
      bundle: false,
      dts: { autoExtension: true },
      format: "cjs",
      output: {
        distPath: { root: "./dist/cjs" },
      },
    },
  ],
  output: {
    cleanDistPath: true,
    target: "web",
  },
  plugins: [pluginReact()],
  source: {
    entry: {
      index: ["./src/**/*.{ts,tsx}", "!./src/**/*.test.{ts,tsx}"],
    },
    tsconfigPath: "./tsconfig.build.json",
  },
});
