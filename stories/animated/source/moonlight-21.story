story 2
label opening
scene tavern
ambience none
show Hyun curious left
show Bard neutral right
look Hyun Bard
look Bard away
camera two Hyun Bard cut
I: 诗人看了看四周，又小心地说下去。
look Bard Hyun
Bard [neutral]: 他们在同一个村子出生，也一起长大。
Bard [happy]: 男孩叫扎哈布。女孩一直带着他雕刻的小东西。
choice gifts
option keep "她一直带着他做的东西？" -> keep
option craft "他那时候，就会雕刻了？" -> craft
label keep
Bard [neutral]: 对，那是他做了送给她的。
goto wish
label craft
Bard [neutral]: 对，他会做这些小东西，还送给了她。
label wish
Bard [happy]: 她小时候就想，以后要做他的妻子。
camera listener Hyun over 0.5
express Hyun neutral
I: 这次，我没有马上想钱。
I: 她带着的，不只是一个好看的东西。
camera two Hyun Bard cut
Bard [sad]: 可是，后来的事，和她想的不一样。
Bard [sad]: 她被选进王宫，做了宫女。
Hyun [curious]: 那他呢？
Bard [neutral]: 他离开了她。
choice apart
option sad "她想和他一起生活，最后却分开了。" -> sad
option wait "那他们的故事，就这样完了？" -> wait
label sad
Bard [sad]: 是啊。后来的事，不像她想的那样。
goto promise
label wait
Bard [neutral]: 还没有。他们之间，还有一个约定。
label promise
Bard [neutral]: 人分开了，约定却还在。
Hyun [curious]: 什么约定？
Bard [proud]: 他答应她，要给她看世界上最美的雕像。
camera listener Hyun over 0.65
express Hyun surprised
I: 世界上最美的？这话可不小。
camera two Hyun Bard cut
Hyun [skeptical]: 可她后来成了王后，王宫里什么好东西没有？
Hyun [skeptical]: 这个约定，他应该没做到吧？
Bard [neutral]: 不，他做到了。
camera listener Hyun cut
express Hyun surprised
I: 我以为自己想明白了，没想到，又错了。
camera two Hyun Bard cut
Bard [neutral]: 很多年以后，他被请到了王宫。
Bard [happy]: 听说，王后看了他做的雕像，非常感动。
Bard [happy]: 她说，那是世界上最美的东西。
choice beauty
option person "也许，因为那是他做的？" -> person
option wonder "什么样的雕像，能让王后这么说？" -> wonder
label person
Bard [neutral]: 她为什么这样说，你得问那天也在那里的人。
goto witness
label wonder
Bard [neutral]: 想知道是什么，就去问自己看过的人吧。
label witness
Hyun [curious]: 那个人是谁？
Bard [neutral]: 以前照顾王后的一位侍女。那天，她也在。
Bard [neutral]: 你去找她，听她说完这个故事。
choice certain
option honest "原来，您也不是自己看过的？" -> honest
option grateful "那她知道的，会比您更多吧？" -> grateful
label honest
Bard [neutral]: 对，我也是听别人说的。我只能跟你说这些。
goto alive
label grateful
Bard [neutral]: 对。她亲眼看过，我只是听说。
label alive
Hyun [curious]: 她还活着吗？
Bard [neutral]: 活着。
camera listener Hyun over 0.5
express Hyun relieved
I: 原来，他没有忘记那个约定。
I: 我也终于知道，接下来要去问谁了。
camera two Hyun Bard cut
I: 可他到底做出了什么，能让王后说，那是世界上最美的东西？
end
