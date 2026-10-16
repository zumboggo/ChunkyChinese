story 2
variable tired = false hidden
variable deadline = false hidden
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
I: 游戏里，三个星期过去了。我每天都来。
I: 还是这个地方，还是手里的剑。
camera medium Hyun
Hyun [neutral]: 以前一直练习，身体好了。现在每天睡四个小时也能起来。
I: 除了睡觉，我几乎一直在游戏里。
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 tiring
I: 每次进来，差不多八十个小时，都这样打下去。
camera listener Hyun over 0.65
express Hyun disappointed
rest Hyun downcast
look Hyun down
I: 想到这三个星期，我心里也很累。
Hyun [disappointed]: 一次，又一次。什么时候会不一样？
choice remember
option body "想想身体有多累。" -> body ; tired = true
option same "想想每天都一样。" -> same
label body
Hyun [worried]: 手里的剑还在动。我却好想休息。
goto notice
label same
Hyun [disappointed]: 不是不会做。是每天都这样做，太难了。
label notice
camera medium Hyun
I: 可是，每过一段时间，系统就会说，我变了一点。
sound chime
express Hyun surprised
rest Hyun attentive
look Hyun front
camera listener Hyun over 0.65
I: 力量多了一点。敏捷也多了一点。
Hyun [relieved]: 又变了。
I: 要是一直没有这些声音，我可能已经不想做了。
camera medium Hyun
I: 这一次，还有以前没有的东西。
I: 新的属性：斗志。
Hyun [curious]: 这是什么？
I: 它能让我在一小段时间里，变得特别强。
I: 也能只用眼睛，让比我差的怪物跪下。
express Hyun surprised
camera listener Hyun over 0.65
Hyun [surprised]: 只看一眼，也可以？
camera medium Hyun
I: 可是，我不能自己让这个数字变大。
I: 要一直打，常常面对比自己强的怪物，它会自己慢慢变。
I: 还有一个新的：耐力。
Hyun [curious]: 做一样的事，可以少用一点力气？
react Hyun nod
I: 这个也一样，不能自己让它变大。要真的去做。
camera listener Hyun over 0.65
Hyun [relieved]: 原来，练习带来的，不只是刚才那两点。
sound chime
camera medium Hyun
I: 系统又说，用剑的本事也变好了。
I: 剑术：初级三级。现在是百分之零。
I: 用剑时，打得更强，多百分之三十；也更快，多百分之九。
express Hyun happy
camera listener Hyun over 0.65
Hyun [happy]: 手里的剑，没有白动。
if tired == true -> bodyReturn else sameReturn
label bodyReturn
Hyun [relieved]: 刚才只想着累。现在看到这些，心里又有了力气。
goto totals
label sameReturn
Hyun [relieved]: 刚才觉得每天都一样。原来，我已经不一样了。
label totals
camera medium Hyun
I: 三个星期，力量一共多了二十八点。
I: 敏捷多了二十五点，体力多了二十二点。
express Hyun frustrated
look Hyun down
camera listener Hyun over 0.65
Hyun [frustrated]: 可是，还是太慢了。
I: 开心是真的。觉得自己太慢，也是真的。
choice urgency
option count "想想已经得到的。" -> count
option time "想想还有多少时间。" -> time ; deadline = true
label count
Hyun [determined]: 这些都是我练习得到的。我知道这样做有用。
goto promise
label time
Hyun [worried]: 四个星期的时间一到，我就能离开城市了。
label promise
camera medium Hyun
Hyun [determined]: 要是不快一点，到时候还得留在这里打它。
Hyun [determined]: 我必须在能离开城市以前，把这里的练习做完。
if deadline == true -> timeReturn else countReturn
label timeReturn
camera listener Hyun over 0.65
Hyun [determined]: 刚才想的是时间。不能到了那一天，我还没准备好。
goto finish
label countReturn
camera listener Hyun over 0.65
Hyun [determined]: 刚才想的是已经得到的。现在，还要再多做一点。
label finish
look Hyun Dummy
rest Hyun attentive
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 steady
I: 剑又动了。这一次，我心里想的是离开这里的那一天。
end
