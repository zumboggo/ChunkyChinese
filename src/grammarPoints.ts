export interface GrammarPoint {
  id: string
  pattern: string
  pinyin: string
  level: 'HSK1' | 'HSK2' | 'HSK3' | 'HSK4' | 'HSK5' | 'HSK6'
  explanation: string
  example: string
  exampleTranslation: string
}

export interface GrammarMatch {
  grammarId: string
  startIndex: number
  endIndex: number
  point: GrammarPoint
}

export const grammarPoints: GrammarPoint[] = [
  {
    id: 'ba-construction',
    pattern: '把',
    pinyin: 'bǎ',
    level: 'HSK3',
    explanation: 'The 把 construction emphasizes what is done to an object. Structure: Subject + 把 + Object + Verb + Result/Complement.',
    example: '我把书放在桌子上了。',
    exampleTranslation: 'I put the book on the table.',
  },
  {
    id: 'bei-passive',
    pattern: '被',
    pinyin: 'bèi',
    level: 'HSK3',
    explanation: '被 is used for passive voice, often with a negative connotation. Structure: Object + 被 + Agent + Verb.',
    example: '他被老师批评了。',
    exampleTranslation: 'He was criticized by the teacher.',
  },
  {
    id: 'le-completed',
    pattern: '了',
    pinyin: 'le',
    level: 'HSK1',
    explanation: '了 indicates a completed action or a change of state. Placed after the verb for completion, or at the end of a sentence for change.',
    example: '我吃了饭。',
    exampleTranslation: 'I have eaten.',
  },
  {
    id: 'guo-experiential',
    pattern: '过',
    pinyin: 'guo',
    level: 'HSK3',
    explanation: '过 indicates past experience. Structure: Verb + 过. Means "have done something before."',
    example: '我去过中国。',
    exampleTranslation: 'I have been to China before.',
  },
  {
    id: 'zhe-durative',
    pattern: '着',
    pinyin: 'zhe',
    level: 'HSK3',
    explanation: '着 indicates a continuing state or action. Structure: Verb + 着. Can mean "-ing" or "in a state of."',
    example: '门开着。',
    exampleTranslation: 'The door is open.',
  },
  {
    id: 'de-possessive',
    pattern: '的',
    pinyin: 'de',
    level: 'HSK1',
    explanation: '的 shows possession or modifies a noun with an adjective/phrase. Structure: Modifier + 的 + Noun.',
    example: '我的书',
    exampleTranslation: 'My book',
  },
  {
    id: 'de-complement',
    pattern: '得',
    pinyin: 'de',
    level: 'HSK2',
    explanation: '得 is used after a verb to introduce a complement describing degree or manner. Structure: Verb + 得 + Complement.',
    example: '他说得很好。',
    exampleTranslation: 'He speaks very well.',
  },
  {
    id: 'de-adverbial',
    pattern: '地',
    pinyin: 'de',
    level: 'HSK3',
    explanation: '地 is used after an adjective/phrase to modify a verb adverbially. Structure: Adjective + 地 + Verb.',
    example: '他高兴地笑了。',
    exampleTranslation: 'He smiled happily.',
  },
  {
    id: 'hai-still',
    pattern: '还',
    pinyin: 'hái',
    level: 'HSK2',
    explanation: '还 means "still" or "yet," indicating continuation. Can also mean "also" or "in addition."',
    example: '他还在睡觉。',
    exampleTranslation: 'He is still sleeping.',
  },
  {
    id: 'zai-progressive',
    pattern: '在',
    pinyin: 'zài',
    level: 'HSK1',
    explanation: '在 before a verb indicates an action in progress (like English "-ing"). Structure: Subject + 在 + Verb.',
    example: '我在学习中文。',
    exampleTranslation: 'I am studying Chinese.',
  },
  {
    id: 'jiu-then',
    pattern: '就',
    pinyin: 'jiù',
    level: 'HSK2',
    explanation: '就 indicates "then," "right away," or emphasis. Often used in conditional sentences: 如果...就...',
    example: '如果你想去，我就陪你。',
    exampleTranslation: 'If you want to go, then I will accompany you.',
  },
  {
    id: 'cai-only',
    pattern: '才',
    pinyin: 'cái',
    level: 'HSK3',
    explanation: '才 means "only then" or "not until," often implying something happened later than expected.',
    example: '他十点才来。',
    exampleTranslation: 'He only came at 10 o\'clock (late).',
  },
  {
    id: 'ye-also',
    pattern: '也',
    pinyin: 'yě',
    level: 'HSK1',
    explanation: '也 means "also" or "too." Structure: Subject + 也 + Verb.',
    example: '我也喜欢中国菜。',
    exampleTranslation: 'I also like Chinese food.',
  },
  {
    id: 'dou-all',
    pattern: '都',
    pinyin: 'dōu',
    level: 'HSK1',
    explanation: '都 means "all" or "both." Placed before the verb. Often used with 每 (every) or 所有 (all).',
    example: '他们都来了。',
    exampleTranslation: 'They all came.',
  },
  {
    id: 'le-change',
    pattern: '了',
    pinyin: 'le',
    level: 'HSK2',
    explanation: 'Sentence-final 了 indicates a change of situation or new state of affairs.',
    example: '下雨了。',
    exampleTranslation: 'It\'s raining now. (It wasn\'t before.)',
  },
  {
    id: 'yijing-already',
    pattern: '已经',
    pinyin: 'yǐjīng',
    level: 'HSK2',
    explanation: '已经 means "already," indicating something has happened before now. Often used with 了.',
    example: '他已经走了。',
    exampleTranslation: 'He has already left.',
  },
  {
    id: 'bixu-must',
    pattern: '必须',
    pinyin: 'bìxū',
    level: 'HSK3',
    explanation: '必须 means "must" or "have to," expressing strong necessity or obligation.',
    example: '你必须完成作业。',
    exampleTranslation: 'You must finish your homework.',
  },
  {
    id: 'keyi-permission',
    pattern: '可以',
    pinyin: 'kěyǐ',
    level: 'HSK1',
    explanation: '可以 means "can" or "may," expressing permission or possibility.',
    example: '我可以进来吗？',
    exampleTranslation: 'May I come in?',
  },
  {
    id: 'huide-ability',
    pattern: '会',
    pinyin: 'huì',
    level: 'HSK1',
    explanation: '会 means "can" (learned ability) or "will" (future). Used for skills learned through practice.',
    example: '我会说中文。',
    exampleTranslation: 'I can speak Chinese.',
  },
  {
    id: 'yinwei-because',
    pattern: '因为',
    pinyin: 'yīnwèi',
    level: 'HSK2',
    explanation: '因为 means "because." Often paired with 所以 (so). Structure: 因为...所以...',
    example: '因为下雨，所以我不去了。',
    exampleTranslation: 'Because it\'s raining, I\'m not going.',
  },
  {
    id: 'suoyi-so',
    pattern: '所以',
    pinyin: 'suǒyǐ',
    level: 'HSK2',
    explanation: '所以 means "so" or "therefore," showing a result. Paired with 因为 (because).',
    example: '我很忙，所以不能去。',
    exampleTranslation: 'I\'m very busy, so I can\'t go.',
  },
  {
    id: 'although-but',
    pattern: '虽然',
    pinyin: 'suīrán',
    level: 'HSK3',
    explanation: '虽然 means "although." Paired with 但是 (but). Structure: 虽然...但是...',
    example: '虽然很贵，但是很好。',
    exampleTranslation: 'Although it\'s expensive, it\'s very good.',
  },
  {
    id: 'however-but',
    pattern: '但是',
    pinyin: 'dànshì',
    level: 'HSK2',
    explanation: '但是 means "but" or "however," showing contrast. Often paired with 虽然 (although).',
    example: '我想去，但是没时间。',
    exampleTranslation: 'I want to go, but I don\'t have time.',
  },
  {
    id: 'ruguo-if',
    pattern: '如果',
    pinyin: 'rúguǒ',
    level: 'HSK3',
    explanation: '如果 means "if," used in conditional sentences. Often paired with 就 (then).',
    example: '如果明天下雨，我就不去了。',
    exampleTranslation: 'If it rains tomorrow, I won\'t go.',
  },
  {
    id: 'liandou-even',
    pattern: '连',
    pinyin: 'lián',
    level: 'HSK4',
    explanation: '连...都/也... means "even," emphasizing an extreme case. Structure: 连 + Extreme case + 都/也 + Verb.',
    example: '连小孩都知道。',
    exampleTranslation: 'Even children know that.',
  },
  {
    id: 'yijiu-as-soon-as',
    pattern: '一',
    pinyin: 'yī',
    level: 'HSK3',
    explanation: '一...就... means "as soon as." Structure: 一 + Condition + 就 + Result.',
    example: '一回家就吃饭。',
    exampleTranslation: 'As soon as (I) get home, (I) eat.',
  },
  {
    id: 'haishi-or',
    pattern: '还是',
    pinyin: 'háishì',
    level: 'HSK2',
    explanation: '还是 means "or" in questions, offering choices. Different from 或者 (or in statements).',
    example: '你想喝茶还是咖啡？',
    exampleTranslation: 'Do you want tea or coffee?',
  },
  {
    id: 'budan-not-only',
    pattern: '不但',
    pinyin: 'bùdàn',
    level: 'HSK4',
    explanation: '不但...而且... means "not only...but also." Structure: 不但 + Clause 1 + 而且 + Clause 2.',
    example: '他不但聪明，而且努力。',
    exampleTranslation: 'He is not only smart but also hardworking.',
  },
  {
    id: 'erqie-moreover',
    pattern: '而且',
    pinyin: 'érqiě',
    level: 'HSK3',
    explanation: '而且 means "moreover" or "and also," adding information. Often paired with 不但 (not only).',
    example: '便宜而且好吃。',
    exampleTranslation: 'Cheap and also delicious.',
  },
  {
    id: 'yibian-so-as-to',
    pattern: '一边',
    pinyin: 'yībiān',
    level: 'HSK3',
    explanation: '一边...一边... means "while doing...also doing..." Two simultaneous actions.',
    example: '他一边吃饭一边看电视。',
    exampleTranslation: 'He eats while watching TV.',
  },
  {
    id: 'zhiyou-only-if',
    pattern: '只有',
    pinyin: 'zhǐyǒu',
    level: 'HSK4',
    explanation: '只有...才... means "only if...then..." Structure: Only under this condition + 才 + Result.',
    example: '只有努力才能成功。',
    exampleTranslation: 'Only by working hard can you succeed.',
  },
  {
    id: 'jingran-surprisingly',
    pattern: '竟然',
    pinyin: 'jìngrán',
    level: 'HSK5',
    explanation: '竟然 means "unexpectedly" or "surprisingly," expressing surprise or disbelief.',
    example: '他竟然不知道这件事。',
    exampleTranslation: 'He surprisingly didn\'t know about this.',
  },
  {
    id: 'yizhi-always',
    pattern: '一直',
    pinyin: 'yīzhí',
    level: 'HSK2',
    explanation: '一直 means "always" or "continuously," indicating an action that has been ongoing.',
    example: '他一直在等你。',
    exampleTranslation: 'He has been waiting for you.',
  },
  {
    id: 'gangjust',
    pattern: '刚才',
    pinyin: 'gāngcái',
    level: 'HSK2',
    explanation: '刚才 means "just now," referring to the recent past. Different from 刚 (just, with verb).',
    example: '他刚才来了。',
    exampleTranslation: 'He came just now.',
  },
  {
    id: 'yijing-le-already',
    pattern: '已经了',
    pinyin: 'yǐjīng le',
    level: 'HSK2',
    explanation: '已经...了 emphasizes that something has already been completed. A common combination.',
    example: '我已经吃了。',
    exampleTranslation: 'I have already eaten.',
  },
  {
    id: 'ba-suggestion',
    pattern: '吧',
    pinyin: 'ba',
    level: 'HSK1',
    explanation: '吧 at the end of a sentence makes a suggestion or softens a statement. Like "let\'s" or "right?"',
    example: '我们走吧。',
    exampleTranslation: 'Let\'s go.',
  },
  {
    id: 'ma-question',
    pattern: '吗',
    pinyin: 'ma',
    level: 'HSK1',
    explanation: '吗 at the end of a sentence turns it into a yes/no question.',
    example: '你好吗？',
    exampleTranslation: 'How are you?',
  },
  {
    id: 'ne-softened-question',
    pattern: '呢',
    pinyin: 'ne',
    level: 'HSK1',
    explanation: '呢 at the end of a sentence asks a follow-up question or softens the tone. "What about...?"',
    example: '你呢？',
    exampleTranslation: 'And you? / What about you?',
  },
]

export function findGrammarMatches(text: string): GrammarMatch[] {
  const matches: GrammarMatch[] = []
  for (const point of grammarPoints) {
    let searchIndex = 0
    while (searchIndex < text.length) {
      const foundIndex = text.indexOf(point.pattern, searchIndex)
      if (foundIndex === -1) break
      matches.push({
        grammarId: point.id,
        startIndex: foundIndex,
        endIndex: foundIndex + point.pattern.length,
        point,
      })
      searchIndex = foundIndex + 1
    }
  }
  return matches.sort((a, b) => a.startIndex - b.startIndex)
}

export function mapGrammarToTokens(
  grammarMatches: GrammarMatch[],
  tokens: Array<{ id: string; text: string; index: number; isChinese: boolean }>,
): Map<string, GrammarMatch[]> {
  const tokenGrammarMap = new Map<string, GrammarMatch[]>()
  let charOffset = 0
  for (const token of tokens) {
    const tokenStart = charOffset
    const tokenEnd = charOffset + token.text.length
    const overlapping = grammarMatches.filter(
      (gm) => gm.startIndex < tokenEnd && gm.endIndex > tokenStart,
    )
    if (overlapping.length > 0) {
      tokenGrammarMap.set(token.id, overlapping)
    }
    charOffset = tokenEnd
  }
  return tokenGrammarMap
}
