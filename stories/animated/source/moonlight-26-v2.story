story 2
label opening
scene shop
ambience none
show Hyun happy left
show Shopkeeper happy right
look Hyun Shopkeeper
look Shopkeeper Hyun
camera two Hyun Shopkeeper cut
I: 离开老侍女的家，我回到雕像店。任务做完了，奖励还没拿呢。
Shopkeeper [happy]: 维德，这么快就知道是怎么回事了！真是谢谢你。
Shopkeeper [happy]: 让你去做这个任务，看来我没找错人。
choice thanks
option modest "事情问清楚了。您答应的奖励呢？" -> modest
option trust "您这回有时间听我说话了？" -> trust
label modest
Shopkeeper [happy]: 少不了你的。做成了事，当然要给。
goto payment
label trust
camera listener Shopkeeper over 0.5
Shopkeeper [happy]: 你还记着呢？这次我可真要谢谢你。
label payment
I: 老板给了我两枚银币。拿到手里的钱，才是真的。
I: 吟游诗人拿走的那枚银币，终于赚回来了！
choice coins
option cost "先记住，下次要带铜币。" -> cost
option gain "先算算花了多少，还多了多少。" -> gain
label cost
I: 那时候，一不小心就让他拿走了。现在想起来，还是心疼。
goto return
label gain
I: 两枚！不只把花出去的钱赚回来，还多了一枚。
label return
scene hall
ambience hall
show Hyun happy left
show Instructor happy right
look Hyun Instructor
look Instructor Hyun
camera two Hyun Instructor cut
I: 我又回到训练场。教官也说我做得好，还给了一枚银币。
Instructor [happy]: 做得不错。
I: 一开始的两枚，老板的两枚，还有教官的一枚。
I: 这次，前前后后，一共拿到了五枚银币。
I: 给吟游诗人花了一枚，手里还有四枚。
I: 钱赚到了，我也已经从一级，变成了三级。
I: 等级提高以后得到的点数，我一半用来提高力量，一半用来提高敏捷。
choice stats
option strong "先想想这一剑能多有力。" -> strong
option quick "先想想怎么让剑更快，不只要有力。" -> quick
label strong
I: 同样的一把剑，我用起来也会更有力。
goto temptation
label quick
I: 敏捷提高了，出剑的时候，也就更快了。
label temptation
scene hall
ambience hall
show Hyun curious left
show Dummy neutral right
look Hyun front
camera listener Hyun cut
Hyun [curious]: 为什么不再接一个任务呢？
I: 我刚出去一次，就拿到了钱，等级也提高了。
I: 再去找个任务，好像比一直打木头人有意思多了。
choice next
option money "先问自己：再来一次还会这么好吗？" -> money
option sword "先问自己：练习一半就停？" -> sword
label money
I: 钱当然很好。可这么特别的任务，不是想找就能找到的。
goto choose
label sword
I: 我已经练习了这么久。刚赚到一点钱，就不练习了吗？
label choose
express Hyun determined
look Hyun Dummy
prop Hyun sword
camera action Hyun Dummy cut
I: 心里还想去接任务，我却又拿出了木剑。
activity Hyun train Dummy steady
I: 木剑又打在木头人身上。我回来了。
I: 这次任务给的奖励，对我这个等级来说，已经很多了。
I: 可这样的好事，不会每次都有。眼前能做的，还是练习。
I: 银币收好了，剑还在手里。没有新的任务，我也有事要做。
end
