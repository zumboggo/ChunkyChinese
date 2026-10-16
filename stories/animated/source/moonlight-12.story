story 2
variable bread = false hidden
variable promise = false hidden
label opening
scene hall
ambience hall
show Hyun determined left
show Dummy neutral right
prop Hyun sword
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 tiring
I: 我还在练习，肚子却先叫起来了。
camera listener Hyun over 0.65
express Hyun embarrassed
Hyun [embarrassed]: 又饿了……现在不是吃饭的时候吧。
camera medium Hyun
I: 练习的效果来得慢，面包却吃得太快。
I: 水喝完了，可以去外面再拿。面包吃完了，就得花钱买。
choice worry
option food "想想还有几个面包。" -> food ; bread = true
option money "想想买面包的钱。" -> money
label food
Hyun [worried]: 再这样吃下去，很快就没有了。
goto smell
label money
Hyun [worried]: 进来是为了钱，怎么先花钱吃饭了？
label smell
camera medium Hyun
I: 这时候，饭菜的香味过来了。
express Hyun curious
look Hyun away
camera listener Hyun over 0.65
Hyun [curious]: 谁在吃饭？闻起来真好！
prop Hyun none
move Dummy exit
show Instructor happy right
camera two Hyun Instructor cut
I: 教官正在拿出自己的午饭。我的手停了，眼睛也跟着过去了。
camera medium Hyun
Hyun [happy]: 教官！您好啊！
I: 我走过去。要是我有尾巴，现在一定已经动起来了。
camera listener Instructor over 0.65
express Instructor happy
Instructor [happy]: 哦，是你啊！怎么过来了？
camera two Hyun Instructor cut
Hyun [happy]: 一个人吃饭，不会太安静了吗？我来和您说说话。
camera listener Hyun over 0.65
express Hyun embarrassed
I: 话刚说完，肚子又叫了一声。这次比我说得还清楚。
camera listener Instructor over 0.65
express Instructor happy
Instructor [happy]: 你是饿了吧？来，坐在我旁边。
camera two Hyun Instructor cut
Instructor [happy]: 我带得多，两个人也吃不完。
camera listener Hyun over 0.65
express Hyun relieved
react Hyun nod
Hyun [relieved]: 谢谢您！
if bread == true -> foodReturn else moneyReturn
label foodReturn
I: 刚才还在担心面包，现在面前就是午饭。
goto welcome
label moneyReturn
I: 刚才还在担心花钱，现在可以好好吃饭了。
label welcome
camera medium Instructor
Instructor [proud]: 不用谢。以后你会成为了不起的冒险者，能请你吃饭，我也很开心。
camera listener Hyun over 0.65
express Hyun surprised
I: 我还没有离开城市，教官已经想到那么远了。
camera medium Instructor
Instructor [happy]: 有一天，城市外面的人也会听说你的名字。
Instructor [happy]: 到了那个时候，可别忘记我啊。
camera listener Hyun over 0.65
express Hyun happy
choice answer
option remember "我一定会记得您。" -> remember ; promise = true
option thanks "您对我这么好，我怎么会忘记呢？" -> thanks
label remember
Hyun [determined]: 以后大家知道我，也会知道是谁请我吃饭的。
goto lunch
label thanks
Hyun [happy]: 今天的午饭，我会好好记在心里。
label lunch
camera listener Instructor over 0.65
express Instructor happy
react Instructor nod
I: 教官听了很开心。我也终于吃上了午饭。
camera two Hyun Instructor cut
I: 我坐在教官旁边，一口接着一口。
Hyun [happy]: 真好吃！
camera listener Hyun over 0.65
express Hyun relieved
I: 为了吃饭，说了这么多好听的话，我也觉得自己有点可怜。
camera medium Hyun
Hyun [neutral]: 不过，教官是游戏里的人。跟游戏里的人说点好话，也没关系吧？
I: 肚子里有了东西，心里也舒服了。
if promise == true -> promiseReturn else thanksReturn
label promiseReturn
Hyun [neutral]: 刚才说一定会记得教官。这三个星期，教官也一直记得我。
goto ending
label thanksReturn
Hyun [neutral]: 刚才说不会忘记。这三个星期，教官对我真的很好。
label ending
camera two Hyun Instructor cut
I: 三个星期，变好的不只是身体。我和教官，也越来越了解对方了。
camera listener Hyun over 0.65
express Hyun happy
I: 今天，这样的交情变成了面前的午饭。
end
