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
I: 人、精灵、矮人和兽人，曾经一起生活，都需要别人的帮助。
I: 怪物太强，大家需要兽人的帮助。后来，人学会种地，精灵有了魔法，矮人有了更好的剑。
I: 大家越来越强，却不愿再一起生活。人有了国家，精灵进森林，矮人进山，兽人走向外面。
show Watcher curious far-right
I: 而我，只想在这座城市里，安静地打我的木头人。
Watcher [curious]: 他真的是玩家吗？你看，四个星期了！
choice rumor
option listen "先听听，他们到底想干什么？" -> listen
option practice "不接话，这一剑还要练习。" -> practice
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
Watcher [curious]: 不要这个？说说你想要什么，我去找。
goto sword
label proud
Hyun [angry]: 我不是来要饭的。
Watcher [happy]: 不是那个意思！收下吧，我们再好好说话。
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
I: 我说自己也是来玩游戏的，他却只想听到任务。
goto evidence
label question
Hyun [curious]: 玩家就不能一直练习吗？
camera listener Watcher over 0.65
express Watcher curious
Watcher [curious]: 能啊。可别人早走了，你为什么还在？
I: 对他来说，一直练习的人，一定不是玩家。
label evidence
camera two Hyun Watcher cut
Watcher [happy]: 而且，教官对你那么好！
I: 教官不喜欢他们，却天天和我一起吃午饭。
I: 他们把这个也算进去了。越想，越觉得自己想对了。
choice leave
option direct "请让开。我不会给你任务。" -> direct
option clear "剑请拿回去。我有自己的。" -> clear
label direct
Hyun [angry]: 请让开。我不会给你任务。
Watcher [curious]: 现在不给，就是以后会给？
goto ending
label clear
Hyun [neutral]: 剑请拿回去。我有自己的。
Watcher [curious]: 长剑都不要？那得是什么样的任务啊……
label ending
I: 礼物没有收，我也说了自己是谁。可他们还是跟着我，等一个特别的任务。
scene hall
ambience hall
show Hyun determined left
show Dummy neutral right
camera action Hyun Dummy cut
activity Hyun train Dummy steady
I: 在这里，别人不会一眼就知道，我和他们一样是来玩游戏的。
I: 我说了，他们又不相信。
I: 木剑还在我手里。我不要他们的礼物，只想接着练习。
I: 我又打了一下。他们还在说：他一定有任务。
end
