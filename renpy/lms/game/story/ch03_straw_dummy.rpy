# Seeded from ch03-straw-dummy.json — this file is now the source of truth, edit freely.
label story_ch03_straw_dummy:
    $ chunky_chapter_start("ch03-straw-dummy")
    jump node_ch03_001

label node_ch03_001:
    scene bg_training_yard_dawn
    show spr_weed_sculptor_calculating at left
    char_lee_hyun "杂草进入皇家之路以后，没有先去找热闹的地方，也没有急着去做简单任务。\n{en}{size=24}{color=#bcd0e8}After Weed enters Royal Road, he does not first look for lively places and does not hurry to do easy quests.{/color}{/size}{/en}"
    scene bg_training_hall
    char_lee_hyun "他一到塞拉堡城，就先走进训练场。别的新手看了一圈，打几下训练稻草人，很快就走了。\n{en}{size=24}{color=#bcd0e8}As soon as he arrives in Serabourg, he walks into the training hall. Other newcomers look around, hit the training scarecrow a few times, and quickly leave.{/color}{/size}{/en}"
    "有人去市场，有人去找队友，还有人笑杂草。他们问：\"你一直打这个木头人，要打到什么时候？\"\n{en}{size=24}{color=#bcd0e8}Some go to the market, some look for teammates, and some laugh at Weed. They ask, 'How long are you going to keep hitting that wooden dummy?'{/color}{/size}{/en}"
    show spr_weed_sculptor_determined at left
    char_lee_hyun "杂草没有回话，只是继续拿着木剑，一下一下地打。\n{en}{size=24}{color=#bcd0e8}Weed does not reply. He just keeps holding the wooden sword, striking again and again.{/color}{/size}{/en}"
    menu:
        "杂草为什么要一直打稻草人？\n{en}{size=24}{color=#bcd0e8}Why does Weed keep hitting the scarecrow?{/color}{/size}{/en}"
        "因为他很生气，想打东西。\n{en}{size=24}{color=#bcd0e8}Because he is angry and wants to hit something.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_006
        "因为他想变强，比别人更苦、更久。\n{en}{size=24}{color=#bcd0e8}Because he wants to become stronger, endure more and longer than others.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_007
        "因为他没有别的事做。\n{en}{size=24}{color=#bcd0e8}Because he has nothing else to do.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_006

label node_ch03_006:
    "不完全是。杂草心里一直有一个想法：自己开始得太晚，钱也不多，运气也不会特别好。如果不比别人更苦、更久、更能忍，以后一定还是弱的人。\n{en}{size=24}{color=#bcd0e8}Not quite. Weed has always had a thought: he started too late, does not have much money, and will not have special luck. If he does not endure more, longer, and harder than others, he will surely remain weak.{/color}{/size}{/en}"
    jump node_ch03_008

label node_ch03_007:
    "对。在杂草心里，这很重要。他一直有一个想法：自己开始得太晚，钱也不多。如果不比别人更苦、更久、更能忍，以后一定还是弱的人。\n{en}{size=24}{color=#bcd0e8}Right. In Weed's heart, this is very important. He has always thought: he started too late and does not have much money. If he does not endure more, longer, and harder than others, he will surely remain weak.{/color}{/size}{/en}"
    jump node_ch03_008

label node_ch03_008:
    "所以他不肯停。手痛了，他继续。肚子饿了，他继续。天黑了，他还是继续。\n{en}{size=24}{color=#bcd0e8}So he refuses to stop. His hands hurt, he continues. He is hungry, he continues. It gets dark, he still continues.{/color}{/size}{/en}"
    show spr_weed_sculptor_exhausted at left
    "可是打得越久，他心里越乱。他开始想：\"我是不是太慢了？\"他又想：\"我是不是再练也没有用？\"\n{en}{size=24}{color=#bcd0e8}But the longer he strikes, the more chaotic his mind becomes. He starts thinking, 'Am I too slow?' He also thinks, 'Is practicing more even useful?'{/color}{/size}{/en}"
    show spr_weed_sculptor_exhausted at left
    show spr_geomchi_default at right
    "教官一直在旁边看。\n{en}{size=24}{color=#bcd0e8}The instructor has been watching from the side.{/color}{/size}{/en}"
    show spr_geomchi_commanding at right
    char_geomchi "教官没有马上说话。只在杂草快没有力气的时候，教官问了一句：\"你是在练，还是只是在生气？\"\n{en}{size=24}{color=#bcd0e8}The instructor does not speak right away. Only when Weed is nearly out of strength, the instructor asks, 'Are you practicing, or just being angry?'{/color}{/size}{/en}"
    menu:
        "教官的话是什么意思？\n{en}{size=24}{color=#bcd0e8}What did the instructor mean?{/color}{/size}{/en}"
        "我需要先想清楚再打，而不是乱打。\n{en}{size=24}{color=#bcd0e8}I need to think before I strike, not just hit randomly.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_013
        "我需要打更用力！\n{en}{size=24}{color=#bcd0e8}I need to hit harder!{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_014
        "我需要先睡一觉。\n{en}{size=24}{color=#bcd0e8}I need to take a nap first.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch03_014

label node_ch03_013:
    show spr_weed_sculptor_startled at left
    "杂草第一次停下来，看着手里的木剑，又看着前面的稻草人。他突然明白，一直乱打，不等于真正变强。\n{en}{size=24}{color=#bcd0e8}Weed stops for the first time. He looks at the wooden sword in his hand, then at the scarecrow ahead. He suddenly understands that hitting randomly does not truly make you stronger.{/color}{/size}{/en}"
    jump node_ch03_015

label node_ch03_014:
    show spr_weed_sculptor_startled at left
    "不完全是。杂草停下来，看着手里的木剑，突然明白，他不是在跟稻草人练，而是在跟自己心里的怕打。\n{en}{size=24}{color=#bcd0e8}Not quite. Weed stops and looks at the wooden sword. He suddenly understands: he was not practicing against the scarecrow. He was fighting against his own fear.{/color}{/size}{/en}"
    jump node_ch03_015

label node_ch03_015:
    show spr_weed_sculptor_observing_side at left
    char_lee_hyun "从那以后，杂草还是继续练，可是方法变了。他先看，再想，然后再打。每一下都更稳，也更安静。\n{en}{size=24}{color=#bcd0e8}From then on, Weed still continues practicing, but his method changes. He watches first, thinks, and then strikes. Each blow is steadier and quieter.{/color}{/size}{/en}"
    show spr_geomchi_commanding at right
    "没过多久，教官走过来，把一个特别任务交给了他。\n{en}{size=24}{color=#bcd0e8}Not long after, the instructor walks over and gives him a special quest.{/color}{/size}{/en}"
    "那一刻，杂草才知道，真正让人变强的，不只是吃苦，也是愿意改自己。\n{en}{size=24}{color=#bcd0e8}At that moment, Weed learns that what truly makes you stronger is not just enduring hardship, but also being willing to change yourself.{/color}{/size}{/en}"
    "杂草在训练场打了很久的稻草人，直到教官问他：你是在练，还是只是在生气？他学会了先看、先想、再动手。\n{en}{size=24}{color=#bcd0e8}Weed hit the training scarecrow for a long time, until the instructor asked: are you practicing, or just angry? He learned to watch first, think first, then act.{/color}{/size}{/en}"
    $ chunky_chapter_complete("ch03-straw-dummy", "trained-wisely")
    jump chunky_menu

