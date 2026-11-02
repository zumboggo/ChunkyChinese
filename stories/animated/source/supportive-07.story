story 2
label opening
scene restaurant
show Hannah curious left
show Cly skeptical right
rest Hannah seated
rest Cly attentive
look Hannah Cly
camera two Hannah Cly cut
I: 克莱把喝的东西拿了过来。我还在本子上写工作的事。
Cly [skeptical,question]: 你真是世界上最没意思的人。今天大家来跟我说再见，你还在工作？
Hannah [embarrassed,hesitant]: 啊……大家不是已经快吃完了吗？
I: 她叫克莱，是我最好的朋友。她终于能去多伦多工作了。今天，我们在她最喜欢的饭店吃饭。
Cly [happy,celebrate]: 我还在这里，怎么能说已经完了！
I: 她把喝的东西拿得高高的，一点到了头发上。她也不在意。其他人都笑了。
choice farewell
option friend "先说自己会想她。" -> friend
option future "先说自己为她开心。" -> future
label friend
Hannah [happy,reassure]: 我真的会想你的。希望你在那边过得开心。
goto offer
label future
Hannah [happy,reassure]: 你终于能去了。我真为你开心，不过，我会很想你的。
label offer
Cly [pleading,plead]: 那就跟我一起去啊！你来帮我，我的钱也分给你。我们一定可以一起工作。
Hannah [embarrassed,hesitant]: 一起去一定很好玩。可是，你知道我想……
Cly [skeptical,insist]: 我知道，你想让跟你一起的人变得更强。那就让我更强啊！我也想！
Hannah [happy,explain]: 你那么远就能让对方的脑子不能工作。只要打中了，就已经做到了。还能怎么更强？
I: 其实，我已经想过几个可以帮她的办法。只是两个人一起打，跟让另一个人变得强很多，不是一回事。
choice work
option plans "想想自己为什么还在写。" -> plans
option help "想想自己想怎么帮人。" -> help
label plans
I: 我还在想，怎么写能让对方明白我的意思。这份工作，对我很重要。
goto partner
label help
I: 我想跟一个人一起工作，让他做到以前做不到的事。不只是旁边多一个人。
label partner
I: 我想跟一个能让周围变冷变热的人一起工作。他以前有人帮，做事真的好了很多。可后来，帮他的人去了其他世界，就再也没有回来。
react Cly reach
Cly [happy,insist]: 这个本子给我！你喝这个。我们还能在这里玩一个小时呢。来玩扑克！
I: 她拿走了我的本子。我笑了，好吧。其他还没走的人也一起玩了起来。
rest Cly seated
camera wide cut
I: 有个人能让人更喜欢她。还有个人的手特别快。跟他们玩游戏，大概不是很容易拿到钱。
I: 大家一边玩，一边说，她这种力量这么强的人，居然也能出去工作了。
Cly [proud,proud]: 我从十五岁开始，就一直是个好人！连我妈妈都没什么话好说的。
I: 大家笑着说，她坐在那里不动，也能让人死。她马上说，没那么容易，其他人也会打她啊。
I: 我看着她笑。我知道，这件事对她真的不容易。很多地方，都怕能让别人改变想法的人。
I: 所以，她一直做得特别好，还只让自己学会一种很强的办法。这一次，她真的能去想去的地方了。
camera two Hannah Cly cut
Hannah [curious,explain]: 对了，你走以前，也许可以……等等，有电话。
react Hannah reach
I: 我眼前有一点金色的光。我用手点了一下，比只用脑子去想容易多了。
I: 这个颜色，是我给最重要的人用的。她就在我对面，我现在也没有一起工作的人。那一定是妈妈。
choice greeting
option warm "先开心地跟妈妈说话。" -> warm
option late "先问她为什么还没睡。" -> late
label warm
Hannah [happy,question]: 妈妈！怎么了？你那边现在不是半夜吗？
goto silence
label late
Hannah [curious,question]: 妈妈，你还没睡？伦敦那边已经半夜了吧？
label silence
I: 那边安静了几秒。然后，一个很小心的声音说起话来。
scene kitchen
show Alden worried center
rest Alden guarded
camera listener Alden cut
Alden [embarrassed,phone-talk]: 那个……我是阿登。请问，你是汉……汉娜吗？
scene restaurant
show Hannah shocked left
show Cly worried right
rest Hannah seated
rest Cly seated
look Cly Hannah
camera two Hannah Cly cut
I: 我手里的扑克掉了。
Cly [worried,question]: 你没事吧？
react Hannah shake-head
Hannah [shocked,hesitant]: 是我。我是汉娜。
I: 我的声音有点不对。我让自己好好说话。是那个孩子。他真的打来了。
Hannah [worried,reassure]: 很高兴你打来。有什么我能帮你的吗？
I: 对面的人一下就明白了，马上让大家不要说话。其实没关系，系统不会让他听到其他人的声音。
scene kitchen
show Alden determined center
rest Alden guarded
camera listener Alden cut
Alden [worried,phone-talk]: 我想问，那天前两次爆炸，到那两个人进我们家的时候，真的是九十秒吗？
Alden [worried,insist]: 我在网上看的。他先用了两次力量，然后过了九十秒，他们才一起进来。真的是那么久吗？
scene restaurant
show Hannah worried left
show Cly worried right
rest Hannah seated
rest Cly seated
camera listener Hannah cut
I: 我刚想说话，他就已经把后面的话都说完了。说得很快，好像只想快一点说完。
I: 我还没有忘记那天的事。可能永远也不会。可我从来没想过，他还会打电话来。
choice answer
option honest "先说自己没有看时间。" -> honest
option careful "先说那只是大约的时间。" -> careful
label honest
Hannah [worried,hesitant]: 我……那天没有看着时间。不过，我们后来都觉得，大约是九十秒。
Hannah [worried,explain]: 也可能少一点。
goto aftermath
label careful
Hannah [worried,explain]: 应该是大约九十秒。也可能少一点。我那天没有看着时间，后来我们一起想的时候，是这么说的。
label aftermath
I: 我说得对吗？他现在十一岁了吧？我一定要好好跟他说。
I: 我一直想知道他好不好。可不能只是为了让自己心里好一点，就去找他和他阿姨。
I: 他为什么问这个？如果再问那天的事，哪些能说，哪些不能说？我现在都不太清楚。
scene kitchen
show Alden neutral center
rest Alden attentive
camera listener Alden cut
Alden [neutral,phone-talk]: 好的。谢谢你。再见。
scene restaurant
show Hannah surprised left
show Cly worried right
rest Hannah seated
rest Cly seated
camera two Hannah Cly cut
Hannah [confused,hesitant]: 啊……再见。
I: 他已经不在了。就这样？我往椅子上一靠，手放在胸口，心跳得特别快。
Cly [worried,question]: 你还好吗？
Hannah [worried,hesitant]: 没事。就是没想到。他只是想知道……
camera listener Hannah cut
react Hannah reach
I: 眼前的光又亮了。我还没来得及想清楚，手就已经点了上去。
end
