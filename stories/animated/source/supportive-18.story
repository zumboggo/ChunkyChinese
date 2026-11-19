story 2
label opening
scene lobby
show Alden worried left
show Gorgon neutral right
camera two Alden Gorgon cut
Alden: 大家都走了以后，你有房间可以睡觉吗？
Gorgon: 没有房间。我不需要睡很久。
Gorgon: 我就留在桌子这里，或者去外面的椅子上休息。
label desk
I: 我把手放在桌子上，低下头，让自己的手托着头。
I: 这里的光比白天少了。他身上那些尖尖的东西，看起来有点可怕。
choice notice
option desk "看看他的桌子。" -> desk_notice
option room "想想没人的时候。" -> room_notice
label desk_notice
I: 白天他在这里，晚上也在这里。这桌子几乎就是他的家。
goto food
label room_notice
I: 我下课以后可以回家。他却没有另一个地方可以去。
label food
camera two Alden Gorgon cut
Alden: 我没给你带吃的，你就吃机器里卖的东西吗？
Alden: 上最后一门课的时候，我一直在想这件事。
Alden: 你不能说想吃什么。那你怎么叫别人送饭来呢？
label request
Alden: 难道你打电话，只能说，给我送点吃的？
I: 我说着说着，自己也觉得这个办法不太好。
choice order
option guess "想想送来什么。" -> guess
option online "想想在网上买。" -> online
label guess
I: 别人不知道他想吃什么，送来的东西可能不是他能吃的。
goto bound
label online
I: 在网上买，也要选自己想吃的东西。他大概也不能这样做。
label bound
Alden: 我不太了解魔法。不过，把你留在这里的人，应该早就想过这些办法了。
label blink
camera listener Alden cut
I: 戈尔贡眨了一下眼睛。我第一次看见他这样。
I: 他闭上眼睛的时候，我还能看见里面的颜色。真奇怪。
label go_home
camera two Alden Gorgon cut
Gorgon: 回家吧，奥尔登。你累了，说话都不太清楚了。
Gorgon: 你不用担心我。
label alone
camera listener Alden cut
I: 他叫我回家。我却还想着他一个人留在这里的样子。
choice respond
option self "想想自己一个人的时候。" -> self
option visitors "想想白天经过的人。" -> visitors
label self
I: 我知道一个人是什么感觉。我今天也不想那么早回家。
goto company
label visitors
I: 白天这里有很多人，可有多少人真的跟他说话呢？
label company
camera two Alden Gorgon cut
Alden: 嗯，我没有担心。只是觉得，一个人的时候，有时候真的不好受。
Alden: 你大部分时间都是一个人。
Alden: 很多人从你面前走过去，连你好都不说。
label famous
look Gorgon down
Gorgon: 有很多人来这里，就是为了看我。
Gorgon: 他们给我拍了很多照片。
Gorgon: 我听说，这里还有一家店，卖长得像我的玩具。
Gorgon: 我也算有一点名气吧。
label voice
camera listener Alden cut
express Alden worried
I: 他的声音跟以前不一样。
I: 人伤心的时候，不会这样说话。可我以前也没听过他用这种声音。
choice listen
option words "想想他说的话。" -> words
option sound "听听他的声音。" -> sound
label words
I: 有很多人来看他。可是，被人看，跟有人一起说话，是一样的吗？
goto hurt
label sound
I: 我不知道他是什么感觉。可我不能因为不明白，就觉得他没事。
label hurt
I: 我本来只是想跟他说说话。现在却担心，自己说到了让他难受的事。
I: 以前看见网上那些照片，我只觉得那些人很不懂事。
label camera
I: 可现在想想，这件事比我以为的更不好。
I: 别人想给他拍照，他连走开都做不到。
label ending
camera two Alden Gorgon cut
I: 他们看他，就像看动物园里的动物。
I: 我可以回家。他却连不想被人看的时候，也不能离开。
end
