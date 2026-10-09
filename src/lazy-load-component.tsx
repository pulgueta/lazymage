import type {
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
} from "react";
import {
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { mergeRefs } from "./merge-refs";
import type { UseLazyLoadOptions } from "./use-lazy-load";
import { useLazyLoad } from "./use-lazy-load";

export interface LazyLoadComponentProps extends Omit<
  UseLazyLoadOptions,
  "onVisible"
> {
  /** The content to render once it is visible. */
  children?: ReactNode;
  /** Class name of the placeholder span. */
  className?: string;
  /** Style of the placeholder span. */
  style?: CSSProperties;
  /** Width of the placeholder span. */
  width?: number | string;
  /** Height of the placeholder span. */
  height?: number | string;
  /**
   * Shown until the content is visible. An element that can hold a ref, like
   * `<div />` or a `forwardRef` or `memo` component, is observed directly.
   * Other content, function components included, goes inside the placeholder
   * span.
   */
  placeholder?: ReactNode;
  /** Called right before the content renders. */
  beforeLoad?: () => void;
  /** Called after the content rendered. */
  afterLoad?: () => void;
}

type RefElement = ReactElement<{ ref?: Ref<Element> }>;

/**
 * Like upstream, every element whose type is not a function gets the
 * observer ref: host elements and `forwardRef` or `memo` objects.
 */
const isRefElement = (node: ReactNode): node is RefElement =>
  isValidElement(node) && typeof node.type !== "function";

interface PlaceholderProps {
  className?: string;
  height?: number | string;
  observerRef: RefCallback<Element>;
  placeholder?: ReactNode;
  style?: CSSProperties;
  width?: number | string;
}

const RefPlaceholder = ({
  element,
  observerRef,
}: {
  element: RefElement;
  observerRef: RefCallback<Element>;
}) => {
  const elementRef = element.props.ref;
  const ref = useMemo(
    () => mergeRefs(observerRef, elementRef),
    [elementRef, observerRef]
  );

  // oxlint-disable-next-line react/no-clone-element -- upstream API: this placeholder is observed directly, so it needs the observer ref.
  return cloneElement(element, { ref });
};

const Placeholder = ({
  className,
  height,
  observerRef,
  placeholder,
  style,
  width,
}: PlaceholderProps) => {
  if (isRefElement(placeholder)) {
    return <RefPlaceholder element={placeholder} observerRef={observerRef} />;
  }

  const placeholderStyle: CSSProperties = { display: "inline-block", ...style };
  if (width !== undefined) {
    placeholderStyle.width = width;
  }
  if (height !== undefined) {
    placeholderStyle.height = height;
  }

  return (
    <span className={className} ref={observerRef} style={placeholderStyle}>
      {placeholder}
    </span>
  );
};

/**
 * Render `children` only after they enter the viewport. Until then, render a
 * placeholder.
 */
export const LazyLoadComponent = ({
  afterLoad,
  beforeLoad,
  children,
  className,
  height,
  placeholder,
  style,
  width,
  ...options
}: LazyLoadComponentProps): ReactNode => {
  const hasCalledBeforeLoadRef = useRef(false);
  const hasCalledAfterLoadRef = useRef(false);

  const { isVisible, ref } = useLazyLoad({
    ...options,
    onVisible: () => {
      hasCalledBeforeLoadRef.current = true;
      beforeLoad?.();
    },
  });

  // A layout effect runs before the browser can fire `load` for a cached
  // image, so `beforeLoad` runs first. It does not run on the server.
  useLayoutEffect(() => {
    if (!isVisible || hasCalledAfterLoadRef.current) {
      return;
    }

    hasCalledAfterLoadRef.current = true;
    // With `visibleByDefault`, the content renders without a visibility change.
    if (!hasCalledBeforeLoadRef.current) {
      hasCalledBeforeLoadRef.current = true;
      beforeLoad?.();
    }
    afterLoad?.();
  }, [afterLoad, beforeLoad, isVisible]);

  if (isVisible) {
    return children;
  }

  return (
    <Placeholder
      className={className}
      height={height}
      observerRef={ref}
      placeholder={placeholder}
      style={style}
      width={width}
    />
  );
};
