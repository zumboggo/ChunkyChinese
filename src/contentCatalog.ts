import type { HostedClipPack, HostedReaderPack } from './types'

export const PRIVATE_CONTENT_BUCKET = 'study-content'

export const PRIVATE_CLIP_PACKS: HostedClipPack[] = [
  {
    id: 'lms-1000-azure',
    name: 'LMS 1000',
    description: 'Legendary Moonlight Sculptor vocabulary with Azure audio.',
    storagePath: 'clip-packs/lms-1000-azure-v1.zip',
    language: 'zh-CN',
  },
]

export const PRIVATE_READER_PACKS: HostedReaderPack[] = [
  ['lms-books', 'LMS Reader Books'],
  ['sherlock-holmes', 'Sherlock Holmes Graded Reader'],
  ['rise-of-the-monkey-king', 'Rise of the Monkey King'],
  ['just-friends', 'Just Friends?'],
  ['can-i-dance', 'Can I Dance With You?'],
  ['china-arrival', 'The Package, the Classroom, and a Bowl of Hot Soup'],
  ['john-gospel', 'Gospel of John'],
].map(([id, name]) => ({
  id,
  name,
  storagePath: id === 'john-gospel'
    ? 'reader-packs/john-gospel-core-v1.zip'
    : `reader-packs/${id}-v1.zip`,
  storagePaths: id === 'john-gospel'
    ? [
        'reader-packs/john-gospel-core-v1.zip',
        'reader-packs/john-gospel-audio-1-v1.zip',
        'reader-packs/john-gospel-audio-2-v1.zip',
      ]
    : undefined,
  language: 'zh-CN',
}))

export const PRIVATE_SENTENCE_AUDIO_PACKS = [
  {
    storagePath: 'sentence-audio/lms-sentence-audio-v1.zip',
    publicPrefix: 'seed/sentence-audio',
  },
  {
    storagePath: 'sentence-audio/china-life-audio-v1.zip',
    publicPrefix: 'seed/china-life-audio',
  },
] as const
