import { useState } from 'react'
import { useFx } from '../features/fx/useFx'
import { ApiError } from '../lib/api'
import { SHOP_CATEGORY_LABELS, SLOT_LABELS } from '../lib/labels'
import { useEquip, usePurchase, useUnequip } from '../lib/queries'
import type { ShopItem } from '../lib/types'
import { Button } from './Button'
import { HudFrame } from './HudFrame'

type ShopItemCardProps = {
  item: ShopItem
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
    return (
      <span
        className={[
          'lr-artifact-preview',
          'lr-artifact-preview--frame',
          visual?.style === 'double' ? 'is-double' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
    )
  }
  if (item.slot === 'EMBLEM') {
    return (
      <span className="lr-artifact-preview lr-artifact-preview--emblem" aria-hidden="true">
        {visual?.sign ?? '◆'}
      </span>
    )
  }
  return null
}

export function ShopItemCard({ item }: ShopItemCardProps) {
  const purchase = usePurchase()
  const equip = useEquip()
  const unequip = useUnequip()
  const { announce, toast } = useFx()
  const [error, setError] = useState('')

  const isReward = item.category === 'REWARD'
  const canBuy = isReward ? item.is_available : item.is_available && !item.owned
  const buyLabel =
    item.owned && !isReward ? 'Possédé' : isReward && item.owned ? 'Racheter' : 'Acheter'

  async function handlePurchase() {
    setError('')
    try {
      const result = await purchase.mutateAsync(item.id)
      announce(result.message)
      toast(result.message)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.detail : 'Achat impossible.')
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
    <HudFrame className="lr-shop-card">
      <div className="lr-shop-card-head">
        <ArtifactPreview item={item} />
        <div>
          <p className="lr-detail-code">{SHOP_CATEGORY_LABELS[item.category]}</p>
          <h3 className="lr-q-title">{item.name}</h3>
        </div>
      </div>
      <p className="lr-note">{item.description}</p>
      <div className="lr-q-meta">
        {item.slot ? <span className="lr-pill">{SLOT_LABELS[item.slot]}</span> : null}
        <span className="lr-xp">
          <span className="num">{item.cost}</span> crédits
        </span>
      </div>
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
