story 2
variable water = false hidden
variable listen = false hidden
label opening
scene hall
ambience hall
environment dust
show Hyun determined left
show Dummy neutral right
prop Hyun sword
look Hyun Dummy
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 tiring
I: 又过了五个小时。我还在这里练习。
I: 手里的剑，一次又一次打在它身上。
sound chime
camera medium Hyun
I: 系统的声音又来了。体力多了一点。
I: 敏捷也多了一点。两个数字几乎同时变了。
express Hyun relieved
camera listener Hyun over 0.65
Hyun [relieved]: 啊……终于可以休息一下了。
camera medium Hyun
prop Hyun none
react Hyun sigh
rest Hyun downcast
look Hyun down
I: 我不再拿着剑。现在发现，身体已经很累了。
I: 这么长时间，没吃东西，也没喝水。
Hyun [worried]: 口好干。我也好饿。
choice need
option drink "先想想水。" -> drink ; water = true
option food "先想想吃的。" -> food
label drink
Hyun [worried]: 有水就好了。
goto inventory
label food
Hyun [worried]: 现在，一点吃的也好。
label inventory
look Hyun front
camera medium Hyun
Hyun [neutral]: 打开背包。
react Hyun reach
I: 我的东西出现在眼前。
I: 水，还有十块面包。
express Hyun surprised
camera listener Hyun over 0.65
Hyun [surprised]: 就这些？
I: 我再看一次。只有这些。
express Hyun disappointed
camera medium Hyun
Hyun [disappointed]: 想要更多东西，就得自己去找。
I: 其他新来的人做简单的任务，得到钱。
Hyun [determined]: 可我一分钟也不想等。
react Hyun reach
I: 我拿出水和一块面包。
I: 这是黑麦面包。我吃了一小口。
express Hyun relieved
rest Hyun relaxed
camera listener Hyun over 0.65
I: 我不再那么饿了。系统里的满足感也高了一点。
if water == true -> waterReturn else foodReturn
label waterReturn
Hyun [relieved]: 刚才只想着水。原来，也这么需要吃东西。
goto rule
label foodReturn
Hyun [relieved]: 刚才只想着吃的。这一小口，已经不一样了。
label rule
camera medium Hyun
Hyun [neutral]: 每五个小时，就要吃一次东西。
Hyun [neutral]: 如果一直这样练习，就要多吃几次。
Hyun [skeptical]: 可是，一定要吃得很饱吗？
react Hyun shake-head
Hyun [determined]: 不用。能活着，就可以了。
I: 很快，我就吃完了。
rest Hyun attentive
look Hyun Dummy
prop Hyun sword
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 2 steady
I: 剑又在手里。我站到那个稻草人面前。
move Dummy exit
show Watcher surprised right
move Watcher turn
look Watcher Hyun
camera two Hyun Watcher cut
Watcher [surprised]: 那个人又开始了！
express Hyun determined
camera listener Hyun over 0.65
I: 我听到了。手里还是拿着剑。
camera medium Watcher
Watcher [skeptical]: 那个人是不是疯了？
express Hyun embarrassed
look Hyun away
camera listener Hyun over 0.65
choice voices
option notice "听听那些人还说什么。" -> notice ; listen = true
option focus "继续想怎么练习。" -> focus
label notice
Hyun [embarrassed, hesitant]: 我只是练习。那些人却越说越奇怪。
goto comments
label focus
Hyun [determined]: 别人的话，不能帮我变强。
label comments
camera medium Watcher
Watcher [confused]: 那个人是不是很恨那个东西？
Watcher [skeptical]: 那个东西不变成几块，那个人不会停吧。
express Hyun determined
look Hyun down
camera listener Hyun over 0.65
I: 大家在看我。我在看手里的剑。
if listen == true -> heard else ignored
label heard
Hyun [determined]: 那些人以为我在生气。我只是不想停。
goto finish
label ignored
Hyun [determined]: 刚才想的是练习。现在，就接着做。
label finish
move Watcher exit
show Dummy neutral right
look Hyun Dummy
rest Hyun attentive
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 steady
I: 不休息了。面前还是它，下一剑还是我来。
end
