story 2
label opening
scene bed
show Alden neutral center
camera medium Alden cut
I: 现在，我肯定睡不着。心里有太多事，一直想个不停。
I: 今天晚上已经这么不好了。再做一件难做的事，也没什么吧。
choice ready
option now "就现在打吧。" -> now
option breathe "先让自己慢一点。" -> breathe
label now
I: 一直等下去，这个电话也不会变得容易。
goto call
label breathe
I: 我拿着手机，让自己先慢一点。
label call
I: 我拿出手机，用手点了一下上面的符号。我先让自己慢一点，再说话。
Alden: 打给克莱特姆·赵。
I: 系统没有让我直接和她说话，而是让我给她留言。
I: 还好。我现在真的不想和别人说很久，说心里那些事。
choice approach
option short "说简单一点。" -> short
option reason "只说我为什么打来。" -> reason
label short
I: 简单一点，最安全。把要说的话说完就好。
goto greeting
label reason
I: 我不是打来说心里的每件事的。说出我的决定就好。
label greeting
Alden: 赵女士，您好。我是奥尔登。
Alden: 对不起，这么久才给您回电话。
label decision
Alden: 我想去葬礼。
Alden: 如果带我过去不会让您太麻烦的话。
Alden: 谢谢您愿意带我去。
label after
I: 电话打完了。
I: 好了。决定做了。
choice aftermath
option hand "看看手里的手机。" -> hand
option quiet "先不说话。" -> quiet
label hand
I: 话已经说出去了。我不用再拿着手机想要不要打了。
goto distract
label quiet
I: 我没再说什么。这个决定，已经不只是心里的想法了。
label distract
I: 接下来，得找点其他事做。我不想一直想这些事。
I: 我穿上一件衣服，又在外面穿上连帽衫。
I: 然后，我拿着床上的枕头，走到外面的房间。
label victor
scene home
show Alden neutral center
camera medium Alden cut
I: 猫还在那里，在闻那条我一点也不想看见的短裤。
choice companion
option cat "看看维克多。" -> cat
option shorts "看看那条短裤。" -> shorts
label cat
I: 至少，这里还有它，可以听我说话。虽然它是一只猫。
goto invite
label shorts
I: 它好像很想知道那个东西是什么。我可不想。
label invite
Alden: 你想不想一起去买点金枪鱼，再去见个人？
I: 维克多叫了一声。
Alden: 对，就是这样！
label ending
Alden: 那么，你觉得恶魔怎么样？
end
