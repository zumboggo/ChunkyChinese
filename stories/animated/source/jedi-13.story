story 2
variable water = 2 range 0 40 visible
scene station
show Jonathan curious left
show Min worried right
show An determined far-right
camera two Jonathan Min cut
I: Min在检查分水的记录。他没有偷偷给他家提前分水。
Min [worried, question]: 我害怕又马虎了。你愿意陪我检查吗？
Jonathan [determined, explain]: 愿意。从前答应的，我们还要负责。
choice list
option compare "我们一起看从前的记录。" -> compare
option explain "你为什么不安心？" -> explain
label compare
Min [determined, explain]: 记录在这里。我没有偷偷分水。
goto ready
label explain
Min [worried, explain]: 我本来只想给我家捎水。不过，别人也在等。
goto ready
label ready
An [determined, explain]: 今天接4桶。飞船水箱里的水能喝，不是清洗用的水。
react Jonathan crouch
I: 我先检查管子。清洗用的管子分开了。水箱有合格的记录，封口没有坏。
rest Jonathan attentive
Min [curious, question]: 还要检查？从前不是合格了吗？
choice check
option changes "管子合格了，水箱的水也要检查。" -> changes
option witness "你也检查，不能只相信我。" -> witness
label changes
Min [curious, explain]: 合格，不表示以后可以马虎。是吗？
goto flow
label witness
Min [determined, explain]: 好。我看记录，你看管子。
goto flow
label flow
camera wide
I: An说明安全要求。飞船上的人慢慢接好，开水。我们没有冒险。
Min [happy, explain]: 有水了。你听！真的有水了。
Jonathan [happy, explain]: 我听见了。不过，我们还要记录。
I: 接到4桶，飞船上的人就关水。检查好了，4桶水都能喝。
choice receipt
option count "一起检查有多少，然后记录。" -> count ; water += 4
option record "你看记录，我检查水箱。" -> record ; water += 4
label count
Min [determined, explain]: 4桶。不能多写，也不能少写。我们要诚实。
goto mother
label record
An [determined, explain]: 对，是4桶。从前的记录保留，今天的水要补充进去。
goto mother
label mother
move An exit
show Mother determined far-right
camera two Jonathan Min cut
Min [worried, explain]: 今天有水了。他们会相信我了吗？
Jonathan [worried, question]: 你想叫谁回答？
Min [sad, explain]: 所有人。包括她。
camera two Min Mother cut
Min [worried, explain]: 我想向你说明。我真的吸取教训了。
camera listener Min over 0.65
Mother [determined, explain]: 我的孩子不需要你说明自己多好。她需要你答应过的水。
rest Min attentive
I: Min停下来。他没有继续说明，悄悄看着记录。
camera two Jonathan Min cut
choice next
option work "先对答应的话负责。他们会看见。" -> work
option company "我陪你去。不过，我不能替她原谅你。" -> company
label work
Min [determined, question]: 好。接下来谁搬水？我愿意帮忙。
goto promise
label company
Min [sad, explain]: 我知道。你陪我，不表示你要替我说话。
goto promise
label promise
camera wide
I: 我们没有提前分水。从前答应怎样分水，现在仍然要负责。
Jonathan [determined, explain]: 现在，我们去做答应过的事。
Mother [determined, explain]: 我陪你们走。最后一家也在等。
Min [determined, explain]: 我记得。我不会提前回来。
I: 飞船上的人捎来通知：明天风很大，外面的管子还要保护。
Jonathan [determined, explain]: 先给他们捎水，再一起准备。修管子是帮忙，送水也是帮忙。
camera two Jonathan Min cut
Min [relieved, explain]: 好。今天，我负责捎水。
I: 我们准备出发。水多了4桶。我们还要对答应过的话负责。
end
