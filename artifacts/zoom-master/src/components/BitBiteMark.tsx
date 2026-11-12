/** The bitten cookie. It is the brand on every card we sign. */
export function BitBiteMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="bitbite-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M28 10a22 22 0 1 0 .01 0zM46 15a11 11 0 1 0 .01 0z"
      />
      <circle cx="54" cy="14" r="3.1" fill="currentColor" />
      <circle cx="58" cy="28" r="2.15" fill="currentColor" />
    </svg>
  );
}
