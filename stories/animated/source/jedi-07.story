story 2
variable tower = 0 range 0 2 hidden
variable archive = 0 range 0 1 hidden
variable tested = false hidden
variable result = 0 range 0 2 hidden
label opening
scene home
show Jonathan curious left
show Mother worried right
camera two Jonathan Mother cut
look Jonathan Mother
Mother [worried, question]: 你又听到我的声音了？
Jonathan [determined, explain]: 是。不过现在，先问你。
Mother [sad, explain]: 孩子已经安全了。为什么我的声音还在要水？
I: 孩子在屋子，朋友陪着。妈妈和我们一起去塔。
I: 我捎来电池，电够了。不过坏电线还不能用。
scene station
show Jonathan curious left
show Mother worried right
show An worried far-right
camera wide
if tower == 1 -> injury else unhurt
label injury
An [worried, explain]: 我的手还没好。我不移动石头，看记录就好。
goto warning
label unhurt
An [determined, explain]: 我来读记录。你们先听。
goto warning
label warning
if tower == 0 -> unsent else sent
label unsent
I: 从前没有通知他们。看见朋友，我们就提醒他们风暴要来了。
goto voice
label sent
I: 他们接到信息，提前回去了。
goto voice
label voice
camera two Jonathan Mother cut
I: 机器里传来：孩子要水。妈妈的脸变了。
Mother [sad, explain]: 从前我向机器要水。我没有答应它可以再说。
rest Jonathan attentive
camera listener Jonathan over 0.65
I: 我本来想说机器的事，现在停下来。
camera two Jonathan Mother cut
choice intention
option permission "你愿意和我们一起研究吗？" -> permission
option memory "从前你还说了什么？" -> memory
label permission
Mother [determined, explain]: 可以。不过，别替我答应再用我的声音。
goto preparation
label memory
Mother [determined, explain]: 我说孩子害怕。不过现在，我要说的是：先问我。
Jonathan [determined, question]: 我们可以一起研究吗？
Mother [determined, explain]: 可以。我也要听。
goto preparation
label preparation
camera wide
An [curious, explain]: 记录说，机器把录音传给管子。管子没有水，下面就有声音。
An [determined, explain]: 这是这里的记录。不是从前那段录音。
choice preparation
option test "用我的声音试一试。" -> test ; tested = true
option wires "不录新声音，先检查电线。" -> wires
label test
Jonathan [determined, explain]: 我答应录这句。试完就关掉：我们在这里。
I: 管子里有我的声音。妈妈关掉开关。
Mother [determined, explain]: 我听得出它在重复，不是有人在下面回答。
An [curious, explain]: 试过以后，我知道哪边只管声音。还要旧站的记录，才能安全分开。
goto archive
label wires
react Jonathan crouch
I: 我检查电线。它们连在一起。哪条管声音，还不知道。
goto archive
label archive
if archive == 0 -> lost else retained
label lost
An [sad, explain]: 旧站的记录已经没了。不能假装我们知道怎么分开。
goto warning-final
label retained
An [determined, explain]: 旧站的记录还在。上面有电线的画。
goto warning-final
label warning-final
camera two Jonathan Mother cut
Mother [worried, explain]: 这里的开关可以叫它停。不过，接到外面的要求，它就再说。
An [worried, explain]: 打坏机器，声音就停，这里的记录也会没了。
Mother [determined, explain]: 保护机器，可以研究谁用过。不过我的声音还会再说。
Jonathan [determined, insist]: 偷来的声音，不是答应。
rest Mother attentive
camera listener Mother over 0.65
I: 她没有点头。她在等我的选择。
if tested == true -> check-archive else basic
label check-archive
if archive == 1 -> earned else basic
label earned
camera wide
choice decision-earned
option destroy "打坏机器，牺牲这里的记录。" -> destroy ; result = 0
option preserve "保护机器，研究记录，它还会说话。" -> preserve ; result = 1
option isolate "用试验和记录，分开声音的电。" -> isolate ; result = 2
label basic
camera wide
choice decision-basic
option destroy "打坏机器，牺牲这里的记录。" -> destroy ; result = 0
option preserve "保护机器，研究记录，它还会说话。" -> preserve ; result = 1
label destroy
react Jonathan reach
I: 我用石头打坏机器。声音停了，这里的记录也没了。
Mother [sad, explain]: 现在我可以不听了。不过是谁做的，还不知道。
goto aftermath
label preserve
I: 我把门关好，写下要求：别跟着声音走。
Mother [sad, insist]: 我没有答应。记录里也要写这句。
goto aftermath
label isolate
react Jonathan crouch
I: An看着记录，我按试过的办法分开电线。
Mother [relieved, explain]: 声音停了。记录还在。现在，可以听我说了。
goto aftermath
label aftermath
rest Mother relaxed
camera listener Mother over 0.65
I: 妈妈慢慢呼吸。我没有替她说没事了。
camera two Jonathan Mother cut
choice account
option together "你来说你的经历。" -> together
option cost "我来记录我的选择和代价。" -> cost
label together
Mother [determined, explain]: 我会说。也会说我不满意的地方。
goto report
label cost
Mother [determined, explain]: 诚实地记录。研究，不能替我答应。
goto report
label report
if tower == 2 -> carry else send
label carry
An [determined, explain]: 灯的电已经坏了，不能通知他们。我们得亲自捎回这些事。
goto next
label send
I: 塔的机器帮忙通知他们：别跟着声音走。
goto next
label next
scene home
show Jonathan curious left
show Mother determined right
show An worried far-right
camera wide
I: 我们安全回来了。屋子的水没有变多，没有变少。
Mother [curious, explain]: 机器外面还有一行字：东边来的要求，由人打开。
Jonathan [curious, question]: 机器会重复。可是，是谁要求它再说？
An [determined, explain]: 我们要去东边。先和人沟通，然后研究机器。
I: 我知道声音怎么来的。还不知道谁要我们听。
end
