story 2
label opening
scene home
ambience none
show Hyun curious left
show Attendant neutral right
look Hyun Attendant
look Attendant Hyun
camera two Hyun Attendant cut
I: 诗人告诉我怎么走。我找到了那位侍女的家。
I: 她已经不在王宫工作了。
Hyun [neutral]: 您好，我想问问伊凡王后和雕刻家的事。
express Attendant happy
Attendant [happy]: 王后？你想听她以前的故事？
choice welcome
option queen "是的。我想知道她的事。" -> queen
option sculptor "是的。还有她和扎哈布的约定。" -> sculptor
label queen
Attendant [happy]: 那你找对人了，我以前就照顾她。
goto served
label sculptor
Attendant [happy]: 那个约定啊。来，你找对人了。
label served
Attendant [happy]: 王后是一位非常好的人，对人也很好。
Attendant [neutral]: 我以前照顾她，那些事，我自己也看过。
camera listener Hyun over 0.5
express Hyun relieved
I: 这次，不是听别人说的了。
camera two Hyun Attendant cut
Attendant [sad]: 不过，扎哈布第一次到王宫时，她可不开心。
express Hyun surprised
Hyun [surprised]: 不开心？为什么？
choice surprise
option reunion "她不是一直想再见到他吗？" -> reunion
option promise "是因为那个约定吗？" -> promise
label reunion
Attendant [sad]: 是啊，可她等的人，和眼前的人不一样。
goto explain
label promise
Attendant [sad]: 对，就是因为他们小时候的约定。
label explain
Attendant [neutral]: 他答应过，要给她看世界上最美的雕像。
Attendant [sad]: 可是他到王宫的时候，手里拿着剑。
camera listener Hyun cut
express Hyun confused
Hyun [confused]: 剑？不是雕刻用的小刀？
Attendant [neutral]: 对，是剑。不是小刀。
camera two Hyun Attendant cut
Attendant [neutral]: 大家看他，都觉得那是个很会用剑的人。
I: 一个雕刻家，拿着剑来到王宫。
choice sword
option work "那他答应做的雕像呢？" -> work
option hurt "她觉得，他忘记了约定？" -> hurt
label work
Attendant [sad]: 她等的也是那个约定。可是，他拿来的却是剑。
goto pain
label hurt
Attendant [sad]: 她一直相信他不会变。所以，那时候才那么伤心。
label pain
camera speaker over 0.5
Attendant [sad]: 你要是在那里，看她的样子就知道了。
Attendant [sad]: 她有多伤心，我都不知道怎么说。
camera listener Hyun over 0.65
express Hyun worried
I: 我没有说话，听她接着说。
camera two Hyun Attendant cut
Attendant [neutral]: 她一直觉得，就算全世界都变了，他也不会变。
Attendant [sad]: 他们的约定，也一直不会变。
choice meaning
option trust "她相信的，是这个人。" -> trust
option years "过了那么多年，她还是一样相信他。" -> years
label trust
Attendant [sad]: 是啊，她就是那么相信他。
goto ending
label years
Attendant [sad]: 是啊，在她心里，他一直没有变。
label ending
camera listener Hyun over 0.5
express Hyun neutral
I: 原来，让她伤心的，不只是没有雕像。
I: 她以为，连那个不会变的人，也变了。
camera two Hyun Attendant cut
I: 可诗人说，他最后做到了。
I: 那把剑，和世界上最美的雕像，到底是怎么回事？
end
