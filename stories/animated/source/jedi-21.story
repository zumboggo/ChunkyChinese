story 2
variable water = 2 range 0 40 visible
scene garden
show Jonathan determined left
show Min neutral right
camera two Jonathan Min cut
I: 我检查这里的路，想保护来读书的孩子。
Jonathan [determined, explain]: 面试结束了，今天我们负责检查路。
Min [neutral, explain]: 录用的人知道要求，试用期的工资也答应了。
Jonathan [happy, explain]: 我有信心，不想错过任何要检查的地方。
I: 我看见一群蜜蜂。从前走的路旁边有蜂窝。
Jonathan [worried, question]: 蜂窝在那里，孩子怎么办？
show Edda determined center
camera two Jonathan Edda cut
Edda [determined, explain]: 先停。我叫Edda，我负责这里的花园。
Jonathan [determined, explain]: 我可以赶走蜜蜂。和进攻的时候一样。
Edda [determined, explain]: 不是进攻。我们别从那里走，也别靠近蜂窝。
choice stop
option listen "先听Edda的要求。" -> listen
option route "先叫Min看住旧路。" -> route
label listen
Jonathan [neutral, explain]: 我不知道，我先听你说。
goto bees
label route
Min [neutral, explain]: 我在这里提醒别人，不会去碰蜂窝。
label bees
Edda [neutral, explain]: 蜜蜂在鲜花上采蜜，不是要蜇你。
Jonathan [worried, question]: 我害怕被蜇，它们有刺儿吧？
Edda [neutral, explain]: 会蜇人，我们不去碰。不能拍打。
Jonathan [worried, explain]: 害怕的时候，我就想拍打，我太着急了。
camera listener Jonathan over 0.65
Edda [neutral, explain]: 蜜蜂不是来进攻你的。保护这里，不一定要赶走蜜蜂。
rest Jonathan attentive
I: 我慢慢放下手，没有继续走。
camera two Jonathan Edda cut
Jonathan [neutral, explain]: 我们可以给蜜蜂留地方。我不必总像在进攻似的。
Edda [neutral, explain]: 一群人急着过去，会变得很复杂。
Min [neutral, explain]: 我们不能一窝蜂地过去。我先检查别的路。
Jonathan [neutral, explain]: 像害怕错过面试似的，我们有时候一窝蜂地过去。
Edda [neutral, explain]: 有刺儿，不表示要进攻。不是叫你冒险。
Jonathan [embarrassed, explain]: 我还没有被蜇，就想到鼻青脸肿了。
Edda [neutral, explain]: 我不想看见你鼻青脸肿地回来，不是叫你去试一试。我们保护人，也保护蜂窝。
choice space
option barrier "先把不能走的路标出来。" -> barrier
option expert "请合格的人来检查。" -> expert
label barrier
Min [neutral, explain]: 先在这里告诉别人，不要去蜂窝旁边。
goto garden
label expert
Edda [neutral, explain]: 我叫合格的人来检查了。我们等，不冒险。
label garden
I: 我们选择安全的路，从前的路仍然关着。
Jonathan [curious, question]: 这里为什么有五颜六色的鲜花？不只是为了形象吧？
Edda [neutral, explain]: 不是选美。花给蜜蜂食物，蜜蜂也给植物帮忙。
Min [curious, question]: 五颜六色的花，孩子看了会高兴吧。
Edda [neutral, explain]: 五颜六色很好看，不过，花期也要考虑。
Jonathan [curious, question]: 花期不一样，就不会一起开，一起结束？
Edda [neutral, explain]: 对。四季不一样，鲜花开的时间也不一样。
Min [neutral, explain]: 不能要求四季都一样。和人的性格一样，不必什么都一样。
Jonathan [curious, question]: 孩子可以来采鲜花吗？
Edda [neutral, explain]: 先看哪里可以采，不能为了打扮，就不考虑蜜蜂。
Jonathan [happy, explain]: 没有名牌，我也可以帮忙。今天不比打扮。
Min [happy, laugh]: 我连衣领都放下了，你还想选美？
Edda [neutral, explain]: 蜜是蜜蜂的食物，不是给我们随便拿的。
Jonathan [neutral, explain]: 这里的蜜，不是我们的。我记得从前答应过的话。
Edda [neutral, explain]: 愿意停下来，也表示自信。不必大声喊。
choice work
option sign "我帮忙写安全的提醒。" -> sign
option plants "我听Edda说植物的要求。" -> plants
label sign
Jonathan [neutral, explain]: 先给你看，不自己决定哪里安全。
goto care
label plants
Jonathan [neutral, explain]: 认识植物，不表示善于照顾植物。
label care
Edda [neutral, explain]: 这块旧牌子要涂颜色，不过，先搬到安全的地方。
Min [neutral, explain]: 涂的时候，别让孩子走进来。等干了，再放回去。
Jonathan [curious, question]: 我可以在这里帮忙，不用加班吧？
Edda [neutral, explain]: 不用。超过要求，就停，不要求你为花园牺牲一切。
Min [neutral, explain]: 两人以上也不能马虎。所有人要知道哪里不能走。
I: 合格的人来了，先检查安全。我们没有一窝蜂地过去。
Edda [neutral, explain]: 他确认可以先隔开这里，再安排适当的处理。
Jonathan [neutral, explain]: 我们不需要搬蜂窝，更不要求孩子冒险。
Min [neutral, explain]: 从前的路还关着，不过，别的路检查过了。
Edda [neutral, explain]: 这是普遍的误解，保护不是赶走一切。
Jonathan [neutral, explain]: 我们不歧视应聘的人，也不该小看蜜蜂。不过，也不能说一切都安全。
Min [neutral, explain]: 你善于检查，还要有耐心听。
Edda [neutral, explain]: 你们保护了鲜花，也给孩子找到了安全的路。不是赶走一切才有作用。
choice donation
option ask "先问开门那天需要什么。" -> ask
option record "先记录哪些东西不能拿。" -> record
label ask
Jonathan [curious, question]: 我们还缺便宜的用品，你有什么建议？
goto ending
label record
Min [neutral, explain]: 有主人的东西，不能因为想帮忙就拿走。
label ending
Edda [neutral, explain]: 我家种花的人愿意捐一些小花苗，给开门那天的摊位。
Jonathan [happy, explain]: 谢谢。我们先记录，不把答应的东西当成已经到了。
Min [neutral, explain]: 水和从前一样。今天没有用站里的水。
Jonathan [neutral, explain]: 旧路关着，新路安全。我们可以一起往前走，也给别人留地方。
end
