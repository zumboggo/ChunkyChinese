# Seeded from ch05-sculptor-path.json — this file is now the source of truth, edit freely.
label story_ch05_sculptor_path:
    $ chunky_chapter_start("ch05-sculptor-path")
    jump node_ch05_001

label node_ch05_001:
    scene bg_workshop_before
    show spr_weed_sculptor_calculating at left
    char_lee_hyun "杂草为了一个关于月光的任务，先去找雕刻店的店主，又去酒馆找吟游诗人，后来还去找旧女仆。\n{en}{size=24}{color=#bcd0e8}For a quest about moonlight, Weed first visits the sculpture shop owner, then finds the bard at the tavern, and later visits the old maid.{/color}{/size}{/en}"
    show spr_weed_sculptor_annoyed at left
    char_lee_hyun "每个人都只说一点点，没有一个人把话一次说完。杂草本来就不是喜欢听故事的人。\n{en}{size=24}{color=#bcd0e8}Each person says only a little; no one tells the whole story at once. Weed has never been someone who enjoys listening to stories.{/color}{/size}{/en}"
    "他觉得故事太慢，也太远。故事不能马上变成钱，也不能马上让人变强。\n{en}{size=24}{color=#bcd0e8}He thinks stories are too slow and too distant. Stories cannot immediately become money, and cannot immediately make someone stronger.{/color}{/size}{/en}"
    menu:
        "杂草应该继续听这些慢吞吞的故事吗？\n{en}{size=24}{color=#bcd0e8}Should Weed keep listening to these slow stories?{/color}{/size}{/en}"
        "是的，耐心也是一种技能。\n{en}{size=24}{color=#bcd0e8}Yes, patience is also a skill.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_006
        "不，这是浪费时间。\n{en}{size=24}{color=#bcd0e8}No, this is a waste of time.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_005
        "假装在听，其实在想午饭吃什么。\n{en}{size=24}{color=#bcd0e8}Pretend to listen while thinking about lunch.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_005

label node_ch05_005:
    show spr_weed_sculptor_startled at left
    char_lee_hyun "杂草站起来准备离开。可是他忽然想到自己在训练场的日子。那时候，别人也觉得打稻草人没有用。可是正是那些看起来没用的时间，让他后来拿到了任务。\n{en}{size=24}{color=#bcd0e8}Weed stands up to leave. But he suddenly remembers his days in the training hall. Back then, others also thought hitting the scarecrow was useless. But it was exactly those seemingly useless hours that later earned him a quest.{/color}{/size}{/en}"
    jump node_ch05_006

label node_ch05_006:
    show spr_weed_sculptor_observing_side at left
    char_lee_hyun "想到这里，他又坐下来了。这一次，他不再只想\"快点结束\"，而是开始认真听，认真问，也认真把每个人的话放在一起想。\n{en}{size=24}{color=#bcd0e8}Thinking of this, he sits back down. This time, he no longer just wants to 'finish quickly.' He starts listening carefully, asking carefully, and piecing each person's words together.{/color}{/size}{/en}"
    "慢慢地，一条线在他眼前清楚起来。月光不是普通的名字，扎哈布也不是普通的雕刻家。那份约定、那个夜晚、那把像剑一样的雕刻刀，原来都连在一起。\n{en}{size=24}{color=#bcd0e8}Slowly, a thread becomes clear before his eyes. Moonlight is not just a name, and Zahab is not just a sculptor. That promise, that night, that carving knife shaped like a sword — they are all connected.{/color}{/size}{/en}"
    "以前的他也许会因为怕麻烦而转身就走，这一次他却没有。他终于明白，有些最好的东西，不会大声叫你过去。你要先安静下来，才会真的听见。\n{en}{size=24}{color=#bcd0e8}The old him might have turned away for fear of trouble, but this time he did not. He finally understands that some of the best things do not call out to you loudly. You must first quiet down before you can truly hear.{/color}{/size}{/en}"
    scene bg_town_square_day
    show spr_weed_sculptor_calculating at left
    "杂草终于走到了可以换职业的时候。很多人都很兴奋。有人想做骑士。有人想做魔法师。\n{en}{size=24}{color=#bcd0e8}Weed finally reaches the moment when he can change his class. Many people are excited. Some want to be knights. Some want to be mages.{/color}{/size}{/en}"
    "后来，他听见有人提到雕刻师。那个人一说完，旁边的人都笑了。有人说：\"那种职业能做什么？\"还有人说：\"选那个，不如什么都不选。\"\n{en}{size=24}{color=#bcd0e8}Then he hears someone mention the sculptor class. As soon as that person finishes, everyone nearby laughs. Someone says, 'What can that class even do?' Another says, 'Choosing that is worse than choosing nothing.'{/color}{/size}{/en}"
    menu:
        "杂草应该选什么职业？\n{en}{size=24}{color=#bcd0e8}What class should Weed choose?{/color}{/size}{/en}"
        "雕刻师。真正有用的东西，不一定写在表面上。\n{en}{size=24}{color=#bcd0e8}Sculptor. Truly useful things are not always written on the surface.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_013
        "骑士！看起来比较帅。\n{en}{size=24}{color=#bcd0e8}Knight! It looks cooler.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_012
        "魔法师！会放火比较厉害。\n{en}{size=24}{color=#bcd0e8}Mage! Throwing fire is more impressive.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_012

label node_ch05_012:
    show spr_weed_sculptor_determined at left
    char_lee_hyun "杂草差点选了更安全的路。可是他又想到一件事：真正有用的东西，不一定会在表面上写出来。如果每个人都觉得一个职业没用，也许只是因为他们只看今天。\n{en}{size=24}{color=#bcd0e8}Weed almost chose the safer path. But he thought of something: truly useful things are not always written on the surface. If everyone thinks a class is useless, maybe they are only looking at today.{/color}{/size}{/en}"
    jump node_ch05_013

label node_ch05_013:
    show spr_weed_sculptor_calculating at left
    char_lee_hyun "杂草慢慢走过去。周围的人还在把雕刻师当笑话。杂草听见了，可是没有回头。\n{en}{size=24}{color=#bcd0e8}Weed walks over slowly. The people around him are still laughing about the sculptor class. Weed hears them, but does not look back.{/color}{/size}{/en}"
    "他做出了自己的选择。那一刻，没有掌声。也没有人觉得他很聪明。可是杂草心里反而安静。\n{en}{size=24}{color=#bcd0e8}He makes his choice. At that moment, there is no applause. No one thinks he is smart. But Weed's heart is actually quiet.{/color}{/size}{/en}"
    char_lee_hyun "因为他终于不是照着别人的眼睛选路。他是在照着自己最清楚的地方走。\n{en}{size=24}{color=#bcd0e8}Because he is finally not choosing his path based on others' eyes. He is walking toward what he himself sees most clearly.{/color}{/size}{/en}"
    scene bg_workshop_before
    show spr_weed_sculptor_sculpting_focus at left
    "换了职业以后，杂草拿到了一把小小的雕刻刀。那把刀不像剑。也不像别人的高级武器。它很短，也很安静。\n{en}{size=24}{color=#bcd0e8}After changing his class, Weed receives a small carving knife. That knife is not like a sword. It is not like others' advanced weapons. It is short, and it is quiet.{/color}{/size}{/en}"
    menu:
        "这把小刀教会了杂草什么？\n{en}{size=24}{color=#bcd0e8}What did this small knife teach Weed?{/color}{/size}{/en}"
        "快没有用，乱也没有用。要先安静下来。\n{en}{size=24}{color=#bcd0e8}Speed is useless, chaos is useless. You must first quiet down.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_019
        "动作要快要狠！\n{en}{size=24}{color=#bcd0e8}Move fast and hard!{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_018
        "这刀太小了，能退货吗？\n{en}{size=24}{color=#bcd0e8}This knife is too small, can I return it?{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch05_018

label node_ch05_018:
    show spr_weed_sculptor_startled at left
    char_lee_hyun "不完全是。这把刀不是用来乱挥的。这种东西要小心。要轻轻地用。也要认真地看。\n{en}{size=24}{color=#bcd0e8}Not quite. This knife is not for swinging wildly. This kind of tool requires care. You must use it gently. And watch carefully.{/color}{/size}{/en}"
    jump node_ch05_019

label node_ch05_019:
    show spr_weed_sculptor_sculpting_focus at left
    char_lee_hyun "杂草第一次正式练雕刻的时候，面前只放着一块普通木头。第一刀下去的时候，他太快了。木头马上歪了一边。\n{en}{size=24}{color=#bcd0e8}When Weed formally practices carving for the first time, there is only an ordinary piece of wood in front of him. His first cut is too fast. The wood immediately veers to one side.{/color}{/size}{/en}"
    char_lee_hyun "他本来以为，有决心就够了。现在他才发现，手也要跟上。眼睛也要跟上。心也要跟上。\n{en}{size=24}{color=#bcd0e8}He had thought determination was enough. Now he discovers his hands must keep up. His eyes must keep up. His heart must keep up.{/color}{/size}{/en}"
    show spr_weed_sculptor_observing_side at left
    char_lee_hyun "杂草坐了一会儿，没有马上再下刀。他先看着那块木头。后来又看着自己手里的刀。最后，他轻轻地呼了一口气。这一次，他决定重新来。\n{en}{size=24}{color=#bcd0e8}Weed sits for a while, not cutting again right away. He first looks at the wood. Then at the knife in his hand. Finally, he lets out a quiet breath. This time, he decides to start over.{/color}{/size}{/en}"
    char_lee_hyun "不是为了快。也不是为了马上做出很大的东西。他只想先把一个小小的表情做对。一点一点地，木头终于没有再乱掉。\n{en}{size=24}{color=#bcd0e8}Not for speed. Not for making something big right away. He just wants to get one small expression right first. Bit by bit, the wood finally stops going wrong.{/color}{/size}{/en}"
    show spr_weed_sculptor_amused at left
    char_lee_hyun "做完以后，那东西还是很简单。也说不上多好看。可是杂草看了很久。这一次，他没有笑自己。\n{en}{size=24}{color=#bcd0e8}After finishing, the piece is still simple. It cannot be called beautiful. But Weed looks at it for a long time. This time, he does not laugh at himself.{/color}{/size}{/en}"
    "因为他第一次明白，不满意的时候，不一定要生气。有时候，你只要安静地再做一次。\n{en}{size=24}{color=#bcd0e8}Because for the first time he understands: when you are not satisfied, you do not have to be angry. Sometimes, you just quietly do it again.{/color}{/size}{/en}"
    scene bg_market_stalls
    show spr_weed_sculptor_neutral at left
    char_lee_hyun "杂草做出第一件还算像样的东西以后，把它带到了市场。市场里有很多摊位。也有很多人在大声说话。\n{en}{size=24}{color=#bcd0e8}After Weed makes his first decent piece, he brings it to the market. The market has many stalls. And many people talking loudly.{/color}{/size}{/en}"
    "他一开始站得很直。好像只要自己站得稳一点，别人就会觉得那东西也不错。可是第一个看见的人笑了。第二个人也笑了。\n{en}{size=24}{color=#bcd0e8}At first he stands very straight. As if standing steady would make others think his work is good too. But the first person who sees it laughs. The second person laughs too.{/color}{/size}{/en}"
    "后来还有人直接取笑他。那个人说：\"这个也有人要吗？\"\n{en}{size=24}{color=#bcd0e8}Later someone directly mocks him. That person says, 'Does anyone actually want this?'{/color}{/size}{/en}"
    show spr_weed_sculptor_exhausted at left
    "杂草听见以后，手一下子冷了。他差一点就想把东西收起来。\n{en}{size=24}{color=#bcd0e8}When Weed hears this, his hands go cold. He almost wants to pack up his things.{/color}{/size}{/en}"
    "在他心里，一个老想法又出来了。如果大部分人都笑，说明这东西一定没有用。\n{en}{size=24}{color=#bcd0e8}In his heart, an old thought surfaces again. If most people laugh, it must be useless.{/color}{/size}{/en}"
    show spr_weed_sculptor_startled at left
    show spr_old_man_approving at right
    "可是就在这时候，一个老人走到了他面前。老人没有笑。老人只是低头看了很久。\n{en}{size=24}{color=#bcd0e8}But right at that moment, an old man walks up to him. The old man does not laugh. The old man just looks down for a long time.{/color}{/size}{/en}"
    char_old_man "后来，老人轻轻点头。老人说：\"这东西还不成熟。可是做它的人很认真。\"\n{en}{size=24}{color=#bcd0e8}Then, the old man nods gently. The old man says, 'This piece is not yet mature. But the person who made it was very serious.'{/color}{/size}{/en}"
    show spr_weed_sculptor_amused at left
    "杂草听见这句话，心里忽然一静。因为老人看到的，不只是东西本身。老人也看见了他花在上面的时间。看见了他没有放弃的样子。\n{en}{size=24}{color=#bcd0e8}When Weed hears these words, his heart suddenly quiets. Because the old man saw more than just the piece itself. The old man also saw the time he spent on it. Saw the way he did not give up.{/color}{/size}{/en}"
    char_lee_hyun "杂草最后没有把那件东西丢掉。他反而把它收得更好。他终于明白，不是每个人的笑声都一样重要。只要有一个人真的看见了，你做的事就值得继续。\n{en}{size=24}{color=#bcd0e8}Weed does not throw that piece away. He actually keeps it even better. He finally understands that not everyone's laughter carries the same weight. As long as one person truly sees it, what you do is worth continuing.{/color}{/size}{/en}"
    "杂草选择了雕刻师的路，拿到了第一把雕刻刀，做出了第一件作品。市场里有人笑，但也有一个老人看见了他的认真。\n{en}{size=24}{color=#bcd0e8}Weed chose the sculptor's path, received his first carving knife, and made his first piece. Some people in the market laughed, but one old man saw his dedication.{/color}{/size}{/en}"
    $ chunky_chapter_complete("ch05-sculptor-path", "chose-sculptor")
    jump chunky_menu

