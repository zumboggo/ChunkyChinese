story 2
label opening
scene shop
ambience none
show Hyun neutral left
show Shopkeeper happy right
camera wide
look Hyun away
activity Hyun walk right slow
I: 我嘴上说美，心里却在问：谁会花钱买？
I: 学会做这些东西，真的能赚很多钱吗？
I: 这里最贵的一个，也不过三十枚银币。
I: 做得很好。不过，用的还是石头和木头。
activity Hyun pause
choice business
option price "先看价格，三十枚银币呢。" -> price
option buyers "先找买家，谁需要它？" -> buyers
label price
I: 是不少。可是，没有人买，我还是没有钱。
goto market
label buyers
I: 喜欢看的人，不一定愿意花钱买。
label market
activity Hyun resume
I: 有钱人也不会每年都买一个新的吧？
I: 玩游戏的人一直要更好的剑。雕像能让他们更强吗？
activity Hyun stop
camera medium Hyun
express Hyun skeptical
I: 刚才我说它们多好，现在却不想学了。
I: 我来这个游戏，是为了赚钱。
camera two Hyun Shopkeeper cut
look Hyun Shopkeeper
look Shopkeeper Hyun
Shopkeeper [curious]: 看过了吧？现在，你想问什么？
Hyun [neutral]: 我想问很久以前的一个故事。
Hyun [curious]: 听说五十年前，有人在王宫里雕刻月光。
choice question
option doubt "这事，真的发生过吗？" -> doubt
option heard "您也听说过这事吗？" -> heard
label doubt
Shopkeeper [happy]: 你不信？这可不是随便编的故事。
goto tale
label heard
Shopkeeper [happy]: 你总算问对人了。这个故事，我知道。
label tale
Shopkeeper [proud]: 做雕刻的人，一直都在说这个故事。
camera listener Hyun over 0.65
express Hyun surprised
I: 不只是教官知道。他也知道！
camera two Hyun Shopkeeper cut
Hyun [curious]: 您是听谁说的？
Shopkeeper [neutral]: 来自王宫的客人。他们说的话，可以相信。
choice response
option trust "您相信这些客人？" -> trust
option surprised "不是只有一个人这么说？" -> surprised
label trust
Shopkeeper [happy]: 他们常来这里。我不是听谁说都信。
goto confirmation
label surprised
Shopkeeper [neutral]: 不只一个。来自王宫的客人，我才相信。
label confirmation
camera medium Hyun
I: 我一直在想，月光怎么能做成东西？
I: 可现在，这个消息被证实了。
sound chime
express Hyun excited
I: 任务完成！
I: 教官听说的事，真的发生过。
I: 不过，那个人到底怎么做到的，还是没有人说得清楚。
I: 想拿奖励，要先回去找教官。
choice reward
option easy "先看任务消息，别白高兴。" -> easy
option welcome "先向他道谢，这话可不好问。" -> welcome
label easy
I: E级任务，是不难。可刚才，我差点连问题都问不了。
goto finish
label welcome
camera two Hyun Shopkeeper cut
Hyun [happy]: 谢谢您。我总算能回去交代了。
Shopkeeper [neutral]: 能帮上忙就好。
label finish
camera two Hyun Shopkeeper cut
express Hyun happy
I: 我笑了。这一次，终于有结果了。
I: 接下来，我要回去拿奖励了。
camera listener Shopkeeper over 0.65
express Shopkeeper curious
I: 任务说完成了，老板却还在想。我把再见留在嘴边。
end
