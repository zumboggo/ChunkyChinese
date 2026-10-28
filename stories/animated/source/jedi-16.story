story 2
variable water = 2 range 0 40 visible
scene station
show Jonathan worried left
show An determined center
rest An seated
show Min worried right
camera two Jonathan Min cut
I: 风停了。Min擦着脸，没有先去检查。
Jonathan [worried, question]: 冻坏了吗？先等一等。
Min [neutral, explain]: 没有冻坏。我想迅速检查，然后回去。
camera two Jonathan An cut
An [determined, explain]: 迅速，不表示安全。先看记录。
I: 一张记录放在An面前。她可以坐着看。
Min [neutral, explain]: 我先擦记录，你看下面的名字。
Jonathan [curious, question]: 管子没有摇。检查可以结束了吗？
An [determined, explain]: 任何结论，都要有检查。我还没有看透。
I: 她的声音很严肃。我停下来，听她说。
Jonathan [neutral, explain]: 你看记录，我陪Min去看管子。
An [neutral, explain]: 任何人都可以说不安全，不用害怕。
choice start
option record "先检查从前的记录。" -> record
option ask "先听An要检查什么。" -> ask
label record
Jonathan [neutral, explain]: 从前答应检查的，今天不能错过。
goto pipe
label ask
Jonathan [curious, question]: An，你想先检查什么？
label pipe
An [determined, explain]: 先看盖板下面。别只看上面。
react Jonathan crouch
I: 我在这里，看向管子下面。
Jonathan [curious, question]: 这里有一根弯的管子。从前也是弯的吗？
Min [neutral, explain]: 是。那是从前的坏管子。修好的管子在下面。
An [determined, explain]: 弯的坏管子先别碰，然后检查修好的管子。别以为自己什么都知道。
I: 我看了很久，腰有点酸。
Min [worried, question]: 腰不舒服，为什么不说？
rest Jonathan attentive
Jonathan [neutral, explain]: 我想提前结束。不过，我可以先等一等。
I: Min拿出自己的杯子。杯子里的热气还在冒。
Min [neutral, explain]: 这是我从家里带来的，不是站里的水。
Jonathan [neutral, explain]: 还在冒热气，你先拿着暖暖手。
choice pace
option pause "我先等一等，不说自己没事。" -> pause
option partner "我们分别检查，一起负责。" -> partner
label pause
Jonathan [neutral, explain]: 我先等一等。然后，我再检查记录。
goto result
label partner
Min [neutral, explain]: 你看过的地方，我也会检查。
label result
I: 我们按记录检查，没有发现坏的地方。
An [neutral, explain]: 盖板还在，管子也没有漏。水还是一样的水。
Min [neutral, explain]: 没有多拿水，也没有再分水。记录还是一样。
Jonathan [neutral, explain]: 那就去孩子读书的屋子。他们还等着回去。
scene centre
show Jonathan curious left
show Min worried right
show An determined center
rest An seated
camera wide
I: 在屋子外面，An坐在安全的地方。我们没有开门。
Min [worried, explain]: 门边还有水，那张纸已经湿透了。
Jonathan [curious, question]: 房顶只有这个高度，我可以上去看吗？
An [determined, explain]: 知道高度，还不够。房顶还在摇。
I: 我本来想走近，连忙停住了。
Min [determined, explain]: 别开门！他们都在外面等。
Jonathan [worried, explain]: 我看到了。这比我想的复杂。
An [determined, explain]: 既然复杂，我们不得不等会修房顶的人。
choice response
option admit "我不该这样冒险。" -> admit
option protect "先告诉他们别开门。" -> protect
label admit
Jonathan [worried, explain]: 我想提前帮忙，不过，我不该冒险。
goto listen
label protect
Min [determined, explain]: 我去解释清楚，不说已经安全了。
label listen
camera two Jonathan An cut
Jonathan [worried, question]: 他们相信我。叫他们等，会不会叫他们难过？
An [determined, explain]: 我说得严肃，是因为我相信你会听。
camera listener Jonathan over 0.65
An [determined, explain]: 你不必说明自己什么都能修。你要保护等你回答的人。
I: 我慢慢点头，没有再走近那扇门。
camera two Jonathan An cut
Jonathan [neutral, explain]: 我不得不重新选择。不过，仍然答应保护他们。
I: 风来了。我闭了一下眼睛，等沙过去。
An [neutral, explain]: 闭眼睛可以挡沙，闭眼睛也不能保护他们。
Jonathan [neutral, explain]: 我知道。我愿意慢慢研究，听你说。
Min [neutral, explain]: 会修房顶的人正在来。我们回安全的屋子等。
scene home
show Jonathan neutral left
show Min neutral right
show An neutral center
rest An seated
camera two Jonathan Min cut
I: 回去的时候，Min轻轻敲门。
Min [neutral, explain]: 敲两下，里面的人知道是我们。
I: 门一开，我连忙叫An先过去。
Jonathan [neutral, explain]: 先说明，那里的屋子还不能开门。别叫孩子冒险。
Min [neutral, explain]: 会修房顶的人说，这里可以等，那里的屋子还要修。
An [curious, question]: 那孩子在哪里读书？
choice plan
option families "先听家长和孩子要什么。" -> families
option teacher "先找教孩子读书的人。" -> teacher
label families
Jonathan [neutral, explain]: 不能只给他们一个计划，不听他们说。
goto together
label teacher
Jonathan [neutral, explain]: 教孩子读书的人，知道怎样帮忙，我们不能替他们选择一切。
label together
Min [neutral, explain]: 妈妈去找Sela了。她教孩子读书。我们一起听。
An [neutral, explain]: 先叫会检查的人，看一看其他屋子。安全了，然后叫他们来。
Jonathan [determined, explain]: 我答应的是一起帮忙，不是一个人选择。
I: 我们记录房顶哪里要修，也记录孩子想读书的事。
Jonathan [neutral, explain]: 水还是一样。那里的屋子还没开门。不过，我们知道要先听谁说话了。
end
