story 2
label opening
scene bed
show Alden embarrassed center
rest Alden attentive
camera listener Alden cut
I: 昨天晚上，我说了很久，康妮阿姨才相信我没事。我不用她跟我一起睡，我又不是小孩子了。
I: 可第二天从学校回家，我的房间里，全是甜甜的苹果派的味道。
I: 我很快就找到了。一个粉红色的小夜灯，开着，还很好闻。
I: 一定是她拿来的。她想让我晚上不要怕。
choice lamp
option care "想想她为什么这么做。" -> care
option guilt "想想昨天晚上自己的话。" -> guilt
label care
I: 她是真的怕我出事。可她不知道我为什么大叫。
goto leaveLight
label guilt
I: 我说是睡觉的时候出了点事。她相信了，可我没有跟她说清楚。
label leaveLight
I: 我不太喜欢，可没有把它关掉。我让她那么怕，还没说真话，就让它开着吧。
scene kitchen
show Alden curious center
rest Alden attentive
camera wide cut
I: 我把书包拿进房间，去了厨房。还有几个小时，家里都只有我一个人。
I: 我要找一个很久以前看过的东西。就在她叫“扁东西的地方”的两个抽屉里。
I: 里面有饭店的东西，有学校的东西，还有过生日时别人写的话。什么都有。
I: 这里的东西，从来不会变少。只会越来越多。
choice drawer
option old "先看看很久以前的东西。" -> old
option school "先看看学校的东西。" -> school
label old
I: 好久没见过这些了。也好，我要找的东西，应该还在。
goto search
label school
I: 以前学校的东西也在这里。它们下面，还有更多东西。
label search
I: 我找了快二十分钟，终于找到那个深红的小本子。
I: 上面写着，如果那些有特别力量的人让你受了伤，你可以得到什么帮助。
I: 有人跟你说话，让你的心好一点。也有钱，给没有爸爸妈妈的孩子上学用。我也得到过这些帮助。
express Alden skeptical
I: 还有每年一次，大家一起出去玩。我怎么想，都不觉得跟他们一起出去会好玩。
I: 她以前问过我要不要去。我说不要。今天，我想找的，也不是这些。
camera listener Alden cut
react Alden reach
I: 小本子里面有个纸条。上面有电话号码，还有一句话。
I: “你和阿登，不管谁需要什么，都可以打电话给我。”下面是H.E.。
Alden [curious,hesitant]: 她说，我可以打电话给她。
I: 是汉娜。我已经很久没见过她了。可她跟家里人说过这些话。
choice note
option promise "再看看“需要什么”这几个字。" -> promise
option number "看看那个很长的电话号码。" -> number
label promise
I: 她没有说只能问什么事。只是说，需要什么，都可以。
goto saved
label number
I: 上面的数字比我见过的都多。它一直在这里，只是我不知道。
label saved
express Alden sad
I: 出事几个月以后，跟汉娜一起的那个人打过电话给我。我们能看到对方。他说话很好，可我们都不知道该说什么。
I: 后来我才明白，杀人的那个人，最后想跑到我这里，拿走我的力量。是跟她一起的人让他停了下来。
I: 他们让我活了下来。先是不让那个人再伤害我，后来又把我带进那个泡泡，不让我死。
I: 我应该谢谢他，让我还能活着。我以前没有这样想过。爸爸妈妈死了，让我很难去想其他的事。
express Alden determined
I: 我让自己慢慢地平静下来，打了电话。今天在学校，我已经把想说的话想了很多次。
I: 她一接，我就问清楚。知道最后是怎么回事，然后说再见。就这样。
react Alden phone-talk
I: 电话里只传来了一次声音，那边就有人说话了。
Alden [worried,phone-talk]: 我是阿登。我……
I: 一个很开心的声音先说起话来。“你好，地球人！这里是地球上那些有特别力量的人用的电话系统。”
I: “你没有用过这里的电话。请说出你的名字，为什么打电话，还有你是不是马上需要帮助。不要打电话来开玩笑。”
express Alden surprised
I: 等等。我是在跟那个系统说话吗？真的系统？它刚刚叫我地球人。
choice system
option wonder "想想它怎么还能接电话。" -> wonder
option words "先想想怎么跟它说。" -> words
label wonder
I: 它能给人特别的力量。可我从来不知道，还能用电话找到它。
goto reply
label words
I: 我想了一天怎么跟汉娜说话。现在，这么简单的问题，我却还得想一下。
label reply
Alden [embarrassed,phone-talk]: 我是阿登。我想跟汉娜说话。她有特别的力量。我不用马上找她，所以，应该可以等吧？
I: 那个声音马上又说起话来，这次听起来，好像真的有人在跟我说话。
I: “我看到你了，阿登。汉娜说，你是她很重要的人，应该先让你跟她说话。她现在没有在做任务，我可以让你跟她说话。”
camera listener Alden over 0.6
express Alden surprised
I: 我还没说要问什么。可在她那里，我已经是一个很重要的人。
I: “你想看到对方，只听声音，还是直接知道对方心里在想什么？”
Alden [shocked,question]: 直接知道心里在想什么？
I: 那不是一种特别的力量吗？怎么打个电话也能用？
I: 系统说：“最好不要用最后那个。你还太小，用了会伤到你的脑子。而且，她的钱只能让你们用四点六八分钟。”
express Alden skeptical
I: 那你为什么还要问我！我把手机拿远了一点，好像这样就能安全一些。
Alden [embarrassed,phone-talk]: 那个……只听声音就好了。
I: “现在帮你接过去。”
express Alden worried
I: 这一次，真的要跟她说话了。那个纸条还在我旁边。九十秒的问题，也还在。
end
