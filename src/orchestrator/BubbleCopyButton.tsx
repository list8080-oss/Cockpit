import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import type { Locale } from "../i18n";
import { t } from "../i18n";

/** Per-message copy-to-clipboard button, shown only on hover/focus of the
 * parent `.orchestrator-bubble` (see App.css) — same reveal-on-hover
 * interaction as Claude Code's own message bubbles. Shared between Simple
 * Chat and the Orchestrator chat, since both render messages through the
 * same `.orchestrator-bubble` markup. */
export function BubbleCopyButton({ text, locale }: { text: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className="orchestrator-bubble-copy-btn"
      title={t(locale, "copyTitle")}
      aria-label={t(locale, "copyTitle")}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
