import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "@/components/ui/Icon";
import IconButton from "@/components/ui/IconButton";
import { StatusPill, PriorityPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/auth/AuthContext";
import { parseIntent, SUGGESTIONS } from "./intents";
import { runIntent } from "./runIntent";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { cn } from "@/lib/cn";

/** Renders **bold** segments without pulling in a markdown dependency. */
const RichText = ({ text }) => (
  <>
    {String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-[var(--ink-primary)]">{part.slice(2, -2)}</strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )}
  </>
);

const ResultRow = ({ item, onNavigate }) => (
  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[var(--surface-sunken)] transition-colors group">
    <button onClick={() => onNavigate(item.link)} className="min-w-0 flex-1 text-left">
      <span className="block text-[13px] font-medium text-[var(--ink-primary)] truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
        {item.title}
      </span>
      {item.meta && <span className="block text-[11px] text-[var(--ink-tertiary)] truncate">{item.meta}</span>}
    </button>
    <div className="flex items-center gap-1 flex-none">
      {item.priority && <PriorityPill priority={item.priority} showLabel={false} />}
      {item.status && <StatusPill status={item.status} />}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open in new tab"
        className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--ink-tertiary)] hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icon icon="solar:square-top-down-linear" className="text-[13px]" />
      </a>
    </div>
  </div>
);

// Routes where the launcher would sit on top of a primary control (the chat
// composer's send button), so it's hidden entirely there.
const HIDDEN_ON = [/^\/chat(\/|$)/];

const AssistantWidget = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  // Session-only dismissal: deliberately NOT persisted, so a reload brings it back.
  const [dismissed, setDismissed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const hiddenHere = HIDDEN_ON.some((re) => re.test(location.pathname));

  useKeyboardShortcut({ key: "j", ctrlOrMeta: true }, () => setOpen((o) => !o), []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  // Greet on first open so the panel is never empty.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          from: "bot",
          text: `Hi ${user?.name?.split(" ")[0] || "there"} 👋 Ask me about your tasks, jobs, deadlines, hours or leaves.`,
          isHelp: true,
        },
      ]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);
    setThinking(true);
    try {
      const parsed = parseIntent(text);
      const result = await runIntent(parsed, { role: user.role, user });
      setMessages((m) => [...m, { from: "bot", ...result }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Sorry — I couldn't fetch that just now. Please try again." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const go = (to) => {
    if (!to) return;
    navigate(to);
    setOpen(false);
  };

  if (!isAuthenticated || hiddenHere || dismissed) return null;

  return createPortal(
    <>
      {/* Launcher — sits above the mobile tab bar */}
      <div
        className="fixed z-[45] right-4 bottom-20 lg:bottom-6"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "relative rounded-full shadow-float flex items-center justify-center",
            "bg-gradient-to-br from-primary-500 to-primary-700 text-white",
            "hover:shadow-lg transition-shadow"
          )}
          style={{ width: 52, height: 52 }}
          title="Assistant (⌘J)"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "bot"}
              initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
              transition={{ duration: 0.15 }}
            >
              <Icon icon={open ? "solar:close-circle-bold" : "solar:chat-square-code-bold-duotone"} className="text-[22px]" />
            </motion.span>
          </AnimatePresence>
          {!open && (
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-primary-400 pointer-events-none"
              animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.button>

        {/* Dismiss for this session — reappears on reload. */}
        <AnimatePresence>
          {(hovering || open) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.12 }}
              onClick={(e) => { e.stopPropagation(); setOpen(false); setDismissed(true); }}
              title="Hide assistant (returns on reload)"
              className={cn(
                "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                "bg-[var(--surface-raised)] border border-[var(--line-strong)] shadow-soft",
                "text-[var(--ink-secondary)] hover:text-danger-500 hover:border-danger-500 transition-colors"
              )}
            >
              <Icon icon="solar:close-circle-linear" className="text-[11px]" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "fixed z-[45] right-4 bottom-36 lg:bottom-24 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[min(600px,70vh)]",
              "rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] shadow-float flex flex-col overflow-hidden"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--line-subtle)] flex-none">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white flex-none">
                <Icon icon="solar:chat-square-code-bold-duotone" className="text-[16px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--ink-primary)] leading-tight">Assistant</p>
                <p className="text-[11px] text-[var(--ink-tertiary)] leading-tight">Ask about your work</p>
              </div>
              {messages.length > 1 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[11px] text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]"
                >
                  Clear
                </button>
              )}
              <IconButton icon="solar:close-circle-bold" size="sm" label="Close" onClick={() => setOpen(false)} />
            </div>

            {/* Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.from === "user"
                        ? "bg-primary-500 text-white rounded-br-md"
                        : "bg-[var(--surface-sunken)] text-[var(--ink-secondary)] rounded-bl-md w-full"
                    )}
                  >
                    <RichText text={m.text} />

                    {m.items?.length > 0 && (
                      <div className="mt-2 -mx-1 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-raised)] divide-y divide-[var(--line-subtle)]">
                        {m.items.map((item) => (
                          <ResultRow key={item.id} item={item} onNavigate={go} />
                        ))}
                      </div>
                    )}
                    {m.more > 0 && (
                      <p className="text-[11px] text-[var(--ink-tertiary)] mt-1.5">+{m.more} more…</p>
                    )}
                    {m.link && (
                      <button
                        onClick={() => go(m.link.to)}
                        className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {m.link.label} <Icon icon="solar:arrow-right-up-linear" className="text-[12px]" />
                      </button>
                    )}
                    {m.isHelp && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {SUGGESTIONS.slice(0, 5).map((s) => (
                          <button
                            key={s}
                            onClick={() => ask(s)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-raised)] border border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:border-primary-400 hover:text-primary-600 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface-sunken)] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--ink-tertiary)]"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => { e.preventDefault(); ask(); }}
              className="flex items-center gap-2 p-3 border-t border-[var(--line-subtle)] flex-none"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your tasks, deadlines…"
                className="flex-1 h-10 px-3.5 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-sunken)] text-[13px] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <IconButton
                icon="solar:plain-2-bold"
                variant="primary"
                size="md"
                label="Ask"
                type="submit"
                disabled={!input.trim() || thinking}
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
};

export default AssistantWidget;
