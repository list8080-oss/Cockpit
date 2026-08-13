/** Plain circle + person-silhouette outline — deliberately generic, not a
 * distinct icon per entity (per the first-version scope: only the name text
 * distinguishes who's who, see CLAUDE.md's Entities section). */
export function EntityAvatar({
  size = 32,
  active = false,
}: {
  size?: number;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={active ? "entity-avatar entity-avatar-active" : "entity-avatar"}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16" cy="12.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 25.5c1.8-4.8 5.8-7.5 9.5-7.5s7.7 2.7 9.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
