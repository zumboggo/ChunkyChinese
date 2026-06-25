# Toggleable English translation, shown inline beneath the Chinese.
#
# Every dialogue line and menu choice carries its English inside an {en}...{/en}
# tag, e.g.
#
#     weed "我没事。\n{en}{size=24}{color=#bcd0e8}I'm fine.{/color}{/size}{/en}"
#
# The custom {en} text tag returns its contents when persistent.show_english is
# on, and nothing when it is off. Because both say statements and menu captions
# use the same tag, one toggle controls English everywhere.
#
# Note: visibility is decided when a line is first shown, so toggling mid-line
# takes effect on the next line — which is the natural reading flow anyway.

init python:

    def chunky_en_tag(tag, argument, contents):
        if getattr(store.persistent, "show_english", True):
            return contents
        return []

    config.custom_text_tags["en"] = chunky_en_tag
