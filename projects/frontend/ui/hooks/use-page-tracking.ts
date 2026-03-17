import { useEffect, useRef, useCallback } from "react";

type Tracker = (eventName: string, params: Record<string, unknown>) => void;

/**
 * Tracks page view, section visibility (IntersectionObserver), and
 * scroll depth (25 / 50 / 75 / 100 %) milestones via the provided tracker.
 *
 * Returns a `trackCTA` helper for button-click events.
 */
export function usePageTracking(tracker: Tracker | undefined) {
  const firedSections = useRef<Set<string>>(new Set());
  const firedDepths = useRef<Set<number>>(new Set());

  // Fire page_view once on mount
  useEffect(() => {
    if (!tracker) return;
    tracker("page_view", { page: "landing" });
  }, [tracker]);

  // Scroll depth tracking (25 / 50 / 75 / 100 %)
  useEffect(() => {
    if (!tracker) return;
    const milestones = [25, 50, 75, 100];

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);
      for (const m of milestones) {
        if (pct >= m && !firedDepths.current.has(m)) {
          firedDepths.current.add(m);
          tracker("scroll", { percent_scrolled: m, page: "landing" });
        }
      }
    };

    // Throttle with requestAnimationFrame
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [tracker]);

  // Section visibility tracking via IntersectionObserver
  useEffect(() => {
    if (!tracker || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute("data-section");
            if (section && !firedSections.current.has(section)) {
              firedSections.current.add(section);
              tracker("section_view", { section_name: section, page: "landing" });
            }
          }
        }
      },
      { threshold: 0.4 }
    );

    // Observe all elements with data-section attribute
    const targets = document.querySelectorAll("[data-section]");
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [tracker]);

  // Helper for CTA button clicks
  const trackCTA = useCallback(
    (button: string, section: string, extraParams?: Record<string, unknown>) => {
      if (!tracker) return;
      tracker("cta_click", { button, section, page: "landing", ...extraParams });
    },
    [tracker]
  );

  return { trackCTA };
}
