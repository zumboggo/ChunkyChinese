# Seeded from ch04-last-student.json — this file is now the source of truth, edit freely.
label story_ch04_last_student:
    $ chunky_chapter_start("ch04-last-student")
    jump node_ch04_001

label node_ch04_001:
    scene bg_training_hall
    show spr_weed_sculptor_determined at left
    "那一天，训练场里的人一个一个走了。有人去吃饭，有人去接任务。最后只剩下杂草。\n{en}{size=24}{color=#bcd0e8}That day, people leave the training hall one by one. Some go to eat, some go to take quests. In the end, only Weed remains.{/color}{/size}{/en}"
    char_lee_hyun "他站在木头人前面，反复练同一个动作。可是练了很久，还是不对。木剑总是偏一点。脚也总是慢半步。\n{en}{size=24}{color=#bcd0e8}He stands in front of the wooden dummy, practicing the same motion over and over. But after a long time, it is still not right. The sword always drifts a little. His feet are always half a step slow.{/color}{/size}{/en}"
    show spr_weed_sculptor_exhausted at left
    show spr_geomchi_default at right
    "教官在远处看着，没有马上过来。杂草心里很急。他知道自己做得不对。可是他不想问。\n{en}{size=24}{color=#bcd0e8}The instructor watches from a distance, not coming over right away. Weed is anxious. He knows he is doing it wrong. But he does not want to ask.{/color}{/size}{/en}"
    menu:
        "杂草应该问教官吗？\n{en}{size=24}{color=#bcd0e8}Should Weed ask the instructor for help?{/color}{/size}{/en}"
        "是的，问别人不丢人。\n{en}{size=24}{color=#bcd0e8}Yes, asking for help is not shameful.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch04_006
        "不，我自己能搞定。\n{en}{size=24}{color=#bcd0e8}No, I can figure it out myself.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch04_005
        "我看看有没有攻略视频。\n{en}{size=24}{color=#bcd0e8}Let me check if there are tutorial videos.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch04_005

label node_ch04_005:
    char_lee_hyun "杂草只是一直重复。一次不行，就再来一次。十次不行，就再来十次。可是越这样，他的身体越硬。心里也越烦。\n{en}{size=24}{color=#bcd0e8}Weed just keeps repeating. Once fails, try again. Ten times fail, try ten more. But the more he does this, the stiffer his body becomes. And the more frustrated his heart.{/color}{/size}{/en}"
    jump node_ch04_007

label node_ch04_006:
    char_lee_hyun "杂草心里想：如果连这种事都要问，说明自己太弱。可是他又想：如果一直错下去，不是更弱吗？\n{en}{size=24}{color=#bcd0e8}Weed thinks: if I have to ask about even this, it means I am too weak. But then he thinks: if I keep doing it wrong, isn't that even weaker?{/color}{/size}{/en}"
    jump node_ch04_007

label node_ch04_007:
    show spr_geomchi_commanding at right
    "后来，教官终于走过来。\n{en}{size=24}{color=#bcd0e8}Finally, the instructor walks over.{/color}{/size}{/en}"
    char_geomchi "教官没有笑他。教官只是说：\"你的手太紧了。\"\n{en}{size=24}{color=#bcd0e8}The instructor does not laugh at him. The instructor simply says, 'Your hands are too tight.'{/color}{/size}{/en}"
    show spr_weed_sculptor_startled at left
    "杂草听见以后，脸一下子热了。因为这句话很简单。简单得像他早一点开口就能得到。\n{en}{size=24}{color=#bcd0e8}When Weed hears this, his face flushes. Because this advice is so simple. So simple he could have gotten it if he had spoken up earlier.{/color}{/size}{/en}"
    char_geomchi "教官又提醒他说：\"不是一直用力，就会更强。合适的时候放松，动作才会对。\"\n{en}{size=24}{color=#bcd0e8}The instructor adds, 'Using force all the time does not make you stronger. Relax at the right moment, and the movement will be correct.'{/color}{/size}{/en}"
    show spr_weed_sculptor_calculating at left
    char_lee_hyun "杂草这一次没有装作没听见。他低声问：\"那我应该先看哪里？\"\n{en}{size=24}{color=#bcd0e8}This time Weed does not pretend he did not hear. He asks quietly, 'Then where should I look first?'{/color}{/size}{/en}"
    "教官指了指他的手，又指了指他的脚。杂草再练一次的时候，真的比刚才顺了很多。\n{en}{size=24}{color=#bcd0e8}The instructor points to his hands, then to his feet. When Weed tries again, it really goes much smoother than before.{/color}{/size}{/en}"
    "那一刻他才明白，自己刚才不是在坚持。自己刚才只是不肯承认，别人也能帮他变强。\n{en}{size=24}{color=#bcd0e8}At that moment he finally understands: he was not persevering. He was just refusing to admit that others could help him become stronger.{/color}{/size}{/en}"
    show spr_weed_sculptor_amused at left
    char_lee_hyun "训练场里还是只有他一个人。可是这一次，他不再觉得一个人就一定要什么都自己扛。\n{en}{size=24}{color=#bcd0e8}The training hall still has only him. But this time, he no longer feels that being alone means having to carry everything by himself.{/color}{/size}{/en}"
    "杂草在训练场里一个人练到很晚，直到他终于开口问教官。他学会了：一个人不一定要什么都自己扛。\n{en}{size=24}{color=#bcd0e8}Weed practiced alone in the training hall until he finally asked the instructor. He learned: being alone does not mean carrying everything by yourself.{/color}{/size}{/en}"
    $ chunky_chapter_complete("ch04-last-student", "learned-humility")
    jump chunky_menu

