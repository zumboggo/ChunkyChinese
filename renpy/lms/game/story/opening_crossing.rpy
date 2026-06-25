# Seeded from opening-crossing.json — this file is now the source of truth, edit freely.
label story_opening_crossing:
    $ chunky_chapter_start("opening-crossing")
    jump node_opening_001

label node_opening_001:
    scene bg_family_room_late
    "李贤家里一直没有很多钱。\n{en}{size=24}{color=#bcd0e8}Lee Hyun's family has not had much money for a long time.{/color}{/size}{/en}"
    scene bg_gas_station_night
    "白天，他在加油站工作。\n{en}{size=24}{color=#bcd0e8}During the day, he works at a gas station.{/color}{/size}{/en}"
    scene bg_family_room_late
    "晚上，他回家以后，还要照顾奶奶和妹妹。\n{en}{size=24}{color=#bcd0e8}At night, after he goes home, he still has to take care of his grandma and younger sister.{/color}{/size}{/en}"
    "妹妹虽然不说，可是李贤看得出来，她每天都在担心家里的钱。\n{en}{size=24}{color=#bcd0e8}His younger sister does not say it, but Lee Hyun can tell that she worries about the family's money every day.{/color}{/size}{/en}"
    "李贤自己也很急，可是他不喜欢把“我很难”放在脸上。\n{en}{size=24}{color=#bcd0e8}Lee Hyun is worried too, but he does not like to show how hard things are on his face.{/color}{/size}{/en}"
    scene bg_account_sale_screen
    "他还有一个旧游戏账号。\n{en}{size=24}{color=#bcd0e8}He still has an old game account.{/color}{/size}{/en}"
    menu:
        "他为什么要卖掉旧账号？\n{en}{size=24}{color=#bcd0e8}Why does he need to sell the old account?{/color}{/size}{/en}"
        "为了家里的账单和生活费。\n{en}{size=24}{color=#bcd0e8}For family bills and living costs.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_008
        "因为他想证明自己很厉害。\n{en}{size=24}{color=#bcd0e8}Because he wants to prove he is impressive.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_009
        "因为赚钱很容易。\n{en}{size=24}{color=#bcd0e8}Because making money is easy.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_009

label node_opening_008:
    "对。旧账号不是回忆，是奶奶的药费和妹妹的学费。\n{en}{size=24}{color=#bcd0e8}Right. The old account is not nostalgia; it is medicine for Grandma and school money for his sister.{/color}{/size}{/en}"
    jump node_opening_010

label node_opening_009:
    "不完全对。李贤不卖骄傲，也不相信轻松的钱。他卖的是自己舍不得的时间。\n{en}{size=24}{color=#bcd0e8}Not quite. Lee Hyun is not selling pride, and he does not believe in easy money. He is selling time he did not want to lose.{/color}{/size}{/en}"
    jump node_opening_010

label node_opening_010:
    scene bg_real_apartment_night
    show spr_lee_hyun_real_sitting_exhausted at left
    "那天晚上，李贤比平常更晚回家。\n{en}{size=24}{color=#bcd0e8}That night, Lee Hyun comes home later than usual.{/color}{/size}{/en}"
    "他一开门，就先把手放到背后。\n{en}{size=24}{color=#bcd0e8}As soon as he opens the door, he puts his hands behind his back.{/color}{/size}{/en}"
    "妹妹马上看了他一眼。\n{en}{size=24}{color=#bcd0e8}His younger sister looks at him right away.{/color}{/size}{/en}"
    menu:
        "李贤要怎么回答？\n{en}{size=24}{color=#bcd0e8}How should Lee Hyun answer?{/color}{/size}{/en}"
        "笑一下，说自己只是和箱子打架。\n{en}{size=24}{color=#bcd0e8}Smile and say he only fought some boxes.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_014
        "安静一点，只说今天有点累。\n{en}{size=24}{color=#bcd0e8}Answer quietly that today was a little tiring.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_015

label node_opening_014:
    show spr_lee_hyun_real_forced_smile at right
    "李贤笑着说：“我回来了。”\n{en}{size=24}{color=#bcd0e8}Lee Hyun smiles and says, 'I'm home.'{/color}{/size}{/en}"
    jump node_opening_016

label node_opening_015:
    show spr_lee_hyun_real_sitting_exhausted at left
    "他把声音放轻，只说：“今天有点累，但没事。”\n{en}{size=24}{color=#bcd0e8}He softens his voice and says only, 'Today was a little tiring, but it's okay.'{/color}{/size}{/en}"
    jump node_opening_016

label node_opening_016:
    "她只问：“今天很累吗？”\n{en}{size=24}{color=#bcd0e8}She only asks, 'Was today very tiring?'{/color}{/size}{/en}"
    "李贤还是说：“没事。”\n{en}{size=24}{color=#bcd0e8}Lee Hyun still says, 'It's okay.'{/color}{/size}{/en}"
    menu:
        "旧头盔亮起来，皇家之路在黑暗里等他。\n{en}{size=24}{color=#bcd0e8}The old headset glows. Royal Road waits for him in the dark.{/color}{/size}{/en}"
        "先停一下，记住现实的重量。\n{en}{size=24}{color=#bcd0e8}Pause and remember the weight of reality.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_019
        "直接进入。不能浪费时间。\n{en}{size=24}{color=#bcd0e8}Enter directly. No time can be wasted.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_opening_020

label node_opening_019:
    scene bg_royal_road_login
    "他停了一秒。不是因为害怕，而是因为身后还有家人。\n{en}{size=24}{color=#bcd0e8}He pauses for one second. Not because he is afraid, but because his family is behind him.{/color}{/size}{/en}"
    jump node_opening_021

label node_opening_020:
    scene bg_royal_road_login
    "他立刻按下确认。穷人的犹豫，也要算成本。\n{en}{size=24}{color=#bcd0e8}He confirms at once. Even hesitation has a cost when you are poor.{/color}{/size}{/en}"
    jump node_opening_021

label node_opening_021:
    scene cg_lee_hyun_to_weed_transition
    "黑暗退后，光向前铺开。李贤在光里睁开眼，名字变成了杂草。\n{en}{size=24}{color=#bcd0e8}Darkness falls back and light spreads ahead. Lee Hyun opens his eyes in the light, and his name becomes Weed.{/color}{/size}{/en}"
    scene bg_training_yard_dawn
    show spr_weed_sculptor_startled at right
    char_lee_hyun "杂草进入皇家之路以后，没有先去找热闹的地方，也没有急着去做简单任务。\n{en}{size=24}{color=#bcd0e8}After Weed enters Royal Road, he does not first look for lively places and does not hurry to do easy quests.{/color}{/size}{/en}"
    show spr_weed_sculptor_calculating at left
    char_lee_hyun "他一到塞拉堡城，就先走进训练场。\n{en}{size=24}{color=#bcd0e8}As soon as he arrives in Serabourg, he first walks into the training hall.{/color}{/size}{/en}"
    "杂草站在训练场前，身上没有钱，也没有名声，但他知道第一件事：先变强。\n{en}{size=24}{color=#bcd0e8}Weed stands before the training yard with no money and no reputation, but he knows the first rule: become stronger first.{/color}{/size}{/en}"
    $ chunky_chapter_complete("opening-crossing", "entered-world")
    jump chunky_menu

