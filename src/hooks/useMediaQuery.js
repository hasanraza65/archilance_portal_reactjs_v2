import { useEffect, useState } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Tailwind's default breakpoints — keep in sync with any custom @theme overrides.
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");
// Below Tailwind's `sm` — i.e. exactly where `sm:` utilities stop applying.
// Use this when JS branching has to line up with `sm:` classes in the same file.
export const useIsPhone = () => useMediaQuery("(max-width: 639px)");
export const useIsTablet = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
