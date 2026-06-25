# Ending scaffold.
#
# Three priorities accumulate across the chapters via track(...) calls placed at
# meaningful choices, e.g.  $ track("romance")  or  $ track("wealth", 2).
# At the end of the story, jump to chunky_finale and it dispatches to whichever
# priority the player leaned into hardest.
#
# The three ending labels below are stubs — fill them in with real scenes.

default romance = 0   # caring for people / relationships
default wealth = 0    # money, security, the practical path
default strength = 0  # mastery, the final boss, proving yourself

init python:
    def track(stat, amount=1):
        setattr(store, stat, getattr(store, stat, 0) + amount)

label chunky_finale:
    # Highest priority wins; ties resolve strength > romance > wealth.
    if strength >= romance and strength >= wealth:
        jump ending_strength
    elif romance >= wealth:
        jump ending_romance
    else:
        jump ending_wealth

label ending_romance:
    $ chunky_ending("romance")
    scene black with fade
    narrator "（浪漫结局占位：李贤选择了人。）\n{en}{size=24}{color=#bcd0e8}(Romance ending placeholder: Lee Hyun chose the people he loves.){/color}{/size}{/en}"
    jump chunky_menu

label ending_wealth:
    $ chunky_ending("wealth")
    scene black with fade
    narrator "（财富结局占位：李贤选择了安稳。）\n{en}{size=24}{color=#bcd0e8}(Wealth ending placeholder: Lee Hyun chose security.){/color}{/size}{/en}"
    jump chunky_menu

label ending_strength:
    $ chunky_ending("strength")
    scene black with fade
    narrator "（终极结局占位：李贤选择了登顶。）\n{en}{size=24}{color=#bcd0e8}(Final-boss ending placeholder: Lee Hyun chose to reach the summit.){/color}{/size}{/en}"
    jump chunky_menu
