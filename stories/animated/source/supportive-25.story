story 2
label opening
scene bed
show Alden neutral center
camera medium Alden cut
I: 现在，我肯定睡不着。心里有太多事，一直想个不停。
label watch_25_opening_1
I: 今天晚上已经这么不好了。再做一件难做的事，也没什么吧。
label watch_25_opening_2
choice ready
option now "就现在打吧。" -> now
option breathe "先让自己慢一点。" -> breathe
label now
I: 一直等下去，这个电话也不会变得容易。
label watch_25_now_1
goto call
label breathe
I: 我拿着手机，让自己先慢一点。
label watch_25_breathe_1
label call
I: 我拿出手机，用手点了一下上面的符号。我先让自己慢一点，再说话。
label watch_25_call_1
Alden: 打给克莱特姆·赵。
label watch_25_call_2
I: 系统没有让我直接和她说话，而是让我给她留言。
label watch_25_call_3
I: 还好。我现在真的不想和别人说很久，说心里那些事。
label watch_25_call_4
choice approach
option short "说简单一点。" -> short
option reason "只说我为什么打来。" -> reason
label short
I: 简单一点，最安全。把要说的话说完就好。
label watch_25_short_1
goto greeting
label reason
I: 我不是打来说心里的每件事的。说出我的决定就好。
label watch_25_reason_1
label greeting
Alden: 赵女士，您好。我是奥尔登。
label watch_25_greeting_1
Alden: 对不起，这么久才给您回电话。
label watch_25_greeting_2
label decision
Alden: 我想去葬礼。
label watch_25_decision_1
Alden: 如果带我过去不会让您太麻烦的话。
label watch_25_decision_2
Alden: 谢谢您愿意带我去。
label watch_25_decision_3
label after
I: 电话打完了。
I: 好了。决定做了。
label watch_25_after_2
choice aftermath
option hand "看看手里的手机。" -> hand
option quiet "先不说话。" -> quiet
label hand
I: 话已经说出去了。我不用再拿着手机想要不要打了。
label watch_25_hand_1
goto distract
label quiet
I: 我没再说什么。这个决定，已经不只是心里的想法了。
label watch_25_quiet_1
label distract
I: 接下来，得找点其他事做。我不想一直想这些事。
label watch_25_distract_1
I: 我穿上一件衣服，又在外面穿上连帽衫。
label watch_25_distract_2
I: 然后，我拿着床上的枕头，走到外面的房间。
label victor
scene home
show Alden neutral center
camera medium Alden cut
I: 猫还在那里，在闻那条我一点也不想看见的短裤。
label watch_25_victor_1
choice companion
option cat "看看维克多。" -> cat
option shorts "看看那条短裤。" -> shorts
label cat
I: 至少，这里还有它，可以听我说话。虽然它是一只猫。
label watch_25_cat_1
goto invite
label shorts
I: 它好像很想知道那个东西是什么。我可不想。
label watch_25_shorts_1
label invite
Alden: 你想不想一起去买点金枪鱼，再去见个人？
label watch_25_invite_1
I: 维克多叫了一声。
label watch_25_invite_2
Alden: 对，就是这样！
label watch_25_invite_3
label ending
Alden: 那么，你觉得恶魔怎么样？
label watch_25_ending_1
end

