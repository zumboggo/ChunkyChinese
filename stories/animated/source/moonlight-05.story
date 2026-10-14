story 2
variable strength = false hidden
variable people = false hidden
label opening
scene home
show Hyun determined center
camera medium Hyun
I: 想在游戏里赚到钱，我得先离开电脑。
Hyun [curious]: 游戏里要用身体。那我就先让身体变得更好。
I: I spend part of the available money on aikido, kendo and taekwondo classes.
I: 一天，我最多要去六个地方。早上学，下午也学。
Hyun [worried]: 六个地方……光是跑过去，就很累了。
I: 每天回来，身体到处都疼。第二天，我还是去。
choice reason
option stronger "我要比现在更强一点。" -> stronger ; strength = true
option future "我想把以后的日子过好。" -> future
label stronger
Hyun [determined]: 哪怕只强一点，也没有白学。
goto training
label future
Hyun [determined]: 我不是来玩一天的。我要为以后做准备。
label training
camera wide
I: 一天又一天，我的身体慢慢变强了。
react Hyun strike
Hyun [determined]: 再来一次。
I: 老师们叫我野兽。我学得快，学的时候也特别认真。
camera medium Hyun
Hyun [skeptical]: 野兽？至少不是只会坐在电脑前的人了。
I: 有时候，我从早到晚学用剑，手都流血了。
react Hyun wince
I: 这很疼。这一年，我要花的不只是钱。
Hyun [curious]: 可是，学这些，真的能帮我玩游戏吗？
I: This is virtual reality: movement in the real world affects movement in the game.
Hyun [neutral, explain]: 会用身体，不一定就能赢。可这能让我比现在更好。
I: 哪怕一开始只有一级，我也想比别人强一点。
I: If that advantage stays at even ten percent, imagine what it could mean over a whole game.
if strength == true -> strengthReturn else futureReturn
label strengthReturn
Hyun [determined]: 我想比现在更强一点。现在，我知道怎么做了。
goto evening
label futureReturn
Hyun [determined]: 想过好日子，就得先把眼前的事做好。
label evening
camera medium Hyun
I: 白天让身体变强。到了晚上，我又坐到电脑前。
Hyun [disappointed]: 身体想睡觉，我还得用心学习。
I: 哪个游戏的人最多？游戏是怎么玩的？我都要看明白。
choice research
option players "先看大家都在玩什么。" -> players ; people = true
option rules "先看游戏里能做什么。" -> rules
label players
Hyun [curious]: 人多的地方，可能有更多能赚到钱的事。
goto records
label rules
Hyun [curious]: 进去以后能做什么？现在就要问清楚。
label records
I: 每一种职业、每一座城市、每一种技能，我都写下来。
Hyun [neutral]: 放在一起，好好看清楚。
I: Paper charts cover my walls: professions, cities, skills. My room becomes a map of what I need to learn.
Hyun [laughing]: 这些东西这么多！我的房间都要变小了。
I: 就这样，我一边学用身体，一边学习怎么玩游戏，过了一整年。
camera close Hyun
I: 这一年，我也一直在看皇家之路变成什么样了。
I: Royal Road now holds over 75% of the world’s game market.
I: More than 90% of Korean gamers play it.
I: When its kings go to war, the broadcasts draw more viewers than other networks.
if people == true -> peopleReturn else rulesReturn
label peopleReturn
Hyun [proud]: 我要找人多的地方。现在，大家都到这里来了。
goto decision
label rulesReturn
Hyun [proud]: 这一年写下来的东西，都有用了。我知道自己要去哪里了。
label decision
camera medium Hyun
I: 想让大家知道自己，想变得更强，想赚到钱。人们都可以在这里试一试。
Hyun [happy]: 很好。和我想的一样。
I: 一年前，我问自己能不能再来一次。现在，我知道要去哪里了。
Hyun [determined]: 皇家之路。就是它。
I: 我还没有开始玩这个游戏。但这一年，已经不是空等了。
end
