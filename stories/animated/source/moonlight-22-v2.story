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
option queen "您照顾过她，她是什么样的人？" -> queen
option sculptor "那个约定，您也知道吗？" -> sculptor
label queen
Attendant [happy]: 先问她这个人，问得好。我照顾过她。
goto served
label sculptor
Attendant [happy]: 约定的事我知道。不过，你先听听她的事。
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
option reunion "终于见面了，怎么不开心？" -> reunion
option promise "她等的是他，还是那个雕像？" -> promise
label reunion
Attendant [sad]: 她等了那么久，看见他这样，怎么会开心？
goto explain
label promise
Attendant [sad]: 在她心里，这两件事分得开吗？
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
option work "他没带雕像，也没解释吗？" -> work
option hurt "一把剑，就让她不信他了？" -> hurt
label work
Attendant [sad]: 我记得最清楚的，是她看见剑时的样子。
goto pain
label hurt
camera listener Hyun over 0.5
Attendant [sad]: 不是不信。是一直太相信，才这么伤心。
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
option trust "先不问雕像，听她说完。" -> trust
option years "那么多年，她一直没变过？" -> years
label trust
Attendant [sad]: 你肯听就好。这些事，我一直记着。
goto ending
label years
Attendant [sad]: 她相信他也没变。那天看见剑，她才会那么难过。
label ending
camera listener Hyun over 0.5
express Hyun neutral
I: 我原来只想问他带来了什么。现在先不问了。
I: 她以为，连那个不会变的人，也变了。
camera two Hyun Attendant cut
I: 可诗人说，他最后做到了。
I: 她等来的明明是一把剑。这次听完，再说对不对。
end
