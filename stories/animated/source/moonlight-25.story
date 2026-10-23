story 2
label opening
scene home
ambience none
show Hyun curious left
show Attendant neutral right
look Hyun Attendant
look Attendant Hyun
camera two Hyun Attendant cut
I: 老侍女拿出一个包，慢慢打开，里面有一把小刀。
Attendant [happy]: 这把刀，是扎哈布留给王后的。后来，一直在我这里。
Attendant [happy]: 还有这个木头雕像，也是他做的。请收下吧。
I: 我接过刀和雕像。雕刻大师做的东西，就是不一样。
choice gift
option careful "我看看那把旧刀。" -> careful
option statue "我看看那个木头雕像。" -> statue
label careful
I: 这把刀很旧，却是他用过的，不能只看样子。
goto thanks
label statue
I: 只看一眼，就知道这雕像做得很好。
label thanks
Hyun [happy]: 谢谢您。我一定会好好收着。
Attendant [neutral]: 扎哈布的刀，请一定好好收着。
Hyun [happy]: 是，请您放心。
look Hyun front
express Hyun happy
I: 这些东西，要是卖出去，应该能赚不少钱吧？
look Hyun Attendant
Attendant [neutral]: 看这个木头雕像，你就能知道扎哈布在哪里。
Attendant [sad]: 我不希望以后再也没有人知道，他是怎么雕刻的。
Hyun [neutral]: 我也不希望这样。
choice wish
option song "我听听她还想说什么。" -> song
option knife "我再看看她说的刀。" -> knife
label song
I: 说起过去，她不笑了。过了这么多年，她还记得那一天。
goto secret
label knife
I: 她一直说要好好收着。看来，这把刀不只是能卖钱。
label secret
camera listener Attendant over 0.5
Attendant [sad]: 要是能再听一次那天的歌，就好了……
Attendant [neutral]: 雕刻的一切秘密，都在那把刀里。
Hyun [surprised]: 您说什么？
Attendant [neutral]: 就在扎哈布的刀里。
express Hyun worried
camera listener Hyun cut
I: 我低头看看刀。有种感觉：有什么事要来了，而且，我没办法拒绝。
I: 新的任务出现了：扎哈布的遗愿。
I: 原来，扎哈布那天没有死。他去了很远的地方，想看看自己的雕刻到底有多强。
I: 我要先成为雕刻大师，再去找他，学会《雕像之心》这首歌。
I: 然后回来，把歌唱给她听。
I: 最后见到他的人说，他要去灰色山口。
express Hyun surprised
I: 这是A级任务。必须在她死以前完成，而且，不能取消！
choice trouble
option cancel "我再看看能不能不接。" -> cancel
option level "我想想自己能不能完成。" -> level
label cancel
I: 没看错，不能取消。刚才拒绝职业那么容易，这次却没得选。
goto danger
label level
I: 我才三级。A级任务？这可不是多练几天就能完成的。
label danger
I: 三百级的高手，要几个人一起，才能完成B级任务。
I: 这次A级任务，我可能要到四百级，才有办法。
I: 灰色山口，还是大家最不能去的十个地方里的一个。那里的怪物，我现在打不过。
express Hyun sad
I: 而且，一次能接的任务只有三个。有了这个任务，我只能再接两个了。
I: 我没得选，却要一直带着这个任务。
express Attendant sad
camera two Hyun Attendant cut
I: 她想再听一次歌。我手里拿着礼物，却在想自己要花多少年。
I: 不过，新的技能也来了：鉴定术、雕刻术、修理术，还有手工艺。
I: 我没选择那个职业，却学到了四种技能！
choice skills
option repair "我想想修理术能怎么用。" -> repair
option identify "我想想鉴定术能怎么用。" -> identify
label repair
I: 东西不能用了，也许就不用花钱找别人了，自己就有办法。
goto ending
label identify
I: 有了这个技能，也许就知道东西能卖多少钱，不会把好东西便宜卖掉。
label ending
express Hyun skeptical
look Hyun front
camera listener Hyun over 0.5
I: 不是自己职业的技能，一般很难学到。这些技能，对我很有用。
I: 第二个任务就有隐藏职业。我拒绝以后，还有四种有用的技能。
express Hyun determined
I: 这几个连着的任务，最后会有什么奖励？有好处，我可不能不要。
I: 可是，她等得到我学会那首歌吗？
end
