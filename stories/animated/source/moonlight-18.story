story 2
label opening
scene shop
ambience none
show Hyun neutral left
show Shopkeeper happy right
camera wide
look Hyun away
activity Hyun walk right slow
I: 我慢慢看这些雕像，心里却在算钱。
I: 学会做这些东西，真的能赚很多钱吗？
I: 这里最贵的一个，也不过三十枚银币。
I: 做得很好。不过，用的还是石头和木头。
activity Hyun pause
choice business
option price "三十枚银币，也不少了。" -> price
option buyers "可是，会有多少人买呢？" -> buyers
label price
I: 是不少。可是，没有人买，我还是没有钱。
goto market
label buyers
I: 喜欢看的人，不一定愿意花钱买。
label market
activity Hyun resume
I: 有钱人也不会每年都买一个新的吧？
I: 真想用这个赚大钱，就要比其他人做得更好。
I: 玩游戏的人就不一样了。他们一直想变得更强。
I: 好的剑，好的装备，他们会一直想买。
I: 可是，这些雕像，能让他们更强吗？
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
Shopkeeper [happy]: 真的有这事。
goto tale
label heard
Shopkeeper [happy]: 听说过，当然听说过。
label tale
Shopkeeper [proud]: 做雕刻的人，一直都在说这个故事。
camera listener Hyun over 0.65
express Hyun surprised
I: 不只是教官知道。他也知道！
camera two Hyun Shopkeeper cut
Hyun [curious]: 您是听谁说的？
Shopkeeper [neutral]: 来自王宫的客人。他们说的话，可以相信。
choice response
option trust "原来，是他们跟您说的。" -> trust
option surprised "连他们也这样说？" -> surprised
label trust
Shopkeeper [happy]: 对，不是只有我一个人知道。
goto confirmation
label surprised
Shopkeeper [neutral]: 对，他们也知道这事。
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
option easy "原来，问清楚就可以了。" -> easy
option welcome "还好，他现在愿意和我说话。" -> welcome
label easy
I: E级任务，是不难。可刚才，我差点连问题都问不了。
goto finish
label welcome
I: 要是他还让我出去，我可没这么容易完成任务。
label finish
camera two Hyun Shopkeeper cut
express Hyun happy
I: 我笑了。这一次，终于有结果了。
I: 接下来，我要回去拿奖励了。
camera listener Shopkeeper over 0.65
express Shopkeeper curious
I: 我看了看他，想找个时候说再见。
end
