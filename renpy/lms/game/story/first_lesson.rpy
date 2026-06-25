# Seeded from first-lesson.json — this file is now the source of truth, edit freely.
label story_first_lesson:
    $ chunky_chapter_start("first-lesson")
    jump node_lesson_001

label node_lesson_001:
    scene bg_training_hall
    show spr_weed_sculptor_calculating at left
    show spr_geomchi_commanding at right
    char_geomchi "新人，先别问怎么变强。先问自己能不能听完一句话。\n{en}{size=24}{color=#bcd0e8}Newcomer, do not first ask how to become strong. First ask whether you can listen to one full sentence.{/color}{/size}{/en}"
    menu:
        "师傅让你选第一项训练。\n{en}{size=24}{color=#bcd0e8}The master tells you to choose your first training.{/color}{/size}{/en}"
        "先练听命令。\n{en}{size=24}{color=#bcd0e8}Train listening to orders first.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_lesson_003a
        "先挥剑，看起来比较帅。\n{en}{size=24}{color=#bcd0e8}Swing a sword first; it looks cooler.{/color}{/size}{/en}":
            # $ track("romance")  # TODO: weight this choice toward an ending
            jump node_lesson_003b

label node_lesson_003a:
    show spr_weed_sculptor_amused at left
    show spr_geomchi_commanding at right
    char_geomchi "很好。活得久的人，通常不是最帅的人。\n{en}{size=24}{color=#bcd0e8}Good. The people who live long are usually not the coolest-looking ones.{/color}{/size}{/en}"
    jump node_lesson_result

label node_lesson_003b:
    show spr_weed_sculptor_annoyed at left
    show spr_geomchi_commanding at right
    char_geomchi "剑挥得不错。差点打到自己，也算认识了敌人。\n{en}{size=24}{color=#bcd0e8}Nice swing. You nearly hit yourself, which means you have met the enemy.{/color}{/size}{/en}"
    show spr_weed_sculptor_startled at left
    show spr_geomchi_commanding at right
    char_geomchi "看，墙角的灰尘史莱姆被你吵醒了。正好，用它试试手。\n{en}{size=24}{color=#bcd0e8}Look, the dust slime in the corner was woken up by you. Perfect, use it to test your hand.{/color}{/size}{/en}"
    # (card battle removed) continue to the win branch
    jump node_lesson_slime_win

label node_lesson_slime_win:
    scene bg_training_hall
    show spr_weed_sculptor_exhausted at left
    show spr_geomchi_commanding at right
    char_geomchi "还算有点样子。\n{en}{size=24}{color=#bcd0e8}Not too bad.{/color}{/size}{/en}"
    jump node_lesson_result

label node_lesson_result:
    "陈佑学会了第一件事：系统不会替他理解别人的话。\n{en}{size=24}{color=#bcd0e8}Chen You learns the first thing: the system will not understand other people's words for him.{/color}{/size}{/en}"
    $ chunky_chapter_complete("first-lesson", "trained")
    jump chunky_menu

