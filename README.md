# lazymage

Lazy load images and components in React 19.

## Install

```bash
bun add lazymage
# or
pnpm add lazymage
# or
npm install lazymage
```

lazymage needs `react` and `react-dom` 19 or newer.

## Use

```tsx
import { LazyLoadImage } from "lazymage";

import "lazymage/effects/blur.css";

export const Photo = () => (
  <LazyLoadImage
    alt="A lake at sunset"
    effect="blur"
    height={480}
    placeholderSrc="/lake-small.jpg"
    src="/lake.jpg"
    width={640}
  />
);
```

The image renders when it comes near the viewport. Until it loads, the user sees a blurred placeholder.

## Features

- `LazyLoadImage`, `LazyLoadComponent`, and `trackWindowScroll`, with the API of `react-lazy-load-image-component`.
- `useLazyLoad` and `useImageStatus` hooks for your own components.
- One shared `IntersectionObserver` for all elements with the same settings.
- The image shows only after it is loaded and decoded.
- `blur`, `opacity`, and `black-and-white` effects that respect reduced motion.
- A `data-state` attribute for CSS: `idle`, `loading`, `loaded`, or `error`.
- `fallbackSrc`, `onReady`, `preload`, `root`, and `scrollMargin` props.
- No runtime dependencies. Works with SSR and React Server Components.

## Docs

- [Getting started](docs/content/getting-started.mdx)
- [LazyLoadImage API](docs/content/api/lazy-load-image.mdx)
- [Migration from react-lazy-load-image-component](docs/content/guides/migration.mdx)

## Credits

lazymage is a rewrite of [react-lazy-load-image-component](https://github.com/Aljullu/react-lazy-load-image-component) by Albert Juhé Lluveras, under the MIT license.

## License

[MIT](LICENSE)
