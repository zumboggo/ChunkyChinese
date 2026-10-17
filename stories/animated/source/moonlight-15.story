story 2
variable rare = false hidden
variable promise = false hidden
label opening
scene hall
ambience hall
show Hyun happy left
show Instructor neutral right
camera two Hyun Instructor cut
look Instructor Hyun
I: 教官还在等我说话。我差一点就笑了。
camera medium Hyun
I: 这个任务，可能很特别。
choice lucky
option friend "谁会和教官这么好？" -> friend ; rare = true
option training "谁会在这里练习三个星期？" -> training
label friend
I: 别人忙着去外面。我却来这里，和教官一起吃午饭。
goto conditions
label training
I: 别人学会了就走。我却对着木头人，练习了三个星期。
label conditions
camera two Hyun Instructor cut
I: 要在这个城市开始，还要和教官这么好。
I: 要认真练习用剑，却没有学过雕刻。
I: 最后，还得正好和他一起说雕刻不好。
camera medium Hyun
express Hyun excited
I: 这么多条件，我全都做到了。
I: 更好的是，这只是个E级任务。
I: 我身上的钱快没有了，面包也不多了。
choice face
option calm "先别笑，认真一点。" -> calm
option hungry "先别想面包，看着教官。" -> hungry
label calm
express Hyun neutral
I: 我不笑了，认认真真地想这个问题。
goto accept
label hungry
look Hyun Instructor
I: 我不再想面包，认真地看教官。
label accept
camera two Hyun Instructor cut
react Hyun nod
Hyun [determined]: 能帮您做这个任务，是我的荣幸。
Hyun [skeptical]: 虽然我不相信，真的有人能把月光做成东西。
Hyun [determined]: 不过，我会去问清楚。
camera listener Instructor over 0.65
express Instructor happy
sound chime
I: 我接受了任务。
Instructor [happy]: 谢谢你，韦德。这个任务就给你了。
choice vow
option truth "我会把事情问明白。" -> truth ; promise = true
option report "我会回来跟您说。" -> report
label truth
Hyun [determined]: 我会把事情问明白，再来跟您说。
goto payment
label report
Hyun [happy]: 等我问到了，就回来跟您说。
label payment
camera two Hyun Instructor cut
Instructor [neutral]: 先拿着这些钱。
camera medium Hyun
express Hyun surprised
I: 教官给了我两枚银币。
I: 还没出门，钱已经到了手里。
express Hyun excited
I: 我手里有了钱，心里一下子放心了。
choice money
option thanks "好好说声谢谢。" -> thanks
option careful "先把钱收好。" -> careful
label thanks
camera two Hyun Instructor cut
Hyun [happy]: 谢谢您，教官。
goto advice
label careful
I: 我小心地把钱收起来。现在，钱就在我这里了。
label advice
camera two Hyun Instructor cut
Instructor [curious]: 你先去一个地方。
Instructor [neutral]: 去雕刻店，问问那边的人。
Hyun [curious]: 就是卖雕刻的店，对吗？
Instructor [happy]: 对，先去那里问一下。
react Hyun nod
Hyun [determined]: 好，我知道了。
if rare == true -> friendReturn else trainingReturn
label friendReturn
camera medium Hyun
I: 原来，和教官一起吃午饭，还能得到这样的任务。
goto promiseReturn
label trainingReturn
camera medium Hyun
I: 三个星期对着木头人，现在终于有了新的任务。
label promiseReturn
if promise == true -> truthReturn else reportReturn
label truthReturn
I: 钱到手了。不过，说过要问明白的事，也得去做。
goto ending
label reportReturn
I: 钱到手了。不过，我还得回来，把结果跟教官说。
label ending
camera two Hyun Instructor cut
look Hyun Instructor
I: 两枚银币，一个任务。现在，该去雕刻店了。
end
