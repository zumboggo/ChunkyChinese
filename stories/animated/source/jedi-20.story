story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan curious left
show Min worried right
camera two Jonathan Min cut
I: Min提前来了，还在整理衣领。
Min [worried, explain]: 今天的面试，不能叫应聘的人碰钉子。
Jonathan [neutral, explain]: 招聘要有耐心，不只看谁自信。
Min [neutral, explain]: 我有决心，不过，我也害怕。我害怕给单位丢面子。
Jonathan [curious, question]: 那你为什么一直摸衣领？
Min [embarrassed, explain]: 形象好，别人就相信我吧。
Jonathan [neutral, explain]: 今天不是选美。你不用替衣领面试。
react Min laugh
Min [embarrassed, laugh]: 好吧，衣领合格了。我还要继续研究。
I: 他不再整理衣领，忍不住笑了。
choice arrival
option joke "陪他开个玩笑。" -> joke
option listen "听他真正害怕什么。" -> listen
label joke
Jonathan [happy, laugh]: 纸狼从前检查过我，今天衣领检查你。
goto interview
label listen
Jonathan [neutral, explain]: 你不必装成什么都知道。我愿意陪你。
label interview
Min [neutral, explain]: 我承认我爱面子。不过，不能叫别人替我牺牲。
scene courtyard
show Min neutral left
show Vek skeptical center
show Ryn worried right
camera two Vek Ryn cut
Vek [skeptical, explain]: 你的简历检查过了，经历和要求对口。
Ryn [neutral, explain]: 今天正式面试，你们还要知道什么？
Vek [skeptical, explain]: 这件衣服不是名牌吧？我们要考虑单位的形象。
Ryn [determined, explain]: 不是名牌。不过，干净，不妨碍安全。
Min [determined, explain]: 招聘不是选美。我们要检查她会什么。
Vek [skeptical, explain]: 打扮一下，会不会更自信？
Ryn [neutral, explain]: 我愿意打扮，不过，打扮不能表示我会修机器。
Min [neutral, explain]: 你从前在外地碰钉子，这里先听你的结论。
Vek [neutral, explain]: 好，先说试用期。师傅会陪你检查管子。
Ryn [curious, question]: 试用期有没有工资？我想先知道，不想只听前途很好。
Min [neutral, explain]: 有工资。录用的要求，我们一起看记录。
Vek [skeptical, explain]: 有人要求你们晚上来，不算加班。
Ryn [determined, question]: 晚上还在修管子，为什么不算加班？
choice terms
option written "先看记录里的条件。" -> written
option worker "先听Ryn的要求。" -> worker
label written
Min [neutral, explain]: 不能只靠一句答应。所有人要知道一样的要求。
goto pay
label worker
Min [neutral, explain]: 你不答应，也可以说。应聘不是听话比赛。
label pay
Ryn [neutral, explain]: 我想被录用，不过，我不答应没有工资的加班。
Vek [skeptical, explain]: 为了迅速开门，有人说这种要求很普遍。
Min [determined, explain]: 普遍，不表示合格。我们不能要求别人牺牲。
Ryn [neutral, explain]: 我的目的不是批评你们，是知道我答应了什么。
Vek [neutral, explain]: 我们有开门的目的，不过，不能要求他们牺牲一切。
Min [neutral, explain]: 我本来爱面子，害怕别人说我不够迅速。
Ryn [neutral, explain]: 你要给他们留面子，也要考虑我们需要时间。
camera listener Min over 0.65
Ryn [determined, explain]: 我需要清楚的条件，不是你的表扬。
rest Min attentive
I: Min没有再摸衣领，慢慢点头。
camera two Min Ryn cut
Min [neutral, explain]: 给人留面子，不能变成不敢诚实地说话。
Vek [neutral, explain]: 好，每天六小时以下。超过这个时间，首先谈话，确定工资和意愿。
Ryn [curious, question]: 六小时以上的安排，不能偷偷加上，对吗？
Min [determined, explain]: 对。超过六小时，没有答应，就不要求。
Vek [neutral, explain]: 六小时以下，我们也提前通知。
Ryn [neutral, explain]: 最后也不能马虎。安全，最后也要检查。
Min [neutral, explain]: 对，两人以下，不能要求他们修需要三人修的机器。
Ryn [neutral, explain]: 两人以上，也不表示可以冒险。所有人要知道谁负责。
choice limit
option honest "说明开门不能只靠着急。" -> honest
option schedule "一起检查安排是否现实。" -> schedule
label honest
Min [neutral, explain]: 晚一点开门，比假装一切安全好。
goto assess
label schedule
Ryn [neutral, explain]: 我愿意一起考虑，不愿意被悄悄加上条件。
label assess
I: 合格的师傅来到练习台，给所有人一样的要求。
Ryn [neutral, explain]: 昨天的练习达到要求，今天还要检查。
Vek [neutral, explain]: 达到要求，才可以负责，不是大声说话就合格。
I: 师傅检查记录和实际操作，说Ryn合格，可以负责管子。
Min [neutral, explain]: 屋子的房顶，我们找合格的专业人员负责。你们分别负责，不冒险。
Ryn [relieved, explain]: 这样的录用，我愿意接受。
Vek [neutral, explain]: 试用期的要求记录好了。你们看过，答应了，我们才开始。
scene courtyard
show Jonathan curious left
show Min neutral right
camera two Jonathan Min cut
Jonathan [curious, question]: 软件还是坏的吗？没有信息灵通的朋友，也有回复吗？
Min [neutral, explain]: 所有人都有回复，所有人都知道要求。
Jonathan [neutral, explain]: 学历、简历、经历，都看了，不是只看衣领。
Min [happy, laugh]: 唉，我差点又丢面子。不过，你没有严厉地批评我。
Jonathan [happy, explain]: 我从前也傻过。熊掌的图还在，狼倒是休息了。
Min [neutral, explain]: 我为他们骄傲，我们愿意听批评，也值得骄傲。
choice next
option garden "先检查花园的路。" -> garden
option supplies "先记录还缺什么。" -> supplies
label garden
Jonathan [neutral, explain]: 不等孩子来，我们先看看哪里不能走。
goto ending
label supplies
Min [neutral, explain]: 先知道缺什么，再考虑买什么。
label ending
Min [neutral, explain]: 合格的人知道要求，也答应了。屋子还没修好，不能提前开门。
Jonathan [neutral, explain]: 水和从前一样。然后，我们检查花园的路。
end
