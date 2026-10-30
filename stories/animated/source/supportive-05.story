story 2
label opening
scene desk
show Alden sad center
rest Alden seated
camera listener Alden cut
I: 已经半夜了。外面的声音还是很大，我睡不着。
I: 我拿了一块冷的披萨，回到电脑前。又开始看三年前那天的事。
I: 有时候我不看。有时候，就像今天晚上，我特别想爸爸妈妈，又停不下来。
I: 汉娜那天没有骗我。她说过的事，让我能找到其他真的事情。
I: 那个坏人还在上高中。他杀了二十七个人。大家说的数字，却不总是一样。
I: 有的人把爸爸妈妈算在里面。有的人说，他们只是旁边的人。
I: 有个地方，写着爸爸妈妈的名字。旁边的话，却好像在说，他们不重要。
choice names
option remember "看看爸爸妈妈的名字。" -> remember
option compare "想想那些不一样的话。" -> compare
label remember
I: 那是我的爸爸妈妈。不只是两个名字。
goto comment
label compare
I: 同样两个人，到了其他地方，就说得不一样了。可他们还是我的爸爸妈妈。
label comment
I: 还有人说，那两个人不是做错了，是想让他们死。好像说是自己做错了，就可以想做什么做什么。
express Alden angry
I: 有个人连妈妈的工作都笑。他什么都不知道，却说得像自己什么都明白。
I: 妈妈为了那工作，学了很多年。我们为了她的工作，才来到这里生活。
I: 她能跟会用特别力量的医生一起帮人。我们一家人都为她开心。她不是他说的那样！
I: 我想跟他说，他不对。可是，一年多以前写的那些话，现在已经不能再回了。
I: 我气得眼睛都快出水了。最后，把头放在桌子上。
I: 学校有人教过我，怎么慢慢呼吸，让自己好一点。我很久没做了，可还记得。
express Alden worried
I: 一点一点，我终于觉得好了一些。我把那个地方关掉。
I: 耳机里是下雨的声音。我把声音开大，让外面的声音小一点。
I: 然后，我去看Marv写的东西。他是个年纪很大的人，特别想明白这些力量是怎么回事。
I: 他写的很多东西，我还不太明白。可今天读的这些，我已经看过好几次。
I: 他知道的事情，没有比别人多很多。只是，他想的事情，跟我一直想的不一样。
choice article
option ability "先想想他问的力量。" -> ability
option difference "先想想他在问什么。" -> difference
label ability
I: 大家都说，那个人拿走了别人的力量。可到底拿走了什么？
goto argument
label difference
I: 我一直在想谁做错了。他却在想，那个人的力量，到底是怎么工作的。
label argument
I: 如果只是让自己跑得快、力气大，为什么还会发生爆炸？
I: 那个人才得到力量没多久，也不太可能马上又得到其他很强的力量。
I: 我读得很慢。一点一点地看，想明白他的意思。
I: 他说，先有两次很大的声音，中间只过了一秒。
I: 然后，又过了大约九十秒，才有第三次。就在那两个人撞进我家的时候。
express Alden curious
Alden [curious,question]: 九十秒？
I: 从我受伤、从床上掉下来，到他们进来，真的有那么久吗？
choice memory
option wummy "看看床上的Wummy。" -> wummy
option eyes "不看其他地方，再想一次。" -> eyes
label wummy
I: Wummy坐在床上，旁边是我的书包。它还在笑，却不能跟我说。
goto remembernight
label eyes
I: 我不看其他地方，想从头再想一次。
label remembernight
I: 我在地上醒来，很疼。耳朵里一直有声音。我大声叫爸爸妈妈。
I: 我的手受了伤，房间里有风。我还想把Wummy拿过来。
I: 然后，房间里什么都不对了。我就什么都不知道了。
I: 可能真的有九十秒。可是，九十秒，不是很长吗？
express Alden determined
I: 我一定得想清楚。
scene bed
show Alden worried left
rest Alden reclining
camera listener Alden cut
I: 我关了电脑和灯，拿着手机上床。这么做很不好，也很不好意思。
I: 我用手机计时，把手和手机藏在被子下面。
I: 我慢慢呼吸了一下。开始计时的那一下，就用最大的声音叫了起来。
Alden [scared,insist]: 康妮阿姨！救命！快来！
I: 外面马上有了声音。东西掉到了地上，有人在叫。
show Connie scared right
rest Connie attentive
look Connie Alden
camera action Alden Connie cut
I: 门一下开了。她跑进来，头发很乱，眼睛大大的。
Connie [scared,question]: 阿登！宝贝！怎么了？
I: 她一下就来了，抱住我。我差一点没停下手机上的时间。
camera listener Alden over 0.65
express Alden embarrassed
I: 也许，我不用叫得那么大声？门口还有跟她一起的两个人，都在看我。
choice answer
option dream "说自己好像做了个梦。" -> dream
option stumble "不好意思地说话。" -> stumble
label dream
Alden [embarrassed,hesitant]: 我……我好像做了个不好的梦。
goto comfort
label stumble
Alden [embarrassed,hesitant]: 刚才……我想，我是做了个不好的梦。
I: 我的脸热了起来。我知道，她是真的怕我出了事。
label comfort
camera two Alden Connie cut
react Connie support
Connie [worried,reassure]: 没事了，没事了。我在这里。
I: 她还抱着我，慢慢地动着。我把手机留在被子下面。
camera listener Alden over 0.65
express Alden sad
I: 时间停在八秒。
I: 只有八秒。外面的声音那么大，她还是来了。
I: 她在这里，我很安全。可那个九十秒的问题，还没有离开我的心里。
end
