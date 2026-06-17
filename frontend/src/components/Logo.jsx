// Inline SVG brand mark for DocFlow AI. No external asset.
export default function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="url(#docflow-grad)" />
      <path
        d="M16 13h11l6 6v16a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path d="M27 13v6h6" stroke="#2563eb" strokeWidth="1.6" fill="none" />
      <path
        d="M18.5 26h11M18.5 30h11M18.5 22h6"
        stroke="#2563eb"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="docflow-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
