# Lazymage

Lazy load images from your React components. Get nice loading states and avoid high network usage when loading images.

## Installation

```bash
# Bun
bun add lazymage

# PNPM
pnpm add lazymage

# NPM
npm install lazymage
```


## `LazyImage` usage

```typescript
import { LazyImage } from 'lazymage';

export const ComponentWithImage = () => (
  <div className="flex flex-col gap-4">
    <LazyImage
      src="https://example.com/image.jpg"
      alt="A beautiful image"
      effect="blur"
      // ...any other image attributes
    />
    {/* 
      ...more components
    */}
  </div>
);
```