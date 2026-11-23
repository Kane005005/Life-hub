import '../styles/shop.css'
import { SLOT_LABELS } from '../lib/labels'
import type {
  Avatar as AvatarShape,
  CharacterEquipment,
  EquipmentSlot,
  ShopItem,
} from '../lib/types'
import { Avatar } from './Avatar'
import { HudFrame } from './HudFrame'

type ShopAvatarPreviewProps = {
  avatar: AvatarShape
  equipment?: CharacterEquipment | null
  previewItem?: ShopItem | null
  listLabel?: string
}

const SLOTS: EquipmentSlot[] = ['AURA', 'FRAME', 'EMBLEM']
const EMPTY_EQUIPMENT: CharacterEquipment = { AURA: null, FRAME: null, EMBLEM: null }

function withPreview(
  equipment: CharacterEquipment,
  previewItem: ShopItem | null | undefined,
): CharacterEquipment {
  if (!previewItem?.slot) return equipment
  return { ...equipment, [previewItem.slot]: previewItem }
}

export function ShopAvatarPreview({
  avatar,
  equipment,
  previewItem,
  listLabel = 'Équipement',
}: ShopAvatarPreviewProps) {
  const current = equipment ?? EMPTY_EQUIPMENT
  const visible = withPreview(current, previewItem)

  return (
    <HudFrame as="aside" className="lr-shop-preview" aria-label="Aperçu de l'avatar">
      <div className="lr-shop-preview-head">
        <p className="lr-detail-subtitle">{listLabel}</p>
        {previewItem ? <p className="lr-shop-preview-flag">Aperçu</p> : null}
      </div>
      <div className="lr-shop-preview-avatar">
        <Avatar
          size={220}
          silhouette={avatar.silhouette}
          color={avatar.color}
          accent={avatar.accent}
          equipment={visible}
          label={previewItem ? `Aperçu avec ${previewItem.name}` : 'Aperçu de ton avatar équipé'}
        />
      </div>
      <ul className="lr-shop-preview-list">
        {SLOTS.map((slot) => (
          <li key={slot} className="lr-shop-preview-row">
            <span className="lr-detail-code">{SLOT_LABELS[slot]}</span>
            <span className="lr-shop-preview-item">{visible[slot]?.name ?? 'Aucun objet'}</span>
          </li>
        ))}
      </ul>
    </HudFrame>
  )
}
