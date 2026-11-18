story 2
label opening
scene lobby
show Alden curious left
show Gorgon neutral right
camera two Alden Gorgon cut
Alden: 大家都走了以后，你有房间睡觉吗？
label watch_18_beat_1
Gorgon: 没有房间。
label watch_18_beat_2
I: 他没有看我，眼睛看向我的左边。
label watch_18_beat_3
Gorgon: 我不用睡很久。我就在桌子这里，或者去那边坐。
label watch_18_beat_4
I: 我把手放在桌子上，头也放在手上。
label watch_18_beat_5
I: 现在灯没有那么亮。他脖子上的那些刺，看起来更奇怪了。
label watch_18_beat_6
choice night
option night_a "想想没有人的时候。" -> night_a
option night_b "想想桌子后面的他。" -> night_b
label night_a
I: 别人回家以后，他还是在这里。
label watch_18_beat_7
goto night_join
label night_b
I: 我以前看到他的时候，他都坐在桌子后面。
label watch_18_beat_8
label night_join
Alden: 我不带吃的来，你就吃那些机器里卖的东西吗？
label watch_18_beat_9
Alden: 刚才学那些字，我一直在想这件事。
label watch_18_beat_10
Alden: 你也不能打电话，请人送饭吧？
label watch_18_beat_11
Alden: 你可以只说，请给我送点吃的，不说要吃什么吗？
label watch_18_beat_12
I: 这样大概不太好。网上买东西，也许也不可以。
label watch_18_beat_13
choice rules
option rules_a "想想自己知道多少。" -> rules_a
option rules_b "想想能不能这样做。" -> rules_b
label rules_a
I: 魔法到底是怎么回事，我不太明白。
label watch_18_beat_14
goto rules_join
label rules_b
I: 让他不能说的人，也许早就想过了。
label watch_18_beat_15
label rules_join
I: 他第一次在我面前，把眼睛闭了一下。
label watch_18_beat_16
I: 那层皮很特别，我好像能看到里面，上面还有黑色的线。
label watch_18_beat_17
Gorgon: 回家吧。你累了，说话都有点奇怪了。
label watch_18_beat_18
Gorgon: 你不用担心我。
label watch_18_beat_19
Alden: 我不是担心。我只是觉得，有时候一个人不好过。
label watch_18_beat_20
Alden: 你大部分时间，都是一个人。
label watch_18_beat_21
Alden: 大部分人走进来，都不跟你说你好。
label watch_18_beat_22
I: 他又去看电脑了。
label watch_18_beat_23
Gorgon: 有很多人，就是为了来看我。
label watch_18_beat_24
Gorgon: 我的照片有好多。听说这个城市有店，卖像我的小玩具。
label watch_18_beat_25
Gorgon: 我差不多也算是一个小名人了。
label watch_18_beat_26
choice voice
option voice_a "认真听他的声音。" -> voice_a
option voice_b "想想人不开心的样子。" -> voice_b
label voice_a
I: 他的声音，和以前不太一样。
label watch_18_beat_27
goto voice_join
label voice_b
I: 人不开心的时候，不是这样的声音。
label watch_18_beat_28
label voice_join
I: 可我以前没有听他这样说过话。
label watch_18_beat_29
I: 我是不是说到了，让他更不开心的事？
label watch_18_beat_30
I: 网上那些照片，我以前只觉得，那些人不太聪明。
label watch_18_beat_31
I: 现在我才想到，他不能走开。
label watch_18_beat_32
I: 别人要给他拍照，他想不让人看见，也做不到。
label watch_18_beat_33
I: 这样看他，就像看动物园里不能离开的动物。
label watch_18_beat_34
choice pity
option pity_a "记住他不想要什么。" -> pity_a
option pity_b "记住他以前的话。" -> pity_b
label pity_a
I: 他不想让我觉得他可怜。
label watch_18_beat_35
goto pity_join
label pity_b
I: 他以前说过，好像这样的感觉，他也能闻到。
label watch_18_beat_36
label pity_join
I: 可我心里一下子，就有了这种感觉。
label watch_18_beat_37
I: 我努力把它收起来，不让他感觉到。
label watch_18_beat_38
I: 我站直了，清了清嗓子。
label watch_18_beat_39
end
