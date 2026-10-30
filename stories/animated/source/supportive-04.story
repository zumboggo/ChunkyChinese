story 2
label opening
scene field
show Alden worried left
show Coach neutral right
rest Alden guarded
rest Coach attentive
look Alden Coach
look Coach Alden
camera two Alden Coach cut
I: 我十一岁了。爸爸妈妈走了以后，他们找到了康妮阿姨。现在，我们一起生活。
I: 她爱我，我也爱她。可是，跟她生活，很多事情都得我来想。
I: 今天打完棒球，其他人都回家了。我还在等。教练也没有走。
Coach [worried,explain]: 你很懂事，我就直说了。
Coach [frustrated]: 不应该总是你像个大人一样。她做事太不让人放心了。
camera listener Alden over 0.6
I: 我低头看看自己的鞋，在地上动了动。我不喜欢听别人这样说她。
choice waiting
option defend "说她一定会来。" -> defend
option release "让他不用等我。" -> release
label defend
Alden [determined]: 她会来接我的。就是要再等一会儿。
Coach [worried]: 上次她让你一直等，这里都关门了。你以为我不知道？
goto aftercoach
label release
Alden [neutral,reassure]: 你不用等我。她一定会来的。
Coach [worried]: 可上次，这里都关门了，她还没来。这事我知道。
label aftercoach
camera two Alden Coach cut
I: 我不喜欢他说的话。可我也没办法说，他说得不对。
I: 其实，有时候，我可以自己回家。我已经用她的名字，在手机上做了登记。
I: 那样，就可以用这里的电动车。本来只有大人才能用。
choice secret
option capable "想跟他说，我能自己回家。" -> capable
option concern "想想他听了会怎么说。" -> concern
label capable
I: 我想说，我有办法，不是只能在这里等。可是，我最后没有说。
goto stay
label concern
I: 我没有说。他听了，可能更觉得，我才是家里那个大人。
label stay
I: 他还是在这里，跟我一起等。没有因为我说不用，就真的走了。
scene home
show Alden neutral left
show Connie happy right
rest Alden relaxed
rest Connie relaxed
camera two Alden Connie cut
I: 后来，她真的来了。今天只晚了一个小时。
Connie [embarrassed,explain]: 路上车太多了。
I: 车后面还有六盒冰淇淋。已经全化了。
I: 没关系。我们把那些不要了，又买了新的，当晚饭吃。
express Alden happy
I: 她不是不爱我。有时候，跟她生活，也会有这样的晚上。
I: 她工作的地方，有几个人来了。他们带了吃的、喝的，声音也越来越大。
choice room
option noise "听听越来越大的声音。" -> noise
option visitors "看看家里的人。" -> visitors
label noise
I: 声音越来越大。我已经不想在这里了。
goto retreat
label visitors
I: 他们很开心。我却不太舒服，还是想回自己的房间。
label retreat
scene desk
show Alden neutral center
rest Alden seated
camera listener Alden cut
I: 我回房间，戴上耳机。先玩了一会儿电脑，再做学校的功课。
I: 今天要读的，是系统来到地球以后的事。这些，我大多已经知道。
I: 七十年前，外星人带来了系统。人们可以得到力量，也可以学到新的知识。
I: 不过，得到力量的人，要在他们需要的时候，去帮他们做事。
I: 有些事很难。做的事越难，给的东西就越好。很多人觉得，这个办法很好。
I: 我把要读的东西读到最后。那里有一个问题。
I: 你想不想得到特别的力量？
choice wish
option help "想想能为别人做的事。" -> help
option power "想想有力量的自己。" -> power
label help
I: 我知道，这些力量能帮助别人。就算发生过那些事，我也没有马上说不。
goto yes
label power
I: 我看看那个问题。知道力量会带来什么，没有让我完全不想要它。
label yes
I: 我只想了一下，就选了“想”。
I: 电脑说，百分之九十六的学生，都跟我一样。
I: 可是，每一万个人里面，只有七个人能得到系统的力量。
express Alden disappointed
I: 原来，有那么多人想要，却一直没有得到。我也不太开心。
I: 我做完题，全对。电脑上出现了好看的烟花。
I: 功课做完了。外面的人却还没有走，我也还没办法睡。
express Alden sad
I: 我想要力量。可是，三年前的那个晚上，还有一些事情，我一直想不明白。
end
