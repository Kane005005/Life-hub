import '../styles/shop.css'
import { HudFrame } from './HudFrame'

type WalletBadgeProps = {
  credits: number
}

export function WalletBadge({ credits }: WalletBadgeProps) {
  return (
    <HudFrame className="lr-wallet-badge">
      <p className="lr-wallet-label">Solde disponible</p>
      <p className="lr-wallet-value">
        <span className="lr-wallet-amount num">{credits}</span>
        <span className="lr-wallet-unit">crédits</span>
      </p>
    </HudFrame>
  )
}
