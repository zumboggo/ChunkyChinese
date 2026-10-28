story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan curious left
show Mother neutral right
camera two Jonathan Mother cut
I: 妈妈擦着一张桌子。我陪她一起等。
Mother [neutral, explain]: 这里检查过了，孩子可以先在这里读书。
Jonathan [curious, question]: 快开学了吗？屋子还没有修好。
Mother [neutral, explain]: 不是在那里开学。Sela说，安全了，孩子才可以来。
I: 一位家长来到门边。他没有先敲门。
I: 妈妈连忙来到门边，陪他过来。
Jonathan [neutral, explain]: 家长也可以先坐，不用在外面等。
scene courtyard
show Jonathan curious left
show Ivo worried right
camera two Jonathan Ivo cut
Ivo [worried, explain]: 我叫Ivo。我儿子不愿意来。
Jonathan [curious, question]: 他害怕什么？
Ivo [worried, explain]: 他想念朋友。不过，他缺课太久了。
Jonathan [neutral, explain]: 想念朋友，又害怕回来。我愿意听他说，也愿意陪他等。
choice welcome
option seat "先陪Ivo坐一会儿。" -> seat
option listen "先听他为什么害怕。" -> listen
label seat
Jonathan [neutral, explain]: 不用迅速回答。我们可以慢慢谈话。
goto parent
label listen
Jonathan [curious, question]: 他还说了什么？我不想替他回答。
label parent
Ivo [worried, explain]: 他从前哭了，说他害怕再被批评。
Ivo [worried, explain]: 我还没有想透，他为什么这样害怕。
Jonathan [worried, question]: 有人批评他缺课吗？
Ivo [worried, explain]: 从前有人说，哭的孩子不听话。
Jonathan [neutral, explain]: 哭的时候，他也要有人听。
Ivo [sad, explain]: 他不爱大声说话，性格很温和。越叫他回答，他越难过。
Jonathan [neutral, explain]: 不爱大声说话，不表示性格不好。不说话，也不该被批评。
I: Ivo拿着一张成绩单，没有打开。
Ivo [worried, explain]: 我本来想，报到，就要先给班主任看成绩单。
Jonathan [curious, question]: 我们先听Sela说，不替她回答。
show Sela neutral center
camera two Sela Ivo cut
Sela [neutral, explain]: 我是Sela，这里的班主任。谢谢你愿意来。
Ivo [worried, question]: 班主任要先看什么？我可以说明。
Sela [curious, question]: 你儿子今天怎么样？
camera listener Ivo over 0.65
Sela [neutral, explain]: 我想先知道他好不好，不是先看成绩单。
I: Ivo慢慢放下手，没有打开那张纸。
camera two Sela Ivo cut
Ivo [sad, explain]: 他从外地回来，还是难过，不想说话。
Sela [neutral, explain]: 我从前在外地陪孩子读书。离开朋友，不只是换一张桌子。
Ivo [worried, explain]: 风暴以来，他还没有见到从前的朋友。
Sela [neutral, explain]: 这段时间以来，你们经历了很多。
choice question
option explain "听Sela说明报到的要求。" -> explain
option child "先谈孩子愿意怎么来。" -> child
label explain
Jonathan [curious, question]: 没有成绩单，先说什么？
goto return
label child
Jonathan [curious, question]: 他可以先只来看看吗？
label return
Sela [neutral, explain]: 来报到，先说名字，然后说他要什么。
Ivo [worried, question]: 一定要在所有人面前说明为什么缺课吗？
Sela [determined, explain]: 不必。他愿意说，我们两个人谈话。
Ivo [worried, explain]: 我怕他跟新同学处不好。
Sela [neutral, explain]: 和朋友处得好，不表示他们什么都一样。
Jonathan [neutral, explain]: 我们也要研究怎样相处。不是只有孩子要研究。
Sela [neutral, explain]: 相处要有耐心。开学时候的班会，我们先认识朋友。
Ivo [curious, question]: 班会要求所有人大声回答吗？
Sela [neutral, explain]: 可以先听，也可以小声说。不想说，就点头。
Jonathan [neutral, explain]: 我也愿意先听。我有时候忘了听人说话。
Ivo [neutral, explain]: 他从前愿意给朋友做伴。现在，他不愿意出来了。
Sela [curious, question]: 叫朋友给他做伴，他愿意来这里看看吗？
Ivo [neutral, explain]: 我先听他说，不替他答应。
choice companion
option family "家长可以先陪着。" -> family
option friend "先听朋友是否愿意做伴。" -> friend
label family
Jonathan [neutral, explain]: 你陪着，他可以自己选择什么时候说话。
goto care
label friend
Sela [neutral, explain]: 朋友要真的愿意。不是接到一句命令。
label care
Ivo [worried, question]: 房顶还没有修好，会不会又叫他们回去？
Jonathan [neutral, explain]: 从前读书的屋子还不能去。我们没有说修好了。
Sela [neutral, explain]: 这里有人认真检查过。桌子不会摇，顶上也不会漏水。
Sela [neutral, explain]: 桌子的高度也检查过了，孩子可以舒服地坐着。
Ivo [curious, question]: 门边那根弯的管子呢？
Jonathan [neutral, explain]: 那是从前的坏管子，孩子不会从那里走。
Sela [neutral, explain]: 我们要考虑的，不是孩子的性格，是他们为什么害怕。
I: Ivo敲了敲桌子，然后点头。
Ivo [neutral, explain]: 我可以先带儿子来看看。不过，我要先听他说。
Sela [neutral, explain]: 我们等他。不是等一张好看的成绩单。
scene courtyard
show Jonathan neutral left
show Mother neutral center
show Ivo neutral right
camera two Mother Ivo cut
Mother [curious, question]: 你们谈话结束了？
Ivo [neutral, explain]: 我本来想，不敢来就要被批评。不过，我想先听他说。
I: 妈妈从家里带来一杯水，热气还在冒。
Mother [neutral, explain]: 先暖暖手，别冻着。这不是站里新拿的水。
Ivo [neutral, explain]: 谢谢。我没有冻坏。我从前只是害怕。
I: 我站得太久，腰有点酸。妈妈叫我先坐。
Jonathan [neutral, explain]: 不能只叫他们慢慢来，我却不愿意等。
choice next
option invite "我愿意先听孩子读书。" -> invite
option help "我愿意听Sela的要求。" -> help
label invite
Jonathan [neutral, explain]: 不表演原力，先听孩子说的话。
goto ending
label help
Mother [neutral, explain]: 你会保护他们，也要给他们自己想的时间。
label ending
Ivo [neutral, explain]: 我不再要求他迅速回答。开学的时候，我们可以先来看看。
Mother [neutral, explain]: 临时读书的地方准备好了。修屋子，我们还要一起负责。
I: 一阵风来了，我闭眼等沙过去，然后睁开。
Jonathan [neutral, explain]: 开学的时候，我也会来。先听，然后一起学。
end
