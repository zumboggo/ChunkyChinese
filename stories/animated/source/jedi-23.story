story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan determined left
show Min neutral far-right
camera two Jonathan Min cut
I: 所有人为了屋子做了生意，我想保护他们的信心。
Jonathan [determined, explain]: 从前的聚餐成功了，今天要负责，不能马虎。
Min [neutral, explain]: 汤的香味还记得，不过，记忆不能替我们检查。
show Orr happy center
camera two Jonathan Orr cut
Orr [happy, explain]: 我叫Orr，我卖管子。我可以叫你们今天开门。
Jonathan [curious, question]: 绝对能修好吗？你还没有检查屋子。
Orr [happy, explain]: 绝对合格。看，金色的。
Min [skeptical, question]: 我们要修管子，不是为了宴会打扮。
Jonathan [neutral, explain]: 答应，不等于修好了。先听Ryn说。
choice offer
option inspect "先让Ryn检查。" -> inspect
option record "先检查所有人的要求。" -> record
label inspect
Jonathan [neutral, explain]: 我不替她答应。她负责管子。
goto evidence
label record
Min [neutral, explain]: 所有人答应过怎么用钱，不能因为着急就不考虑。
label evidence
show Ryn determined right
camera two Orr Ryn cut
Ryn [determined, explain]: 请列出你负责什么，不负责什么。
Orr [happy, explain]: 金色的，真好看，我从来没骗你。
Ryn [skeptical, question]: 好看，不过，管子的材料合格吗？
Orr [happy, explain]: 我巧妙地涂了颜色，好看，别人自然会相信。
Min [skeptical, explain]: 这看起来很自然，不过，不能表示合格。
Ryn [determined, explain]: 现实是我们要保护孩子。不能只考虑打扮。
Jonathan [curious, question]: 不合格有什么坏处？我想听你说明。
Ryn [neutral, explain]: 坏处是可能漏水，不能保证安全。先检查材料的记录。
Orr [skeptical, explain]: 你很严厉。我从来没听过这样的要求。
Jonathan [determined, explain]: 显然，你没有检查过这里。不过，你答应今天开门。
Orr [happy, explain]: 你害怕我的语气吗？我有信心。
Ryn [neutral, explain]: 语气不能表示合格。你还没有回复我的要求。
choice answer
option limits "听他说明限度。" -> limits
option proof "让他拿记录来检查。" -> proof
label limits
Min [neutral, explain]: 知道限度，比什么都答应负责。
goto question
label proof
Ryn [neutral, explain]: 记录和东西要对口，不是有纸就合格。
label question
Orr [skeptical, explain]: 先买，再检查。你们可能会侥幸成功。
Jonathan [determined, explain]: 不能靠侥幸保护人。所有人要知道代价。
Orr [skeptical, explain]: 你们不买，我就卖掉。我还有别的生意。
Ryn [neutral, explain]: 你可以卖掉，我们不能因为着急就上当。
I: Orr走了。他留下样品，我还想继续批评。
move Orr exit
show Sela curious center
camera two Jonathan Sela cut
Sela [curious, question]: 我在研究哲学。哲学家在文章里问，为什么相信别人？
Jonathan [determined, explain]: 他在说谎话，我们不能上当。
Sela [curious, question]: 这是结论。哲学家还问你怎样知道。
Jonathan [embarrassed, explain]: 我太着急了。我想叫你相信我。
camera listener Jonathan over 0.65
Sela [neutral, explain]: 我想听你的理由，不是只听你的结论。
rest Jonathan attentive
I: 我放下样品，先认真听。
camera two Jonathan Sela cut
Jonathan [neutral, explain]: 我们列出他说过什么，检查是否可靠。
Sela [neutral, explain]: 哲学不必很复杂。我想知道现实的要求。
Jonathan [neutral, explain]: 他涂的颜色很好看，不过，不能表示管子合格。
Ryn [neutral, explain]: 他说好看，然后变成安全的保证。
Min [neutral, explain]: 谎话可能既有真的，又有假的。这就是他的巧妙手法。
Jonathan [neutral, explain]: 显然，我要检查我的结论。不能变成不愿意听的人。
Sela [neutral, explain]: 你的结论变得清楚了。我可以继续检查。
choice explain
option example "说说从前卖蜂蜜的事。" -> example
option compare "一起研究记录。" -> compare
label example
Jonathan [neutral, explain]: 从前有人愿意听批评，今天我也愿意。
goto review
label compare
Sela [neutral, explain]: 我来研究，你不必替我回答。
label review
Min [neutral, explain]: 从前卖蜂蜜，我们去掉了减肥、安神的保证。
Sela [neutral, explain]: 甜蜜的广告，不表示结论可靠。
Jonathan [neutral, explain]: 那顿聚餐值得记住。聚餐不是只为了吃。
Ryn [neutral, explain]: 值得相信的人，愿意说明限度，不害怕检查。
Min [neutral, explain]: 你不用像进攻似的。不必把人弄得鼻青脸肿。
Jonathan [embarrassed, explain]: 我不再像进攻似的，要求所有人相信我。
Sela [neutral, explain]: 一群人一起研究，可以有不同的结论。
Ryn [neutral, explain]: 先检查管子是否达到要求，最后再考虑涂颜色。
choice purchase
option crew "让合格的人检查管子。" -> crew
option accounts "让Min检查费用。" -> accounts
label crew
Ryn [neutral, explain]: 我负责管子，房顶找合格的专业人员。
goto repair
label accounts
Min [neutral, explain]: 我检查费用，不替专业人员答应安全。
label repair
I: 专业人员检查材料，Min记录费用。所有人知道自己的要求。
Ryn [neutral, explain]: 我们按要求买材料，样品还给Orr。所有费用都有记录。
I: 几天后，管子和房顶修好了。修理的人分别签字。
Ryn [neutral, explain]: 修好了，不表示可以开门。还要等最后的安全检查。
Jonathan [neutral, explain]: 这会留在我的记忆里。愿意听，结论才会变得清楚。
Min [neutral, explain]: 水和从前一样。测试的水从专业人员那里来，没有用站里的水。
Sela [happy, explain]: 屋子修好了，检查还没结束。然后，我们准备开门那天的照片。
end
