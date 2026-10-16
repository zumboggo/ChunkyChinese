story 2
variable sword = false hidden
variable time = false hidden
label opening
scene hall
ambience hall
show Hyun happy left
show Instructor curious right
camera two Hyun Instructor cut
activity Hyun eat eager
I: 我还在教官旁边吃午饭。
I: 一口，再一口。我的手好像只会做这一件事了。
I: 肚子终于舒服了，手却还不想停。
look Instructor Hyun
Instructor [curious]: 对了，你觉得雕刻怎么样？
camera listener Hyun over 0.65
activity Hyun pause
express Hyun surprised
react Hyun shock
I: 我的手停了。雕刻？那是什么？
look Hyun down
Hyun [neutral]: 先把嘴里的饭吃完，再说话。
camera two Hyun Instructor cut
look Hyun Instructor
Hyun [curious]: 您说的雕刻，是一种做东西的本事吗？
activity Hyun resume
Instructor [neutral]: 我只是想听听，你觉得这种本事怎么样？
camera listener Hyun over 0.65
express Hyun worried
I: 怎么会问这个？我还不知道要怎么说。
look Hyun down
Hyun [neutral]: 等等，先想一想。
I: 我不说话，心里却一下子想了很多。
choice read
option blade "想想教官怎么看剑。" -> blade ; sword = true
option practice "想想教官怎么看练习。" -> practice
label blade
look Hyun Instructor
Hyun [neutral]: 在他心里，剑比什么都好。
Hyun [neutral]: 他觉得，有了剑，什么事都可以做好。
goto understand
label practice
look Hyun Instructor
Hyun [neutral]: 他最喜欢看人认真练习。
Hyun [neutral]: 练得越认真，他就越开心。
label understand
camera medium Hyun
I: 这三个星期，我已经看明白了。
Hyun [neutral]: 他想的事情很简单，眼里几乎只有剑。
Hyun [curious]: 这样的人，为什么现在问我雕刻呢？
look Hyun Instructor
I: 我看了看教官，知道要怎么说了。
choice plan
option moment "别在这种事上花时间。" -> moment ; time = true
option identity "我可是用剑的人。" -> identity
label moment
Hyun [neutral]: 他一定只想把时间用在练习上。
goto answer
label identity
Hyun [neutral]: 他一定想听我说，剑是最重要的。
label answer
activity Hyun stop
camera two Hyun Instructor cut
express Hyun disappointed
react Hyun shake-head
Hyun [disappointed]: 教官，您怎么会问这种问题？
camera listener Instructor over 0.65
express Instructor curious
I: 我让自己看起来很不开心。教官却还在等我说完。
camera medium Hyun
react Hyun proud
Hyun [determined]: 我可是用剑的人！
Hyun [disappointed]: 雕刻这种小本事，也要我去想吗？
Hyun [determined]: 我从来没有想过，一次也没有！
camera listener Instructor over 0.65
express Instructor happy
react Instructor cheer
I: 教官不但没生气，还开心地拍手。
Instructor [happy]: 我就知道，你一定会这么说！
camera listener Hyun over 0.65
express Hyun relieved
I: 啊，说对了。他真的爱听这个。
if sword == true -> swordReturn else practiceReturn
label swordReturn
Hyun [neutral]: 刚才想到他眼里只有剑，真的没错。
goto agree
label practiceReturn
Hyun [neutral]: 刚才想到他最喜欢看人练习，真的没错。
label agree
camera two Hyun Instructor cut
look Hyun Instructor
react Hyun shake-head
Hyun [determined]: 那种东西，我们想都不用想。
if time == true -> timeReturn else identityReturn
label timeReturn
Hyun [determined]: 连一点时间都不要花在上面！
goto pleased
label identityReturn
Hyun [determined]: 我们用剑的人，为什么要想那种事？
label pleased
camera listener Instructor over 0.65
express Instructor happy
react Instructor nod
Instructor [happy]: 说得好！你说的跟我想的一样。
camera listener Hyun over 0.65
express Hyun happy
I: 看不见的交情，好像又多了一点。
camera medium Hyun
look Hyun down
Hyun [neutral]: 原来，还可以这样让人喜欢自己。
Hyun [neutral]: 不用一起去打仗，也不用花很多时间和钱。
Hyun [neutral]: 找到他不喜欢的东西，跟着说说它有多不好。
look Hyun Instructor
Hyun [neutral]: 他就觉得，你和他是一样的人了。
camera two Hyun Instructor cut
I: 教官笑得很开心。我也跟着笑了。
camera listener Hyun over 0.65
express Hyun skeptical
activity Hyun eat eager
I: 可是，雕刻到底是什么？我还是不知道。
end
