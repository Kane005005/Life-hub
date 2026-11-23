import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AchievementGrid } from '../components/AchievementGrid'
import { Button } from '../components/Button'
import { CharacterForm } from '../components/CharacterForm'
import { HeroCard } from '../components/HeroCard'
import { HudFrame } from '../components/HudFrame'
import { Radar } from '../components/Radar'
import { SkillDetail } from '../components/SkillDetail'
import { SkillPointsBadge } from '../components/SkillPointsBadge'
import { SkillTreeView } from '../components/SkillTreeView'
import { formatDate } from '../lib/format'
import { TERRITORY_BY_CODE, TERRITORY_CODES, TERRITORY_LABELS } from '../lib/labels'
import { useAchievements, useCharacter, useSkillTrees, useXpHistory } from '../lib/queries'
import type { SkillNode, TerritoryCode } from '../lib/types'

export function HeroPage() {
  const characterQuery = useCharacter()
  const historyQuery = useXpHistory()
  const achievementsQuery = useAchievements()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const arbreParam = searchParams.get('arbre') as TerritoryCode | null
  const selectedTree: TerritoryCode =
    arbreParam && TERRITORY_CODES.includes(arbreParam) ? arbreParam : 'KNOWLEDGE'
  const skillTreesQuery = useSkillTrees(selectedTree)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [unlockFx, setUnlockFx] = useState<{ code: string; key: number } | null>(null)
  const unlockFxKey = useRef(0)
  const character = characterQuery.data
  const transactions = historyQuery.data?.results.slice(0, 10) ?? []
  const tree = skillTreesQuery.data?.[0]

  useEffect(() => {
    setSelectedCode(null)
    setUnlockFx(null)
  }, [selectedTree])

  const achievements = useMemo(() => achievementsQuery.data ?? [], [achievementsQuery.data])
  const branches = tree?.branches ?? []
  const unlockedCount = tree
    ? branches.reduce(
        (total, branch) =>
          total + branch.skills.filter((skill) => skill.state === 'UNLOCKED').length,
        0,
      )
    : null
  // Toujours relire le nœud dans l'arbre à jour : après un déblocage, l'API renvoie le nouvel état.
  const selectedNode: SkillNode | null =
    branches.flatMap((branch) => branch.skills).find((node) => node.code === selectedCode) ?? null

  return (
    <section className="lr-section">
      <p className="lr-eyebrow">02 · Le héros</p>
      <h1 className="lr-title">Ton personnage</h1>

      {characterQuery.isPending ? <p className="lr-note">Chargement du personnage…</p> : null}
      {!characterQuery.isPending && !character ? (
        <p role="alert" className="lr-note">
          Personnage indisponible.
        </p>
      ) : null}

      {character ? (
        <div className="lr-hero-grid">
          <div>
            <HeroCard character={character} />
            <Button variant="quiet" onClick={() => setEditing((value) => !value)}>
              Modifier le personnage
            </Button>
          </div>
          <HudFrame>
            <h2 className="lr-subtitle">Statistiques</h2>
            <Radar stats={character.stats} />
          </HudFrame>
        </div>
      ) : null}

      {character && editing ? (
        <div className="lr-hero-edit">
          <h2 className="lr-subtitle">Modifier le personnage</h2>
          <CharacterForm
            character={character}
            submitLabel="Enregistrer les modifications"
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : null}

      <h2 className="lr-subtitle">Succès</h2>
      {achievementsQuery.isPending ? <p className="lr-note">Chargement des succès…</p> : null}
      {achievements.length > 0 ? <AchievementGrid achievements={achievements} /> : null}

      <h2 className="lr-subtitle" id="competences">
        Compétences
      </h2>
      <div className="lr-skill-territories" role="group" aria-label="Territoire de l'arbre">
        {TERRITORY_CODES.map((code) => {
          const isSelected = selectedTree === code
          const count = isSelected ? unlockedCount : null
          return (
            <button
              key={code}
              type="button"
              className={isSelected ? 'lr-skill-territory is-selected' : 'lr-skill-territory'}
              aria-label={TERRITORY_LABELS[code]}
              aria-pressed={isSelected}
              style={{ '--c': TERRITORY_BY_CODE[code].color } as CSSProperties}
              onClick={() => setSearchParams({ arbre: code })}
            >
              <span>{TERRITORY_LABELS[code]}</span>
              {count !== null ? (
                <span className="lr-skill-territory-count" aria-hidden="true">
                  {count}/12
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      {character ? (
        <SkillPointsBadge
          available={character.skill_points.available}
          spent={character.skill_points.spent}
        />
      ) : null}
      <div className="lr-skill-layout">
        {tree ? (
          <SkillTreeView
            tree={{ ...tree, branches }}
            selectedCode={selectedCode ?? undefined}
            onSelect={(node) => setSelectedCode(node.code)}
            celebratingCode={unlockFx?.code}
            celebrationKey={unlockFx?.key}
          />
        ) : (
          <p className="lr-note">Chargement de l'arbre…</p>
        )}
        <SkillDetail
          node={selectedNode}
          onUnlocked={(code) => {
            unlockFxKey.current += 1
            setUnlockFx({ code, key: unlockFxKey.current })
          }}
        />
      </div>

      <h2 className="lr-subtitle">Progression récente</h2>
      {historyQuery.isPending ? <p className="lr-note">Chargement de l'historique…</p> : null}
      {transactions.length > 0 ? (
        <ol className="lr-xp-list" aria-live="polite">
          {transactions.map((item) => (
            <li key={item.uuid}>
              <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
              <span className="lr-xp">+{item.amount} XP</span>
              <span>{TERRITORY_BY_CODE[item.territory].name}</span>
              <span>{item.quest_title}</span>
              <span className="num">
                Niveau {item.level_before} → {item.level_after}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        !historyQuery.isPending && <p className="lr-note">Aucune progression enregistrée.</p>
      )}
    </section>
  )
}
