story 2
label opening
scene home
ambience none
show Hyun curious left
show Attendant worried right
look Hyun Attendant
look Attendant Hyun
camera two Hyun Attendant cut
I: 她还没讲完，我等着听。
I: 扎哈布带来的剑，怎么会变成最美的雕像？
Attendant [worried]: 那一天，旁边那个国家的人，要杀国王和王后。
Hyun [shocked]: 在王宫里？
Attendant [worried]: 就在花园里。我那时候也在那里。
choice danger
option queen "您那时也在那里？" -> queen
option knights "骑士在哪里？没有人能帮忙吗？" -> knights
label queen
Attendant [worried]: 在。我连自己还能不能活着都不知道。
goto trapped
label knights
Attendant [worried]: 他们也走不了。不是不想帮，是过不来。
label trapped
Attendant [worried]: 大家都快要死了，扎哈布却走进了花园。
camera listener Hyun over 0.5
express Hyun surprised
Hyun [surprised]: 他在那个时候来了？
camera two Hyun Attendant cut
Attendant [neutral]: 王后一看他来了，马上叫他走。
Attendant [sad]: 她想让他快走。
choice warning
option leave "她叫他走，是想救他？" -> leave
option stay "他那时候来，能做什么？" -> stay
label leave
Attendant [neutral]: 她自己都危险，还在叫他走。他却笑了。
goto promise
label stay
Attendant [neutral]: 我们都以为要死了。可他没有走，只是笑了笑。
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
option words "歌里的话，您还记得吗？" -> words
option face "王后还在叫他走吗？" -> face
label words
Attendant [neutral]: 歌里的话我不记得了。可歌名还记得。
goto heart
label face
Attendant [sad]: 她没有再叫了。她听着歌，眼泪一直流。
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
option person "换成一块木头，她也会觉得最美？" -> person
option light "不只是王后，您也觉得那么美？" -> light
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
I: 大家都以为没有希望了，他却让约定成了真的。
camera two Hyun Attendant cut
Attendant [sad]: 过了这么多年，我还是一直记得那一晚。
I: 我说雕刻没用。可那些人见了月光，全跑了。
end
