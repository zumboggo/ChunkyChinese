story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan happy left
show Ryn neutral right
camera two Jonathan Ryn cut
I: 最后的安全检查结束了。屋子可以按要求开门了。
Ryn [neutral, explain]: 专业人员签字了。我负责管子，房顶仍然由专业人员检查。
Jonathan [happy, explain]: 我从来没这样安心过。不过，开门了仍然要负责。
show Nia happy center
camera two Jonathan Nia cut
Nia [happy, explain]: 那还用说！我是音乐迷，我负责音乐。
I: Nia打开机器，声音很大。我忍不住跟着摇。
Nia [happy, explain]: 这姑娘的声音迷住我了。我想给所有人听。
show Daro worried far-right
Daro [worried, explain]: 我倒是想听见老婆说话。几乎听不见了。
Nia [surprised, question]: 你不满意吗？我想叫所有人精神起来。
choice sound
option stop "先小声一点。" -> stop
option ask "问Daro的要求。" -> ask
label stop
Jonathan [neutral, explain]: 先小声一点，我们要沟通。
goto conflict
label ask
Daro [neutral, explain]: 我愿意听，不过，不想被声音赶出去。
label conflict
Nia [worried, explain]: 得了，我关掉吧。我一时得意，又挨批评了。
Jonathan [neutral, explain]: 你想叫所有人精神起来。不过，他也愿意做伴。
Daro [neutral, explain]: 我不是要求消除所有声音。我们要一起考虑。
Nia [worried, explain]: 我迷上这姑娘的音乐，是因为难过的时候她陪着我。
Jonathan [neutral, explain]: 我相信你的善意。不过，不能只考虑声音大的人。
camera listener Jonathan over 0.65
Daro [neutral, explain]: 门开了，还要有我的地方。
rest Jonathan attentive
move Jonathan far-left
I: 我不再跟着摇。我走开一点，给他让路。
move Jonathan left
camera two Jonathan Daro cut
Jonathan [neutral, explain]: 门开了，所有人都该有地方。我不能只考虑我满意不满意。
Nia [neutral, explain]: 那我先小声一点。我想听你的要求。
Daro [neutral, explain]: 我是读书迷。文章可以迷住我，不过，我不会叫你非读不可。
Nia [neutral, explain]: 可不是吗，我迷上音乐，不能要求所有人和我一样。
choice programme
option quiet "先小声谈话。" -> quiet
option together "一起研究时间表。" -> together
label quiet
Daro [neutral, explain]: 我想和朋友小声谈话。不是要求你不能出声。
goto agreement
label together
Nia [neutral, explain]: 我先列出时间，我们一起考虑。
label agreement
Jonathan [neutral, explain]: 一时的得意，不用变成争吵。先考虑所有人的要求。
Nia [neutral, explain]: 倒是可以先小声谈话，然后再有一小段音乐。
Daro [happy, explain]: 可不是吗！时间提前说明，我可以选择。
Nia [happy, explain]: 我会小声一点，不挡着别人谈话。不满意就叫我。
Jonathan [neutral, explain]: 不能保证消除所有烦恼。不过，可以耐心地听。
Daro [happy, explain]: 那还用说。开门是为了相处，不是为了挨骂。
Nia [happy, laugh]: 得了，我也不想挨骂。我先试一试。
I: 我们检查声音，所有人答应了。音乐停下来，我们谈话。
move Nia exit
move Daro exit
show Luma happy center
show Edda happy far-right
camera two Jonathan Edda cut
Edda [happy, explain]: 亲戚把答应的苗送来了。我检查过，这次是真的收获。
Jonathan [happy, question]: 花园的路呢？我记得蜂窝。
Edda [neutral, explain]: 专业人员已经处理好了。检查合格的路可以走，旧路仍然关着，不必冒险。
Edda [happy, explain]: 苗需要的水，亲戚带来了。不拿站里的水，别人的水仍然归他们。
Jonathan [neutral, explain]: 我不会再进攻蜜蜂。保护蜜蜂，就是保护人。
show Sela happy far-left
camera two Jonathan Sela cut
Sela [happy, explain]: 文章和照片放好了。愿意读书的，可以读书；不愿意说的，可以先听。
Jonathan [neutral, explain]: 那An呢？不能因为开门，就要求她冒险。
Sela [neutral, explain]: 哪能要求她冒险？我们仍然按她的限度安排。
choice duties
option limits "先说明每个人的限度。" -> limits
option willing "先问谁愿意负责。" -> willing
label limits
Ryn [neutral, explain]: 我的试用期和工资按约定，不能变成免费加班。
goto rota
label willing
Jonathan [neutral, explain]: 不愿意的人可以拒绝。我不替别人答应。
label rota
Ryn [neutral, explain]: 我答应定期检查管子。Vek答应记录问题，联系合格人员。
Sela [neutral, explain]: 我答应负责读书活动，Edda答应检查花园的安全路。
Jonathan [neutral, explain]: 我答应按表值班。所有人答应的工作时间都有记录。
Ryn [neutral, explain]: 不能来就提前联系Vek，找愿意而且合格的人替。安全有问题就先关门。
move Edda exit
show Tavi happy far-right
camera two Jonathan Tavi cut
Tavi [happy, explain]: 汤准备好了。材料和水是我带来的，费用、工资都有记录。
Jonathan [happy, explain]: 谢谢。我们不会因为爱面子，就又上当。
show Luma happy center
Luma [happy, explain]: 照片里的丈夫、老婆，不是为了选美。我的老公陪我做事，这感情比青春长。
Tavi [happy, explain]: 你的口红很好看。皱纹也留着，我看见真正的你。
Luma [happy, explain]: 他娶我，不是买宝贝。他愿意听，我们才亲密。
Sela [happy, explain]: Nia没有藏起痘痘，Daro没有藏起近视眼镜。他们选择了自己的形象。
choice finish
option join "和所有人一起坐。" -> join
option serve "先问谁想喝汤。" -> serve
label join
Jonathan [happy, explain]: 我坐这里，不用叫我站在前面。
goto ending
label serve
Tavi [happy, explain]: 先问，再给。你越来越善于听了。
label ending
Jonathan [neutral, explain]: 我从来没想过，我会变得愿意等。从前，我想替所有人回答。
Sela [neutral, explain]: 哪能替所有人选择？你就是我们的朋友。
Jonathan [happy, explain]: 值得记住的，不只是门开了。我不用成为所有人的答案。
I: 我们一起吃，一起听。从前的记忆没有消失，今天的经历也会成为记忆。
Jonathan [neutral, explain]: 水和从前一样，承诺仍然算数。门开了，我也是这里的一员。
end
