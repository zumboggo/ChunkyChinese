story 2
label opening
scene counter
show Alden neutral left
show Boe neutral center
show Jeremy neutral right
camera wide cut
I: 我又和两个朋友走进了那家店。这里卖的肉，我已经看过很多次了。
I: 我看了看里面的东西。今天，我应该带什么给他呢？
Boe: 有件事，我本来不想说。
Boe: 你一直在想他的事，会不会是不想去想另一件事？
Alden: 什么事？
I: 他看起来很不舒服。他怎么也会有这种样子？
choice question
option face "看看他的样子。" -> face
option meaning "想想他说的另一件事。" -> meaning
label face
I: 以前，他可不会这样。他今天不是在开玩笑。
goto glance
label meaning
I: 我在找吃的。他却好像在问，我为什么一直找。
label glance
I: 他看了旁边的人一眼。那个人也看了看我，准备说话。
Jeremy: 他说的是汉娜的葬礼。你会去吗？
label glass
I: 我不再看他们。我的脸离玻璃很近，面前很快就白了一小块。
Alden: 我想，我不会去。
I: 我想把话说得轻松一点。好像这不是什么重要的事。
label reasons
Alden: 那里，我只认识她一个人。
Alden: 会去的人，都比我更了解她。我不想让他们觉得，我不应该在那里。
choice distance
option others "想想那些更了解她的人。" -> others
option place "想想自己能站在哪里。" -> place
label others
I: 他们和她一起生活过。我去过的时间，却那么少。
goto urging
label place
I: 如果我去了，我要和谁说话？谁会知道我为什么在那里？
label urging
Jeremy: 你应该去。
Boe: 对。葬礼本来就不好受。多你一个人，应该不会让别人更难受。
label care
Jeremy: 别人可能不关心你去不去。可是，你自己会难受。
Jeremy: 第二天早上，你一起来，就会发现自己已经错过了。
Jeremy: 到那时候，你会很生自己的气。
choice tomorrow
option missed "想想第二天的自己。" -> missed
option matters "记住他刚才说的话。" -> matters
label missed
I: 第二天。到那个时候，我再想去，也不能再来一次了。
goto silence
label matters
I: 他没有说别人需要我。他说的是，我自己会难受。
label silence
I: 我们谁也没有说话。那一会儿，真的很难受。
I: 我不知道应该说什么。
label doom
Boe: 然后，你就会觉得自己要疯了，跑去把他从里面救走。
Boe: 我们的城市都会变成地狱。大家一起完蛋。
choice joke
option picture "想想大家一起死的样子。" -> picture
option friend "看看旁边的人。" -> friend
label picture
I: 从不去葬礼，到大家一起死。他说的话，走得也太远了吧。
goto glare
label friend
I: 我看向旁边。看他的脸，我就知道他有多不高兴。
label glare
I: 杰里米看了他一眼。他马上做了个不好意思的样子。
Boe: 刚才太认真了。我真的不能再听下去了。
label tacos
Boe: 这里的牛舌卷饼很好吃。买那个吧。
Boe: 他要是不吃，你还可以拿来做午饭。
label ending
I: 说了这么多，我们又回到了吃的问题。
I: 可是，“你自己会难受”这几个字，还留在我心里。
end
