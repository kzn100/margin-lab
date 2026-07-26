import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect x="1" y="1" width="20" height="20" rx="5" fill="var(--accent)" />
        <path
          d="M6 14.5 L9.5 10 L12.5 12.5 L16 6.5"
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Margin Lab
    </Link>
  );
}
