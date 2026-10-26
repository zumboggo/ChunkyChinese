story 2
label opening
scene hall
ambience hall
show Hyun determined left
show Dummy neutral right
camera action Hyun Dummy cut
activity Hyun train Dummy steady
I: 我只想好好练习，可城市里已经有人在说：训练场里有个奇怪的人。
I: 四个星期了。大家说，他天天拿着木剑，什么话也不说。
I: 一开始，我的剑还没有那么有力。现在，每一下都更有力。
I: 这个世界的故事，却从很久以前开始。
I: 人、精灵、矮人和兽人，曾经一起生活，都需要别人的帮助。
I: 精灵找水果，矮人做东西，人和兽人一起找吃的。
I: 怪物太可怕。大家需要帮助。那时候，强大的兽人走在最前面。
I: 后来，人学会种地，精灵有了魔法，矮人做出了更好的剑。
I: 大家越来越强，却越来越不愿意一起生活，最后都离开了。
I: 后来，人有了自己的国家，其他的种族住进森林、山里，或者走向外面。
show Watcher curious far-right
I: 而我，只想在这座城市里，安静地打我的木头人。
Watcher [curious]: 他真的是玩家吗？你看，四个星期了！
choice rumor
option listen "先听听他们在说什么。" -> listen
option practice "先好好练习。" -> practice
label listen
I: 他们越说越认真。我不过是在练习，怎么就不是玩家了？
goto guess
label practice
I: 木剑又打了下去。对我来说，这一下比他们的话重要。
label guess
Watcher [happy]: 他可能是游戏里给任务的人！
I: 一听到任务，他们的眼睛都亮了。
activity Hyun stop
scene hall
ambience hall
show Hyun neutral left
show Watcher happy right
look Hyun Watcher
look Watcher Hyun
camera two Hyun Watcher cut
Watcher [happy]: 来，吃点东西吧！钱也可以给你。
I: 我爱钱，可我不是来要东西的。这些礼物，我不收。
choice gift
option polite "谢谢，可我不需要。" -> polite
option proud "我不是来要饭的。" -> proud
label polite
Hyun [neutral]: 谢谢，可我不需要。
Watcher [curious]: 那你需要什么？跟我说，我去找！
goto sword
label proud
Hyun [angry]: 我不是来要饭的。
Watcher [happy]: 不不，只是一点礼物。请收下吧！
label sword
I: 我没有接。他们却没有走，又有人说起了剑。
Watcher [happy]: 钢剑比木剑好吧？我可以送你一把长剑。
Hyun [neutral]: 不用了。
I: 面包，钱，长剑。他们想给的东西越来越多，我却只想接着练习。
choice explain
option plain "我也是玩家，和你一样。" -> plain
option question "玩家就不能一直练习吗？" -> question
label plain
Hyun [neutral]: 我也是玩家，和你一样。
camera listener Watcher over 0.65
express Watcher curious
Watcher [curious]: 可是，谁会一连四个星期都在这里？
I: 我已经说清楚了。他却还在等我说其他的话。
goto evidence
label question
Hyun [curious]: 玩家就不能一直练习吗？
camera listener Watcher over 0.65
express Watcher curious
Watcher [curious]: 一两天还好。可是，四个星期啊！
I: 对他来说，一直练习的人，一定不是玩家。
label evidence
camera two Hyun Watcher cut
Watcher [happy]: 而且，教官对你那么好！
I: 教官不喜欢其他的玩家，却天天和我一起吃午饭。
I: 他们把这个也算进去了。越想，越觉得自己想对了。
choice leave
option direct "请走开，我还要练习。" -> direct
option clear "东西请拿回去，我要练习了。" -> clear
label direct
Hyun [angry]: 请走开，我还要练习。
Watcher [curious]: 什么礼物都不收，真不一般……
goto ending
label clear
Hyun [neutral]: 东西请拿回去，我要练习了。
Watcher [curious]: 连长剑都不要？一定不简单……
label ending
I: 礼物没有收，我也说了自己是谁。可他们还是跟着我，等一个特别的任务。
scene hall
ambience hall
show Hyun determined left
show Dummy neutral right
camera action Hyun Dummy cut
activity Hyun train Dummy steady
I: 在这里，不说自己是谁，别人就不知道谁是玩家。
I: 我说了，他们又不相信。
I: 木剑还在我手里。我不要他们的礼物，只想接着练习。
I: 可要让他们相信我，难道比练习还难？
end
