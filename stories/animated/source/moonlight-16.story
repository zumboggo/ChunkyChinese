story 2
variable bread = false hidden
variable polite = false hidden
label opening
scene hall
ambience hall
show Hyun excited center
camera medium Hyun
I: 两枚银币，已经在我手里了。
I: 一个面包要三个铜币，一枚银币是一百个铜币。
I: 两枚银币，能买六十六个面包，还能有一点钱。
choice count
option food "先想面包。" -> food ; bread = true
option reward "再想任务。" -> reward
label food
I: 这么多面包！我终于不用每天担心吃不饱了。
goto enough
label reward
I: 这还只是先给的钱。做完任务，应该还有奖励。
label enough
I: 面包虽然不好吃，却能让我吃饱。
I: 以前没有饭吃的日子，我不想再过了。
scene square
ambience wind
show Hyun happy center
camera wide
I: 我先去水池，把水壶装满水，再去雕刻店。
activity Hyun walk right steady
I: 这是我第一次好好看看这个城市。路上全都是人。
I: 有人在找人一起玩，有人在说要一起去哪里。
I: 我身上还是新人的衣服，没有他们身上那些好东西。
I: 没有人多看我一眼。那也很好。
choice crowd
option water "至少现在有水喝了。" -> water
option quiet "没人看，也好。" -> quiet
label water
I: 水不用花钱。下次来，也要记得多带一点。
goto shopOutside
label quiet
I: 他们忙他们的。我先把自己的任务做好。
label shopOutside
activity Hyun stop
camera medium Hyun
I: 雕刻店就在这里，旁边是一家卖珠宝的店。
I: 玩游戏的人不常来，有钱的贵族却喜欢这里。
scene shop
ambience none
show Hyun neutral left
show Shopkeeper happy right
camera two Hyun Shopkeeper cut
look Hyun Shopkeeper
look Shopkeeper Hyun
sound chime
Shopkeeper [happy]: 欢迎——
camera listener Shopkeeper over 0.65
express Shopkeeper skeptical
I: 他看了看我的衣服，脸上的笑没有了。
camera two Hyun Shopkeeper cut
Shopkeeper [skeptical]: 你来这里，有什么事？
I: 店里只有我一个客人。他好像还不想让我来。
choice greeting
option respect "先好好说话。" -> respect ; polite = true
option look "先看看店里。" -> look
label respect
react Hyun nod
I: 我先站直，让自己认真一点。
goto question
label look
look Hyun away
I: 这里没有其他人。我应该能问一个问题吧？
look Hyun Shopkeeper
label question
camera two Hyun Shopkeeper cut
Hyun [curious]: 您好。我有一个问题，一直想不明白。
Shopkeeper [neutral]: 你有问题？
Hyun [neutral]: 是的。如果您能给我一点时间……
choice wait
option brief "只问一个问题。" -> brief
option patient "先等一等。" -> patient
label brief
Hyun [pleading]: 我只问一个问题。
goto refusal
label patient
I: 我先等一等。他愿意听，我就能问。
label refusal
camera listener Shopkeeper over 0.65
Shopkeeper [frustrated]: 我现在很忙。请你出去。
camera two Hyun Shopkeeper cut
Hyun [neutral]: 好的，那我下次再来。
Shopkeeper [neutral]: 再见。
camera medium Hyun
I: 他连问题是什么，都不想知道。
if bread == true -> breadReturn else rewardReturn
label breadReturn
I: 六十六个面包，我算得清楚。问一个问题，怎么这么难？
goto mannerReturn
label rewardReturn
I: 我还在想做完任务的奖励。现在，问题还没有问。
label mannerReturn
if polite == true -> respectReturn else lookReturn
label respectReturn
I: 我已经好好跟他说话了。可他还是要我走。
goto ending
label lookReturn
I: 没有其他客人，他却说自己很忙。
label ending
camera wide
activity Hyun walk left slow
look Hyun away
I: 我慢慢走向门口。任务刚刚开始，我就得回去了吗？
end
