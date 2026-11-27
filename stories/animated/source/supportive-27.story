story 2
label opening
scene lobby
show Alden neutral left
show Gorgon neutral right
camera wide cut
I: 我们一起在里面走，看看上课的地方。有时候，他停下来，擦一擦什么东西。
I: 他好像没有想好要洗什么。看到什么，就洗什么。
label watch_27_opening_2
I: 不过，窗户不一样。他把窗户擦得特别认真。
I: 我一下子明白了。对他来说，这就是离外面最近的地方。
label watch_27_opening_4
choice windows
option glass "看看窗户外面。" -> glass
option cloth "看看他怎么擦窗户。" -> cloth
label glass
I: 外面还有很多地方。可是，他只能从窗户这里看看。
goto snacks
label cloth
I: 他还在慢慢擦。我就在旁边等他。
label snacks
Alden: 要不要吃点玉米片和辣酱？
label watch_27_snacks_1
I: 我们终于回到楼下。我拿出吃的，给他。
I: 有一包蓝色的玉米片，还有一瓶辣酱。
I: 他点点头，都拿了过去。
label watch_27_snacks_4
label night
I: 晚上的这里，感觉很不错。头上的灯还亮着。
label watch_27_night_1
I: 树下面还有蟋蟀在叫。猫在椅子旁边走来走去。
I: 他直接走向猫，选了离它最近的椅子坐下，打开辣酱。
I: 他一直看它，好像觉得很有意思。
label watch_27_night_4
choice watching
option alien "看看猫怕不怕他。" -> alien
option seat "看看他们坐的地方。" -> seat
label alien
I: 他的样子和人这么不一样。我还以为猫会怕呢。
goto sniff
label seat
I: 他没有选离我最近的地方。他选了猫。
label sniff
I: 可是，猫一点也不怕。它到他脚旁边闻了闻，就走开了。
I: 如果出门前认真想一想，我大概会把猫留在家里。
I: 我低下身体，想过去。它马上变了样子，看起来很生气。
label watch_27_sniff_3
Gorgon: 你把它关起来，它还在生气。
label watch_27_sniff_4
Alden: 我知道。它不喜欢那个箱子。
I: 以前，我只把它关进去过一次。那次是带它去看医生。
label watch_27_sniff_6
label offering
I: 我拿出一罐金枪鱼。
Alden: 我们和好吧？这是你最喜欢吃的。
label watch_27_offering_2
I: 我把它打开了。
I: 它往我这边走了过来。
label watch_27_offering_4
choice hope
option food "看看给它买的东西。" -> food
option step "看看它走近的样子。" -> step
label food
I: 我买的还是好的。这次应该没问题吧。
goto attack
label step
I: 有了好吃的，它应该就不生气了吧。
label attack
Alden: 看吧？它其实很容易——啊！维克多！你太过分了！
label watch_27_attack_1
I: 它一下子跳过来，又咬又抓，我的右手就受伤了。
I: 快得我还没觉得疼，它就跑到他的椅子下面去了。
Alden: 你干什么啊？我给你买的可是好金枪鱼！
label watch_27_attack_4
I: 手很疼。被它抓过的地方，还有被咬的地方，都在流血。
I: 我看看受伤的手，又看看旁边。这里有没有能帮我包一下手的东西？
label watch_27_attack_6
label sound
I: 这时候，有一个奇怪的声音。我马上看过去，怕猫还要过来。
label watch_27_sound_1
I: 可声音不是猫发出来的。是他。
I: 他拿着那包吃的，身体一下一下地发抖。
I: 一开始，我还以为他身体出了什么问题。然后，我明白了。
label watch_27_sound_4
label laugh
Alden: 你在笑我吗？
label watch_27_laugh_1
Gorgon: 是啊！
label watch_27_laugh_2
Gorgon: 猫一定会这样做啊。可是，你不知道！
I: 他说话的时候，还在发出那种奇怪的笑声。
Alden: 我的血都到你地上了。这不好笑。
label watch_27_laugh_5
I: 可是，我听自己的声音，也有一点想笑。
label watch_27_laugh_6
choice reaction
option face "看看他笑的样子。" -> face
option voice "听听自己的声音。" -> voice
label face
I: 我从没见他笑过。他笑起来的样子，真的很奇怪。
goto relief
label voice
I: 我明明很疼，可刚才的话听起来，一点也不生气。
label relief
I: 不过，知道他也会觉得好笑，我心里舒服了一点。
label watch_27_relief_1
I: 他还在笑。猫在他椅子下面，我站在他们前面。
Alden: 好吧。我怕了你们两个了。我去厕所洗一下手。
label watch_27_relief_3
I: 血还在流，已经流到衣服上了。
I: 这只猫做事，还真是一点也不客气。
end

