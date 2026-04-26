export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Outer circle - soap shape */}
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Inner botanical element - stylized leaf/branch */}
        <path
          d="M16 8C16 8 12 12 12 16C12 19 14 21 16 21C18 21 20 19 20 16C20 12 16 8 16 8Z"
          fill="currentColor"
          opacity="0.15"
        />

        <path
          d="M16 8V21M12 16C12 13 14 11 16 11M20 16C20 13 18 11 16 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Small decorative dots */}
        <circle cx="16" cy="9" r="1" fill="currentColor" />
        <circle cx="13" cy="12" r="0.5" fill="currentColor" opacity="0.5" />
        <circle cx="19" cy="12" r="0.5" fill="currentColor" opacity="0.5" />
      </svg>

      <span
        className="text-[2rem] tracking-tight"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Atelier
      </span>
    </div>
  );
}
