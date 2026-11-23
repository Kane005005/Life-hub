import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { HudFrame } from '../components/HudFrame'
import { RewardForm } from '../components/RewardForm'
import { ShopItemCard } from '../components/ShopItemCard'
import { WalletBadge } from '../components/WalletBadge'
import { formatDateTime } from '../lib/format'
import { SLOT_LABELS } from '../lib/labels'
import { useCharacter, useInventory, useShopItems, useWalletTransactions } from '../lib/queries'
import type { EquipmentSlot, ShopItem } from '../lib/types'

const TABS = ['Récompenses', 'Objets', 'Inventaire', 'Crédits'] as const
type Tab = (typeof TABS)[number]

function groupBySlot(items: ShopItem[]): Array<[EquipmentSlot, ShopItem[]]> {
  const slots: EquipmentSlot[] = ['AURA', 'FRAME', 'EMBLEM']
  return slots
    .map(
      (slot) => [slot, items.filter((item) => item.slot === slot)] as [EquipmentSlot, ShopItem[]],
    )
    .filter(([, slotItems]) => slotItems.length > 0)
}

export function ShopPage() {
  const [tab, setTab] = useState<Tab>('Récompenses')
  const [editingReward, setEditingReward] = useState<ShopItem | null>(null)
  const [creatingReward, setCreatingReward] = useState(false)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const characterQuery = useCharacter()
  const rewardsQuery = useShopItems({ category: 'REWARD' })
  const artifactsQuery = useShopItems({ category: 'ARTIFACT' })
  const inventoryQuery = useInventory()
  const walletQuery = useWalletTransactions()

  const rewards = rewardsQuery.data ?? []
  const artifacts = artifactsQuery.data ?? []
  const inventory = inventoryQuery.data
  const walletTx = walletQuery.data?.results ?? []

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const next = (index + direction + TABS.length) % TABS.length
    setTab(TABS[next])
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">05 · Boutique</p>
      <h1 className="lr-title">Boutique</h1>
      <p className="lr-lede">Dépense tes crédits pour des récompenses et des objets cosmétiques.</p>

      {characterQuery.data ? <WalletBadge credits={characterQuery.data.credits} /> : null}

      <div className="lr-tabs" role="tablist" aria-label="Sections de la boutique">
        {TABS.map((label, index) => {
          const selected = tab === label
          return (
            <button
              key={label}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              className={selected ? 'lr-tab is-selected' : 'lr-tab'}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(label)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'Récompenses' ? (
        <div role="tabpanel" className="lr-stack">
          <div className="lr-page-head">
            <h2 className="lr-subtitle">Récompenses personnelles</h2>
            <Button variant="solid" onClick={() => setCreatingReward(true)}>
              Nouvelle récompense
            </Button>
          </div>
          {creatingReward ? (
            <RewardForm
              onSaved={() => setCreatingReward(false)}
              onCancel={() => setCreatingReward(false)}
            />
          ) : null}
          {editingReward ? (
            <RewardForm
              reward={editingReward}
              onSaved={() => setEditingReward(null)}
              onCancel={() => setEditingReward(null)}
            />
          ) : null}
          <div className="lr-shop-grid">
            {rewards.map((item) => (
              <div key={item.id} className="lr-stack">
                <ShopItemCard item={item} />
                {item.is_custom ? (
                  <Button variant="quiet" onClick={() => setEditingReward(item)}>
                    Modifier
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {rewards.length === 0 && !rewardsQuery.isPending ? (
            <p className="lr-note">Aucune récompense disponible.</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'Objets' ? (
        <div role="tabpanel" className="lr-stack">
          {groupBySlot(artifacts).map(([slot, items]) => (
            <section key={slot} className="lr-stack">
              <h2 className="lr-subtitle">{SLOT_LABELS[slot]}</h2>
              <div className="lr-shop-grid">
                {items.map((item) => (
                  <ShopItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
          {artifacts.length === 0 && !artifactsQuery.isPending ? (
            <p className="lr-note">Aucun objet disponible.</p>
          ) : null}
        </div>
      ) : null}

      {tab === 'Inventaire' ? (
        <div role="tabpanel" className="lr-stack">
          {characterQuery.data ? (
            <HudFrame className="lr-stack">
              <p className="lr-detail-subtitle">Aperçu</p>
              <Avatar
                silhouette={characterQuery.data.avatar.silhouette}
                color={characterQuery.data.avatar.color}
                accent={characterQuery.data.avatar.accent}
                equipment={characterQuery.data.equipment}
                label="Aperçu de ton avatar équipé"
              />
            </HudFrame>
          ) : null}
          <div className="lr-shop-grid">
            {(inventory?.items ?? []).map((item) => (
              <ShopItemCard key={item.id} item={item} />
            ))}
          </div>
          {!inventoryQuery.isPending && (inventory?.items ?? []).length === 0 ? (
            <p className="lr-note">Tu ne possèdes pas encore d'objet.</p>
          ) : null}
          <h2 className="lr-subtitle">Historique des achats</h2>
          <ul className="lr-journal-list">
            {(inventory?.purchases ?? []).map((purchase) => (
              <li key={purchase.uuid} className="lr-journal-item">
                <time dateTime={purchase.purchased_at}>
                  {formatDateTime(purchase.purchased_at)}
                </time>
                <span>{purchase.item_name}</span>
                <span className="lr-xp">-{purchase.cost} crédits</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === 'Crédits' ? (
        <div role="tabpanel" className="lr-stack">
          <h2 className="lr-subtitle">Transactions</h2>
          <ul className="lr-journal-list">
            {walletTx.map((tx) => (
              <li key={tx.uuid} className="lr-journal-item">
                <time dateTime={tx.created_at}>{formatDateTime(tx.created_at)}</time>
                <span className="lr-xp">
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount}
                </span>
                <span>{tx.reason}</span>
                <span className="num">Solde {tx.balance_after}</span>
              </li>
            ))}
          </ul>
          {!walletQuery.isPending && walletTx.length === 0 ? (
            <p className="lr-note">Aucune transaction.</p>
          ) : null}
        </div>
      ) : null}

      <p className="lr-note">Un achat ici ne dépense pas d'argent réel.</p>
    </section>
  )
}
