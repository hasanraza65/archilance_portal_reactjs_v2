import { clsx } from "clsx";

/** Tiny className combinator — falsy values drop out, arrays/objects flatten. */
export function cn(...args) {
  return clsx(...args);
}
