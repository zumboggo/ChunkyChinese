# Seeded from ch02-tired-hands.json — this file is now the source of truth, edit freely.
label story_ch02_tired_hands:
    $ chunky_chapter_start("ch02-tired-hands")
    jump node_ch02_001

label node_ch02_001:
    scene bg_real_apartment_night
    show spr_lee_hyun_real_sitting_exhausted at left
    "那天晚上，李贤比平常更晚回家。\n{en}{size=24}{color=#bcd0e8}That night, Lee Hyun comes home later than usual.{/color}{/size}{/en}"
    "他一开门，就先把手放到背后。\n{en}{size=24}{color=#bcd0e8}As soon as he opens the door, he puts his hands behind his back.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_neutral at right
    "妹妹马上看了他一眼。\n{en}{size=24}{color=#bcd0e8}His sister looks at him right away.{/color}{/size}{/en}"
    char_lee_hyun_sister "她只问：\"今天很累吗？\"\n{en}{size=24}{color=#bcd0e8}She only asks, 'Was today very tiring?'{/color}{/size}{/en}"
    menu:
        "李贤要怎么回答？\n{en}{size=24}{color=#bcd0e8}How should Lee Hyun answer?{/color}{/size}{/en}"
        "笑一下，说自己只是和箱子打架。\n{en}{size=24}{color=#bcd0e8}Smile and say he only fought some boxes.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch02_006
        "安静一点，只说今天有点累。\n{en}{size=24}{color=#bcd0e8}Answer quietly that today was a little tiring.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch02_007
        "说\"没事\"，然后快点回房间。\n{en}{size=24}{color=#bcd0e8}Say 'It's nothing' and hurry back to his room.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch02_007

label node_ch02_006:
    show spr_lee_hyun_real_forced_smile at left
    char_lee_hyun "李贤笑着说：\"没事，今天只是和几个箱子打架，我赢了。\"\n{en}{size=24}{color=#bcd0e8}Lee Hyun smiles and says, 'It's nothing. I just fought some boxes today. I won.'{/color}{/size}{/en}"
    jump node_ch02_008

label node_ch02_007:
    char_lee_hyun "他把声音放轻，只说：\"今天有点累，但没事。\"\n{en}{size=24}{color=#bcd0e8}He softens his voice and says only, 'Today was a little tiring, but it's okay.'{/color}{/size}{/en}"
    jump node_ch02_008

label node_ch02_008:
    "其实他今天搬了很多东西。手上有两处小小的擦伤。右手还有一个新的伤口。\n{en}{size=24}{color=#bcd0e8}In fact, he carried many things today. There are two small scrapes on his hands. His right hand has a fresh wound.{/color}{/size}{/en}"
    "在他心里，家里已经很难了。如果连他也看起来很累，妹妹一定会更怕。\n{en}{size=24}{color=#bcd0e8}In his heart, things are already hard enough at home. If even he looks tired, his sister will be even more afraid.{/color}{/size}{/en}"
    "所以他一直有一个习惯。不管多痛，都先说\"没事\"。\n{en}{size=24}{color=#bcd0e8}So he has always had a habit. No matter how much it hurts, he always says 'It's nothing' first.{/color}{/size}{/en}"
    "妹妹去拿水的时候，李贤想快点回房间。可是他一转身，手还是碰到了门边。\n{en}{size=24}{color=#bcd0e8}While his sister goes to get water, Lee Hyun tries to hurry back to his room. But as he turns, his hand brushes against the door frame.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_worried at right
    "他马上吸了一口气。妹妹听见声音，立刻走了过来。\n{en}{size=24}{color=#bcd0e8}He gasps at once. His sister hears the sound and immediately walks over.{/color}{/size}{/en}"
    "她看见他的手，脸一下子白了。\n{en}{size=24}{color=#bcd0e8}She sees his hands, and her face turns pale at once.{/color}{/size}{/en}"
    char_lee_hyun_sister "她小声说：\"哥哥，你为什么不早说？\"\n{en}{size=24}{color=#bcd0e8}She whispers, 'Why didn't you tell me earlier?'{/color}{/size}{/en}"
    "李贤本来还想笑一下。可是他看见妹妹的眼睛，突然说不出话。\n{en}{size=24}{color=#bcd0e8}Lee Hyun wanted to smile. But when he sees his sister's eyes, he suddenly cannot speak.{/color}{/size}{/en}"
    "他第一次想到，也许自己一直这样逞强，并没有让妹妹放心。也许妹妹最怕的，不是伤口。妹妹最怕的是，哥哥什么都不说。\n{en}{size=24}{color=#bcd0e8}For the first time, he thinks that maybe his constant pretense of strength has not reassured her. Maybe what she fears most is not the wounds. What she fears most is that her brother says nothing at all.{/color}{/size}{/en}"
    show spr_lee_hyun_real_sitting_exhausted at left
    "李贤慢慢坐下，把手伸出来。他说：\"今天真的有一点痛。\"\n{en}{size=24}{color=#bcd0e8}Lee Hyun slowly sits down and holds out his hands. He says, 'Today it really does hurt a little.'{/color}{/size}{/en}"
    show spr_lee_hyun_sister_neutral at right
    "妹妹没有哭。她只是去拿药，又认真帮他包扎。\n{en}{size=24}{color=#bcd0e8}His sister does not cry. She just goes to get medicine and carefully bandages his hands.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_relieved at right
    char_lee_hyun_sister "包扎完以后，她说：\"下次早点告诉我。\"\n{en}{size=24}{color=#bcd0e8}After the bandaging, she says, 'Tell me earlier next time.'{/color}{/size}{/en}"
    "李贤点了点头。那天晚上，他还是很累。可是他的心比平常更安静。\n{en}{size=24}{color=#bcd0e8}Lee Hyun nods. That night, he is still very tired. But his heart is quieter than usual.{/color}{/size}{/en}"
    "他终于明白，保护家里的人，不一定是什么都自己藏起来。\n{en}{size=24}{color=#bcd0e8}He finally understands that protecting your family does not always mean hiding everything by yourself.{/color}{/size}{/en}"
    "妹妹看见了李贤的手，也看见了他一直藏起来的痛。李贤学会了一件事：保护家人，不一定要什么都自己扛。\n{en}{size=24}{color=#bcd0e8}Sister saw Lee Hyun's hands and the pain he had been hiding. Lee Hyun learned something: protecting family does not mean carrying everything alone.{/color}{/size}{/en}"
    $ chunky_chapter_complete("ch02-tired-hands", "sister-helped")
    jump chunky_menu

