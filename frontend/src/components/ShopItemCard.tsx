import { useState } from 'react'
import '../styles/shop.css'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { SHOP_CATEGORY_LABELS, SLOT_LABELS } from '../lib/labels'
import { useEquip, usePurchase, useUnequip } from '../lib/queries'
import type { ShopItem } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type ShopItemCardProps = {
  item: ShopItem
  onPreview?: (item: ShopItem | null) => void
  previewing?: boolean
}

function ArtifactPreview({ item }: { item: ShopItem }) {
  if (item.category !== 'ARTIFACT') return null
  const visual = item.visual
  if (item.slot === 'AURA') {
    return (
      <span
        className="lr-artifact-preview lr-artifact-preview--aura"
        style={{ background: visual?.color ?? '#2FD08B' }}
        aria-hidden="true"
      />
    )
  }
  if (item.slot === 'FRAME') {
    const frameClass =
      visual?.style === 'double'
        ? 'lr-artifact-preview lr-artifact-preview--frame lr-artifact-preview--frame-double'
        : 'lr-artifact-preview lr-artifact-preview--frame lr-artifact-preview--frame-silver'
    return <span className={frameClass} aria-hidden="true" />
  }
  if (item.slot === 'EMBLEM') {
    return (
      <span className="lr-artifact-preview lr-artifact-preview--emblem" aria-hidden="true">
        <svg className="lr-artifact-emblem-mark" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeDasharray="44 7"
          />
          <path
            d="M6 16 L11 11 L14 14 L19 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19" cy="8" r="2.4" fill="#2FD08B" />
        </svg>
        {visual?.sign && visual.sign !== '◆' ? (
          <span className="lr-artifact-emblem-sign">{visual.sign}</span>
        ) : null}
      </span>
    )
  }
  return null
}

function shortfallFromDetail(detail: string): string | null {
  const match = /il te manque\s+(\d+)\s+crédits/i.exec(detail)
  return match ? match[1] : null
}

export function ShopItemCard({ item, onPreview, previewing = false }: ShopItemCardProps) {
  const purchase = usePurchase()
  const equip = useEquip()
  const unequip = useUnequip()
  const { announce, toast } = useFx()
  const [error, setError] = useState('')
  const [shortfall, setShortfall] = useState<string | null>(null)

  const isReward = item.category === 'REWARD'
  const canBuy = isReward ? item.is_available : item.is_available && !item.owned
  const buyLabel =
    item.owned && !isReward ? 'Possédé' : isReward && item.owned ? 'Racheter' : 'Acheter'
  const statusClass = item.equipped
    ? 'lr-pill lr-shop-status lr-shop-status--equipped'
    : 'lr-pill lr-shop-status lr-shop-status--owned'

  async function handlePurchase() {
    setError('')
    setShortfall(null)
    try {
      const result = await purchase.mutateAsync(item.id)
      announce(result.message)
      toast(result.message)
    } catch (cause) {
      const detail = cause instanceof ApiError ? cause.detail : 'Achat impossible.'
      setError(detail)
      setShortfall(shortfallFromDetail(detail))
    }
  }

  async function handleEquip() {
    setError('')
    try {
      await equip.mutateAsync(item.id)
      const message = `Objet équipé : ${item.name}.`
      announce(message)
      toast(message)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Équipement impossible.')
    }
  }

  async function handleUnequip() {
    setError('')
    try {
      await unequip.mutateAsync(item.id)
      const message = `Objet retiré : ${item.name}.`
      announce(message)
      toast(message)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Retrait impossible.')
    }
  }

  return (
    <HudFrame
      as="article"
      className={previewing ? 'lr-shop-card lr-shop-card--preview' : 'lr-shop-card'}
      tabIndex={onPreview ? 0 : undefined}
      aria-label={`Objet ${item.name}`}
      onMouseEnter={onPreview ? () => onPreview(item) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
      onFocus={onPreview ? () => onPreview(item) : undefined}
      onBlur={
        onPreview
          ? (event) => {
              const next = event.relatedTarget
              if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
                onPreview(null)
              }
            }
          : undefined
      }
    >
      <div className="lr-shop-card-head">
        <ArtifactPreview item={item} />
        <div>
          <p className="lr-detail-code">{SHOP_CATEGORY_LABELS[item.category]}</p>
          <h3 className="lr-q-title">{item.name}</h3>
        </div>
      </div>
      <p className="lr-note lr-shop-card-description">{item.description}</p>
      <div className="lr-q-meta">
        {item.slot ? <span className="lr-pill">{SLOT_LABELS[item.slot]}</span> : null}
        {item.owned ? (
          <span className={statusClass}>{item.equipped ? 'Équipé' : 'Possédé'}</span>
        ) : null}
        <span className="lr-shop-price">
          <span className="num">{item.cost}</span> crédits
        </span>
      </div>
      {shortfall ? <p className="lr-shop-shortfall">Il te manque {shortfall} crédits</p> : null}
      {error ? (
        <p role="alert" className="lr-field-error">
          {error}
        </p>
      ) : null}
      <div className="lr-form-actions">
        <Button
          variant={canBuy ? 'solid' : 'default'}
          disabled={!canBuy || purchase.isPending}
          onClick={() => void handlePurchase()}
        >
          {buyLabel}
        </Button>
        {item.owned && item.category === 'ARTIFACT' ? (
          item.equipped ? (
            <Button
              variant="quiet"
              disabled={unequip.isPending}
              onClick={() => void handleUnequip()}
            >
              Retirer
            </Button>
          ) : (
            <Button variant="quiet" disabled={equip.isPending} onClick={() => void handleEquip()}>
              Équiper
            </Button>
          )
        ) : null}
      </div>
    </HudFrame>
  )
}
