story 2
label opening
scene landing
show Jonathan neutral left
show An worried right
show Q neutral far-left
camera two Jonathan An cut
I: 我是绝地武士。
I: 我来到一个新的星球。
An [worried]: 山上的人和河边的人不愿意谈话。
Jonathan [curious]: 为了水？
An [sad]: 是。水不够。
Q: 我可以记录。
An [neutral]: 先听，再说。
move Child enter
show Child scared center
camera two Jonathan Child cut
Child [scared]: 妈妈！
An [worried]: 她还在找妈妈。
Jonathan [neutral,reassure]: 别害怕。我陪你。
choice approach
option ask "你听见什么了？" -> ask
option show "你可以指给我看吗？" -> show
label ask
Child [worried]: 我听见妈妈的声音。
Jonathan [curious]: 她说什么？
Child [worried,hesitant]: 她说，回来。
goto follow
label show
react Child point
Child [worried]: 那间屋子。我不敢过去。
Jonathan [neutral]: 你在这里指给我看，就可以。
label follow
An [worried]: 我们先陪她找妈妈。
Q: 可是，声音还在。
Jonathan [determined]: 我们一起去。慢慢走。
scene storage
show Jonathan neutral left
show Child worried center
show An neutral far-left
show Q neutral right
camera wide cut
I: 我走到女孩面前。门还关着。
I: 门边有一个影子。
Child [scared]: 妈妈在里面吗？
choice inspect
option shadow "先看看影子。" -> shadow
option sound "先听一听。" -> sound
label shadow
look Jonathan Q
I: 我看向Q。它也在看我。
move Q far-right
I: Q移动，影子也移动。
Jonathan [happy]: 是Q的影子。
Child [relieved]: 不是妈妈。
goto voice
label sound
rest Jonathan attentive
Jonathan [neutral]: 先小声一点。
Child [worried]: 好。我听着。
label voice
camera wide cut
I: 门后有声音：回来。
Child [surprised]: 就是这个声音！
Q: 我记录下来了。
An [worried]: 这间屋子本来是放水的。
An [sad]: 现在没有水，也没有人。
Jonathan [curious]: 你怎么知道？
An [neutral]: 我刚才看过。我负责这里。
move Q right
show Mother worried far-right
react Mother wave
Mother [worried]: 你在这里！
camera two Child Mother cut
Child [relieved]: 妈妈！
move Child right
show Q neutral center
I: 女孩走到妈妈身边。
Mother [relieved]: 我在河边找你。
camera two Jonathan Mother cut
I: 妈妈在我面前。门后又有声音。
I: 回来。
camera listener Mother over 0.6
Mother [shocked]: 我没有说话。
choice response
option honest "我还不知道为什么。" -> honest
option compare "Q，再放一次。" -> compare
label honest
camera two Jonathan Mother cut
Jonathan [worried]: 我还不知道。不过，你妈妈在这里。
Child [curious]: 绝地武士也不知道？
Jonathan [neutral]: 也有不知道的时候。
Mother [relieved]: 你没有让她一个人进去。谢谢。
goto safe
label compare
camera two Q Mother cut
Q: 这是刚才的录音。
I: 回来。
Mother [worried]: 声音一样。可是，不是我说的。
Jonathan [neutral]: 我们知道声音一样。还不知道为什么。
label safe
camera wide cut
An [worried]: 先送她们回去吧。
Q: 不看里面吗？
look Jonathan Child
Jonathan [determined]: 先保护她们。屋子可以等。
scene home
show Jonathan neutral left
show Mother relieved right
show Child happy center
show An neutral far-left
show Q neutral far-right
camera wide cut
I: 我们陪她们回到家。
Mother [happy]: 到了。她安全了。
Child [curious]: 你会再来吗？
choice goodbye
option promise "明天，我再来。" -> promise
option listen "有声音，就告诉An。" -> listen
label promise
Jonathan [happy]: 明天，我再来看你。
Child [happy]: 那我等你。
I: 我记得自己答应了什么。
goto endwalk
label listen
Jonathan [neutral]: 有声音，先告诉An。别一个人去。
Child [happy]: 好。我不一个人去。
An [happy]: 我会听你说。
label endwalk
camera two Jonathan An cut
An [relieved]: 你先送她回家，没有先去找声音。
Jonathan [neutral]: 她不是一个问题。她是一个孩子。
Q: 女孩安全。录音还在。
I: 我看向那间屋子。
I: 没有水的屋子，为什么会有妈妈的声音？
end
