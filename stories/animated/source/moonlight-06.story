story 2
variable cost = false hidden
variable name = false hidden
label opening
scene home
show Hyun determined center
camera medium Hyun
I: 一年过去了。今天，我不再只是坐在电脑前。
I: 我要买游戏胶囊，进去玩皇家之路。
I: 游戏胶囊要一千万韩元。
react Hyun wince
Hyun [worried]: 一千万……光是想一想，我就想哭。
choice purchase
option money "这么多钱，真让人心疼。" -> money ; cost = true
option ready "我已经为这一天准备了一年。" -> ready
label money
Hyun [sad]: 身体疼的时候，我没有哭。可是，这些钱……
goto buy
label ready
Hyun [determined]: 学了一年。现在，我要进去看看了。
label buy
I: 我还是买了。贵得我都快哭了。
Hyun [determined]: 这是投资。想在里面得到钱，就得先进去。
I: 我一直提醒自己：这是投资，是必须花的钱。
Hyun [neutral]: 准备好了。真的要开始了。
camera close Hyun
I: 我觉得自己好像一个战士，马上就要走进战场。
I: A message appears: “Connect to Royal Road?”
Hyun [determined, insist]: 是！
scene entry
show Hyun surprised center
camera wide
I: 四周好像没有边。我看不到别人。
I: The system scans my iris and veins. I am a new user; a woman's voice asks me to create an account.
Hyun [confused]: 谁在说话？
I: 我又看看四周。没有人。
Hyun [relieved]: 原来是游戏在问我。要开始了。
I: 要开一个新账号吗？
Hyun [determined]: 是！
camera medium Hyun
I: 请选择你的名字……
Hyun [neutral]: 杂草。
I: Weed. The lowest of plants. To me, the name fits.
choice meaning
option low "再小的草，也能活下去。" -> low ; name = true
option mine "我还是喜欢这个名字。" -> mine
label low
Hyun [determined]: 小一点也没关系。我还在这里。
goto gender
label mine
Hyun [happy]: 叫这个名字，我觉得很好。
label gender
I: 你要做男人、女人，或者……
Hyun [neutral]: 男人！
I: 皇家之路有四十九个种族。你可以选择……
Hyun [determined]: 人类！
I: 你可以让自己变成其他样子……
Hyun [neutral]: 就用我现在的样子。
I: 账号开好了。你会有什么职业，会有多强，游戏开始后……
Hyun [determined]: 不用说了！
I: 请选择你要开始的城市和国家。
Hyun [determined]: 罗森海姆的塞拉堡！
Hyun [proud]: 去哪里，我早就想好了。
I: 欢迎来到这个世界……
Hyun [determined]: 不用说了！
react Hyun shake-head
I: 我连一秒钟都不想浪费。要做什么，我都已经想好了。
I: 每个月，玩这个游戏还要花三十万韩元。
if cost == true -> costReturn else readyReturn
label costReturn
Hyun [worried]: 买胶囊已经让我心疼。每个月的钱，也不能白花。
goto nameCallback
label readyReturn
Hyun [determined]: 一年都用来准备了。现在，每一分钟都要用好。
label nameCallback
if name == true -> lowReturn else mineReturn
label lowReturn
Hyun [determined]: 小小的杂草，也要在这个世界活下去。
goto ending
label mineReturn
Hyun [determined]: 还是这个名字。接下来，要在这里走自己的路。
label ending
camera close Hyun
I: 我跳过了说明，选好了要去的地方。
Hyun [determined]: 准备了一年。现在，让我进去吧。
I: 接下来，就是走进那个世界。
end
