story 2
variable counted = false hidden
variable sister = false hidden
label opening
scene hospital
show Hyun relieved center
camera medium Hyun
I: 几天后，我们有了新的家。奶奶终于可以去医院，好好看医生了。
camera medium Hyun
Hyun [happy]: 现在，有医生照顾她。我和妹妹都放心了。
I: 可是，医生发现她还有其他问题。她需要在医院住一段时间。
camera wide
I: 今天，我来看看她。门开了。五个穿黑衣服的男人走进来。
show Hyun worried left
show Collector proud right
I: 我认识他们。他们是来要钱的。其他人很怕，都离开了房间。
camera medium Collector
Collector [proud]: 李贤，听说你最近得到很多钱。真是好运气。
camera medium Hyun
Hyun [skeptical]: 你们来做什么？
camera medium Collector
Collector [neutral]: 你父亲以前借了我们的钱。现在，你应该把钱给我们了。
camera close Hyun
I: 父亲死的时候，我太小，不知道可以怎么办。父亲的债，就这样到了我身上。
I: 那是1亿韩元。我怕过这些人。可是现在，我有钱了。
camera wide
camera medium Hyun
Hyun [determined]: 我会把钱给你们。到底要多少？
camera medium Collector
Collector [happy]: 30亿韩元。
camera medium Hyun
Hyun [shocked]: 30亿？父亲只借了1亿！
choice amount
option count "问清楚：为什么变成这么多？" -> count ; counted = true
option listen "先听听他们怎么说。" -> listen
label count
camera medium Hyun
Hyun [determined]: 你把钱算清楚。让我听明白。
camera medium Collector
Collector [skeptical]: 你以为，我不会算钱？
goto police
label listen
I: 我先不说话。可是，我已经快要生气了。
camera medium Collector
Collector [proud]: 过了那么多年，当然不一样了。
label police
camera medium Hyun
Hyun [angry]: 这太可怕了。我要找警察！
camera medium Collector
Collector [laughing]: 去吧！你以为警察会帮助你？
move Collector exit
show Leader neutral right
camera medium Leader
Leader [neutral]: 好好讲清楚。别找麻烦。
move Leader exit
show Collector neutral right
camera medium Collector
Collector [neutral, explain]: 过了8年，利息越来越多。每年，都要多还一半。
I: 他们开始算。每过一年，要的钱都会更多。
camera medium Collector
Collector [proud]: 我们这样做，没有错。
I: 这是他们的话。我只知道，钱越来越多，我却一直不知道。
camera medium Hyun
Hyun [worried]: 30亿……我几乎只有这么多钱。
camera medium Collector
Collector [skeptical]: 今天不给？可以。明天我们再来，那时你要给更多。
camera close Hyun
I: 昨天，我还觉得家人终于安全了。现在，这些人又站在面前。
camera wide
camera medium Collector
Collector [happy]: 奶奶住在这里，很舒服啊。你妹妹也很漂亮。
camera medium Hyun
Hyun [angry]: 不要找我妹妹！
camera medium Collector
Collector [skeptical]: 别生气。你们三个人一起住医院，不是很好吗？
choice protect
option grandma "看看奶奶，让她放心。" -> grandma
option sister "想到妹妹，不能让她出事。" -> sister ; sister = true
label grandma
camera medium Hyun
Hyun [worried, reassure]: 奶奶，别怕。我在这里。
I: 我希望自己的声音能平静一点。她已经生病了。
goto pay
label sister
I: 妹妹没有在房间里。我不想让她见这些人。
camera medium Hyun
Hyun [determined]: 这是我的事。不要去找她。
label pay
camera close Hyun
I: 我知道这些人会做什么。我不能让家人出事。
I: 我看看手里的存折。昨天，它还是家里每个人的希望。
camera wide
act Hyun give Collector "I hand over the bankbook. The man takes it."
camera medium Collector
Collector [happy]: 这样就对了。
I: 他们拿出90,000,000韩元，还有父亲以前写的借条。他们早就准备好了。
I: 我给了他们3,000,000,000韩元。这里还有一点钱。可是，我的心里好像什么都没有了。
choice thought
option money "记住他们拿走的钱。" -> money
option family "记住家人很怕的样子。" -> family
label money
if counted == true -> countedMoney else plainMoney
label countedMoney
camera medium Hyun
Hyun [determined]: 我会记得你们拿了多少钱。这次，我不会再算错。
goto goodbye
label plainMoney
camera medium Hyun
Hyun [determined]: 这些钱，我不会忘记。
goto goodbye
label family
camera medium Hyun
Hyun [sad]: 我不会忘记你们让家人那么怕。
label goodbye
camera medium Collector
Collector [happy]: 谢谢。再见。
camera medium Hyun
Hyun [angry]: 等等！有一天，我一定会回来找你们！
camera medium Collector
Collector [angry]: 你还这样说话？
I: 他们准备打我。我还是站在那里。
move Collector exit
show Leader neutral right
camera medium Leader
Leader [neutral]: 好了。钱已经得到了。这里是医院，别再找麻烦。
camera medium Leader
Leader [proud]: 我叫Han Jinsup。觉得不对？5年里得到3,000,000,000韩元，再来找我。
camera medium Leader
Leader [skeptical]: 到时候，我就叫你哥哥。
move Leader exit
camera medium Hyun
I: 他们走了。我坐在地上，一点力气都没有。
if sister == true -> sisterEnd else grandmaEnd
label sisterEnd
I: 我刚才只希望妹妹不会出事。现在，我听到她在门外哭。
goto ending
label grandmaEnd
I: 我刚才让奶奶别怕。现在，她的声音听起来那么累。
label ending
move Hyun left
show Grandma sad right
rest Grandma downcast
camera close Grandma
Grandma: 太累了……
I: 妹妹在门外哭。奶奶还在床上。昨天，我们还以为终于可以好好生活了。
end
