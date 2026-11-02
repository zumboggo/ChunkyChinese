story 2
label opening
scene platform
show Alden neutral left
show Jeremy worried right
show Boe happy center
rest Alden relaxed
rest Jeremy arms-crossed
camera wide cut
I: 五年过去了。现在我十六岁，早上要和两个同学一起坐车去学校。今天特别冷。
Jeremy [worried,insist]: 冷死了！你别看起来那么舒服，好不好？你穿了那么多，外面还有外套！
Alden [skeptical,question]: 谁让你说自己能做到？外面这么冷，你真的觉得自己什么都不怕吗？
Jeremy [worried,hesitant]: 我……以为还好。
choice cold
option hands "看看他的手。" -> hands
option clothes "看看他的衣服。" -> clothes
label hands
I: 他一边说，一边用手在身上来回地动。可这样，好像也没什么用。
goto bet
label clothes
I: 他的衣服是白色的，上面的画还在笑。可穿着它的人，已经不想笑了。
label bet
I: 他叫杰里米。为了十美元，他说穿这么少也没问题。我们才走了十五分钟。
Boe [happy,laugh]: 你要是求我，我就借你围巾。
I: 旁边的同学叫博。他看起来很安静，好像是个只知道读书的人。可他现在的笑，一点也不让人放心。
choice scarf
option ask "问他真的不要吗。" -> ask
option smile "看看他的笑。" -> smile
label ask
Alden [curious,question]: 你真的不要？现在说不要，一会儿可别又觉得不好。
Jeremy [determined,insist]: 不要！十块钱是我的！
goto train
label smile
I: 他还在笑，等对方先说话。我看他们，差一点也笑了。
Jeremy [determined,insist]: 我不会求你的！到时候，你得给我十块钱！
label train
I: 车来了。我把手收进衣服里，走向人最少的地方。他们还在说话。
scene train
show Alden neutral left
show Jeremy relieved right
show Boe happy center
rest Alden seated
rest Jeremy seated
rest Boe seated
camera wide cut
Jeremy [happy,explain]: 你们想想，以前的人要是知道这些，会怎么想？我们要去外星人的学校！
Jeremy [happy,explain]: 你还给一个恶魔带了吃的！这家伙的房间里，还有那个女人的画！
choice ordinary
option snack "想想带来的吃的。" -> snack
option school "想想每天去的学校。" -> school
label snack
I: 包里的吃的还在。对我来说，带点东西给他，没有什么特别的。
goto demon
label school
I: 他说得好像很奇怪。可对我们来说，这就是早上去上学，跟昨天一样。
label demon
Alden [neutral,explain]: 他不是真的恶魔。他只是从另外一个世界来的，长得有点奇怪。
Alden [neutral,explain]: 他得一直在这里帮大家做事，不能走。他就是这么回事。
Jeremy [skeptical,insist]: 因为他杀了人！
Alden [skeptical,explain]: 是他想杀人，可是没有做到。
Jeremy [skeptical,question]: 那就好一点了？
Alden [happy,question]: 有人想杀你，可是你没有死。跟你死了，你觉得哪个比较好？
camera listener Jeremy cut
I: 他看着我，好像想说什么。至少这一次，我说的话没有错。
camera wide cut
Boe [embarrassed,insist]: 那画，我八岁的时候就买了。小孩子都喜欢她！
Jeremy [happy,laugh]: 可你现在都十六岁了！她除了跟猫说话，还会做什么？
Boe [skeptical,insist]: 你又知道了？你今天还是先想想自己吧。
I: 他们又说起来了。我坐在旁边，听着这两个声音，拿出了手机。
camera listener Alden cut
rest Alden guarded
I: 手已经动了，我才发现，自己又要做同样的事。
I: 不应该再听了。听完以后，我这一早上，又不会开心了。
choice phone
option stop "想想要不要收起来。" -> stop
option mark "看看上面的东西。" -> mark
label stop
I: 收起来就好了。他们还在旁边，我可以听他们说话。可是，我没有这样做。
goto silver
label mark
I: 我看手机上那个小小的东西。它一直在那里，等我。我还拿着手机。
label silver
I: 第一次给汉娜打电话以后，手机上就多了一个银色的东西。看起来像个软件，可其实不是。
I: 我想删除它，可是做不到。我拿着谁的手机，它就会出现在谁的手机上。
I: 有一次，我拿了别人家一个特别老的电话。连那个电话上，也有它。
I: 不只我一个人这样。能用系统给英雄打电话的人，都有这个东西。
I: 我用手点了它，把手机拿到耳朵旁边。
Alden [worried,phone-talk]: 播放最后三条留言。
rest Alden downcast
I: 没有声音。我看着旁边的金属杆，上面有我的脸。越长大，我看起来越像爸爸。
I: 我还拿着手机。我在等那个声音。
end
