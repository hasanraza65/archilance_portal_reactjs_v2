import { useEffect } from "react";

/**
 * Fires `handler` when `key` is pressed with the given modifiers, unless focus
 * is inside a text input/textarea/contenteditable (so shortcuts never hijack typing).
 *
 * combo: { key: "k", meta: true } matches Cmd/Ctrl+K (meta covers both by design —
 * pass `ctrlOrMeta: true` to match either explicitly).
 */
export function useKeyboardShortcut(combo, handler, deps = []) {
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      const keyMatches = e.key.toLowerCase() === combo.key.toLowerCase();
      const modMatches = combo.ctrlOrMeta ? e.metaKey || e.ctrlKey : true;
      const shiftMatches = combo.shift ? e.shiftKey : !e.shiftKey || combo.shift === undefined;

      if (!keyMatches || !modMatches) return;
      if (isTyping && !combo.allowInInputs) return;
      if (combo.shift !== undefined && e.shiftKey !== combo.shift) return;

      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
