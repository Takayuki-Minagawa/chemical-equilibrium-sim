import type { ReactNode } from 'react'

const paths = {
  play: <path d="M7 4.5v15l12-7.5z" />,
  pause: (
    <>
      <rect height="15" rx="1.2" width="4" x="6" y="4.5" />
      <rect height="15" rx="1.2" width="4" x="14" y="4.5" />
    </>
  ),
  reset: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.2" />
      <path d="M3.5 3.5v4.7h4.7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  thermometer: (
    <>
      <path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z" />
      <path d="M12 9v8" />
    </>
  ),
  flame: (
    <path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-3.4-2.3-5.6-3.6-7.6-.6 1.8-1.6 2.9-2.6 3.4.2-3.2-1.2-6-3.8-8.3.2 3.6-2.2 6-3.4 8.2A6.5 6.5 0 0 0 12 21.5z" />
  ),
  snowflake: (
    <>
      <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
      <path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" />
    </>
  ),
  compress: (
    <>
      <path d="M4 14h6v6M20 10h-6V4" />
      <path d="m14 10 6.5-6.5M3.5 20.5 10 14" />
    </>
  ),
  expand: (
    <>
      <path d="M15 3.5h5.5V9M9 20.5H3.5V15" />
      <path d="m20.5 3.5-7 7M3.5 20.5l7-7" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3.5 12.9 9l5.6 2-5.6 2L11 18.5 9.1 13l-5.6-2 5.6-2z" />
      <path d="M19 3v4M17 5h4" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6.2L4.6 18.4A2 2 0 0 0 6.3 21.5h11.4a2 2 0 0 0 1.7-3.1L14 9.2V3" />
      <path d="M7.2 15h9.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z" />,
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  trophy: (
    <>
      <path d="M8 21h8M12 16.5V21M7 3.5h10V9a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v1.5A3.5 3.5 0 0 1 16.6 10M7 5H4v1.5A3.5 3.5 0 0 0 7.4 10" />
    </>
  ),
  chart: (
    <>
      <path d="M3.5 3.5v17h17" />
      <path d="m7.5 15 4-4.5 3 3 5-6" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18h5M10.5 21.5h3" />
      <path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6V16h6v-.1c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 2.5z" />
    </>
  ),
  list: <path d="M9 6h11.5M9 12h11.5M9 18h11.5M4 6h.01M4 12h.01M4 18h.01" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3.5v17M7.5 20.5h9M4.5 7h15" />
      <path d="m4.5 7-3 6.5a3 3 0 0 0 6 0zM19.5 7l-3 6.5a3 3 0 0 0 6 0z" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  beaker: (
    <>
      <path d="M5 3.5h14M6.5 3.5v15a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-15" />
      <path d="M6.5 12.5c2-1 3.5 1 5.5 0s3.5-1 5.5 0" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof paths

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className ?? ''}`}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}
