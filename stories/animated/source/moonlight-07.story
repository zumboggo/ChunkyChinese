story 2
variable wonder = false hidden
variable endure = false hidden
label opening
scene square
show Hyun surprised center
camera wide
I: 一道光过去，我已经站在塞拉堡的路上。
I: 四周都是人。有人在买东西，有人在说话。
camera medium Hyun
Hyun [shocked]: 这……真的是游戏吗？
I: 我站着不动，看看四周，又看看下面的地。
Hyun [surprised]: 站在地上，感觉也是真的。
choice arrival
option world "这里和真的世界一样！" -> world ; wonder = true
option feet "先看看我的身体。" -> feet
label world
Hyun [excited]: 声音、人、房子……我真的进来了！
goto noticed
label feet
rest Hyun attentive
Hyun [curious]: 我站在这里。可是，我的身体还在家里。
label noticed
show Player curious left
show Hyun surprised right
move Hyun turn
camera medium Player
Player [curious]: 看那个人，一定是新来的。
show Hyun embarrassed right
move Hyun turn
rest Hyun downcast
react Hyun sigh
camera close Hyun
I: 他们是在说我。我还没有动。
camera medium Player
Player [neutral]: 他以前没玩过这样的游戏吧。
move Player exit
camera close Hyun
Hyun [embarrassed, hesitant]: 是啊……我的样子一定很奇怪。
camera medium Hyun
rest Hyun attentive
Hyun [determined]: 没错。这里是皇家之路，也是我要工作的地方。
I: 准备了一年，真的进来，还是不一样。
I: 我慢慢平静下来。这里的人穿着盔甲或者皮衣。
I: 旁边的木头上有地图，也有怎么玩的说明。
Hyun [determined]: 好，开始吧。
camera wide
react Hyun crouch
I: 我蹲下，再站起来，看看身体能不能这样动。
I: I jump, roll, kick and punch. Then I test my waist, fingers, toes and neck, one joint at a time.
camera medium Hyun
Hyun [curious]: 在这里，我的身体能做什么？
Hyun [happy]: 我还要跳，还要打。都得好好练习。
show Player skeptical left
camera wide
Player [skeptical]: 那个人现在又在做什么？
show Hyun embarrassed right
move Hyun turn
rest Hyun guarded
camera close Hyun
I: 我听到了，却还想再动一动。
choice watched
option focus "先练习，不要想他们说的话。" -> focus ; endure = true
option hide "真想找个没人的地方。" -> hide
label focus
Hyun [determined, insist]: 再来一下。我得知道身体能不能动。
goto comment
label hide
Hyun [embarrassed, hesitant]: 大家都在看我……我怎么选了这里？
label comment
show Other curious center
camera medium Other
Other [curious]: 他大概还不习惯。他想知道身体能不能动。
camera wide
Player [skeptical]: 可是，为什么要在这么多人的地方这样做？
show Hyun embarrassed right
move Hyun turn
rest Hyun downcast
react Hyun shake-head
camera close Hyun
I: 这一次，我不能再假装没听到了。
Hyun [frustrated]: 可恶！
camera wide
move Hyun exit
I: 我很快走开，不想再让他们看了。
move Player exit
move Other exit
show Hyun embarrassed center
rest Hyun downcast
camera medium Hyun
I: 离开那些人以后，我慢慢停下来。
if endure == true -> focusReturn else hideReturn
label focusReturn
Hyun [embarrassed]: 我以为自己可以不听。可是，我错了。
goto rules
label hideReturn
Hyun [embarrassed]: 下次，要练习，就找个没人的地方。
label rules
rest Hyun attentive
I: 新来的人，第一个星期不能离开开始的城市。
I: 现实里的一个星期，在游戏里是四个星期。
Hyun [curious]: 四个星期。我在这里做什么呢？
I: 有人做简单的任务，有人学做衣服、打铁、做饭。
I: 也有人在图书馆或者商店工作，想得到一些钱。
I: 在中间的大广场，有人买卖东西，也有人找一起出去的人。
Hyun [neutral]: 他们有他们的办法。
if wonder == true -> worldReturn else feetReturn
label worldReturn
Hyun [determined]: 这里好像真的世界。可我不是来看美丽的房子的。
goto hall
label feetReturn
Hyun [determined]: 身体能动。接下来，就要好好练习了。
label hall
camera medium Hyun
rest Hyun attentive
Hyun [determined]: 我要去训练场。
I: 谁都可以去训练场，想在里面多久都可以。
I: 大家一般去那里试新的技能，很少有人一进游戏就去练习。
I: 很多人觉得，在那里练习，没什么用。
camera close Hyun
Hyun [determined]: 我还是要去。
camera wide
I: 我走向训练场。这一次，我知道自己要去哪里。
end
