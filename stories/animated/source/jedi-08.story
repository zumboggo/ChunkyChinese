story 2
variable tower = 0 range 0 2 hidden
variable relay = 0 range 0 2 hidden
variable checked = false hidden
variable result = 0 range 0 2 hidden
label opening
scene station
show Jonathan curious left
show An worried far-right
show Ren worried right
camera wide
I: 东边的站里，有人在修门。他的衣服破了，手还在忙。
Ren [worried, explain]: 别来这里。门不安全，会掉下来。
Jonathan [curious, question]: 这里是你负责吗？
Ren [determined, explain]: 我叫Ren。她先去安全的地方吧。
if tower == 1 -> injured else safe
label injured
An [worried, explain]: 我的手还没好。我在外面看着。
goto approach
label safe
An [determined, explain]: 我在外面。门不安全，我就叫你们出来。
goto approach
label approach
camera two Jonathan Ren cut
choice approach
option ask "是你要求机器再说的吗？" -> ask
option shelter "我们先去安全的地方，然后沟通。" -> shelter
label ask
Ren [worried, explain]: 是我。别冒险。来这里。
I: 我们慢慢移动。An看着我们。
goto admission
label shelter
I: 我们慢慢移动。Ren停下来，不修门了。
Ren [sad, explain]: 谢谢。你要找的人是我。是我要求机器再说的。
goto admission
label admission
Ren [sad, explain]: 从前，机器传来要水的声音。没有人回答。
Ren [determined, explain]: 我想，它要是反复说，人们就会来帮忙。
Jonathan [worried, explain]: 孩子安全了。不过，妈妈还记得她要水的录音。
Ren [worried, question]: 她回来了？我不知道。
rest Ren attentive
camera listener Ren over 0.65
I: Ren的手紧了。他没有回答。
camera two Jonathan Ren cut
Jonathan [determined, explain]: 她没有答应。你的善意不能替她答应。
if relay == 0 -> destroyed else retained
label destroyed
Jonathan [determined, explain]: 我打坏机器，牺牲了记录。那里的声音停了。
Ren [sad, explain]: 要求没有了。不过，我还要负责。
goto key
label retained
if relay == 1 -> active else isolated
label active
Jonathan [worried, explain]: 我保护了机器。它还会说。我记录了她不答应的事。
Ren [worried, explain]: 这里有钥匙，可以叫那边停。我不会要求它再说。
goto key
label isolated
Jonathan [determined, explain]: 我们分开了声音的电。记录还在，声音停了。
Ren [sad, explain]: 你们先听她说。我没有。我得吸取教训。
goto key
label key
I: Ren给我们看钥匙。
Ren [worried, explain]: 没有钥匙，这里所有要求就会停。包括需要帮忙的人。
An [determined, explain]: 先检查。旧声音可以停，新的要求还可以传来吗？
choice preparation
option inspect "检查钥匙和机器的作用。" -> inspect ; checked = true
option hear "先听他的想法。" -> hear
label inspect
react Jonathan crouch
I: 我检查机器，请Ren说明开关的作用。
Ren [determined, explain]: 这里关旧声音。那里管新的要求。可以分开。
An [curious, question]: 新的要求，可以试一试吗？
Ren [determined, explain]: 可以。我来说：门不安全，请帮忙。
I: An接到信息，听到他的声音。机器没有传来旧声音。
goto danger
label hear
Ren [sad, explain]: 我不敢走。我害怕有人要帮忙，没有人回答。
Jonathan [worried, question]: 为什么不和朋友一起负责？
Ren [sad, explain]: 我害怕他们知道这些事，就不相信我了。
goto danger
label danger
camera wide
I: 门开始掉下来。An大声叫我们出来。我们一起走。
scene home
show Jonathan determined left
show Ren worried right
show An worried far-right
camera two Jonathan Ren cut
I: 我们来到外面的屋子。门下面没有人。我们安全了。
Ren [worried, explain]: 钥匙在这里。你捎走，我就不能开机器。
An [determined, explain]: 捎走钥匙，新的要求也停。给他钥匙，他还可以开旧声音。
Jonathan [determined, insist]: 那就用你自己的声音回答。
rest Ren attentive
camera listener Ren over 0.65
Ren [sad, question]: 他们会听吗？
I: 我没有替他们点头。Ren慢慢呼吸。
camera two Jonathan Ren cut
Jonathan [determined, explain]: 我不能替他们答应。不过，你可以亲自去沟通。
if checked == true -> earned else basic
label earned
choice decision-earned
option take "捎走钥匙，所有要求停下来。" -> take ; result = 0
option trust "相信他，给他钥匙。" -> trust ; result = 1
option shared "按照试验，关旧声音，一起负责新的要求。" -> shared ; result = 2
label basic
choice decision-basic
option take "捎走钥匙，所有要求停下来。" -> take ; result = 0
option trust "相信他，给他钥匙。" -> trust ; result = 1
label take
I: Ren给我钥匙。这里的旧声音停了，新的要求也接不到了。
Ren [sad, explain]: 我们得亲自去找需要帮忙的人。我会一起去。
goto after
label trust
I: Ren收好钥匙，关掉旧声音。新的要求还可以传来。
An [worried, explain]: 他还可以开旧声音。你相信他，别人也要承担这个代价。
Ren [determined, explain]: 我知道。他们没有答应。
goto after
label shared
I: 按照试验，我们关掉旧声音，锁好开关。我捎走这里的钥匙。
I: 新的要求还开着。Ren答应找愿意帮忙的朋友，一起负责。
An [determined, explain]: 朋友没有来。首先，我们一起负责，等朋友答应。
goto after
label after
rest Ren relaxed
camera listener Ren over 0.65
Ren [sad, explain]: 我本来想叫所有人听。不过，我没有听他们的想法。
camera two Jonathan Ren cut
choice account
option own "你亲自向妈妈说明。" -> own
option record "先诚实地记录你的选择。" -> record
label own
Ren [determined, explain]: 我会去。不过，她可以不原谅我。
goto ending
label record
Ren [determined, explain]: 我会记录，然后亲自道歉。记录不能替我说话。
goto ending
label ending
if tower == 2 -> carry else send
label carry
An [determined, explain]: 塔的电线还坏着。消息得亲自捎回去。
goto final
label send
An [determined, explain]: 我们可以用塔的机器通知他们。Ren得亲自回去说明。
goto final
label final
camera wide
I: 屋子的水没有变多。从前牺牲的人和东西，没有回来。
Ren [curious, explain]: 不过，我要求的是声音。西边的水为什么还在流，我不知道。
An [determined, explain]: 首先，负责这里的事。然后，找管水的人。
I: 这一次，回答我们的是人。可是水，还在别处流。
end
