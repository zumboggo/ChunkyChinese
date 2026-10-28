story 2
label opening
scene station
show Jonathan curious left
show Min determined right
show An worried far-right
camera wide
I: 今天，Min提前来了。他捎来新的零件，放在支架上。
Min [determined, explain]: An，你在这里检查。重的东西，我来搬。
An [determined, explain]: 好。不过，谁说停，我们都要停。
choice start
option lead "你负责检查，我听你的。" -> lead
option learn "我有原力。不过，我不太会修这个。" -> learn
label lead
An [determined, explain]: 那就先看。我们要耐心，不能马虎。
goto briefing
label learn
An [relieved, explain]: 不会可以学。最怕你不懂，还不敢说。
goto briefing
label briefing
Jonathan [curious, question]: 我们先检查什么？
An [determined, explain]: 水关好了，电也分开了。首先，检查支架安全不安全。
react Jonathan crouch
I: 我先检查。Min捎来的工具和零件，都记录好了。
Min [worried, explain]: 下午有飞船来，捎干净的水。我想提前修好。
camera two Jonathan Min cut
choice hurry
option challenge "不能为了提前修好，就牺牲安全。" -> challenge
option worry "你害怕他们不满意吗？" -> worry
label challenge
Min [frustrated, explain]: 我知道。不过，他们还在等。
Jonathan [determined, explain]: 他们要水，也要安全。不能为了帮忙，就马虎。
goto fit
label worry
Min [sad, explain]: 我害怕他们记得我偷偷开水，不相信我会修。
Jonathan [determined, explain]: 今天诚实地修。不能要求他们不记得从前。
goto fit
label fit
camera wide
I: Min检查好了。我们慢慢移动零件。不过，接口没有接好。
react Jonathan reach
Jonathan [determined, explain]: 我有原力。可以帮忙。
An [determined, insist]: 停。这里不对。再用原力，会打坏管子。
react Jonathan recoil
I: 我停下来。下面有支架，保护了我们。所有人都安全。
camera two Jonathan An cut
Jonathan [worried, question]: 我想帮忙。这也是马虎吗？
camera listener Jonathan over 0.65
An [determined, explain]: 叫你停，不表示不要你。首先，要看。
rest Jonathan attentive
I: 我没有回答。我停下来，耐心看着。
camera two Jonathan An cut
choice inspect
option gap "这里为什么不对？" -> gap
option explain "请说明这里的作用。" -> explain
label gap
An [curious, explain]: 两边没有对好。是这个问题，不是原力不够。
goto understand
label explain
An [determined, explain]: 它保护管子。这里不对，管子就会坏。
goto understand
label understand
Jonathan [determined, explain]: 真正的力量，包括知道什么时候停。
camera two Jonathan Min cut
Min [worried, question]: 是我马虎了。你还愿意和我一起修吗？
choice reset
option reason "愿意。不过，我们先检查，然后再修。" -> reason
option breathe "先呼吸。然后，我们一起试一试。" -> breathe
label reason
Min [determined, explain]: 好。你看着这里，我慢慢移动。不对就停。
goto repair
label breathe
rest Min relaxed
Min [relieved, explain]: 好。我会有耐心。你可以安心说话。
goto repair
label repair
camera wide
I: 我们先移动支架，然后试一试。An看着我们。
Min [curious, question]: 现在呢？
An [relieved, explain]: 好了。先停，我来检查。
I: An慢慢检查，不搬东西。她点头了，我们固定好接口。
Jonathan [relieved, explain]: 修好了。我本来相信原力。原来，我还要吸取教训。
An [happy, explain]: 你还有原力。不过，你也有耐心了。
camera two Jonathan Min cut
Min [curious, question]: 可以开水了吗？
Jonathan [determined, explain]: 还不可以。看着修好了，不表示合格。首先，要试一试。
I: 我们记录好了。从前的管子还关着，能喝的水没有变多。
Min [determined, explain]: 飞船来的时候，我会诚实地回答。我们还要试一试。
camera wide
I: 没有人要求我们开水。我们一起准备试一试。
end
