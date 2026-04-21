type Props = { service: string; size?: number }

const CONFIGS: Record<string, { bg: string; fg: string; shape: 'vercel' | 'github' | 'openai' | 'anthropic' | 'aws' | 'resend' | 'datadog' }> = {
  vercel:    { bg: '#000000', fg: '#ffffff', shape: 'vercel' },
  aws:       { bg: '#232F3E', fg: '#FF9900', shape: 'aws' },
  resend:    { bg: '#000000', fg: '#ffffff', shape: 'resend' },
  github:    { bg: '#181717', fg: '#ffffff', shape: 'github' },
  datadog:   { bg: '#632CA6', fg: '#ffffff', shape: 'datadog' },
  anthropic: { bg: '#CC785C', fg: '#ffffff', shape: 'anthropic' },
  openai:    { bg: '#10A37F', fg: '#ffffff', shape: 'openai' },
}

function Inner({ shape, fg }: { shape: string; fg: string }) {
  switch (shape) {
    case 'vercel':
      // Triangle
      return <path d="M14 7.5l7 13H7l7-13z" fill={fg} />

    case 'github':
      // GitHub Invertocat
      return (
        <path
          fill={fg}
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14 5.5a8.5 8.5 0 00-2.687 16.565c.425.078.58-.184.58-.41 0-.202-.007-.737-.011-1.447-2.364.514-2.863-1.14-2.863-1.14-.386-.982-.943-1.244-.943-1.244-.771-.527.058-.516.058-.516.853.06 1.302.876 1.302.876.758 1.299 1.99.924 2.474.707.077-.55.297-.924.54-1.136-1.888-.215-3.873-.944-3.873-4.202 0-.928.33-1.688.874-2.283-.088-.215-.379-1.08.083-2.25 0 0 .712-.228 2.332.87a8.12 8.12 0 012.124-.286 8.12 8.12 0 012.124.286c1.619-1.098 2.33-.87 2.33-.87.463 1.17.172 2.035.085 2.25.544.595.873 1.355.873 2.283 0 3.266-1.988 3.985-3.882 4.196.305.263.577.78.577 1.573 0 1.136-.01 2.052-.01 2.332 0 .228.153.492.584.41A8.5 8.5 0 0014 5.5z"
        />
      )

    case 'openai':
      // Simplified swirl / OpenAI mark
      return (
        <path
          fill={fg}
          d="M20.4 11.28a5.27 5.27 0 00-.45-4.32 5.33 5.33 0 00-5.73-2.56A5.32 5.32 0 0010.3 2.8a5.33 5.33 0 00-5.08 3.69 5.32 5.32 0 00-3.56 2.59 5.33 5.33 0 00.66 6.24 5.27 5.27 0 00.45 4.32 5.33 5.33 0 005.73 2.56 5.27 5.27 0 003.92 1.6 5.33 5.33 0 005.09-3.69 5.27 5.27 0 003.55-2.59 5.33 5.33 0 00-.66-6.24zm-7.9 11.07a3.94 3.94 0 01-2.53-.91l.13-.07 4.2-2.43a.69.69 0 00.35-.61v-5.93l1.78 1.02a.07.07 0 01.03.05v4.91a3.95 3.95 0 01-3.96 3.97zm-8.5-3.64a3.94 3.94 0 01-.47-2.65l.13.08 4.2 2.43a.68.68 0 00.7 0l5.13-2.96v2.04a.07.07 0 01-.03.06L9.4 20.18a3.95 3.95 0 01-5.4-1.47zm-1.1-9.16A3.94 3.94 0 015 7.62v5a.68.68 0 00.35.6l5.12 2.96-1.77 1.02a.07.07 0 01-.07 0L4.4 14.7a3.95 3.95 0 01-.49-4.14zm14.62 3.4l-5.12-2.96 1.77-1.02a.07.07 0 01.07 0l4.22 2.44a3.95 3.95 0 01-.61 7.12v-5a.68.68 0 00-.33-.58zm1.76-2.67l-.12-.08-4.2-2.42a.69.69 0 00-.7 0L9.13 10.8V8.76a.07.07 0 01.03-.06l4.22-2.43a3.95 3.95 0 015.88 4.09zm-11.1 3.65L6.4 13.9a.07.07 0 01-.04-.06V8.93a3.95 3.95 0 016.48-3.03l-.12.07-4.2 2.43a.68.68 0 00-.35.6v5.93l-1.78-1.03zm.97-2.08l2.28-1.32 2.29 1.32v2.63l-2.29 1.32-2.28-1.32v-2.63z"
        />
      )

    case 'anthropic':
      // Simplified "A" with serifs — Anthropic mark style
      return (
        <text x="14" y="19" textAnchor="middle" fill={fg} fontFamily="Georgia, serif" fontSize="14" fontWeight="700">
          A
        </text>
      )

    case 'aws':
      // AWS wordmark + smile arrow
      return (
        <>
          <text x="14" y="15.5" textAnchor="middle" fill={fg} fontFamily="'Arial Black', sans-serif" fontSize="7.5" fontWeight="900" letterSpacing=".5">
            aws
          </text>
          {/* Smile arrow */}
          <path d="M9 18.5q5 2.5 10 0" stroke={fg} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M18 17.8l1 .7-.4 1.1" stroke={fg} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )

    case 'resend':
      // Stylised "R"
      return (
        <text x="14" y="19.5" textAnchor="middle" fill={fg} fontFamily="'Arial Black', sans-serif" fontSize="15" fontWeight="900">
          R
        </text>
      )

    case 'datadog':
      // "DD" initials
      return (
        <text x="14" y="19" textAnchor="middle" fill={fg} fontFamily="'Arial Black', sans-serif" fontSize="10" fontWeight="900" letterSpacing="-0.5">
          DD
        </text>
      )

    default:
      return null
  }
}

export function ServiceIcon({ service, size = 28 }: Props) {
  const cfg = CONFIGS[service]
  if (!cfg) {
    // Generic grey badge with first letter
    const letter = service.charAt(0).toUpperCase()
    return (
      <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
        <rect width="28" height="28" rx="6" fill="#888" />
        <text x="14" y="19" textAnchor="middle" fill="#fff" fontFamily="sans-serif" fontSize="13" fontWeight="700">
          {letter}
        </text>
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <rect width="28" height="28" rx="6" fill={cfg.bg} />
      <Inner shape={cfg.shape} fg={cfg.fg} />
    </svg>
  )
}
