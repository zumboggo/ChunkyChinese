story 2
variable secured = false hidden
variable sample = false hidden
variable map = false hidden
label opening
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
look Jonathan An
I: 今天，我和An去看山下面的裂缝。
Jonathan [worried, reassure]: 你的手还疼吗？我来帮忙。
An [skeptical, explain]: 手不疼。不过，你不能替我选择。
I: 我犹豫了。她没有等我帮忙。
choice approach
option ask-rule "那你有什么要求？" -> ask-rule
option admit "我害怕朋友去世。" -> admit
option lighten "今天你负责，我听话。" -> lighten
label ask-rule
An [determined, explain]: 我说停的时候，你先听。别马上拉我。
Jonathan [neutral, reassure]: 好。我答应先听你说。
goto departure
label admit
camera listener An over 0.65
express An sad
An [sad, explain]: 我一样害怕。不过，保护朋友，不是替朋友选择。
I: 我不挡她的路了。
goto departure
label lighten
An [happy, explain]: 别开玩笑。听话，不是只点头。
Jonathan [happy, reassure]: 那我得很有耐心。
goto departure
label departure
scene ravine
show Jonathan worried left
show An determined right
camera wide
activity Jonathan walk right slow
activity An walk right slow
I: 我们慢慢走。昨天的选择没有消失。
An [worried, explain]: 今天检查管子。屋子的水不动，这里的水不能喝。
activity Jonathan stop
activity An stop
orient Jonathan three-quarter
look Jonathan An
camera two Jonathan An cut
I: 裂缝那里有管子。有水，不过不多。
Jonathan [curious, question]: 真的有水？够所有人喝吗？
An [worried, explain]: 还不知道。先关这里的开关，保护屋子的水。
react Jonathan reach
camera wide
I: 我关好开关。这里的坏水不能去屋子了。
An [determined, explain]: 我去看管子上面的记录。你在这里负责绳子。
Jonathan [worried, question]: 先固定绳子，还是先检查水？
An [worried, explain]: 固定绳子，我可以多捎东西。不过石头移动的话，绳子就回不来了。
An [neutral, explain]: 先检查水，就知道找什么。不过你不能放开绳子。
An [worried, explain]: 风起来了。先选一个办法，然后我就过去。
choice prepare
option anchor "先固定绳子，可以多捎东西。" -> anchor ; secured = true
option examine "先检查水，知道找什么。" -> examine
label anchor
react Jonathan crouch
camera wide
I: 我固定好绳子，拉着试一试。An点头，然后走了。
goto crossing
label examine
react Jonathan crouch
camera wide
I: 杯子里面有沙。这和屋子的水不一样。
An [curious, explain]: 水是西边来的。先看西边的管子。
goto crossing
label crossing
rest Jonathan attentive
move An far-right
look Jonathan An
camera wide
I: An过去了。我在这里，紧紧拉着绳子。
An [curious, explain]: 记录说，西边有旧站。这里不是水库，是坏管子。
choice discovery
option ask-her "你为什么愿意来？" -> ask-her
option ask-pipe "为什么不是水库？" -> ask-pipe
label ask-her
camera two Jonathan An cut
An [determined, explain]: 我会修管子，不是只会记录你说的话。
Jonathan [curious, explain]: 我要求你替我回答，几乎小看了你。
goto warning
label ask-pipe
An [neutral, explain]: 水在管子里面，西边来的。这里没有别的水。
Jonathan [curious, explain]: 我看水。你看水走的路。
goto warning
label warning
express An worried
react An brace
camera listener An over 0.65
An [worried, insist]: 停！别拉！下面的石头在移动。
I: 我想拉她回来。不过她说停。我看着她，等她说话。
camera two Jonathan An cut
An [determined, explain]: 听我说。我能回来。杯子有水，记录还没有看完。
An [worried, explain]: 先回来，可以捎水。不过没有记录。放好杯子，可以记得所有的路，然后回来。
if secured == true -> warning-anchor else choose-basic
label warning-anchor
An [determined, explain]: 绳子固定好了，水和记录可以一起回来。不过要牺牲绳子。
choice retreat-anchored
option bottle "先回来，捎水。不要记录。" -> bottle ; sample = true
option diagram "不要水，记得路，然后回来。" -> diagram ; map = true
option both "水和记录一起回来，牺牲绳子。" -> both ; sample = true, map = true
label choose-basic
choice retreat-basic
option bottle "先回来，捎水。不要记录。" -> bottle ; sample = true
option diagram "不要水，记得路，然后回来。" -> diagram ; map = true
label bottle
camera listener An cut
express An relieved
An [relieved, reassure]: 好。我捎水回来。先等我说，然后拉。
move An right
rest Jonathan relaxed
camera two Jonathan An cut
I: 她捎水回来了。记录没有捎回来。绳子还在。
goto safe
label diagram
camera listener An cut
An [determined, explain]: 杯子放好了。我看记录，你耐心等我。
move An right
rest Jonathan relaxed
camera two Jonathan An cut
I: 她回来了，记得所有的路。杯子还在那里。绳子还在。
goto safe
label both
camera listener An cut
An [determined, reassure]: 那就别保护绳子了。我可以的，相信我。
move An right
rest Jonathan relaxed
camera two Jonathan An cut
I: 她捎回水和记录。石头挡住绳子，我们放开了绳子。
goto safe
label safe
express Jonathan relieved
express An worried
camera two Jonathan An cut
Jonathan [relieved, reassure]: 你回来了。
An [worried, explain]: 是。我说过，我可以。
look Jonathan down
camera listener Jonathan over 0.65
I: 我的手还在发抖。她没有开玩笑。
camera two Jonathan An cut
choice response
option credit "回去的时候，你说，我听。" -> credit
option own-fear "我害怕的时候，会先和你沟通。" -> own-fear
label credit
An [relieved, explain]: 一起说。我们一起经历了。不过别替我回答。
goto return
label own-fear
An [relieved, reassure]: 好。沟通比命令好。
goto return
label return
scene home
show Jonathan curious left
show An determined right
camera two Jonathan An cut
I: 我们回来了，记录了坏管子在哪里。今天所有人安全。
Jonathan [determined, explain]: 开关关好了，坏水被挡住了。屋子的水没有变少。
if sample == true -> sample-end else map-end
label sample-end
An [curious, explain]: 杯子的水是为了检查，不能喝。喝的水没有变多。
if map == true -> map-end else no-map
label map-end
An [determined, explain]: 记录有去西边旧站的路。那里有修管子的东西。
if sample == true -> question else no-sample
label no-sample
I: 我们知道路，不过没有水可以检查。那里的水还不能喝。
goto question
label no-map
I: 我们知道旧站在西边。不过，要先找安全的路。
goto question
label question
An [skeptical, question]: 记录说旧站本来关了。为什么还会有水来？
Jonathan [curious, explain]: 不知道。我们一起去研究吧。
I: 我等她先记录。然后补充我说的话。
end
