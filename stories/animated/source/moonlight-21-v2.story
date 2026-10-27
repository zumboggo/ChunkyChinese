story 2
label opening
scene tavern
ambience none
show Hyun curious left
show Bard neutral right
look Hyun Bard
look Bard away
camera two Hyun Bard cut
I: 钱已经花了，我还有问题。诗人却先看了看四周。
look Bard Hyun
Bard [neutral]: 他们在同一个村子出生，也一起长大。
Bard [happy]: 男孩叫扎哈布。女孩一直带着他雕刻的小东西。
choice gifts
option keep "做得那么好，她才一直带着？" -> keep
option craft "他小时候就拿雕刻送人？" -> craft
label keep
camera listener Hyun over 0.5
Bard [neutral]: 你只问做得好不好。那可是他送的。
goto wish
label craft
Bard [neutral]: 是送给她的。他可没说要她花钱。
label wish
Bard [happy]: 她小时候就想，以后要做他的妻子。
camera listener Hyun over 0.5
express Hyun neutral
I: 我差点又问能卖多少钱了。
I: 诗人说的是礼物，我先不问钱了。
camera two Hyun Bard cut
Bard [sad]: 可是，后来的事，和她想的不一样。
Bard [sad]: 她被选进王宫，做了宫女。
Hyun [curious]: 那他呢？
Bard [neutral]: 他离开了她。
choice apart
option sad "她想和他一起生活，怎么却去了王宫？" -> sad
option wait "人都分开了，还有什么？" -> wait
label sad
Bard [sad]: 她小时候想的，可不是去王宫。
goto promise
label wait
Bard [neutral]: 你想听到这里就走？他们还有一个约定。
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
I: 我还觉得自己想得对，他却说不。
camera two Hyun Bard cut
Bard [neutral]: 很多年以后，他被请到了王宫。
Bard [happy]: 听说，王后看了他做的雕像，非常感动。
Bard [happy]: 她说，那是世界上最美的东西。
choice beauty
option person "也许，因为那是他做的？" -> person
option wonder "什么样的雕像，能让王后这么说？" -> wonder
label person
Bard [neutral]: 也许。那天我不在那里，我不能说自己知道。
goto witness
label wonder
Bard [neutral]: 这才是该问的问题。不过，得问亲眼看过的人。
label witness
Hyun [curious]: 那个人是谁？
Bard [neutral]: 以前照顾王后的一位侍女。那天，她也在。
Bard [neutral]: 你去找她，听她说完这个故事。
choice certain
option honest "那我花了钱，您说的也只是听说？" -> honest
option grateful "请说说怎么找到她。" -> grateful
label honest
Bard [neutral]: 知道的我已经说了。没见过，就是没见过。
goto alive
label grateful
Bard [neutral]: 我跟你说。她那天也在那里。
label alive
Hyun [curious]: 她还活着吗？
Bard [neutral]: 活着。
camera listener Hyun over 0.5
express Hyun relieved
I: 原来，他真的做到了。我不再说他没做好了。
I: 我也终于知道，接下来要去问谁了。
camera two Hyun Bard cut
I: 可他到底做出了什么，能让王后说，那是世界上最美的东西？
end
