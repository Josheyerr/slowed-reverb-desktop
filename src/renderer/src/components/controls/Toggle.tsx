import './Toggle.css'

type Props = {
  on: boolean
  onChange: (on: boolean) => void
  label: string
}

export function Toggle({ on, onChange, label }: Props) {
  return (
    <button
      type="button"
      className={`toggle-row ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="toggle" aria-hidden>
        <span className="toggle__knob" />
      </span>
      <span>{label}</span>
    </button>
  )
}
