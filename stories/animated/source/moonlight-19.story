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
option curious "越不说，就越想知道了。" -> curious
option careful "也许，他们不想让别人知道吧。" -> careful
label curious
Shopkeeper [curious]: 是啊，我也一直在想这事。
goto queen
label careful
Shopkeeper [neutral]: 可能吧。不过，他们说到了一个人。
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
option danger "只是问问，他们也会不喜欢我？" -> danger
option reward "这样的任务，奖励会更多吧？" -> reward
label danger
I: 任务不难，也不是谁都愿意跟我说。
goto chain
label reward
I: 奖励再好，也要能把任务做好啊。
label chain
express Hyun excited
I: 等一下。这是一个接着一个的任务！
I: 做完一个任务，就会出现下一个。
I: 这样的任务，奖励会越来越好。
I: 我低头看自己的手。因为太开心，手都在抖。
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
Shopkeeper [neutral]: 我请你帮忙问问，不是要你什么都会。
goto accept
label modest
Shopkeeper [happy]: 你知道要小心，这就很好。
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
option stories "以前的故事，现在的事，他都知道？" -> stories
option discreet "那我去问的时候，也得小心了。" -> discreet
label stories
Shopkeeper [neutral]: 对，所以我让你去找他。
goto caution
label discreet
Shopkeeper [neutral]: 对，这事不能到处说。
label caution
camera listener Shopkeeper over 0.4
express Shopkeeper worried
Shopkeeper [worried]: 千万小心。不要让人说王家的坏话。
camera two Hyun Shopkeeper cut
express Hyun neutral
I: 我记住了：去找诗人，也要小心说话。
I: 本来只是来问一个故事，现在却有了新的任务。
I: 她和雕刻家，到底发生过什么？
end
