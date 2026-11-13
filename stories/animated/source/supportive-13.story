story 2
label opening
scene lobby
show Alden neutral left
show Gorgon neutral right
camera two Alden Gorgon cut
I: 十五分钟后，我们到了上课的地方。我先去找他，给他带了吃的和喝的。
I: 他每天都坐在同一个地方，不能离开。我每次来上课，都会来看看他。
label watch_13_beat_2
Alden: 早上好，戈尔贡。我给你带了热巧克力。
label watch_13_beat_3
Gorgon: 不用了，谢谢。
label watch_13_beat_4
Alden: 这里面没有牛奶。我给你买的是椰奶做的。
label watch_13_beat_5
I: 我把杯子放在桌子上。他一直看电脑，没有看我。
label watch_13_beat_6
Gorgon: 谢谢。
label watch_13_beat_7
I: 我已经来这里六个星期了，他一次也没看过我的眼睛。也许对他来说，那样不太好。
label watch_13_beat_8
Alden: 我还带了这个。是我最喜欢的店里做的，很辣。
I: 我把吃的放在他面前。他不是人，我还不知道他到底喜欢吃什么。
label watch_13_beat_10
choice food
option refused "想想他不吃的东西。" -> refused
option fly "想想他吃过的东西。" -> fly
label refused
I: 我给过他肉、牛奶和鸡蛋，他都不要。这些东西，我不再给他带了。
goto accepted
label fly
I: 有一次，一只苍蝇飞到他手上，他就把它吃了。所以，我还不能说自己很了解他。
label accepted
Gorgon: 好吧。
label watch_13_beat_13
I: 他把吃的拿过去，放在电脑旁边。我很高兴，准备去上课。
label watch_13_beat_14
Gorgon: 你打算每天都这样吗？
label watch_13_beat_15
choice daily
option permission "你不喜欢吗？" -> permission
option promise "我来上课，就给你带。" -> promise
label permission
Alden: 你不喜欢吗？
Gorgon: 我喜欢收到东西。问题不在这里。
goto motive
label promise
Alden: 每次来上课，我都会给你带。
Gorgon: 每次都带？那你一定有自己的想法。
label motive
Gorgon: 可是，你这样给我送东西，是想从我这里得到什么？
label watch_13_beat_20
express Alden surprised
camera listener Alden cut
I: 我刚想走，又停了下来。他不是在问吃的东西。
label watch_13_beat_21
camera two Alden Gorgon cut
Gorgon: 你对我的身体没有那种喜欢，也不是觉得我可怜。这些，我能闻出来。
label watch_13_beat_22
Gorgon: 我以为你跟那些小孩子一样，以为我能让你进入系统，或者给你力量。
label watch_13_beat_23
Gorgon: 可我上星期听过你们的课。你知道的，好像比其他孩子多一点。
label watch_13_beat_24
I: 我在网上找过关于他的东西。除了名字和很多照片，几乎什么也没有。
label watch_13_beat_25
I: 他的声音是什么意思，我也不一定能听懂。可是，他能闻出人的想法？我还是说真的吧。
label watch_13_beat_26
choice honest
option friends "先说想跟他做朋友。" -> friends
option advice "先说以后可能需要帮忙。" -> advice
label friends
Alden: 我想先跟你做朋友。也许以后，我会有事情想问你。
Gorgon: 你想问我什么？
goto hope
label advice
Alden: 也许以后，我会需要你的帮助。所以，我想先认识你。
Gorgon: 原来是这样。你觉得我能帮你什么？
label hope
express Alden embarrassed
Alden: 有一点不好意思。要是有一天，我也有了超能力，我想认识一个比我更了解系统的人。
label watch_13_beat_31
Alden: 大家能知道的东西不多。我想，也许到时候，你能给我一些建议。
label watch_13_beat_32
Gorgon: 那你可找错人了。很多事情，我不能对你们说。
label watch_13_beat_33
choice rules
option cannot "是你不愿意，还是不能？" -> cannot
option public "已经知道的事情呢？" -> public
label cannot
Alden: 是你不愿意，还是不能？
Gorgon: 是不能。我身上的魔法，不会让我这样做。
goto limits
label public
Alden: 那我们已经知道的事情呢？
Gorgon: 你们大家都知道的，我可以说。只有少数人知道的，就不行。
label limits
Gorgon: 关于系统、魔法，还有我是什么，这些有很多都不能说。你们不知道的，我不能让你们知道。
label watch_13_beat_38
express Alden worried
camera listener Alden cut
I: 我看着他身上的光。他不能离开这里，有些话也不能说。
label watch_13_beat_39
camera two Alden Gorgon cut
Gorgon: 也许你不在意我帮不上忙。你都已经在为那一天做准备了，一定很能接受失望。
label watch_13_beat_40
Gorgon: 你知道吗？像你这样的人，得到超能力的可能，连千分之一都不到。
label watch_13_beat_41
express Alden worried
I: 我停了一下，又走近一点，把声音放低。这件事，我还没跟那两个朋友说过。
Alden: 以前有个朋友觉得，我被系统选择的可能，比一般人大一点。
label watch_13_beat_43
Alden: 要是真的，我想把自己能做的事都做好。
label watch_13_beat_44
Alden: 我知道这听起来怎么样。我也想过其他可以做的事，可是……
label watch_13_beat_45
express Alden determined
camera listener Alden cut
Alden: 我有一个很具体的梦想。
label watch_13_beat_46
end
