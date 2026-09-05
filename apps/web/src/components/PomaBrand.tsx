import { Link } from 'react-router'

type PomaBrandProps = {
  compact?: boolean
  iconOnly?: boolean
  inverse?: boolean
  linked?: boolean
}

const logoUrl = `${import.meta.env.BASE_URL}brand/poma-symbol.svg`

export function PomaBrand({
  compact = false,
  iconOnly = false,
  inverse = false,
  linked = true,
}: PomaBrandProps) {
  const className = [
    'poma-brand',
    compact ? 'poma-brand-compact' : '',
    iconOnly ? 'poma-brand-icon-only' : '',
    inverse ? 'poma-brand-inverse' : '',
  ].filter(Boolean).join(' ')

  const content = (
    <>
      <span className="poma-brand-mark" aria-hidden="true">
        <img src={logoUrl} alt="" />
      </span>
      {!iconOnly && <span className="poma-brand-name">POMA</span>}
    </>
  )

  if (!linked) {
    return <span className={className} aria-label="POMA">{content}</span>
  }

  return <Link className={className} to="/" aria-label="POMA, inicio">{content}</Link>
}
