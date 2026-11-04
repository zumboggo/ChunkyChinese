story 2
label opening
scene lobby
show Alden neutral left
show Gorgon neutral right
camera two Alden Gorgon cut
I: 门一开，冷风就进来了。两个一起上课的女孩看见我就笑了。
I: 我也向她们招手，心里还在想给他带什么吃的。
Gorgon: 你应该跟她们说，你对她们没有那个意思。
Alden: 什么意思？
Gorgon: 她们喜欢你。那边那个蓝头发的男孩也喜欢你。
choice blush
option mirror "看看自己的脸。" -> mirror
option screen "看看他在看什么。" -> screen
label mirror
I: 桌子后面有一面镜子。我的脸怎么一下子这么红了？
goto pair
label screen
I: 他没看我，还在看电脑。我的脸却热了起来。
label pair
Gorgon: 叫杰里米去找高的那个，博可以去找另一个。这样就少了两个问题。
express Alden embarrassed
Alden: 别说了！别人喜欢谁，你不要跟大家说！
Gorgon: 那你叫他们停下来。他们身上的味道，我在这里都能闻到。
scene lecture
show Alden neutral center
rest Alden seated
camera listener Alden cut
I: 去教室以前，我们把鞋和袜子留在下面。
I: 今天来上课的人很多。在这位老师面前，大家都得这样做。
I: 十点刚过，我们就能在前面看见老师了。她自己却不在这个世界。
I: 今天上历史课。很多人来这里，是因为这门课在大学也有用。
I: 老师开始讲很久以前的魔法。我开始写东西，先写下几个字：戈尔贡的问题。
choice list
option food "先写我买得起的东西。" -> food
option why "先想清楚我要知道什么。" -> why
label food
I: 想到一样就写一样。买不到的、太贵的，就不用写了。
goto question
label why
I: 一边是他能吃什么，还有一个问题：他为什么不能说想吃什么？
label question
I: 写完能买的东西，我又写下几个可能的原因。我还是觉得，有人不想让他好过。
I: 要是给错了东西真的那么危险，谁还会让他坐在人来人往的地方？
I: 等等。我见过他吃一只苍蝇。会不会有些东西，他只吃活的？
choice test
option doubt "想想他也吃菜。" -> doubt
option cost "算算哪一样便宜。" -> cost
label doubt
I: 他也吃菜，所以我不一定是对的。不过，可以试一试。
goto cheap
label cost
I: 肉店里有那么多东西。要是每样都买，我的钱很快就没了。
label cheap
I: 我写下“活的虫子”。要试，可以先试便宜的，不行再买贵的。
I: 下课的时候，我还在写：不是菜，又特别便宜的东西。
scene counter
show Alden curious left
show Boe neutral center
show Jeremy curious right
camera wide cut
I: 博叫醒了杰里米。我们买好午饭，坐在小店里吃。
Alden: 什么东西不是菜，又特别便宜？
Jeremy: 又是给你那个可怕的朋友？你不是说他不吃肉吗？
Boe: 你吃的东西上面，留一点给他就好了。那一定很便宜。
choice lunch
option refused "说说他不肯吃什么。" -> refused
option told "说说他自己怎么说。" -> told
label refused
Alden: 我给过他肉，也给过他牛奶。他都不能吃。可是他说，他不只是吃菜。
goto ask
label told
Alden: 是他自己说的，他不只是吃菜。可是我带过的肉和牛奶，他都不能吃。
label ask
Jeremy: 我还是希望他只吃菜。
Boe: 那你怎么不问他，他喜欢吃什么？
camera two Alden Boe cut
Alden: 他不能告诉我。
express Boe surprised
camera listener Boe cut
I: 两个人都不吃了，一起看我。
camera two Alden Boe cut
Alden: 真的。他不能说想吃什么。我问他是不是只吃虫子，他连一句“是”都不能说。
Boe: 不能说系统的事，我懂。可是，连想吃什么都不能说？为什么？
Boe: 现在，我也想带点东西给他吃吃看了。
end
