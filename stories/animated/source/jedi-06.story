story 2
variable station = 0 range 0 2 hidden
variable evidence = 0 range 0 2 hidden
variable prepared = false hidden
variable result = 0 range 0 2 hidden
label opening
scene station
show Jonathan curious left
show An determined right
camera two Jonathan An cut
look Jonathan An
I: 塔的灯还开着。An先检查门。
An [curious, explain]: 这里有铁板，可以修好从前的门。
if station == 1 -> intact else repair-promise
label intact
Jonathan [determined, explain]: 门还好，铁板先留在这里。
goto equipment
label repair-promise
Jonathan [determined, explain]: 回去的时候，我来修门。
goto equipment
label equipment
if station == 2 -> spent else intention
label spent
if evidence == 2 -> saber else rope
label saber
I: 光剑已经坏了，修门也不能修好它。
goto intention
label rope
I: 绳子已经牺牲了。我们没有新的绳子。
goto intention
label intention
An [curious, question]: 这里没有人，谁开了灯？
choice intention
option person "先找人。" -> person
option machine "先看机器。" -> machine
label person
Jonathan [worried, explain]: 有人吗？我们来帮忙。
I: 没有人回答。An看着我的脸。
goto preparation
label machine
An [determined, explain]: 好，不过要耐心听人的声音。
goto preparation
label preparation
I: 机器报警，风暴要来了。
An [worried, explain]: 那里的人还不知道。我们要提前通知他们。
choice preparation
option inspect "检查灯的电，找别的办法。" -> inspect ; prepared = true
option exit "先保护下去的路。" -> exit
label inspect
react Jonathan crouch
camera wide
An [curious, explain]: 灯还有电。它可以帮忙开门和通知，代价是灯再也不能开。
goto cage
label exit
activity Jonathan walk left slow
I: 我移动石头，开好下面的门。回去的路安全了。
activity Jonathan stop
move Jonathan left
goto cage
label cage
camera two Jonathan An cut
I: An去检查机器。门关了，她的手被挡在下面。
rest An attentive
An [worried, insist]: 别拉！我的手被挡住了。
rest Jonathan attentive
camera listener Jonathan over 0.65
I: 我停了。先听她说。
camera two Jonathan An cut
An [worried, explain]: 电池不够。开门的话，就不能通知他们。
An [determined, explain]: 我可以出来，不过手会受伤。不能再移动石头。
Jonathan [worried, question]: 你要我选择你受伤？
An [determined, insist]: 别为了救我，让他们听不到。
camera listener Jonathan over 0.65
I: 她看着我，没有犹豫。
if prepared == true -> earned else basic
label earned
camera two Jonathan An cut
choice decision-earned
option lift "电池开门，不能通知他们。" -> lift ; result = 0
option signal "通知他们，An的手会受伤。" -> signal ; result = 1
option relay "牺牲灯，保护An，通知他们。" -> relay ; result = 2
label basic
camera two Jonathan An cut
choice decision-basic
option lift "电池开门，不能通知他们。" -> lift ; result = 0
option signal "通知他们，An的手会受伤。" -> signal ; result = 1
label lift
react Jonathan reach
I: 门开了。An出来了，手没有受伤。没有通知他们。
An [sad, explain]: 你救了我。现在，我们要告诉路上的人。
goto aftermath
label signal
I: 他们接到信息了。An自己出来，手受伤了。
An [worried, explain]: 别碰这只手。我可以走，不过不能移动石头。
goto aftermath
label relay
react Jonathan crouch
I: 灯的电开了门，通知了他们。灯坏了。
An [worried, explain]: 我没有受伤。不过，那里的人再也看不到灯了。
goto aftermath
label aftermath
rest An relaxed
camera listener An over 0.65
I: 她慢慢呼吸。我耐心等着。
camera two Jonathan An cut
choice account
option own "我会诚实地说我的选择。" -> own
option ask "你想怎么说今天的事？" -> ask
label own
An [determined, explain]: 我会补充我的经历。
goto return
label ask
An [determined, explain]: 别只说我很了不起。要说所有选择的代价。
goto return
label return
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
if station == 1 -> door-intact else door-fixed
label door-fixed
I: 回去的时候，我拿铁板修好从前的门。An检查，不移动石头。
if station == 0 -> archive-lost else promise-kept
label archive-lost
I: 门修好了，牺牲的记录不能回来。
goto next
label promise-kept
Jonathan [determined, explain]: 我们答应修门。现在修好了。
goto next
label door-intact
I: 从前的门和记录还在。家里的管子仍然坏着。
goto next
label next
I: 我们安全回来了。屋子的水没有变多，没有变少。
An [curious, explain]: 塔上面的记录有那段声音。孩子妈妈的声音。
Jonathan [determined, explain]: 我们要和她一起听。别替她回答。
I: 我要听声音的主人说的话。
end
