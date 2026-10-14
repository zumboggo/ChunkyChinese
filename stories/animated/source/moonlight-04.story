story 2
variable family = false hidden
variable careful = false hidden
label opening
scene home
show Hyun sad center
rest Hyun downcast
camera medium Hyun
I: 他们拿走钱以后，我什么也不想做。第一天过去了，第二天也过去了。
I: 我不是没有钱了。可是心里，好像什么都没有了。
Hyun [sad]: 30亿……真的没有了。
camera close Hyun
I: 第三天，我突然想到：这些钱，不也是我自己得到的吗？
Hyun [curious]: 我能得到一次，为什么不能再得到一次？
rest Hyun attentive
camera medium Hyun
I: 我站起来。我还在哭，可是也开始笑了。
Hyun [laughing]: 对啊。一次可以，两次也可以！
choice reason
option family "为了奶奶和妹妹，再来一次。" -> family ; family = true
option money "为了钱，再来一次。" -> money
label family
Hyun [determined, reassure]: 奶奶还在医院。妹妹还需要我。我不能一直这样。
I: 想到她们，我还是很难过。可是，也有了一点力气。
goto count
label money
Hyun [skeptical]: 钱已经走了。我不能连自己也不要了吧？
I: 这话听起来有点好笑。我终于又笑了一下。
label count
camera close Hyun
Hyun [determined]: 先看看，我还有多少。
I: 他们给了我90,000,000韩元。好像还有很多。
Hyun [happy]: 还有90,000,000……
Hyun [worried]: 等等。不是每一块钱，都能用。
camera medium Hyun
I: 新家的合同已经写好了。50,000,000韩元，是留给房子的。
Hyun [neutral, explain]: 90,000,000，拿出50,000,000。还有40,000,000。
I: 40,000,000韩元。这就是现在可以用的钱。
choice home
option keep "我们已经有家了，别动这些钱。" -> keep ; careful = true
option cancel "如果不要那个房子呢？" -> cancel
label keep
Hyun [determined]: 房子的钱，留在那里。先算能用的。
I: 少一点，就少一点。至少这些钱，我都要想清楚。
goto plan
label cancel
I: 房子还可以不要。可是不按合同做，要给违约金。
Hyun [shocked]: 房子不要了，还要给钱？
Hyun [angry]: 不行！这种钱，我一块也不想给！
label plan
camera close Hyun
I: 40,000,000，不是3,000,000,000。可是，也不是零。
if family == true -> familyReturn else moneyReturn
label familyReturn
Hyun [determined]: 我想让她们过好日子。现在，就从这里开始。
goto next
label moneyReturn
Hyun [skeptical]: 你们拿走了钱，又没有让我变成一个笨蛋。
I: 这一次，我要好好想想怎么做。
label next
camera medium Hyun
I: 我想到了游戏。上一次，我是在游戏里得到钱的。
Hyun [curious]: 下一次呢？我需要做什么？
I: 只是坐着想，钱不会自己回来。我得开始准备。
if careful == true -> carefulEnd else feeEnd
label carefulEnd
Hyun [determined]: 房子的钱不动。能用的钱，要用在有用的地方。
goto ending
label feeEnd
Hyun [skeptical]: 违约金？不给。准备的钱？这个，可以想一想。
label ending
rest Hyun relaxed
Hyun [determined]: 我能赚到一次，就能再来一次。
I: 钱没有回来。可我终于不再坐着，什么都不做了。
end
