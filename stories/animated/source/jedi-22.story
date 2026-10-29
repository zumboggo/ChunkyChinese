story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan happy left
show Min neutral far-right
camera two Jonathan Min cut
I: 修屋子的人很认真。我想请他们吃一顿。
Jonathan [happy, explain]: 今天聚餐，我想办宴会。
Min [skeptical, question]: 我们的目的是让屋子安全，不是表示我们多有钱。
Jonathan [embarrassed, explain]: 我还是爱面子。我想保护所有人，不过，先考虑了形象。
show Tavi neutral center
camera two Jonathan Tavi cut
Tavi [neutral, explain]: 我叫Tavi，今天负责聚餐。汤的香味怎么样？
Jonathan [happy, explain]: 这香味让我忍不住笑。我的讲话比这碗汤还长。
Tavi [happy, laugh]: 哈哈，汤没有要求你说话。先看看价格。
Min [neutral, explain]: 我们趁所有人在这里，先说明要求。
choice beginning
option joke "承认自己爱面子。" -> joke
option ask "先听Tavi的要求。" -> ask
label joke
Jonathan [embarrassed, laugh]: 我想保护所有人，不过，一顿聚餐不用进攻。
goto stall
label ask
Jonathan [curious, question]: 你负责，我先听你的要求。
label stall
Tavi [neutral, explain]: 今天的生意在院子里，屋子没有开门。
Min [neutral, explain]: 汤和蜂蜜，还有做汤的水，从Tavi那里来。没有动站里的水。
Tavi [neutral, explain]: 所有费用记录好了，我的工资也记录好了。
Jonathan [curious, question]: 你卖汤，也卖蜂蜜吗？
Tavi [neutral, explain]: 卖蜂蜜的人和费用都有记录，不是花园的蜜。
Min [neutral, explain]: 蜂窝还隔开着，蜜蜂没有答应给我们蜜。
Jonathan [neutral, explain]: 不能去采，也不能拍打，小心被蜇。
Tavi [happy, explain]: 我写了广告，蜂蜜可以减肥，也可以安神。
show Edda skeptical right
camera two Tavi Edda cut
Edda [skeptical, question]: 你的结论可靠吗？我想喝汤，不想听谎话。
Tavi [worried, explain]: 别人也这样说，我想生意成功。
Edda [neutral, explain]: 想卖掉，不表示可以说谎话。减肥的结论，你检查过吗？
Tavi [embarrassed, explain]: 没有。安神的结论，我不知道是否可靠。我不能这样答应。
choice sign
option honest "先诚实地改广告。" -> honest
option explain "向等着的人说明。" -> explain
label honest
Min [determined, explain]: 我陪你改，不用等有人批评。
goto correction
label explain
Jonathan [neutral, explain]: 我陪你说明，不替你说谎话。
label correction
Tavi [determined, explain]: 我不再说减肥、安神，只说汤和蜂蜜多少钱。
I: 于是，Tavi改了广告。她诚实地向所有人说明。
Edda [neutral, explain]: 广告写得甜蜜，不表示结论可靠。
Tavi [neutral, explain]: 我想留下甜蜜的记忆，不是叫人上当。今天临开门才检查，我先改。
Min [neutral, explain]: 别临开门才检查。既要负责地卖，也要诚实说。
Jonathan [neutral, explain]: 既想帮忙，又不愿意听批评，就不能真正帮忙。
Tavi [neutral, explain]: 我们卖掉汤和蜂蜜，不能把信心也卖掉。
camera two Jonathan Tavi cut
Jonathan [worried, question]: 那不办宴会了吗？我害怕钱少的人碰钉子。
camera listener Jonathan over 0.65
Tavi [neutral, explain]: 所有人要吃饭，不是来看你表演。
rest Jonathan attentive
I: 我放下讲话的纸，先听别人说。
camera two Jonathan Tavi cut
Jonathan [embarrassed, explain]: 我想给所有人留面子，不过，叫他们等我说话。
Tavi [neutral, explain]: 不用害怕丢面子。好好吃一顿，就值得骄傲。
Min [happy, laugh]: 哈哈，你的讲话可以休息了。所有人可以吃了。
Jonathan [happy, laugh]: 我忍不住笑起来。不是在笑别人。
choice meal
option simple "不要求像宴会一样。" -> simple
option price "先听所有人的要求。" -> price
label simple
Jonathan [neutral, explain]: 我来帮忙记录，不要求别人陪我爱面子。
goto visitors
label price
Min [neutral, explain]: 不能因为钱少就碰钉子。先说明要求。
label visitors
Tavi [neutral, explain]: 每份五块以下，自愿多给的钱分别记录。
Min [neutral, explain]: 费用和收入分别记录，剩下的钱，只能为屋子用。
Edda [neutral, explain]: 从前答应的花苗还没有到。不能提前卖。
Jonathan [neutral, explain]: 五颜六色的鲜花不能随便采，花期和四季也要考虑。
Edda [neutral, explain]: 有刺儿，不表示要进攻。我们保护蜜蜂，也保护人的路。
Min [neutral, explain]: 不要一窝蜂地来。达到安全要求，才能继续。
I: 所有人听了要求，于是慢慢走过来。
Tavi [happy, explain]: 趁汤还热，请所有人吃吧。
Jonathan [neutral, explain]: 我的目的不是叫人表扬我。所有人一起吃，比我说话好。
choice accounts
option count "和Min一起检查记录。" -> count
option thank "先感谢Tavi。" -> thank
label count
Min [neutral, explain]: 我说，你检查。所有人一起负责。
goto ending
label thank
Tavi [happy, explain]: 你愿意听，我很感动。今天的批评值得听。
label ending
I: 汤和蜂蜜都卖掉了。所有人检查费用，把剩下的钱记录下来。
Min [neutral, explain]: 不能偷偷用钱，所有人要知道结论。
Tavi [neutral, explain]: 今天的生意结束了。屋子还要修，不能提前开门。
Jonathan [neutral, explain]: 水和从前一样。然后，我们按记录买用品。
end
