story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan neutral left
show Min worried right
camera two Jonathan Min cut
Min [worried, explain]: 招聘今天结束，软件却坏了。
Jonathan [curious, question]: 来应聘的人怎么办？
Min [neutral, explain]: 先听他们说，别叫他们回去。
I: 门边有个姑娘，护着一张旧简历。
scene courtyard
show Jonathan curious left
show Ryn worried right
rest Ryn guarded
camera two Jonathan Ryn cut
Ryn [worried, explain]: 我叫Ryn，从外地来。我想应聘，负责修屋子。
Jonathan [neutral, explain]: 欢迎。我叫Jon，我给这里帮忙。
Ryn [worried, explain]: 我的信息不灵通，怕错过招聘。
Jonathan [neutral, explain]: 你没有错过。我们先检查记录。
Ryn [neutral, explain]: 我从前的单位，给我一封信，记录了我修过什么。
show Vek skeptical center
camera two Vek Ryn cut
Vek [skeptical, explain]: 简历给我，我负责记录。先说学历。
choice welcome
option time "先记录她来到的时间。" -> time
option hear "先听她的经历。" -> hear
label time
Jonathan [neutral, explain]: 机器坏了，不能说她来晚了。
goto barrier
label hear
Jonathan [neutral, explain]: 她愿意说，我们先耐心听。
label barrier
Ryn [worried, explain]: 学历不高。不过，我修过很多管子，有从前单位的记录。
Vek [skeptical, explain]: 这里要求对口的经历。修过管子，不表示什么都能修。
Ryn [determined, explain]: 我没有这样说。房顶要合格的人负责，我知道。
Vek [skeptical, explain]: 没有学历，你会用软件吗？
Ryn [frustrated, explain]: 唉，软件坏了，不是我不愿意用。
Jonathan [determined, insist]: 不能把软件的问题，变成对人的歧视。
Vek [skeptical, question]: 这是歧视吗？我也有单位的要求。
Jonathan [neutral, explain]: 招聘要求和经历要对口。她说有记录，你还没有看。
Ryn [determined, explain]: 我善于检查管子，也善于发现小问题。
Ryn [neutral, explain]: 不过，我不答应不会做的事。你可以考我。
Jonathan [excited, explain]: 我可以替她说，她的意思是——
camera listener Jonathan over 0.65
Ryn [determined, explain]: 我想请你听我说，不是替我回答。
rest Jonathan attentive
I: 我闭上嘴，没有接着说。
camera two Vek Ryn cut
Jonathan [neutral, explain]: 你说吧。我听着。
choice voice
option paper "要求接收纸上的记录。" -> paper
option equal "要求所有人都有一样的选择。" -> equal
label paper
Jonathan [neutral, explain]: 坏机器不能挡住人。纸上的记录也值得看。
goto fair
label equal
Jonathan [neutral, explain]: 不只给Ryn一个人开门。其他人也要能应聘。
label fair
scene courtyard
show Min determined left
show Vek neutral center
show Ryn worried right
rest Ryn guarded
camera two Min Vek cut
Min [determined, explain]: 这个单位要招聘负责的人，不是找最会填表的人。
Vek [neutral, explain]: 那简历先给我，我记录谁提前来了。
Min [neutral, explain]: 还要通知所有人，可以用纸上的简历。
Ryn [curious, question]: 工资是多少？我要负责什么？
Vek [neutral, explain]: 工资和工作时间，这里有记录。我给所有人一样的记录。
Ryn [neutral, explain]: 我想先知道要求，不只听一句前途很好。
Min [neutral, explain]: 前途不能替代工资。你想知道的，我们会说。
Vek [neutral, explain]: 今天记录简历，明天回复。不管录用不录用，我们都回复。
Ryn [relieved, explain]: 谢谢。没有信息灵通的朋友，我也没有被挡在门外。
Vek [embarrassed, explain]: 唉，我本来怕来不及，却没有耐心听你说。
Ryn [neutral, explain]: 我有信心，可以检查，不过，想知道你们检查什么。
Min [neutral, explain]: 先看安全，然后听你的结论。不要求冒险。
choice assessment
option criteria "先把要求说给所有人听。" -> criteria
option practice "先检查练习的地方。" -> practice
label criteria
Min [neutral, explain]: 标准不能偷偷变。先说要求，然后检查。
goto test
label practice
Min [neutral, explain]: 这里是安全的练习区，不会叫人去冒险修房顶。
label test
scene courtyard
show Jonathan neutral left
show Min neutral center
show Ryn determined right
camera two Min Ryn cut
I: 合格的师傅检查了练习区。桌上是没有接水的旧管子。
Min [neutral, explain]: 这一阶段，检查的是判断和安全。不是检查性格。
Ryn [neutral, explain]: 相处的时候，我可能话少。不过，我善于沟通安全的要求。
Jonathan [neutral, explain]: 话少，不表示处不好。我们先听你怎么研究。
Ryn [neutral, explain]: 物理和安全有关系。你看管子下面的支撑。
Ryn [curious, question]: 不过，这里有什么化学危险？我不会碰不知道的东西。
Min [neutral, explain]: 没有化学品，我们只看干净的空管子。
Ryn [neutral, explain]: 这段外语，我不认识。你先给我说说，我不能猜。
Jonathan [neutral, explain]: 承认不知道，也是专业水平的一部分。
Min [neutral, explain]: 及格不是一声不问。知道什么时候停，也在成绩里。
Ryn [neutral, explain]: 这个题目，我先检查这里。支撑没有固定好。
I: 她先停下来，指给师傅看，然后按要求重新固定。
Ryn [determined, explain]: 让我的工作来回答。不要求你只相信我的话。
Min [neutral, explain]: 这篇文章是谁写的？上面有检查记录。
Ryn [neutral, explain]: 从前单位的师傅写的。风暴以来，我一直带着它。
Jonathan [neutral, explain]: 你有精力记录，我们还要有精力检查。
Ryn [neutral, explain]: 我不是要求你们一定录用。我想有一次真正的面试。
choice future
option listen "以后先听应聘的人说。" -> listen
option record "把今天的办法记录下来。" -> record
label listen
Jonathan [neutral, explain]: 给人帮忙，不是替他回答一切。
goto ending
label record
Min [neutral, explain]: 让后来的人知道怎么办，不必再碰一次钉子。
label ending
Jonathan [neutral, explain]: 我意识到，我不能只在朋友面前讲公平。
Ryn [relieved, explain]: 我有信心了。不是因为你答应录用，是因为你愿意认真检查。
I: 夕阳照着练习台。Ryn看向远处的屋子，没有急着走。
Min [neutral, explain]: 所有简历都记录了，还要检查所有人的记录。屋子仍然没修好。
Jonathan [neutral, explain]: 水和从前一样，我们还记得从前答应的话。明天，我们等正式的回复。
end
