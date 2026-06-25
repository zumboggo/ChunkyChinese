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
        padding (48, 40)
        background "#241c14"

        vbox:
            spacing 14

            text "月光雕刻师" size 46 xalign 0.5 color "#f3e6cf"
            text "Legendary Moonlight Sculptor" size 24 xalign 0.5 color "#b79b73"
            null height 8

            for chapter in chunky_chapters:
                textbutton "[chapter[u'title_zh']]    ·    [chapter[u'title_en']]":
                    xfill True
                    text_size 30
                    action Return(chapter["label"])

            null height 16

            hbox:
                xalign 0.5
                spacing 24
                $ _py = "开" if persistent.show_pinyin else "关"
                $ _en = "开" if persistent.show_english else "关"
                textbutton "拼音 Pinyin: [_py]" action ToggleField(persistent, "show_pinyin")
                textbutton "英文 English: [_en]" action ToggleField(persistent, "show_english")

            hbox:
                xalign 0.5
                spacing 24
                textbutton "读取 Load" action ShowMenu("load")
                textbutton "设置 Settings" action ShowMenu("preferences")
                textbutton "退出 Quit" action Quit(confirm=True)

# Always-on key shortcuts so the reader can toggle aids during dialogue.
# (Effect appears on the next line, which matches natural reading flow.)
screen chunky_toggles():
    zorder 100
    key "p" action ToggleField(persistent, "show_pinyin")
    key "e" action ToggleField(persistent, "show_english")
