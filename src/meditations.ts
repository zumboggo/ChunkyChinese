export interface MeditationPhrase {
  chinese: string
  gloss: string
}

export interface MeditationUnit {
  reference: string
  phrases: MeditationPhrase[]
  english: string
}

export interface MeditationPassage {
  id: string
  title: string
  chineseTitle: string
  subtitle: string
  theme: string
  units: MeditationUnit[]
}

type RawUnit = [reference: string, phraseLine: string, english: string]

function unit([reference, phraseLine, english]: RawUnit): MeditationUnit {
  return {
    reference,
    english,
    phrases: phraseLine.split('|').map((part) => {
      const separator = part.indexOf('=')
      if (separator < 1) throw new Error(`Invalid meditation phrase: ${part}`)
      return { chinese: part.slice(0, separator), gloss: part.slice(separator + 1) }
    }),
  }
}

function passage(
  id: string,
  title: string,
  chineseTitle: string,
  subtitle: string,
  theme: string,
  rows: RawUnit[],
): MeditationPassage {
  return { id, title, chineseTitle, subtitle, theme, units: rows.map(unit) }
}

export const MEDITATION_PASSAGES: MeditationPassage[] = [
  passage('psalm-23', 'Psalm 23', '诗篇二十三篇', 'The shepherd who stays near', '安静 · 信靠', [
    ['23:1', '耶和华=the LORD|是=is|我的=my|牧者=shepherd|我=I|不会缺少=will not lack', 'The LORD is my shepherd; I will lack nothing.'],
    ['23:2', '他=he|让我=makes me|躺下=lie down|在青草地上=in green pastures|领我=leads me|到安静的水边=beside quiet waters', 'He lets me rest in green pastures and leads me beside quiet waters.'],
    ['23:3', '他=he|使我的心=restores my inner life|重新有力量=gives strength again|为了自己的名=for his name|带我走=leads me|正直的路=right paths', 'He restores my life and, for his name, leads me on right paths.'],
    ['23:4', '即使=even if|我走过=I walk through|最黑暗的山谷=the darkest valley|我也不害怕=I am not afraid|因为你与我同在=because you are with me|你的杖和竿=your rod and staff|使我安心=comfort me', 'Even through the darkest valley I am not afraid, because you are with me; your rod and staff comfort me.'],
    ['23:5', '在敌人面前=before my enemies|你为我=you for me|摆好宴席=prepare a feast|用油膏我的头=anoint my head with oil|我的杯=my cup|满得流出来=overflows', 'Before my enemies you prepare a feast for me, anoint my head with oil, and fill my cup until it overflows.'],
    ['23:6', '我一生的日子=all the days of my life|恩惠和慈爱=goodness and faithful love|一定跟着我=will surely follow me|我要住在=I will dwell in|耶和华的家=the LORD’s house|直到永远=forever', 'Goodness and faithful love will surely follow me all my life, and I will dwell in the LORD’s house forever.'],
  ]),
  passage('psalm-1', 'Psalm 1', '诗篇第一篇', 'A life rooted beside living water', '选择 · 扎根', [
    ['1:1', '有福的人=blessed is the person|不跟从=does not follow|恶人的建议=the counsel of the wicked|不站在=does not stand on|罪人的道路=the path of sinners|不坐在=does not sit among|嘲笑上帝的人=those who mock God', 'Blessed is the person who does not follow wicked advice, join the path of sinners, or sit among those who mock God.'],
    ['1:2', '他喜爱=he delights in|耶和华的教导=the LORD’s teaching|白天晚上=day and night|安静思想=quietly reflects on|这些话=these words', 'He delights in the LORD’s teaching and reflects on it day and night.'],
    ['1:3', '他像一棵树=he is like a tree|栽在水边=planted beside water|按时结果=fruiting in season|叶子不枯干=whose leaves do not wither|他所做的事=what he does|得到成长=flourishes', 'He is like a tree planted beside water, bearing fruit in season; its leaves do not wither, and his work flourishes.'],
    ['1:4', '恶人不是这样=the wicked are not so|他们像糠=they are like chaff|被风吹走=blown away by wind', 'The wicked are not like this; they are like chaff blown away by the wind.'],
    ['1:5', '所以=therefore|审判来到时=when judgment comes|恶人站立不住=the wicked cannot stand|罪人也不能进入=sinners cannot enter|义人的群体=the community of the righteous', 'Therefore the wicked cannot stand when judgment comes, nor sinners enter the community of the righteous.'],
    ['1:6', '因为耶和华=for the LORD|看顾=knows and watches over|义人的道路=the way of the righteous|恶人的道路=the way of the wicked|却走向灭亡=leads to ruin', 'For the LORD watches over the way of the righteous, but the way of the wicked leads to ruin.'],
  ]),
  passage('john-15', 'John 15', '约翰福音十五章', 'Remain in the true vine', '连结 · 爱', [
    ['15:1–3', '耶稣说=Jesus says|我是真葡萄树=I am the true vine|我父亲=my Father|是园丁=is the gardener|他修剪=he prunes|结果子的枝子=fruit-bearing branches|使它结果更多=so they bear more fruit|我的话=my word|已经洁净你们=has already made you clean', 'Jesus says that he is the true vine and his Father is the gardener. The Father prunes fruitful branches so they bear more, and Jesus’ word has made his disciples clean.'],
    ['15:4–5', '要住在我里面=remain in me|我也住在你们里面=and I remain in you|枝子离开葡萄树=a branch apart from the vine|不能结果=cannot bear fruit|你们离开我=apart from me|什么也不能做=you can do nothing', 'Remain in me and I will remain in you. A branch cannot bear fruit apart from the vine, and apart from me you can do nothing.'],
    ['15:6–8', '不住在我里面的人=the one who does not remain in me|像丢掉的枝子=is like a discarded branch|若你们住在我里面=if you remain in me|我的话也在你们里面=and my words remain in you|可以祈求=you may ask|结果很多=bear much fruit|就荣耀我的父=this glorifies my Father', 'Those who do not remain are like discarded branches. If you remain in me and my words remain in you, ask; bearing much fruit glorifies my Father.'],
    ['15:9–11', '父怎样爱我=as the Father loves me|我也怎样爱你们=so I love you|要住在我的爱里=remain in my love|遵守我的命令=keep my commands|我的喜乐=my joy|会在你们里面=will be in you|你们的喜乐=your joy|就会完全=will be complete', 'As the Father has loved me, I have loved you. Remain in my love by keeping my commands, so that my joy may be in you and your joy may be complete.'],
    ['15:12–13', '我的命令=my command|就是=is this|你们要彼此相爱=love one another|像我爱你们一样=as I have loved you|人为朋友舍命=to lay down one’s life for friends|没有比这更大的爱=no love is greater than this', 'My command is this: love one another as I have loved you. There is no greater love than laying down one’s life for friends.'],
    ['15:14–17', '你们若照我的话去做=if you do what I command|就是我的朋友=you are my friends|我不再叫你们仆人=I no longer call you servants|我叫你们朋友=I call you friends|不是你们选择了我=you did not choose me|是我选择了你们=I chose you|去结长久的果子=go and bear lasting fruit', 'You are my friends when you do what I command. I no longer call you servants but friends. I chose you to go and bear lasting fruit.'],
    ['15:18–21', '世界若恨你们=if the world hates you|要知道=remember|它先恨了我=it hated me first|仆人不大过主人=a servant is not greater than the master|他们逼迫我=they persecuted me|也会逼迫你们=they will persecute you too|因为他们不认识父=because they do not know the Father', 'If the world hates you, remember that it hated me first. A servant is not greater than the master; persecution comes because they do not know the Father.'],
    ['15:22–25', '我已经来=I have come|向他们说话=and spoken to them|他们看见了=they have seen|却恨我和我的父=yet hated me and my Father|这应验了=thus was fulfilled|他们无故恨我=they hated me without cause', 'I came and spoke to them; they saw and still hated both me and my Father. This fulfilled the words: they hated me without cause.'],
    ['15:26–27', '帮助者来到时=when the Helper comes|就是从父而来的真理之灵=the Spirit of truth from the Father|他要为我作证=he will testify about me|你们也要作证=you also must testify|因为从起初=because from the beginning|你们就与我同在=you have been with me', 'When the Helper comes—the Spirit of truth from the Father—he will testify about me. You also will testify, because you have been with me from the beginning.'],
  ]),
  passage('colossians', 'Colossians', '歌罗西书', 'Christ at the centre of everything', '基督 · 更新', [
    ['1:1–8', '保罗写信=Paul writes|给忠心的信徒=to faithful believers|愿恩典和平安归给你们=grace and peace to you|我们感谢上帝=we thank God|因为你们信基督=for your faith in Christ|也爱所有圣徒=and love for all the saints|福音正在结果增长=the gospel is bearing fruit and growing', 'Paul greets the faithful believers with grace and peace, thanking God for their faith, love, and the gospel that is bearing fruit among them.'],
    ['1:9–14', '我们不断祷告=we continually pray|求你们明白上帝的旨意=that you understand God’s will|有属灵的智慧=with spiritual wisdom|活得配得主=live worthy of the Lord|在善事上结果=bear fruit in good work|他救我们脱离黑暗=he rescued us from darkness|带进爱子的国=and brought us into his Son’s kingdom', 'We pray that you understand God’s will, live worthy of the Lord, bear good fruit, and give thanks to the Father who rescued us from darkness into his Son’s kingdom.'],
    ['1:15–20', '基督是看不见之上帝的形象=Christ is the image of the invisible God|万有借着他被造=all things were created through him|万有靠他而存在=all things hold together in him|他是教会的头=he is the head of the church|上帝一切的丰盛=all God’s fullness|住在他里面=lives in him|借着十字架的血=through the blood of the cross|使万有与自己和好=reconciles all things to himself', 'Christ is the image of the invisible God. All things were created through him and hold together in him; God’s fullness dwells in him, and through the cross he reconciles all things.'],
    ['1:21–29', '你们从前远离上帝=you were once alienated from God|如今基督使你们和好=now Christ reconciled you|使你们圣洁无可指责=to present you holy and blameless|要在信心中站稳=continue firmly in faith|基督在你们里面=Christ in you|就是荣耀的盼望=is the hope of glory|我们传扬他=we proclaim him|使人成熟=to make people mature', 'Once alienated, you are now reconciled through Christ to become holy and blameless. Stand firm in faith: Christ in you is the hope of glory, whom we proclaim so everyone may mature.'],
    ['2:1–7', '我愿你们心里得鼓励=I want your hearts encouraged|在爱中连结=joined together in love|真正认识基督=truly know Christ|一切智慧知识的宝藏=all treasures of wisdom and knowledge|藏在他里面=are hidden in him|既然接受了基督=since you received Christ|就要在他里面生活=continue to live in him|扎根建立=rooted and built up', 'Be encouraged and joined in love, knowing Christ in whom all wisdom is hidden. Since you received him, live rooted and built up in him.'],
    ['2:8–15', '不要被空洞的思想掳走=do not be captured by empty ideas|上帝完整的丰盛=God’s full nature|住在基督里面=lives in Christ|你们在他里面也得完全=in him you are made complete|他赦免一切过犯=he forgave every trespass|把定罪的记录钉在十字架上=nailed the record of debt to the cross|胜过一切权势=triumphed over every power', 'Do not be captured by empty ideas. God’s fullness lives in Christ, and in him you are made complete; he forgave every trespass, nailed our debt to the cross, and defeated every power.'],
    ['2:16–23', '不要让人论断你们=let no one judge you|关于食物节期=about food or festivals|这些只是影子=these are only shadows|实体是基督=the reality is Christ|不要假装谦卑=do not embrace false humility|只照人的规条=following merely human rules|这些不能改变私欲=these cannot change selfish desire', 'Let no one judge you about food or festivals; they are shadows, while Christ is the reality. Human rules and false humility cannot transform selfish desire.'],
    ['3:1–4', '你们既与基督一同复活=since you were raised with Christ|要寻求上面的事=seek what is above|思想上面的事=set your mind above|你们的生命=your life|与基督一同藏在上帝里面=is hidden with Christ in God|基督显现时=when Christ appears|你们也要在荣耀中显现=you also will appear in glory', 'Since you were raised with Christ, seek and think about what is above. Your life is hidden with Christ in God, and you will appear with him in glory.'],
    ['3:5–11', '所以要除掉=therefore put away|淫乱污秽贪心=sexual sin, impurity, and greed|也要除掉愤怒恶意谎言=also anger, malice, and lies|脱去旧人=take off the old self|穿上新人=put on the new self|不断更新=continually renewed|基督是一切=Christ is all|也在一切之中=and is in all', 'Put away sexual sin, greed, anger, malice, and lies. Take off the old self and put on the new, continually renewed; Christ is all and is in all.'],
    ['3:12–17', '你们是上帝所爱的人=you are God’s beloved people|要穿上怜悯恩慈谦卑=clothe yourselves with compassion, kindness, and humility|彼此忍耐饶恕=bear with and forgive one another|最重要的是爱=above all put on love|让基督的平安作主=let Christ’s peace rule|让基督的话丰丰富富住在心里=let Christ’s word dwell richly|凡事奉主的名而做=do everything in the Lord’s name', 'As God’s beloved people, put on compassion, kindness, humility, patience, forgiveness, and above all love. Let Christ’s peace rule and his word dwell richly; do everything in his name.'],
    ['3:18–4:1', '在家庭和工作中=in family and work|要彼此尊重=respect one another|丈夫要爱妻子=husbands love your wives|儿女要听从父母=children obey your parents|父母不要使儿女灰心=parents do not discourage your children|做事要真诚=work sincerely|像为主而做=as working for the Lord|主人要公平=masters act justly', 'In family and work, live with mutual care: love, obey rightly, do not discourage, work sincerely as for the Lord, and treat others justly.'],
    ['4:2–6', '祷告要坚持=continue steadfastly in prayer|保持清醒感恩=stay watchful and thankful|求上帝为福音开门=ask God to open a door for the gospel|要有智慧地对待外人=walk wisely toward outsiders|珍惜时间=make good use of time|说话常有恩典=let your speech always be gracious|知道怎样回答每个人=know how to answer each person', 'Continue steadily in prayer, watchful and thankful. Ask for an open door for the gospel, live wisely, use time well, and speak graciously to each person.'],
    ['4:7–18', '忠心的同工=faithful coworkers|会告诉你们消息=will tell you the news|他们使人心得安慰=they encourage hearts|也彼此问安=they exchange greetings|请记念受捆锁的人=remember those in chains|愿恩典与你们同在=grace be with you', 'Paul closes by naming faithful coworkers who bring news and encouragement, sharing greetings, asking them to remember prisoners, and blessing them with grace.'],
  ]),
  passage('ephesians-1', 'Ephesians 1', '以弗所书第一章', 'Every spiritual blessing in Christ', '恩典 · 身份', [
    ['1:1–2', '写给忠心的人=to the faithful people|愿恩典和平安=may grace and peace|从上帝我们的父=from God our Father|和主耶稣基督=and the Lord Jesus Christ|归给你们=be yours', 'Grace and peace to the faithful, from God our Father and the Lord Jesus Christ.'],
    ['1:3–6', '愿颂赞归给上帝=praise be to God|他在基督里=in Christ he|赐给我们各样属灵福分=gave us every spiritual blessing|在创造世界以前=before the world was made|就选择了我们=he chose us|使我们圣洁=to make us holy|借着耶稣收养我们=adopting us through Jesus|这是他喜悦的旨意=this was his joyful will', 'Praise God, who in Christ gave us every spiritual blessing. Before creation he chose us to be holy and lovingly adopted us through Jesus according to his joyful will.'],
    ['1:7–10', '我们借着他的血得救赎=through his blood we have redemption|过犯得赦免=our sins are forgiven|这是丰富的恩典=this is rich grace|上帝使我们知道=God made known to us|他旨意的奥秘=the mystery of his will|到了合适的时候=at the right time|使天地万有在基督里合一=to unite all things in Christ', 'Through Christ’s blood we are redeemed and forgiven by rich grace. God revealed his plan for the right time: to unite everything in heaven and earth in Christ.'],
    ['1:11–14', '我们在基督里得了产业=in Christ we received an inheritance|照上帝的计划=according to God’s plan|使我们赞美他的荣耀=so we praise his glory|你们听见真理=you heard the truth|相信基督=believed in Christ|就受了圣灵的印记=and were sealed with the Holy Spirit|圣灵是产业的保证=the Spirit guarantees our inheritance', 'In Christ we received an inheritance according to God’s plan. Hearing the truth and believing, you were sealed with the Holy Spirit, the guarantee of what is to come.'],
    ['1:15–16', '我听见你们对主的信心=I heard of your faith in the Lord|和对众人的爱=and love for all people|就不断感谢上帝=so I continually thank God|在祷告中记念你们=remembering you in prayer', 'Because I heard of your faith in the Lord and love for all his people, I continually thank God and remember you in prayer.'],
    ['1:17–19', '愿荣耀的父=may the glorious Father|赐你们智慧启示的灵=give you the Spirit of wisdom and revelation|使你们认识他=so you know him|照亮心里的眼睛=enlighten the eyes of your heart|知道他的呼召带来的盼望=know the hope of his calling|和他能力的浩大=and the greatness of his power', 'May the glorious Father give you wisdom and revelation to know him, enlightening your heart to see the hope of his call and the greatness of his power.'],
    ['1:20–23', '这能力使基督从死里复活=this power raised Christ from the dead|让他坐在天上=seated him in heaven|高过一切权势=above every power|上帝使万有服在他脚下=God placed all things under his feet|使他作教会的头=and made him head of the church|教会是他的身体=the church is his body|充满他的丰盛=filled with his fullness', 'This power raised Christ and seated him above every authority. God placed all things under him and made him head of the church, his body, filled with his fullness.'],
  ]),
  passage('ephesians-2', 'Ephesians 2', '以弗所书第二章', 'Made alive and brought near', '新生 · 和好', [
    ['2:1–3', '你们从前死在过犯中=you were dead in wrongdoing|跟随世界的道路=following the world’s way|顺从自私的欲望=obeying selfish desires|我们都曾这样生活=we all once lived this way|本来在审判之下=and were under judgment', 'You were dead in wrongdoing, following the world and selfish desire. We all once lived this way and stood under judgment.'],
    ['2:4–7', '但是上帝满有怜悯=but God is rich in mercy|因着他的大爱=because of his great love|我们死在罪中时=while we were dead in sin|使我们与基督一同活过来=made us alive with Christ|你们得救是靠恩典=you are saved by grace|又使我们与基督一同坐在天上=and seated us with Christ in heaven|显明恩典的丰富=showing the riches of grace', 'But God, rich in mercy and great love, made us alive with Christ while we were dead in sin. By grace you are saved and seated with Christ, displaying God’s generous grace.'],
    ['2:8–10', '你们得救是靠恩典=you are saved by grace|借着信心=through faith|这不是出于自己=this is not from yourselves|而是上帝的礼物=it is God’s gift|不是靠行为=not earned by works|我们是上帝的作品=we are God’s workmanship|在基督里被造=created in Christ|为了行善=for good works', 'You are saved by grace through faith. It is God’s gift, not something earned. We are God’s workmanship, created in Christ to do the good works he prepared for us.'],
    ['2:11–13', '要记得你们从前=remember that formerly|与基督分离=you were separated from Christ|没有盼望=without hope|也没有上帝=and without God|但如今在基督里=but now in Christ|从前远离的人=you who were far away|靠他的血被带近=have been brought near by his blood', 'Remember that you were once separated from Christ, without hope and without God. Now in Christ, those who were far away have been brought near by his blood.'],
    ['2:14–18', '基督自己是我们的和平=Christ himself is our peace|他使双方成为一体=he made both groups one|拆掉隔断的墙=broke down the dividing wall|借着十字架=through the cross|使双方与上帝和好=reconciled both to God|也消灭敌意=put hostility to death|我们都借着同一位圣灵=we both through one Spirit|来到父面前=come to the Father', 'Christ himself is our peace. He made divided peoples one, broke down hostility through the cross, reconciled both to God, and gives all of us access to the Father by one Spirit.'],
    ['2:19–22', '所以你们不再是外人=so you are no longer outsiders|而是上帝家里的人=but members of God’s household|建造在使徒和先知的根基上=built on the apostles and prophets|基督是房角石=Christ is the cornerstone|整座房子在他里面连接=the whole building is joined in him|成为主的圣殿=becoming a holy temple|你们也一同被建造=you too are built together|成为上帝借圣灵居住的地方=a dwelling for God by the Spirit', 'You are no longer outsiders but members of God’s household, built together on Christ the cornerstone into a holy temple where God lives by the Spirit.'],
  ]),
  passage('galatians-5', 'Galatians 5', '加拉太书第五章', 'Freedom that becomes love', '自由 · 圣灵', [
    ['5:1–6', '基督释放了我们=Christ set us free|使我们得到自由=so we may live free|所以要站稳=therefore stand firm|不要再背负奴役的轭=do not take slavery’s yoke again|在基督里=in Christ|外在身份不能使人得益=outward status gives no advantage|真正重要的是=what matters is|借着爱表达的信心=faith working through love', 'Christ set us free to live in freedom, so stand firm and do not return to slavery. In Christ, outward status gives no advantage; what matters is faith working through love.'],
    ['5:7–12', '你们本来跑得很好=you were running well|谁拦阻你们听从真理=who stopped you obeying truth|一点酵=a little yeast|能影响整团面=affects the whole dough|扰乱你们的人=the one troubling you|必担当责任=will bear responsibility', 'You were running well; who stopped you from obeying truth? A little yeast affects the whole dough, and whoever troubles you will bear responsibility.'],
    ['5:13–15', '你们蒙召得自由=you were called to freedom|不要用自由满足自私=do not use freedom to serve selfishness|要用爱彼此服事=serve one another through love|全部律法=the whole law|总结在这句话=is summed up in this|要爱邻舍如同自己=love your neighbor as yourself|若彼此伤害=if you harm one another|要小心彼此毁灭=beware of destroying one another', 'You were called to freedom, not selfishness. Serve one another through love, for the whole law is summed up in loving your neighbor as yourself.'],
    ['5:16–18', '要顺着圣灵生活=walk by the Spirit|就不会满足自私的欲望=and you will not fulfill selfish desire|肉体和圣灵彼此相争=selfish nature and Spirit oppose each other|但若被圣灵引导=but if led by the Spirit|就不在律法的定罪下=you are not under the law’s condemnation', 'Walk by the Spirit and you will not fulfill selfish desire. The selfish nature and Spirit oppose each other, but those led by the Spirit are not under condemnation.'],
    ['5:19–21', '自私本性的行为=the works of selfish nature|很明显=are evident|淫乱污秽=sexual sin and impurity|偶像和邪术=idolatry and sorcery|仇恨嫉妒暴怒=hatred, jealousy, and rage|纷争分裂=conflict and division|醉酒放纵=drunkenness and excess|一直这样生活的人=those who keep living this way|不能承受上帝的国=will not inherit God’s kingdom', 'The works of selfish nature are clear: sexual sin, idolatry, hatred, jealousy, rage, division, drunkenness, and similar things. Those who persist in them will not inherit God’s kingdom.'],
    ['5:22–23', '圣灵的果子=the fruit of the Spirit|是爱=is love|喜乐=joy|和平=peace|忍耐=patience|恩慈=kindness|良善=goodness|信实=faithfulness|温柔=gentleness|节制=self-control|没有律法反对这些=no law opposes these', 'The fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control. No law stands against these.'],
    ['5:24–26', '属于基督的人=those who belong to Christ|已经把自私的欲望钉在十字架上=have crucified selfish passions|我们若靠圣灵活着=if we live by the Spirit|也要跟随圣灵行走=let us keep in step with the Spirit|不要自负=do not become conceited|不要彼此挑衅嫉妒=do not provoke or envy one another', 'Those who belong to Christ have crucified selfish passions. If we live by the Spirit, let us keep in step with the Spirit, without conceit, provocation, or envy.'],
  ]),
  passage('luke-15-prodigal', 'Luke 15:11–32', '路加福音十五章：浪子回头', 'The father who runs to welcome', '回家 · 恩典', [
    ['15:11–13', '一个人有两个儿子=a man had two sons|小儿子说=the younger said|请把属于我的产业给我=give me my share of the estate|父亲就分给他们=the father divided it between them|过了不久=soon afterward|小儿子去了远方=the younger went far away|在那里浪费了一切=and wasted everything there', 'A man had two sons. The younger asked for his share, went to a distant country, and wasted everything.'],
    ['15:14–16', '他花光以后=after he spent it all|那里发生严重饥荒=a severe famine came|他开始缺乏=he began to be in need|只好去喂猪=he went to feed pigs|他甚至想吃猪的食物=he even wanted the pigs’ food|却没有人给他=nobody gave him anything', 'After he spent everything, a severe famine came. In need, he fed pigs and longed even for their food, but no one gave him anything.'],
    ['15:17–19', '他醒悟过来=he came to his senses|说我父亲的工人都有足够食物=said my father’s workers have enough food|我却在这里饿死=but I am dying of hunger here|我要回到父亲那里=I will return to my father|承认我得罪了天和你=confess I sinned against heaven and you|我不配再称为你的儿子=I am no longer worthy to be called your son|把我当工人吧=treat me as a worker', 'He came to his senses: my father’s workers have food, while I starve. I will return, confess my sin, and ask to be treated as a worker.'],
    ['15:20–24', '他就起来回家=he got up and went home|离家还远=while still far away|父亲看见了他=his father saw him|充满怜悯=was filled with compassion|跑去拥抱亲吻他=ran, embraced, and kissed him|儿子承认自己的罪=the son confessed his sin|父亲却叫人拿最好的衣服=but the father called for the best robe|戴上戒指穿上鞋=put on a ring and sandals|一起庆祝=celebrate together|因为这儿子死而复活=for this son was dead and is alive again|失而又得=was lost and is found', 'He returned. While he was still far away, his compassionate father ran, embraced, and kissed him. The son confessed, but the father clothed and restored him and began a celebration: this son was dead and lives again, lost and now found.'],
    ['15:25–28', '大儿子从田里回来=the older son returned from the field|听见音乐跳舞=heard music and dancing|知道弟弟回来了=learned his brother had returned|就生气不肯进去=became angry and refused to enter|父亲出来劝他=his father came out and pleaded with him', 'The older son came from the field, heard the celebration, and learned that his brother had returned. Angry, he refused to enter, so his father came out and pleaded with him.'],
    ['15:29–30', '大儿子说=the older son said|我服事你这么多年=I served you all these years|从未违背命令=never disobeying|你从没给我庆祝=you never gave me a celebration|可是这个儿子浪费你的产业=but this son wasted your property|他回来时=when he returned|你却为他设宴=you prepared a feast for him', 'The older son protested: I served and obeyed for years without a celebration, but when this son who wasted your property returned, you made him a feast.'],
    ['15:31–32', '父亲说=the father said|孩子啊=my child|你一直和我在一起=you are always with me|我所有的都是你的=everything I have is yours|但我们应该欢喜庆祝=but we must rejoice and celebrate|因为你这个弟弟死而复活=for your brother was dead and lives again|失而又得=was lost and is found', 'The father said: My child, you are always with me, and everything I have is yours. But we must celebrate, because your brother was dead and lives again; he was lost and is found.'],
  ]),
]

export const MEDITATION_SOURCE_NOTE =
  'Fresh plain-language Chinese study adaptation. Scripture reference base: World English Bible (public domain).'
