"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/format";

/**
 * A single 8px rise as a section comes into view, once, and then never again.
 *
 * The animation is decorative and is treated as such. Anything already on
 * screen at mount shows immediately; reduced motion or a missing
 * IntersectionObserver skips the effect; and the hidden state is scoped to
 * `@media (scripting: enabled)`, so with JavaScript unavailable every section
 * is simply visible. Losing the observer costs an animation, never content.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reduced motion is handled entirely in CSS, which also covers the
    // no-JavaScript case — so there is nothing to branch on here. The
    // observer fires straight away for anything already on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // The union of allowed tags makes a precise ref type awkward here.
      ref={ref as React.Ref<never>}
      data-shown={shown}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cx("u-rise", className)}
    >
      {children}
    </Tag>
  );
}
