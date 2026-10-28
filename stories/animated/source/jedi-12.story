story 2
variable water = 2 range 0 40 visible
scene station
show Jonathan worried left
show Mother determined right
show An determined far-right
camera two Jonathan Mother cut
I: 妈妈叫打工的人先休息，然后来到我面前。
Mother [worried, question]: 我的孩子还在等。今天，可以喝这里的水吗？
Jonathan [worried, explain]: 还要检查。我知道，你从前也在等。
choice answer
option time "我去问，检查什么时候结束。" -> time
option stay "我陪你等，不偷偷走。" -> stay
label time
Mother [determined, explain]: 要诚实回答。不要为了叫我安心，就说快了。
goto cost
label stay
Mother [frustrated, explain]: 陪我，不表示孩子就有水喝。
goto cost
label cost
camera listener Jonathan over 0.65
Mother [determined, explain]: 你知道我们在等。不过，等水有代价。
rest Jonathan attentive
I: 我没有回答。我看着关好的管子。
camera two Jonathan An cut
Jonathan [determined, question]: 今天怎样检查？我会向他们说明。
An [determined, explain]: 飞船还在。飞船上的人捎来清洗用的水，不牺牲我们能喝的水。
I: 飞船上的人先分开管子，清洗的水不会成为喝的水。
show Min worried center
Min [curious, explain]: 清洗好了。这里有样本，可以检查。
An [worried, question]: 标签呢？这个样本，是从哪里来的？
Min [worried, explain]: 我不知道。别人放在这里。我本来相信他们记录好了。
choice sample
option ask "先找知道的人。" -> ask
option record "先检查记录，不能说谎。" -> record
label ask
I: 我们分别问。没有人能回答。
goto boundary
label record
An [determined, explain]: 没有记录。我们不能替别人回答。
goto boundary
label boundary
camera two Jonathan Min cut
Min [worried, question]: 水看着很干净。可以提前开吗？
Jonathan [determined, explain]: 想它合格，不表示它合格。没有严格检查，就不能开。
Min [frustrated, explain]: 他们会说，我们只会叫所有人等！
choice responsibility
option own "我来说明：我不答应提前开水。" -> own
option together "我们一起说明，不叫An一个人负责。" -> together
label own
Min [worried, question]: 你不害怕他们批评你吗？
Jonathan [determined, explain]: 害怕。不过，害怕不表示可以马虎。
goto fresh
label together
An [determined, explain]: 好。我说明检查，你说明为什么要等。
goto fresh
label fresh
camera wide
I: 飞船上的人重新取样本。An看着，不搬东西。Min记下地方和时间，贴好标签。
An [determined, explain]: 这次，我们知道样本从哪里来。不过，检查需要时间。
Mother [worried, question]: 我的孩子今天还要等吗？
camera two Jonathan Mother cut
choice waiting
option honest "我不能提前答应。不过，我会回来向你说明。" -> honest
option help "我请人看看怎样帮忙。不过，从前答应的分水还要负责。" -> help
label honest
Mother [determined, explain]: 好。不管合格不合格，要回来。别叫我找你。
goto wait
label help
Mother [determined, explain]: 可以。不能为了帮忙，就牺牲别人。
goto wait
label wait
I: 我答应了。我们保留从前的水，仍然负责答应过的分水。
camera wide
I: 等到了规定的时间，飞船上的人完成所有检查，捎来结果。
An [curious, question]: 哪里、什么时候取水，标签上的记录都对吗？
Min [determined, explain]: 都对。不是刚才没有标签的样本。
Jonathan [curious, question]: 这段管子，可以接喝的水了吗？
An [relieved, explain]: 飞船上的人确认合格了。明天先接4桶，慢慢试，记录清楚。
camera two Jonathan Mother cut
Jonathan [relieved, explain]: 我回来了。检查合格。今天水没有变多，明天先接4桶。
Mother [determined, explain]: 那明天，要捎水来，不是只捎话来。
Jonathan [determined, explain]: 我会捎水来。我们要对答应过的话负责。
camera wide
I: 我们关好管子，保留记录。检查合格了，答应过的事还没有结束。
end
