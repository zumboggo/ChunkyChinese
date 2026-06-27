# Chapter-select menu and the live reading-aid toggles.
#
# chunky_chapters is generated into chapters.rpy by the converter.

label chunky_menu:
    window hide
    $ _chunky_chosen = renpy.call_screen("chunky_chapter_select")
    $ renpy.jump(_chunky_chosen)

screen chunky_chapter_select():
    tag menu
    modal True

    add "#15110d"

    frame:
        xalign 0.5
        yalign 0.5
        xsize 980
        padding (48, 44)
        background "#241c14"

        vbox:
            spacing 10

            text "月光雕刻师" size 52 xalign 0.5 color "#f3e6cf"
            text "Legendary Moonlight Sculptor" size 22 xalign 0.5 color "#b79b73"
            null height 4
            add "#5a3e28" xfill True ysize 1
            null height 8

            for chapter in chunky_chapters:
                textbutton "[chapter[u'title_zh']]    ·    [chapter[u'title_en']]":
                    xfill True
                    padding (16, 10)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_size 26
                    text_idle_color "#d4be9a"
                    text_hover_color "#f3e6cf"
                    action Return(chapter["label"])

            null height 12
            add "#5a3e28" xfill True ysize 1
            null height 8

            hbox:
                xalign 0.5
                spacing 20
                $ _py = "开" if persistent.show_pinyin else "关"
                $ _en = "开" if persistent.show_english else "关"
                textbutton "拼音 Pinyin: [_py]":
                    padding (14, 8)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_idle_color "#b79b73"
                    text_hover_color "#f3e6cf"
                    action ToggleField(persistent, "show_pinyin")
                textbutton "英文 English: [_en]":
                    padding (14, 8)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_idle_color "#b79b73"
                    text_hover_color "#f3e6cf"
                    action ToggleField(persistent, "show_english")

            null height 6

            hbox:
                xalign 0.5
                spacing 20
                textbutton "读取 Load":
                    padding (14, 8)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_idle_color "#b79b73"
                    text_hover_color "#f3e6cf"
                    action ShowMenu("load")
                textbutton "设置 Settings":
                    padding (14, 8)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_idle_color "#b79b73"
                    text_hover_color "#f3e6cf"
                    action ShowMenu("preferences")
                textbutton "退出 Quit":
                    padding (14, 8)
                    background Frame("#2e2016", 4, 4)
                    hover_background Frame("#3d2a1a", 4, 4)
                    text_idle_color "#b79b73"
                    text_hover_color "#f3e6cf"
                    action Quit(confirm=True)

# Always-on key shortcuts so the reader can toggle aids during dialogue.
# (Effect appears on the next line, which matches natural reading flow.)
screen chunky_toggles():
    zorder 100
    key "p" action ToggleField(persistent, "show_pinyin")
    key "e" action ToggleField(persistent, "show_english")
