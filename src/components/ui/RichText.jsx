import React, { useMemo } from "react";
import { cn } from "@/lib/cn";

/**
 * Renders stored rich-text safely.
 *
 * Descriptions come out of the DB as HTML (the editors are Quill), but some
 * legacy rows are plain text. Printing HTML as text shows raw "<p>" tags, and
 * printing text as HTML loses line breaks — so detect which we have and handle
 * each correctly. Tags are whitelisted so stored markup can't inject scripts,
 * event handlers, iframes, or javascript: URLs.
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "DIV",
  "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "CODE", "PRE", "HR",
]);
const ALLOWED_ATTRS = { A: ["href", "target", "rel"] };

function sanitize(html) {
  if (typeof window === "undefined" || !window.DOMParser) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  const walk = (node) => {
    // Iterate over a copy — we mutate the tree as we go.
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      if (!ALLOWED_TAGS.has(child.tagName)) {
        // Keep the text, drop the tag (handles <script>/<iframe>/<style> too).
        const text = doc.createTextNode(child.textContent || "");
        child.replaceWith(text);
        return;
      }

      const allowed = ALLOWED_ATTRS[child.tagName] || [];
      [...child.attributes].forEach((attr) => {
        if (!allowed.includes(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
        }
      });

      if (child.tagName === "A") {
        const href = child.getAttribute("href") || "";
        // Block javascript:/data: style URLs.
        if (!/^(https?:|mailto:|\/|#)/i.test(href)) child.removeAttribute("href");
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }

      walk(child);
    });
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s);

/**
 * Flatten stored markup to readable text.
 *
 * Some records were written by a rich editor and hold real HTML; others are
 * plain strings. For a one-line preview (or a plain <textarea>) we want the
 * words either way, never a literal "<p>...</p>". Entities are decoded via the
 * parser rather than a regex so `&amp;` and friends come back correctly.
 */
export function htmlToText(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!looksLikeHtml(raw)) return raw;
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

const RichText = ({ html, className, emptyText = null }) => {
  const raw = String(html ?? "").trim();

  const clean = useMemo(() => (looksLikeHtml(raw) ? sanitize(raw) : null), [raw]);

  const isEmpty =
    !raw || (clean !== null && !clean.replace(/<[^>]*>/g, "").trim() && !/<(img|hr)\b/i.test(clean));

  if (isEmpty) {
    return emptyText ? <p className={cn("text-[var(--ink-tertiary)] italic", className)}>{emptyText}</p> : null;
  }

  const base = cn(
    "text-sm text-[var(--ink-secondary)] leading-relaxed",
    "[&_p]:mb-2 [&_p:last-child]:mb-0",
    "[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-2",
    "[&_li]:mb-0.5",
    "[&_a]:text-primary-600 dark:[&_a]:text-primary-400 [&_a]:underline",
    "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic",
    "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2",
    "[&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2",
    "[&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1.5",
    "[&_blockquote]:border-l-2 [&_blockquote]:border-[var(--line-strong)] [&_blockquote]:pl-3 [&_blockquote]:italic",
    "[&_code]:bg-[var(--surface-sunken)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px]",
    className
  );

  // Plain-text legacy content: preserve its line breaks instead of collapsing them.
  if (clean === null) {
    return <div className={cn(base, "whitespace-pre-wrap")}>{raw}</div>;
  }

  return <div className={base} dangerouslySetInnerHTML={{ __html: clean }} />;
};

export default RichText;
