import { HudFrame } from './HudFrame'

type WalletBadgeProps = {
  credits: number
}

export function WalletBadge({ credits }: WalletBadgeProps) {
  return (
    <HudFrame className="lr-wallet-badge">
      <p className="lr-wallet-label">Crédits</p>
      <p className="lr-wallet-value">
        <span className="num">{credits}</span> crédits
      </p>
    </HudFrame>
  )
}
