story 2
label opening
scene home
ambience none
show Hyun curious left
show Attendant worried right
look Hyun Attendant
look Attendant Hyun
camera two Hyun Attendant cut
I: 我还在老侍女的家里，等她说下去。
I: 扎哈布带来的剑，怎么会变成最美的雕像？
Attendant [worried]: 那一天，旁边那个国家的人，要杀国王和王后。
Hyun [shocked]: 在王宫里？
Attendant [worried]: 就在花园里。我那时候也在那里。
choice danger
option queen "王后怎么办？" -> queen
option knights "骑士不能帮他们吗？" -> knights
label queen
Attendant [worried]: 我们都觉得，这一次要死了。
goto trapped
label knights
Attendant [worried]: 那几位骑士也走不了，没办法帮我们。
label trapped
Attendant [worried]: 大家都快要死了，扎哈布却走进了花园。
camera listener Hyun over 0.5
express Hyun surprised
Hyun [surprised]: 他在那个时候来了？
camera two Hyun Attendant cut
Attendant [neutral]: 王后一看他来了，马上叫他走。
Attendant [sad]: 她知道有多危险，想让他快走。
choice warning
option leave "他听她的话走了吗？" -> leave
option stay "可是，他还没完成那个约定。" -> stay
label leave
Attendant [neutral]: 没有。他只是对她笑了笑。
goto promise
label stay
Attendant [neutral]: 是啊。他没有走，还对她笑了笑。
label promise
Hyun [surprised]: 那么危险，他还在笑？
Attendant [happy]: 他对她说，要给她看自己做过的、最美的雕像。
camera listener Hyun cut
express Hyun confused
I: 人都快要死了，他却还在说雕像？
camera two Hyun Attendant cut
Attendant [surprised]: 就在那时，月光在他的剑下碎开了。
Hyun [surprised]: 月光？真的可以雕刻？
Attendant [happy]: 是啊。蓝色的月光，变成了一片一片的光。
Attendant [happy]: 他一边雕刻，一边唱歌。
choice song
option words "他唱了什么？" -> words
option face "王后是什么表情？" -> face
label words
Attendant [neutral]: 歌里的话，我已经不记得了。
goto heart
label face
Attendant [sad]: 她一边听，一边哭。
label heart
Attendant [neutral]: 可是歌名，我一直记得，叫《雕刻家的心》。
camera speaker over 0.5
Attendant [sad]: 王后一边听，眼泪就一直流下来。
Attendant [happy]: 对她来说，那就是世界上最美的雕像。
camera listener Hyun over 0.65
express Hyun relieved
I: 那把剑没有让他忘记约定。那是他完成约定的办法。
camera two Hyun Attendant cut
choice beauty
option person "因为那是他为她做的？" -> person
option light "那些月光，一定很美。" -> light
label person
Attendant [happy]: 是啊。就算他只在木头上写个名字，她也会觉得最美。
goto memory
label light
Attendant [happy]: 真的。那样的美，我再也没见过。
label memory
Attendant [happy]: 可那晚的月光，也是真的美得让人说不出话。
Attendant [relieved]: 那些要杀他们的人，一看这月光，全都跑了。
Hyun [relieved]: 所以，他真的做到了。
Attendant [happy]: 是啊。他没有忘记，也完成了对她说过的话。
camera listener Hyun over 0.5
express Hyun happy
I: 原来，诗人说的是真的。那个约定，终于完成了。
camera two Hyun Attendant cut
Attendant [sad]: 过了这么多年，我还是一直记得那一晚。
I: 我终于明白了。原来雕刻，还有这样的力量？
end
