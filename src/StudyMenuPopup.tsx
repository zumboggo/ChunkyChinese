import type { ReactNode } from 'react'

/**
 * Shared ☰ settings popup used by every study mode (sentence, books,
 * listening, reader). Reuses the sentence-menu CSS so all modes match.
 * Render inside a `.sentence-menu-wrap` next to the trigger button.
 */
export function StudyMenuPopup({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  if (!open) return null
  return (
    <>
      <div className="sentence-menu-backdrop" onClick={onClose} />
      <div className={`sentence-menu-popup ${className}`.trim()}>{children}</div>
    </>
  )
}

export function StudyMenuSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <p className="sentence-menu-label">{label}</p>
      <div className="sentence-menu-toggles">{children}</div>
    </>
  )
}

export function StudyMenuToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="sentence-menu-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  )
}

export function StudyMenuSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <label className="sentence-menu-toggle">
      <span>{label}</span>
      <select
        value={String(value)}
        onChange={e => {
          const raw = e.target.value
          onChange((typeof value === 'number' ? Number(raw) : raw) as T)
        }}
      >
        {options.map(option => (
          <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
