story 2
label opening
scene street
show Alden neutral center
camera medium Alden cut
I: 快到晚上十一点了。我站在领事馆外面，这里很安静。
label watch_26_opening_1
I: 可是，我手里的猫一点也不安静。维克多不喜欢被关在里面。
I: 我还拿着两大袋吃的，还带着枕头。
I: 我看看黑黑的房子。我这是在做什么啊？好像喝了酒，可我明明没喝。
label watch_26_opening_4
choice arrival
option plan "想想自己本来的打算。" -> plan
option door "看看关着的门。" -> door
label plan
I: 我一般会先想好，再做事。现在不想就做，就变成这样。
goto button
label door
I: 这么晚了，当然没人来。可我都已经走到这里了。
label button
I: 门上有个对讲机。我拿着猫，用手点了一下按钮。
I: 没有声音，也没有灯亮起来。不知道它有没有用。
Alden: 你好？我是奥尔登。
label answer
scene lobby
show Gorgon neutral center
camera medium Gorgon cut
I: 等了好一会儿，才有声音。是他的声音。
Gorgon: 我在电脑上看见你了。
label watch_26_answer_2
label ask
scene street
show Alden neutral center
camera medium Alden cut
Alden: 太好了！我可以进去吗？
label closed
scene lobby
show Gorgon neutral center
camera medium Gorgon cut
Gorgon: 这里明天早上九点才开门。
label watch_26_closed_1
label plead
scene street
show Alden neutral center
camera medium Alden cut
Alden: 别这样。我睡不着。你不是也说过，你不怎么睡觉吗？
label watch_26_plead_1
Alden: 我们可以一起玩。就像大家一起玩一个晚上，不过不睡觉。
Alden: 这可能会是这里发生过最好玩的事！
label family
scene lobby
show Gorgon neutral center
camera medium Gorgon cut
Gorgon: 你的家人一定在担心你。请回家吧。
label watch_26_family_1
label alone
scene street
show Alden neutral center
camera medium Alden cut
Alden: 我只有一个家人。她说走就走，和一个拿走猫粮的人去加州了。
Alden: 今天晚上，这个世界上，一个会想我的人都没有。
label watch_26_alone_2
I: 那边又没有声音了。
choice silence
option listen "等他说话。" -> listen
option hold "看看手里的东西。" -> hold
label listen
I: 我看看门上的东西。刚才的话，已经说出去了。
goto admit
label hold
I: 手里拿了这么多东西，可我还是站在门外。
label admit
scene lobby
show Gorgon neutral center
camera medium Gorgon cut
I: 过了一会儿，他叹了一口气。
Gorgon: 这是我这几个月听过最让人伤心的话。好吧，进来。
label watch_26_admit_2
Gorgon: 不过，我刚把地上洗干净。在门口脱鞋子。
label enter
scene lobby
show Alden neutral left
show Gorgon neutral right
camera wide cut
I: 门开了。我走进去，看见里面的灯也亮了。
I: 我有点像做了不应该做的事的小孩，心里还很高兴。
label watch_26_enter_2
I: 他就在门旁边等我。身上的束缚一直连到里面的桌子后面。
Gorgon: 鞋子。
label watch_26_enter_4
I: 他看看我的鞋子，好像它们马上就要做不应该做的事。
Alden: 是，先生！
I: 我笑了笑，低下头，把它们脱下来。
label exciting
Gorgon: 先说清楚。你说的这个晚上的活动，不会是这里最好玩的事。
label watch_26_exciting_1
Gorgon: 以前有人两次想炸这里，还有几个生气的超人来过。
label watch_26_exciting_2
Alden: 哦……不过，我带了吃的？
label watch_26_exciting_3
label notcat
I: 他看看猫的箱子。
Gorgon: 不用了，谢谢。
label watch_26_notcat_2
Alden: 不是猫！这是维克多！它和我一起住。它是来玩的，不是给你吃的！
label watch_26_notcat_3
choice guest
option victor "看看生气的猫。" -> victor
option gorgon "看看戈尔贡的样子。" -> gorgon
label victor
I: 它还在叫。好像它也有很多话想说。
goto rage
label gorgon
I: 他很认真地看猫。我可得把这件事说清楚。
label rage
Gorgon: 它叫成这样，是因为很高兴吗？
label watch_26_rage_1
Alden: 是因为生气。不过没关系，让它出去就好了。
label watch_26_rage_2
I: 他没有说不可以。我打开箱子，猫马上跑了出去。
I: 它从刚洗干净的地上滑过去，跑到窗户旁边的椅子下面。
I: 他看猫，好像觉得很有意思。
label watch_26_rage_5
label chores
Alden: 那么，今天晚上，你还想做什么？有什么我能帮忙的吗？
label watch_26_chores_1
Gorgon: 看电脑。看看别人留在男厕所里的杂志。再把电梯按钮洗干净。
label watch_26_chores_2
Alden: 都很好。不过，你可以进去？我从没见你从这里出去。
label bindings
Gorgon: 这里大家都能去的地方，我都能去。
Gorgon: 可是，活的东西不能穿过我的束缚。人多的时候，我走开会让人摔倒。
label watch_26_bindings_2
choice notice
option cords "看看他身上连着的东西。" -> cords
option empty "看看现在空空的房间。" -> empty
label cords
I: 原来，他坐在桌子后面，还有这个原因。
goto invitation
label empty
I: 现在这里没有其他人。只有我们，还有猫。
label invitation
Alden: 明白了。那我们坐电梯上上下下，一起吃点东西吧。
label watch_26_invitation_1
Gorgon: 为什么？
Alden: 为什么不呢？我一定不会摔倒。
label watch_26_invitation_3
end

