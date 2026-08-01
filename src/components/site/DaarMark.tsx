/**
 * The Daar door mark, traced from daar by izzi.pdf.
 * Background-independent: occlusion uses a mask, not a filled backdrop,
 * so it sits on bone, charcoal or oxblood equally well.
 *
 * The mask needs a unique id per instance or multiple marks on one page
 * collide and the second renders wrong.
 */
export function DaarMark({
  className,
  id = "daar-mark",
}: {
  className?: string;
  id?: string;
}) {
  const maskId = `${id}-cut`;
  return (
    <svg
      viewBox="0 0 260 400"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={15}
      aria-hidden="true"
      focusable="false"
    >
      <mask id={maskId}>
        <rect width="260" height="400" fill="#fff" />
        <path d="M88 392 V182 A54 54 0 0 1 196 182 V392 Z" fill="#000" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path d="M88 386 V118 A72 72 0 0 1 232 118 V386" />
        <path d="M28 386 V200 A48 48 0 0 1 124 200 V386" />
      </g>
      <path d="M88 386 V182 A54 54 0 0 1 196 182 V386" />
      <path d="M28 386 H88" />
      <circle cx="168" cy="268" r="8" fill="currentColor" stroke="none" />
    </svg>
  );
}
