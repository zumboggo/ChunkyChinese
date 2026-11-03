story 2
label opening
scene train
show Alden surprised left
show Jeremy curious right
show Boe happy center
rest Alden seated
rest Jeremy seated
rest Boe seated
camera two Alden Jeremy cut
I: 我还在想汉娜的事，朋友已经叫我下车了。
Jeremy: 我们到了！你怎么了？一直在想什么？
Alden: 对不起。我在想学校让我们写的东西。
choice school
option sorry "对不起，刚才没听到。" -> sorry
option thinking "我还没想好怎么写。" -> thinking
label sorry
Jeremy: 你是不是太喜欢学校了？
goto complaint
label thinking
Jeremy: 今天也要想学校的事吗？
label complaint
Jeremy: 我为什么要跟你们一起玩？一个星期已经上五天学了，现在还要多上两天！
camera two Boe Jeremy cut
Boe: 我们叫你一起来的时候，没想到你真的会来。
Boe: 你现在想做什么都可以，却跟我们一起上课。我应该很开心，还是应该担心你没有其他朋友？
camera two Alden Jeremy cut
choice teasing
option need "你这么需要我们啊？" -> need
option student "你要变成好学生了。" -> student
label need
Alden: 我们以前还不知道，你这么需要我们。
Jeremy: 你也这么说？你怎么能跟他一起说我！
goto studentline
label student
Alden: 这样下去，你不想做个好学生，也不行了。
Jeremy: 你怎么能说这种话！
label studentline
rest Alden relaxed
express Jeremy shocked
I: 我拿着包，站起来。他看我的样子，好像我刚才说了什么可怕的话。
Jeremy: 你这个给恶魔送吃的家伙！你不是我们三个人里的好人吗？
express Alden surprised
camera listener Alden cut
Alden: 是吗？我还真不知道。
I: 我不是在开玩笑。我没想到，他会这样说我。
scene street
show Alden curious left
show Boe happy center
show Jeremy frustrated right
camera wide cut
I: 我们下车，一起走下楼，来到外面的路上。
Alden: 我想，我说话是没有你那么难听。
Boe: 那是因为你还不太努力。
camera two Boe Jeremy cut
Jeremy: 你们两个别说了！我是好笑的那个，博是说话难听的那个，你是好人。
Boe: 原来你已经给我们分好了？能不能说我说话很厉害？
choice labels
option laugh "听起来，他很认真。" -> laugh
option compare "我有那么好吗？" -> compare
label laugh
I: 我以为我们只是在开玩笑。他却真的想过，我们每个人是什么样的人。
goto self
label compare
I: 我很少会这样想自己。可是，他说得那么清楚，好像早就知道了。
label self
camera listener Alden cut
I: 我不是见了谁都想说话。自己一个人做自己的事，我也很舒服。
I: 以前在学校，博跟同学说话，总是让他们不高兴。只有我没有生气。
I: 后来，他就开始跟我一起玩。再后来，杰里米也跟我们一起玩了。
camera two Alden Jeremy cut
Alden: 你觉得我好，我很高兴。可是，为什么？
Jeremy: 因为你想成为英雄啊！
Jeremy: 你做事很认真，以后上大学要做什么，你都已经写了很多。
Jeremy: 可是，你还是想穿上那种衣服，去把树上的小猫救下来。
Jeremy: 我也不知道怎么说。就是……你这样，真的很好。
express Alden embarrassed
camera listener Alden cut
I: 我不知道该说什么。这件事，他就这样说了。
choice dream
option plan "想想写好的那些东西。" -> plan
option cat "想想树上的小猫。" -> cat
label plan
I: 我写了那么多以后可以做的事。他看见的，却是我一直想做的那件事。
goto boelaugh
label cat
I: 听起来像小孩子想做的事。可我还是想做那个去救它的人。
label boelaugh
camera two Alden Boe cut
express Boe laughing
Boe: 你看看你现在的脸！
express Boe confused
Boe: 等等。也许，他才是我们三个人里看得最清楚的人？
Boe: 我还真没想到。
end
