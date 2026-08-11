/** Minimal doc-type icon for the writing editor's file/version pickers. */
export function DocTypeIcon({
  docType,
  size = 14,
}: {
  docType?: string;
  size?: number;
}) {
  const label = (docType || "?").slice(0, 1).toUpperCase();
  return (
    <span
      className="doc-type-icon"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        fontSize: Math.max(9, size - 4),
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 3,
        background: "var(--bg-3, #eaeaee)",
        color: "var(--text-dim, #666)",
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}
