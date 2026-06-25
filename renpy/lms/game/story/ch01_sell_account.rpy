# Seeded from ch01-sell-account.json — this file is now the source of truth, edit freely.
label story_ch01_sell_account:
    $ chunky_chapter_start("ch01-sell-account")
    jump node_ch01_001

label node_ch01_001:
    scene bg_family_room_late
    "李贤家里一直没有很多钱。\n{en}{size=24}{color=#bcd0e8}Lee Hyun's family has never had much money.{/color}{/size}{/en}"
    scene bg_gas_station_night
    "白天，他在加油站工作。晚上，他回家以后，还要照顾奶奶和妹妹。\n{en}{size=24}{color=#bcd0e8}During the day he works at a gas station. At night, after he comes home, he still has to take care of Grandma and his younger sister.{/color}{/size}{/en}"
    scene bg_family_room_late
    show spr_nainai_sick at right
    "奶奶身体不好，最近常常生病。\n{en}{size=24}{color=#bcd0e8}Grandma's health is poor, and she has been sick often recently.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_worried at left
    "妹妹虽然不说，可是李贤看得出来，她每天都在担心家里的钱。\n{en}{size=24}{color=#bcd0e8}His sister does not say it, but Lee Hyun can tell she worries about the family's money every day.{/color}{/size}{/en}"
    show spr_lee_hyun_real_sitting_exhausted at left
    "李贤自己也很急，可是他不喜欢把\"我很难\"放在脸上。\n{en}{size=24}{color=#bcd0e8}Lee Hyun is worried too, but he does not like to show how hard things are on his face.{/color}{/size}{/en}"
    scene bg_account_sale_screen
    "他还有一个旧游戏账号。那个账号陪了他很久。\n{en}{size=24}{color=#bcd0e8}He still has an old game account. That account has been with him for a long time.{/color}{/size}{/en}"
    "以前他最难过的时候，他常常打开电脑，看着那个账号，心里会安静一点。\n{en}{size=24}{color=#bcd0e8}When he was at his lowest, he would often turn on the computer and look at that account, and his heart would quiet a little.{/color}{/size}{/en}"
    menu:
        "那个旧账号对李贤来说意味着什么？\n{en}{size=24}{color=#bcd0e8}What does the old account mean to Lee Hyun?{/color}{/size}{/en}"
        "是他最后一点希望。\n{en}{size=24}{color=#bcd0e8}It is his last bit of hope.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch01_009
        "只是一个游戏，没什么特别的。\n{en}{size=24}{color=#bcd0e8}Just a game, nothing special.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch01_010
        "浪费时间的东西，早该删了。\n{en}{size=24}{color=#bcd0e8}A waste of time, should have deleted it long ago.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_ch01_010

label node_ch01_009:
    "对。在他心里，那个账号不只是钱，也是他最后一点希望。他一直告诉自己，只要这个账号还在，他就不算什么都没有。\n{en}{size=24}{color=#bcd0e8}Right. In his heart, that account is not just money; it is his last hope. He has always told himself that as long as this account exists, he has not lost everything.{/color}{/size}{/en}"
    jump node_ch01_011

label node_ch01_010:
    "不完全是这样。那个账号不只是游戏，也不只是钱。它是李贤告诉自己\"我还没有输\"的方式。\n{en}{size=24}{color=#bcd0e8}Not quite. That account is not just a game, and not just money. It is Lee Hyun's way of telling himself, 'I have not lost yet.'{/color}{/size}{/en}"
    jump node_ch01_011

label node_ch01_011:
    scene bg_family_room_late
    show spr_nainai_sick at right
    "可是有一天晚上，奶奶又病了。\n{en}{size=24}{color=#bcd0e8}But one night, Grandma gets sick again.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_worried at left
    char_lee_hyun_sister "妹妹小声问他：\"明天买药的钱在哪里？\"\n{en}{size=24}{color=#bcd0e8}His sister whispers to him, 'Where is the money for tomorrow's medicine?'{/color}{/size}{/en}"
    show spr_lee_hyun_real_sitting_exhausted at left
    "李贤没有马上回答。他看着桌子上的卡，又看着房间里的奶奶，心里很乱。\n{en}{size=24}{color=#bcd0e8}Lee Hyun does not answer right away. He looks at the card on the table, then at Grandma in the other room. His heart is in turmoil.{/color}{/size}{/en}"
    "一个声音说：\"不能卖。卖了以后，你就真的什么都没有了。\"\n{en}{size=24}{color=#bcd0e8}One voice says, 'You cannot sell it. After you sell it, you will truly have nothing.'{/color}{/size}{/en}"
    "另一个声音说：\"如果不卖，家里怎么办？\"\n{en}{size=24}{color=#bcd0e8}Another voice says, 'If you do not sell, what will happen to the family?'{/color}{/size}{/en}"
    "他坐了很久，才慢慢明白，自己一直舍不得的不是游戏本身，而是那个\"我还没有输\"的感觉。\n{en}{size=24}{color=#bcd0e8}He sits for a long time before slowly understanding: what he has been reluctant to let go of is not the game itself, but the feeling of 'I have not lost yet.'{/color}{/size}{/en}"
    scene bg_account_sale_screen
    "第二天，他去把旧账号卖了，把钱带回家。\n{en}{size=24}{color=#bcd0e8}The next day, he sells the old account and brings the money home.{/color}{/size}{/en}"
    scene bg_family_room_late
    show spr_nainai_gentle_smile at right
    "奶奶先愣了一下，然后轻轻笑了。\n{en}{size=24}{color=#bcd0e8}Grandma is stunned for a moment, then smiles gently.{/color}{/size}{/en}"
    show spr_lee_hyun_sister_relieved at left
    "妹妹也终于松了一口气。\n{en}{size=24}{color=#bcd0e8}His sister finally breathes a sigh of relief.{/color}{/size}{/en}"
    show spr_lee_hyun_real_forced_smile at left
    "李贤心里还是有点空，可是那种空没有让他更怕。相反，他第一次觉得自己更稳了。\n{en}{size=24}{color=#bcd0e8}Lee Hyun's heart still feels a little empty, but that emptiness does not scare him more. On the contrary, for the first time he feels more steady.{/color}{/size}{/en}"
    "他知道，真正让人安心的，不是手里留着什么东西，而是自己愿意为了家里去做对的事。\n{en}{size=24}{color=#bcd0e8}He knows that what truly brings peace is not holding on to things, but being willing to do the right thing for your family.{/color}{/size}{/en}"
    "李贤卖掉了旧游戏账号，换来奶奶的药费。他失去了一样东西，却找到了更稳的自己。\n{en}{size=24}{color=#bcd0e8}Lee Hyun sold his old game account to pay for Grandma's medicine. He lost something, but found a steadier version of himself.{/color}{/size}{/en}"
    $ chunky_chapter_complete("ch01-sell-account", "sold-account")
    jump chunky_menu

