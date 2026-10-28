story 2
variable water = 2 range 0 40 visible
scene station
show Jonathan determined left
show Min worried right
show An determined center
rest An seated
camera wide
I: An坐在安全的地方，不搬东西。她知道怎样保护管子。
An [determined, explain]: 听好。不安全，我们就停。
Min [worried, question]: 风越来越大了。我们还要出去吗？
Jonathan [determined, explain]: 先听安全要求。不能为了提前结束，就冒险。
choice prepare
option supplies "先检查飞船捎来的盖板。" -> supplies
option retreat "先看回去的路。" -> retreat
label supplies
Min [determined, explain]: 盖板和带子是飞船新捎来的，不是从前牺牲的。
goto plan
label retreat
An [determined, explain]: 路还安全。不安全就回去，不冒险。
goto plan
label plan
I: 我们关好水和电。飞船上的人检查安全，叫我们在地面工作。
camera two Jonathan An cut
An [determined, explain]: 我在这里看。一起移动，听我叫停。
Jonathan [determined, question]: 你坐着也可以看吗？
An [determined, explain]: 可以。我看着，你听着，就够了。
choice trust
option follow "好。我听你的要求。" -> follow
option repeat "我先说一遍，请你检查。" -> repeat
label follow
An [relieved, explain]: 好。别光点头，移动的时候还要听。
goto lift
label repeat
Jonathan [determined, explain]: 一起移动。不安全就停。不自己提前走。
An [determined, explain]: 对。我们试一试。
goto lift
label lift
camera wide
react Jonathan brace
react Min brace
I: 我们一起移动盖板。风吹过来，Min叫停。我们把盖板放回支架上。
Min [worried, explain]: 它不安全。我要停。
Jonathan [determined, explain]: 我有原力。我可以挡住。
An [determined, insist]: 先停。不是一切都要你一个人挡。
choice impulse
option honest "我害怕停下来，就没有人保护管子。" -> honest
option question "那我怎样帮忙？" -> question
label honest
An [determined, explain]: 我知道。不过，害怕不表示你可以不听别人。
goto connection
label question
An [determined, explain]: 先看Min。他在叫你停，不是在叫你保护一切。
goto connection
label connection
camera listener Jonathan over 0.65
An [determined, explain]: 你听我的声音，就是帮忙。不是只有原力才有作用。
rest Jonathan attentive
I: 我看着Min，慢慢点头。它还在支架上，没有人冒险。
camera two Jonathan Min cut
Jonathan [determined, explain]: Min，我们一起。你叫停，我就停。
Min [relieved, explain]: 好。你也可以叫停。
camera wide
I: 风小了一点。飞船上的人确认安全，An叫我们重新准备。
An [determined, explain]: 一，二，三。一起慢慢移动。
react Jonathan brace
react Min brace
I: 我们一起移动盖板，放好。Min固定带子，我陪他保护它。
An [determined, explain]: 停。先别移动。
choice inspect
option other "Min，我们分别检查，不只看自己的。" -> other
option guide "An，请你说明我们还要检查什么。" -> guide
label other
Min [determined, explain]: 好。我们一起负责，不马虎。
goto safe
label guide
An [determined, explain]: 首先，检查带子。其次，看它有没有挡住检查的地方。
goto safe
label safe
I: 我们分别检查好了。飞船上的人最后确认。它固定好了，管子安全。
An [determined, explain]: 回去。风大了，今天不再冒险。
camera wide
I: 我们一起回去。所有人安全，能喝的水没有变少。
camera two Jonathan An cut
Jonathan [relieved, explain]: 我本来只相信原力。今天，我还要相信你们。
An [happy, explain]: 相信，还要听。你今天听了。
Min [relieved, explain]: 风停了，我们还一起检查吗？
Jonathan [determined, explain]: 一起。不光今天，以后还一起负责。
I: 我们在屋子里等风。水没有变少，我们仍然记得所有答应过的话。
end
