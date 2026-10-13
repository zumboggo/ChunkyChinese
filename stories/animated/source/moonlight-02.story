story 2
variable practical = false hidden
variable joke = false hidden
label opening
scene home
show Hyun neutral center
camera medium Hyun
I: 我开始卖Weed，只希望能买工作穿的衣服。
I: 我睡觉的时候，大家一开始以为这是开玩笑。后来，他们发现我给他们看的东西是真的。
I: 有人认识Weed。还没有一个小时，就有人愿意给100万韩元。
camera wide
I: 愿意买的人越来越多。连公司都来了。我却什么都不知道。
I: 第二天，我工作了一天，身体很累，只得到3万韩元。
Hyun [disappointed]: 那么多工作，只有这一点钱。
I: 我睡着了。第二天早上，我听到电话的声音。
camera medium Hyun
Hyun [confused]: 你好？请问你是谁？
I: 电话里的女人问我，是不是在卖游戏账号。
Hyun [curious]: 是的。有人买了？
I: 她说她是CTS Media公司的人。他们买了账号，钱已经给我了。
Hyun [surprised]: 已经卖了？我在工作，还没时间看。
choice hope
option medicine "想想看医生的钱。" -> medicine ; practical = true
option clothes "想想工作穿的衣服。" -> clothes
label medicine
Hyun [worried]: 如果能去看医生，那就太好了。
goto amount
label clothes
Hyun [happy]: 买点工作穿的衣服，便宜的就好。
label amount
camera close Hyun
I: 我希望能有20万韩元。这样，就有钱看医生了。
Hyun [curious]: 请问，卖了多少钱？
I: 她说：30亿9千万韩元。
camera medium Hyun
Hyun [shocked]: 多少？！你再说一次！
I: 那么多钱，我怎么相信？
choice disbelief
option joke "心里想想：也许是游戏里的钱？" -> gameMoney ; joke = true
option wrong "心里想想：也许她找错人了？" -> wrongPerson
label gameMoney
Hyun [laughing]: 那我就是游戏里的国王了！
I: 我笑了一下，可是买药的钱还是没有。
goto hangup
label wrongPerson
Hyun [skeptical]: 有那么多钱的人，不会住在这里。
I: 我看看旧电脑。一定是她的错。
label hangup
Hyun [frustrated]: 别开玩笑了。再见。
I: 我挂了电话。可是，她怎么知道我的拍卖？
camera wide
move Hyun right
Hyun [determined]: 我自己看看。就看一次。
I: 我打开网站。我的账号就在最前面。
I: 我又看看那些钱。和她说的完全一样。
camera medium Hyun
Hyun [shocked]: 这是真的？这些钱都是我的？
if joke == true -> kingAgain else nameAgain
label kingAgain
Hyun [embarrassed]: 游戏里的国王，刚才对真钱说了再见。
goto bank
label nameAgain
Hyun [surprised]: 她没找错人。是我错了。
label bank
effect fade
camera close Hyun
I: 第二天，我去银行看。银行里真的有那些钱。
Hyun [relieved]: 我没有看错。是真的。
camera wide
move Hyun center
I: 回到家，我拿着存折去找奶奶。她还在休息。
Hyun [happy, reassure]: 奶奶，我得到了一点钱。
Grandma: 好。好好休息。
I: 我把存折给她看。她看了一次，又看一次。
Grandma: 你没有偷钱？那么多钱是哪里来的？
Hyun [determined, reassure]: 我卖了游戏账号。没有偷，真的。
choice reassure
option home "说说以后的家。" -> home
option school "说说回学校的事。" -> school
label home
Hyun [happy]: 我们可以有自己的房子了。
I: 我看看这个小房间。我终于能想到更好的生活。
goto family
label school
Hyun [happy]: 我可以回学校了。妹妹还可以好好学习。
I: 之前，我只打算找工作。现在又能想想学校了。
label family
camera close Hyun
Grandma: 那我们不用再担心水费和电费了？
Hyun [relieved, reassure]: 当然。房子会有的，我们还可以去学校。
I: 她哭了。这一次，她是开心的。
if practical == true -> medicineAgain else clothesAgain
label medicineAgain
Hyun [relieved]: 我本来只希望有钱看医生。现在，真的可以好好照顾你了。
goto ending
label clothesAgain
Hyun [relieved]: 我本来只打算买点衣服。现在，家里每个人都能过得好一点。
label ending
camera medium Hyun
I: 我笑了，却哭了。这一天，我等了太久。
Hyun [happy, reassure]: 奶奶，现在我们可以一起好好生活了。
Grandma: 是啊。一起。
end
