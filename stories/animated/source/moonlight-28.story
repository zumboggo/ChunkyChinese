story 2
label opening
scene hall
ambience hall
show Hyun determined left
show Watcher happy right
camera two Hyun Watcher cut
Watcher [happy]: 跟我们一起吧。一直到一百级，你需要什么，我们都给。
I: 我手里还拿着木剑。四个星期的练习，让这些高手走到我面前。
Hyun [skeptical]: 你知道我也是玩家？
Watcher [happy]: 当然。你想让力量更强，我们知道。
I: 这次，他们知道我不是给任务的人。他们想要的是我。
choice offer
option help "为什么愿意帮我这么多？" -> help
option practice "我还要练习。" -> practice
label help
Watcher [neutral]: 因为我们需要你这样的人。你变强，我们也会更强。
goto refusal
label practice
Watcher [happy]: 我们知道。所以才来找你。我们可以一起变强。
label refusal
I: 高手们想要的不只是一群人。他们想有自己的国家，自己的国王。
I: 城市里的钱，可以用来盖房子、做剑，也可以让更多人去战斗。
I: 他们看我的剑，想的却是以后的天下。
choice refuse
option firm "谢谢。我还是自己来。" -> firm
option work "你们有你们的事，我有我的。" -> work
label firm
Hyun [determined]: 谢谢。我还是自己来。
Watcher [surprised]: 连一百级以前的帮助，也不要？
Hyun [neutral]: 不要。我要自己变强。
goto training
label work
Hyun [neutral]: 你们有你们的事，我有我的。
Watcher [curious]: 我们想走得更远。你就想一直留在这里？
Hyun [determined]: 先把这里的事做完。
label training
I: 来找我的人不只一个。我对他们都说了不。
scene hall
ambience hall
show Hyun determined left
show Dummy neutral right
camera action Hyun Dummy cut
activity Hyun train Dummy steady
I: 木剑又打在木头人身上。一下，再一下。
I: 突然，游戏里有了声音：力量、敏捷、体力，都多了一点。
activity Hyun stop
express Hyun surprised
I: 名声多了二十点，生命多了一百点。我的剑停在半空。
Hyun [relieved]: 终于……做到了。
react Hyun sigh
I: 我不再看眼前的木头人，长长地出了口气。四个星期啊。
I: 在这个训练场里，我已经不能再这样变强了。
choice gains
option strength "看看自己终于得到的力量。" -> strength
option fame "看看新的名声。" -> fame
label strength
I: 每天都一样的练习，终于有了结果。我不是白白站在这里的。
goto visit
label fame
I: 名声高了，买东西会更便宜，别人也会更认真地听我说话。这也不错。
label visit
scene hall
ambience hall
show Hyun relieved left
show Instructor proud right
look Hyun Instructor
look Instructor Hyun
camera two Hyun Instructor cut
Instructor [proud]: 做得好。
Hyun [happy]: 谢谢您，教官。
Instructor [neutral]: 一开始，我真没想到，你能做到这样。
camera listener Hyun over 0.65
express Hyun surprised
Instructor [proud]: 是我看错了。我对你很满意。
I: 从前，他不相信我。现在，他自己对我说，他看错了。
choice praise
option thanks "都是您教得好。" -> thanks
option credit "没有您的帮助，我做不到。" -> credit
label thanks
camera two Hyun Instructor cut
Hyun [happy]: 都是您教得好。
Instructor [laughing]: 哈哈！这话说得对！
goto reward
label credit
camera two Hyun Instructor cut
Hyun [happy]: 没有您的帮助，我做不到。
Instructor [proud]: 哈哈！现在知道我的好了吧！
label reward
I: 他一听这话就开心。我早知道，怎么让教官更开心。
I: 教官拿来一把剑，给了我。
Hyun [curious]: 这把剑是……？
Instructor [happy]: 你的。完成基础训练的人，都能得到这把剑。
I: 游戏里出现了几个字：得到硬铁剑。
Hyun [curious]: 基础训练……
I: 我拿着这把剑。四个星期，终于做完的，原来只是“基础”。
end
