story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan excited left
show Sela neutral right
rest Sela attentive
camera two Jonathan Sela cut
I: 我提前来到这里，检查物理课要用的小木桥。
Jonathan [excited, explain]: 今天的物理课，我们一起研究。
Sela [curious, question]: 你希望他们研究什么？
Jonathan [proud, explain]: 桥为什么会倒。他们愿意研究，不只是听话。
Sela [neutral, explain]: 先说题目，然后听他们回答。
I: 我想念从前一起读书的朋友。缺课的孩子，不应该害怕成绩。
Jonathan [neutral, explain]: 今天不看成绩单，我们一起试一试。
Sela [neutral, explain]: 我是班主任，我负责保护孩子，不只是批评成绩。
Sela [neutral, explain]: 开学不是比赛。先陪他们，叫他们安心。
Jonathan [curious, question]: 家长可以一起研究吗？
Sela [neutral, explain]: 可以。Ivo还在和儿子谈话，我们不替他们答应。
choice begin
option ask "先听班主任的要求。" -> ask
option try "先请Sela试一试。" -> try
label ask
Jonathan [curious, question]: 你是班主任，这个题目合格吗？
goto model
label try
Jonathan [neutral, explain]: 你先试一试，然后批评我。
label model
Sela [neutral, explain]: 我不替孩子回答。不过，我可以检查安全。
I: 木桥只有手掌那么大。我放下两块小石头。
Jonathan [proud, explain]: 看，物理可以回答，为什么这里要有支撑。
Sela [curious, question]: 他们还不知道为什么，你会怎么检查？
Jonathan [excited, explain]: 先看这只狼。它要过桥。
react Jonathan shock
I: 我碰了一下木桥，桥倒了，纸狼正好贴在我的鼻子上。
react Jonathan facepalm
Jonathan [embarrassed, laugh]: 狼可不听我的话。它有自己的计划。
Sela [happy, laugh]: 你的水平，现在由狼来检查了。
Jonathan [embarrassed, explain]: 我本来想叫人说我了不起，现在倒像个傻孩子。
Sela [neutral, explain]: 一次不成功，不表示人傻。我们研究为什么会这样，不批评谁丢面子。
Jonathan [neutral, explain]: 我意识到，我急着说，没有耐心听。
choice mistake
option laugh "承认自己太骄傲了。" -> laugh
option pause "请Sela说明哪里不清楚。" -> pause
label laugh
Jonathan [embarrassed, explain]: 刚才我太骄傲了。连纸狼也不满意。
goto listen
label pause
Jonathan [curious, question]: 哪里最复杂？我愿意听。
label listen
Sela [neutral, explain]: 你有精力表演，还要有耐心等他们研究。
camera listener Jonathan over 0.65
Sela [neutral, explain]: 你要陪他们研究，不是叫人相信你什么都知道。
rest Jonathan attentive
I: 我放下手，等她说完。
camera two Jonathan Sela cut
Jonathan [neutral, explain]: 这个阶段，先听他们说题目是什么。
Sela [neutral, explain]: 好。下一阶段，请他们说结论。
Jonathan [curious, question]: 及格的要求是什么？桥不倒，就及格吗？
Sela [neutral, explain]: 及格要会说明原因，不是碰巧成功。
Sela [neutral, explain]: 今天，能回答为什么，比只求表扬更值得骄傲。
Jonathan [neutral, explain]: 成绩要有作用，不能叫他们害怕回答。
Sela [neutral, explain]: 我会严格检查安全，不过，不用严厉的语气。
Jonathan [neutral, explain]: 严厉地批评，会叫人再也不敢试一试。
I: 我从纸狼的旁边，拿起一张熊掌的图。
Jonathan [curious, question]: 熊掌比狼的脚大。看这张图，研究压力，好吗？
Sela [neutral, explain]: 可以，不过先说，我们研究的是模型。不是让孩子去碰真正的熊掌。
Jonathan [neutral, explain]: 这里有一篇文章，说的是狼和熊掌的故事。
Sela [curious, question]: 这篇文章，孩子读书的时候会害怕吗？
Jonathan [embarrassed, explain]: 文章里外语很多。我本来想表示我有水平。
Sela [neutral, explain]: 外语不是坏处。不过，先说外语是什么意思，读书的人就知道你说什么。
Jonathan [neutral, explain]: 我还有化学的记录。今天一起研究吗？
Sela [neutral, explain]: 化学不属于今天的题目。今天不混合任何东西。
choice revise
option simple "先写清楚一个题目。" -> simple
option reader "先请别人读文章。" -> reader
label simple
Jonathan [neutral, explain]: 不要求他们知道一切。先一起研究这座桥。
goto class
label reader
Jonathan [neutral, explain]: 不要求他们表扬，先听他们知道了什么。
label class
Sela [neutral, explain]: 你的决心很好。不过，有决心也要有耐心。
Jonathan [determined, explain]: 我的决心不是让人表扬我。我要陪他们研究。
I: 我们擦干净桌子，留下简单的图和说明。
scene courtyard
show Jonathan neutral left
show Sela neutral center
show Min curious right
camera two Jonathan Min cut
Min [curious, question]: 班会结束了？我来报到，给你们帮忙，检查记录。
Sela [neutral, explain]: 孩子还没来。我们提前试一试，不要求孩子替我们检查一切。
Min [neutral, explain]: 家长想知道，孩子难过的时候怎么办。
Jonathan [neutral, explain]: 想哭，可以哭。愿意的话，可以请朋友做伴。
Sela [neutral, explain]: 今天不要求成绩。缺课的人也可以先看。
I: 然后，孩子来到这里，分别选择坐在哪里。
I: 有人先看图，有人小声读书，没有人被要求表演。
Jonathan [neutral, explain]: 我渐渐意识到，小声回答也表示他在研究。
Min [neutral, explain]: 他们还有精力，不过，先别给他们复杂的题目。
I: 孩子修改了记录，叫我们分别看。
Min [happy, explain]: 现在我知道怎么办了。先检查支撑，再放石头。
Jonathan [happy, explain]: 我为他们骄傲，不是为我的表演骄傲。
Jonathan [happy, explain]: 他们知道为什么了，还给我们帮忙了。
Sela [determined, explain]: 不过，屋子的门仍然闭着。模型不是修房顶的资格。
Min [neutral, explain]: 我们不得不找合格的人，负责修屋子。
choice next
option notice "我帮忙写招聘的说明。" -> notice
option check "我先请专业的人检查要求。" -> check
label notice
Jonathan [neutral, explain]: 这次先给别人看，不要求他们表扬我。
goto ending
label check
Jonathan [neutral, explain]: 我愿意帮忙，不过，不替合格的人答应。
label ending
Min [neutral, explain]: 水的记录和从前一样。修房顶的人，要知道我们从前答应了什么。
Sela [neutral, explain]: 我严肃地说，任何人都不能冒险，安全要放在前面。
Jonathan [happy, explain]: 今天的小桥倒了，我们倒是知道要先找谁了。
end
