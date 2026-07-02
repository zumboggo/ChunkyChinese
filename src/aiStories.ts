import { supabase } from './supabaseSync'
import { normalizeGeneratedStoryPayload, type GeneratedStoryPayload } from './generatedStories'
import type { VocabWord } from './types'

export interface GenerateAiStoryOptions {
  prompt: string
  knownWords: Pick<VocabWord, 'word' | 'pinyin' | 'meaning'>[]
  strictRetry?: boolean
}

export async function generateAiStory(options: GenerateAiStoryOptions): Promise<GeneratedStoryPayload> {
  if (!supabase) throw new Error('Cloud sign-in is required before AI stories can be generated.')
  const prompt = options.prompt.trim()
  if (!prompt) throw new Error('Enter a story prompt first.')

  const { data, error } = await supabase.functions.invoke('generate-story', {
    body: {
      prompt,
      knownWords: options.knownWords,
      strictRetry: Boolean(options.strictRetry),
    },
  })

  if (error) throw new Error(error.message || 'AI story generation failed.')
  return normalizeGeneratedStoryPayload(data, prompt)
}
