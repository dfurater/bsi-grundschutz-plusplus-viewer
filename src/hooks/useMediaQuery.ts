import { useEffect, useState } from "react";

/**
 * Tracks media query matches for responsive layout switches.
 * REQ: PD-05, PD-06, RESP-01
 */
export function useMediaQuery(query: string) {
  /* REQ: PD-06, RESP-01 */
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);

    const onChange = () => setMatches(media.matches);
    onChange();

    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
}
