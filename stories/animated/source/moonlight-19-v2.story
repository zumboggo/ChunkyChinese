story 2
label opening
scene shop
ambience none
show Hyun happy left
show Shopkeeper curious right
look Hyun Shopkeeper
look Shopkeeper Hyun
camera two Hyun Shopkeeper cut
I: 我想说再见，老板却又说话了。
Shopkeeper [curious]: 不过，他是怎么雕刻月光的，我还不知道。
Hyun [curious]: 王宫来的客人，没有跟您说吗？
Shopkeeper [skeptical]: 说到这里，他们就不愿意说了。
choice silence
option curious "您想知道的，他们偏不说？" -> curious
option careful "连他们都不肯说，还要问下去吗？" -> careful
label curious
Shopkeeper [curious]: 是啊。每次都停在最要紧的地方。
goto queen
label careful
Shopkeeper [neutral]: 我也知道得小心。不过，有个人的名字他们提过。
label queen
Shopkeeper [neutral]: 这事，和已经去世的王后有关。
I: 王后伊凡。一个新的名字。
camera listener Hyun over 0.65
express Hyun surprised
I: 我只是来问一个故事，怎么又说到她了？
camera two Hyun Shopkeeper cut
Shopkeeper [curious]: 你能不能帮我问问？
Shopkeeper [curious]: 我想知道，她和那个人，到底发生过什么。
sound chime
camera medium Hyun
I: 新任务出现了：雕刻家的过去。
I: 还是E级任务。
I: 可是，下面还有一个警告。
express Hyun worried
I: 要是王家骑士发现我在问这事，他们会对我有敌意。
choice warning
option danger "先看警告，别只看奖励。" -> danger
option reward "先想后面的机会。" -> reward
label danger
I: E级写在上面，骑士的敌意写在下面。我两行都得看。
goto chain
label reward
I: 奖励再好，也要能把任务做好啊。
label chain
express Hyun excited
I: 等一下。这是一个接着一个的任务！
I: 这样的任务，奖励会越来越好。
I: 手已经高兴得发抖，脑子还得替它们算清楚。
express Hyun skeptical
I: 可任务也会越来越难。
I: 我现在只有一级，不能只想着奖励。
I: 在城市里找人，问问这些事，我还可以。
I: 真要去打，我现在可做不到。
camera two Hyun Shopkeeper cut
Hyun [worried]: 我现在的能力还很低，怕帮不了您。
Shopkeeper [neutral]: 我相信你能做好。
Shopkeeper [neutral]: 你做事小心，就不会出事。
choice reassurance
option honest "可我也不是什么都能做啊。" -> honest
option modest "您这么相信我，我就更怕做不好了。" -> modest
label honest
Shopkeeper [neutral]: 我要的是消息，不是请你去打仗。
goto accept
label modest
Shopkeeper [happy]: 只会说自己厉害的人，我还不放心呢。
label accept
camera listener Hyun over 0.65
express Hyun neutral
I: 他没有因为我的话，就不让我帮忙了。
camera two Hyun Shopkeeper cut
Hyun [happy]: 您都这么说了，那我就试试吧。
sound chime
I: 我接受了任务。
Shopkeeper [happy]: 谢谢你。
Shopkeeper [neutral]: 想知道她的事，你可以去问诗人。
Shopkeeper [neutral]: 他知道很久以前的故事，也知道人们现在在说什么。
choice lead
option stories "去找诗人，能问到旧事？" -> stories
option discreet "我去问，可不会到处说。" -> discreet
label stories
Shopkeeper [neutral]: 故事和街上的消息，他都知道一些。
goto caution
label discreet
Shopkeeper [neutral]: 这就对了。我想解开疑问，可不想惹出麻烦。
label caution
camera listener Shopkeeper over 0.4
express Shopkeeper worried
Shopkeeper [worried]: 千万小心。不要让人说王家的坏话。
camera two Hyun Shopkeeper cut
express Hyun neutral
I: 我记住了：去找诗人，也要小心说话。
I: 本来只是来问一个故事，现在却有了新的任务。
I: 我接下了。接下来，得找一个肯说秘密的人，还不能让秘密传开。
end
