import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_FAMILY_PROFILE,
  DEFAULT_STORY_WORLD_SELECTION,
  STORY_WORLDS,
  buildStoryWorldContext,
  getStoryWorld,
  loadFamilyProfile,
  loadStoryWorldSelection,
  saveFamilyProfile,
  saveStoryWorldSelection,
} from './storyWorlds'

// The vitest environment is plain node, so provide an in-memory localStorage.
function makeLocalStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorageStub())
})

describe('story world catalog', () => {
  it('provides the four expected worlds', () => {
    expect(STORY_WORLDS.map((w) => w.id)).toEqual(['family', 'lms', 'gospel-john', 'original'])
  })

  it('falls back to the original world for unknown ids', () => {
    expect(getStoryWorld('nope').id).toBe('original')
  })
})

describe('selection persistence', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadStoryWorldSelection()).toEqual(DEFAULT_STORY_WORLD_SELECTION)
  })

  it('round-trips a selection through localStorage', () => {
    saveStoryWorldSelection({ worldId: 'lms', gospelMode: 'companion', lmsAllowSpoilers: true })
    expect(loadStoryWorldSelection()).toEqual({
      worldId: 'lms',
      gospelMode: 'companion',
      lmsAllowSpoilers: true,
    })
  })

  it('sanitizes unknown world ids and corrupt values', () => {
    localStorage.setItem('chunky-chinese:story-world', JSON.stringify({ worldId: 'bogus', gospelMode: 'x' }))
    expect(loadStoryWorldSelection()).toEqual(DEFAULT_STORY_WORLD_SELECTION)
    localStorage.setItem('chunky-chinese:story-world', 'not json')
    expect(loadStoryWorldSelection()).toEqual(DEFAULT_STORY_WORLD_SELECTION)
  })
})

describe('family profile persistence', () => {
  it('returns the default profile when nothing is stored', () => {
    expect(loadFamilyProfile()).toEqual(DEFAULT_FAMILY_PROFILE)
  })

  it('round-trips an edited profile', () => {
    const edited = {
      ...DEFAULT_FAMILY_PROFILE,
      setting: 'A family that lives on a houseboat.',
    }
    saveFamilyProfile(edited)
    expect(loadFamilyProfile().setting).toBe('A family that lives on a houseboat.')
  })

  it('rejects malformed stored profiles', () => {
    localStorage.setItem('chunky-chinese:family-profile', JSON.stringify({ setting: 42 }))
    expect(loadFamilyProfile()).toEqual(DEFAULT_FAMILY_PROFILE)
  })
})

describe('buildStoryWorldContext', () => {
  it('includes family members and safety rules for the family world', () => {
    const context = buildStoryWorldContext({ worldId: 'family', gospelMode: 'retelling', lmsAllowSpoilers: false })
    expect(context).toContain('My Family')
    expect(context).toContain('David')
    expect(context).toContain('Jetaime')
    expect(context).toContain('Leah')
    expect(context).toContain('respectfully and warmly')
    expect(context).toContain('Follow the learner-level and output-format constraints exactly')
  })

  it('uses the edited family profile when one is saved', () => {
    saveFamilyProfile({
      ...DEFAULT_FAMILY_PROFILE,
      characters: [{ name: 'Zorro', role: 'Dog', traits: ['fluffy'] }],
    })
    const context = buildStoryWorldContext({ worldId: 'family', gospelMode: 'retelling', lmsAllowSpoilers: false })
    expect(context).toContain('Zorro')
    expect(context).not.toContain('Jetaime')
  })

  it('adds retelling constraints in gospel retelling mode', () => {
    const context = buildStoryWorldContext({ worldId: 'gospel-john', gospelMode: 'retelling', lmsAllowSpoilers: false })
    expect(context).toContain('Biblical retelling')
    expect(context).toContain('Scripture reference')
    expect(context).toContain('Do not invent events, teachings, miracles, or quotes for Jesus')
  })

  it('adds companion-story labelling in gospel companion mode', () => {
    const context = buildStoryWorldContext({ worldId: 'gospel-john', gospelMode: 'companion', lmsAllowSpoilers: false })
    expect(context).toContain('Imaginative companion story')
    expect(context).toContain('Do not present invented material as Scripture')
  })

  it('keeps LMS stories spoiler-light by default', () => {
    const context = buildStoryWorldContext({ worldId: 'lms', gospelMode: 'retelling', lmsAllowSpoilers: false })
    expect(context).toContain('Royal Road')
    expect(context).toContain('spoiler-light')
    expect(context).not.toContain('enabled later-story references')
  })

  it('allows later-story references when spoilers are enabled', () => {
    const context = buildStoryWorldContext({ worldId: 'lms', gospelMode: 'retelling', lmsAllowSpoilers: true })
    expect(context).toContain('enabled later-story references')
  })

  it('always appends the canon/Scripture safety rule', () => {
    for (const world of STORY_WORLDS) {
      const context = buildStoryWorldContext({ worldId: world.id, gospelMode: 'retelling', lmsAllowSpoilers: false })
      expect(context).toContain('Do not claim that invented details are canon, historical fact, or Scripture.')
    }
  })
})
