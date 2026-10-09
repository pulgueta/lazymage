import { defineConfig } from "blume";

// The Blume project lives in `docs/` so that the docs build goes to
// `docs/dist/` and never mixes with the library build in `dist/`.
export default defineConfig({
  content: {
    root: "content",
  },
  description: "Lazy load images and components in React 19.",
  title: "lazymage",
});
