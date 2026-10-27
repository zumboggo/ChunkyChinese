story 2
variable evidence = 0 range 0 2 hidden
variable prepared = false hidden
variable part = false hidden
variable held = false hidden
label opening
scene ravine
show Jonathan determined left
show An worried right
camera two Jonathan An cut
look Jonathan An
I: An给我最后的点心。
Jonathan [curious, question]: 你不想吃吗？
An [happy, explain]: 想。我们分吧。
I: 我分好点心，和她一起吃。
if evidence == 0 -> find-route else known-route
label find-route
An [determined, explain]: 没有记录，先找路。杯子的水不能喝。
activity Jonathan walk right slow
activity An walk right slow
I: 我们看着管子慢慢找路，不能马虎。
activity Jonathan stop
activity An stop
goto arrival
label known-route
An [determined, explain]: 记录说，走上面的路。那里安全。
I: 我们不用再找路。
goto arrival
label arrival
scene station
show Jonathan curious left
show An determined right
camera wide
I: 旧站的门开着。这里没有人。
react An crouch
An [curious, explain]: 这零件可以修好我们的管子。
react Jonathan reach
An [worried, insist]: 先别捎走！它还在帮门挡水。
rest Jonathan attentive
camera listener Jonathan over 0.65
I: 我停了，看着零件。
camera two Jonathan An cut
choice intention
option home "屋子里的人还在等。" -> home
option cost "捎走它，谁付代价？" -> cost
label home
An [worried, explain]: 我知道。不过，不能为了修管子，牺牲所有的安全。
goto evidence
label cost
An [determined, explain]: 先检查。别要求看不见的人替我们付。
goto evidence
label evidence
if evidence == 1 -> no-sample else test-sample
label test-sample
react An reach
I: An用这里的机器检查杯子的水。
An [worried, explain]: 水不干净，不能喝。修好管子，不表示水干净。
goto preparation
label no-sample
An [worried, explain]: 没有水可以检查。这里的水还不能喝。
goto preparation
label preparation
An [determined, explain]: 水的声音大起来了。先检查门，还是保护回去的路？
choice preparation
option inspect "检查门，研究怎么修。" -> inspect ; prepared = true
option exit "先保护回去的路。" -> exit
label inspect
react An crouch
react Jonathan crouch
camera wide
An [curious, explain]: 可以挡好门，不过要牺牲我们的东西。
if evidence == 2 -> saber-warning else rope-warning
label rope-warning
An [determined, explain]: 牺牲绳子，就可以捎零件。风暴再来的时候，门非修好不可。
goto rising
label saber-warning
Jonathan [worried, explain]: 绳子在裂缝，回不来了。我的光剑可以挡在这里。
An [worried, explain]: 可以。不过，光剑会坏，再也修不好了。风暴再来的时候，门非修好不可。
goto rising
label exit
move Jonathan far-left
camera wide
I: 我开好门，移动石头，保护回去的路。
An [determined, explain]: 路安全了。不过，还没有检查挡水的门。
move Jonathan left
goto rising
label rising
react An brace
camera listener An over 0.65
An [worried, insist]: 水来了！我先挡着。你听好。
camera two Jonathan An cut
An [worried, explain]: 先捎走零件，门就会坏。水去下面没有人的屋子，从前的记录就没了。
An [worried, explain]: 我们可以安全回来。留下零件，门和记录就安全，不过屋子的管子还不能修。
Jonathan [determined, explain]: 捎走它，谁付代价？
if prepared == true -> earned else basic
label earned
if evidence == 2 -> earned-saber else earned-rope
label earned-rope
choice decision-rope
option drain "捎零件，牺牲从前的记录。" -> drain ; part = true
option leave "不捎零件，保护门和记录。" -> leave
option brace-rope "牺牲绳子，挡好门。" -> brace-rope ; part = true, held = true
label earned-saber
choice decision-saber
option drain "捎零件，牺牲从前的记录。" -> drain ; part = true
option leave "不捎零件，保护门和记录。" -> leave
option brace-saber "牺牲我的光剑，挡好门。" -> brace-saber ; part = true, held = true
label basic
choice decision-basic
option drain "捎零件，牺牲从前的记录。" -> drain ; part = true
option leave "不捎零件，保护门和记录。" -> leave
label drain
react Jonathan reach
I: 我捎走零件。我们一起出来。
camera wide
An [sad, explain]: 水去下面了。门坏了，从前的记录没了。
goto aftermath
label leave
react Jonathan reach
An [relieved, explain]: 门还在。我们没有零件，不过回去要说为什么。
goto aftermath
label brace-rope
react Jonathan crouch
I: 我们检查过了。现在牺牲绳子，挡好门，捎走零件。
goto held
label brace-saber
react Jonathan crouch
I: 我关好光剑，放在门下面。光剑被门压坏了。
An [sad, question]: 你舍得？
Jonathan [determined, explain]: 这是我的选择。不是别人替我付。
I: 我捎走零件，坏光剑就放在那里。
goto held
label held
An [worried, explain]: 记录安全了。不过，门挡不住风暴。我们答应回来修。
goto aftermath
label aftermath
rest An relaxed
camera listener An over 0.65
I: An不挡门了。她慢慢呼吸，我耐心等着。
camera two Jonathan An cut
choice account
option together "回去一起说。" -> together
option responsibility "我的选择，我先说代价。" -> responsibility
label together
An [determined, explain]: 好。捎什么回来，牺牲什么，一起说。
goto return
label responsibility
An [determined, explain]: 我会补充我说的话。一起负责，不是你替所有人说话。
goto return
label return
scene home
show Jonathan worried left
show An determined right
camera two Jonathan An cut
I: 我们安全回来了。屋子的水没有变多，没有变少。
if part == true -> repaired else unrepaired
label repaired
react An crouch
I: An修好了管子，不过水的开关还关着。
An [determined, explain]: 管子修好了。水干净了，就可以开。
goto next
label unrepaired
An [determined, explain]: 管子还坏着，开关还关着。旧站的门和记录还在。
goto next
label next
An [curious, explain]: 出来的时候，我看见北边的塔，那里有红灯。
Jonathan [curious, question]: 旧站关了，谁在塔里？
An [determined, explain]: 还不知道。我们要去研究，不过不能忘记今天的代价。
I: 我记录今天的收获，然后记录所有的代价。
end
