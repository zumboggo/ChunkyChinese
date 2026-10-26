story 2
variable rope = false hidden
variable hidden = false hidden
variable result = 0 range 0 3 hidden
label opening
scene port
show Jonathan neutral left
show An worried right
show Q neutral far-left
camera two Jonathan An cut
I: 孩子和妈妈在一起了。不过，那里的水只够今天喝。
I: 我和An、Q的飞船来到Neri星球。
An [worried]: 这里有水。我们要捎水回去。
Q: 那个声音的录音还在。
Jonathan [determined]: 先给他们水喝，然后找声音。
show Tao neutral center
camera two Jonathan Tao cut
Tao [neutral]: 我是Tao。我在下面工作，给你们装水。
Tao [happy]: 回去吧。等水的人，可没有耐心。
An [worried]: 机器很旧。绳子和电池，我们只能选一样。
Q: 绳子可以拉人。电池可以修机器，保护水。
choice equipment
option rope "要绳子。先保护人。" -> ropegear ; rope = true
option part "要电池。他们要喝水。" -> partgear
label ropegear
Tao [relieved]: 好。你没有忘记下面的人。
goto market
label partgear
Tao [neutral]: 好。人安全了，水没有了，怎么办？
label market
scene market
show Jonathan neutral left
show An worried far-left
show Min worried right
show Q neutral far-right
camera two Jonathan Min cut
I: Min偷偷拿水，放在衣服下面。
Min [worried]: 我叫Min。妻子有重病。她不能等。
An [skeptical]: 这水不是你的。这里的人要喝什么？
Min [worried]: 我知道。可她今天就要喝。
choice bottle
option report "向An说明，给Min我的水。" -> report
option cover "替他保密，他可以捎水回去。" -> cover ; hidden = true
label report
Jonathan [neutral]: 这水放回去。我的给你。我少喝。
Min [sad]: 你给了我水。不过，她知道我偷水了。
goto failure
label cover
Min [relieved]: 谢谢。不过，水少了，他们会知道。
Jonathan [worried]: 我知道。我们一起负责。
label failure
scene pump
show Jonathan shocked left
show An scared right
show Q neutral far-left
show Min worried far-right
camera wide cut
I: 石头在动。下面有人喊：救我！
I: 门坏了！这里都是水！
An [scared]: 我去开下面的门！
move An center
react Jonathan block
Jonathan [worried]: 等等！先听Q说！
Q: 开门可以救Tao。不过，水会流走。
Q: 关门可以保护水。Tao会死。
camera listener An over 0.6
An [sad]: 那里的孩子等着喝水。不过，Tao是我的朋友。
camera wide cut
if rope == true -> roperisk else partrisk
label partrisk
Q: 有电池。Tao可以出来。水可以留下一半。
choice rescuepart
option savehalf "开门救Tao，捎一半的水回去。" -> savehalf ; result = 2
option sealpart "关门，留下所有的水。Tao会死。" -> seal
label roperisk
Q: 有绳子。我可以去下面拉他，不开门。
Q: 不过，我会被水弄坏。不能修好，不能回来。
Jonathan [worried]: 你愿意？
Q: 我愿意牺牲。不过，我想活着。你可以开门救他。
choice rescuerope
option saveempty "开门救Tao和Q。水会流光。" -> saveempty ; result = 1
option sendq "Q去下面。Tao和水安全，Q牺牲。" -> sendq ; result = 3
option sealrope "关门，留下所有的水。Tao会死。" -> seal
label savehalf
An [determined]: 我开门。Q，修好上面的机器！
move An right
show Tao scared center
I: Tao出来了。Q留下了一半的水。
Tao [sad]: 谢谢。剩下的水……够给谁喝？
goto aftermath
label saveempty
An [determined]: 开门！Tao，快出来！
move An right
show Tao scared center
I: Tao出来了。最后一点水也流走了。
Tao [sad]: 我活着。不过，你们空着手回去……
goto aftermath
label sendq
Q: 拉着绳子。别放手。
move Q exit
camera medium Jonathan
I: 我和An拉着绳子。Q的声音停了。
move An right
show Tao sad center
camera two Jonathan Tao cut
Tao [sad]: 它保护了我。它没有出来。
I: 水还在。Q牺牲了。那段录音没有了。
goto aftermath
label seal
react An reach
An [shocked]: 你真的要关门？
Jonathan [sad]: 关门。
camera listener An over 0.6
I: 门关了。Tao的声音停了。没有人回答。
An [sad]: 水安全了。Tao死了。我会记得他。
label aftermath
scene port
show Jonathan sad left
show An sad right
show Min worried center
camera two Jonathan Min cut
I: 在飞船面前，An检查水。
if hidden == true -> accusation else account
label accusation
An [angry]: 这里的水少了。Min，你偷水了吗？
Min [worried]: 你答应过……
goto finalchoice
label account
An [worried]: 少的是你的水。我记得。你还没有喝水。
Min [sad]: 妻子喝了水，好多了。你呢？
label finalchoice
camera wide cut
An [worried]: 回去以后，他们会问：你们做了什么？
choice testimony
option truth "诚实回答。我为我的选择负责。" -> truth
option silence "说机器坏了。别说我们的选择。" -> silence
label truth
if hidden == true -> confess else openrecord
label confess
Jonathan [sad]: Min偷水的时候，我知道。我说他可以走。
Min [sad]: 你说出来了。不过，你愿意一起负责。
goto openrecord
label openrecord
An [determined]: 我会说我知道的。我们一起回答。
I: 我们回去一起回答。他们大概不满意，不过会知道我们的选择。
goto ending
label silence
An [angry]: 不。我不替你说谎。我要回去说我知道的。
move An far-right
camera wide cut
I: An走了。她不愿意和我一起回答。我们说的话会不一样。
label ending
if result == 0 -> enddead else endalive
label enddead
I: 我们捎水回去。水够了。Tao没有回来。
goto last
label endalive
if result == 3 -> endq else endwater
label endq
I: Tao安全了。水够了。Q再也不能回来。
goto last
label endwater
if result == 2 -> endhalf else endempty
label endhalf
I: 他们安全了。不过，只有一半的水。山上的人和河边的人怎么分？
goto last
label endempty
show Tao determined far-left
camera wide cut
Tao [determined]: 我陪你们回去。我知道哪里可以找水。
An [worried]: 不过，我们不能等。你真的知道吗？
label last
I: 飞船离开了。水给谁？谁来选择？
end
