import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

export function AnimatedHeight({ children }: { children: ReactNode }): React.ReactElement {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (el) {
        setHeight(el.offsetHeight);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="yv:overflow-hidden yv:transition-[height] yv:duration-300 yv:ease-out yv:motion-reduce:transition-none"
      style={{ height }}
    >
      <div ref={innerRef} className="yv:flow-root">
        {children}
      </div>
    </div>
  );
}
