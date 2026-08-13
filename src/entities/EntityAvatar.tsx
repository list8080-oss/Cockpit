/** Circle + person-silhouette outline by default — an entity can override
 * this with a real portrait via `imageSrc` (see `entityDefinitions.ts`'s
 * `avatarSrc`). Only Оркестратор has one as of this writing; the others
 * still fall back to the generic silhouette until picked. */
export function EntityAvatar({
  size = 32,
  active = false,
  imageSrc,
}: {
  size?: number;
  active?: boolean;
  imageSrc?: string;
}) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        className={active ? "entity-avatar entity-avatar-photo entity-avatar-active" : "entity-avatar entity-avatar-photo"}
      />
    );
  }

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
