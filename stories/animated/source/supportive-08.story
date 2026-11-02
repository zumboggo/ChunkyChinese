story 2
label opening
scene kitchen
show Alden worried center
rest Alden guarded
camera listener Alden cut
Alden [worried,phone-talk]: 我刚才还有一些话没说。
scene restaurant
show Hannah worried left
show Cly worried right
rest Hannah seated
rest Cly seated
camera two Hannah Cly cut
Hannah [worried,reassure]: 你说，我听着。
I: 是阿登。他又打来了。我还在饭店里，大家就在旁边，可现在我只听着他的声音。
camera listener Hannah cut
Alden [determined,explain]: 我爸爸妈妈死了，不是你的错。我看了很多关于你们的事。
Alden [determined,explain]: 你的力量，要先知道哪里会爆炸、什么时候爆炸，才能帮上忙。可那天，你不知道。
Alden [determined,explain]: 那个人也是在那次跟你们打的时候，第一次这样用他的力量。你怎么可能知道呢？
Hannah [worried,hesitant]: 我……
scene kitchen
show Alden determined center
rest Alden guarded
camera listener Alden cut
Alden [determined,explain]: 后来写的报告说，托马斯先生从外面打进来，上面的东西全掉了下来，压在我爸爸妈妈的房间上。
Alden [sad,explain]: 可我觉得，他们在第一次爆炸的时候，就已经死了。因为他们没有跟我说话。
Alden [worried,insist]: 我醒来的时候，叫得特别大声。可是他们没有来，也没有说话。
Alden [determined,explain]: 如果有90秒，他们一定会来。我试过了。康妮阿姨8秒就跑过来了。
Alden [sad,explain]: 所以我觉得，你让那两个人打进我们家以前，他们就已经不在了。
scene restaurant
show Hannah shocked left
show Cly worried right
rest Hannah seated
rest Cly seated
camera listener Hannah cut
I: 我的手紧紧拿着身前的衣服，什么也说不了。要说谢谢吗？还是问他，现在好不好？
I: 我想得太久了。他又说话了。这一次，慢了下来，好像在跟一个小孩子说明白。
Alden [worried,reassure]: 我的意思是，他们是在第一次爆炸里死的。那一次，你什么也做不了。所以，你不用伤心了，好吗？
choice reply
option thanks "先谢谢他打来。" -> thanks
option care "先说自己听明白了。" -> care
label thanks
Hannah [sad,hesitant]: 好……谢谢你。谢谢你打来，跟我说这些。
goto tell
label care
Hannah [sad,reassure]: 我听明白了。你是怕我一直伤心。谢谢你跟我说。
label tell
Alden [neutral,phone-talk]: 我没有托马斯先生的电话。你也可以跟他说吗？
Hannah [worried,reassure]: 好。我马上给他打电话。
I: 汉娜，快想想办法。这个11岁的孩子在照顾你，你却不知道该说什么。
choice help
option words "想想怎么说能让他好一点。" -> words
option action "想想能为他做点什么。" -> action
label words
I: 我想让他心里好一点。可是我想到的话，都好像不太对。
goto wait
label action
I: 我一直想为他做点什么。现在他自己打来了，可我还是不知道怎么办。
label wait
Alden [neutral,phone-talk]: 那，再见。
react Hannah reach
Hannah [worried,insist]: 阿登，等等！你想来阿内西多拉玩吗？我可以给你拿到一天的票。
I: 我已经说了。这样的票，不是谁都能拿到的。不过，我应该能做到。大概吧。
scene kitchen
show Alden curious center
rest Alden attentive
camera listener Alden cut
choice visit
option summer "先想什么时候能去。" -> summer
option travel "先想去那里要花多少钱。" -> travel
label summer
Alden [curious,question]: 暑假的时候可以吗？我那时候不用上学。可是，坐飞机过去会不会很贵？
goto teleport
label travel
Alden [worried,question]: 坐飞机过去要花很多钱吗？如果能去，我想暑假的时候去。
label teleport
scene restaurant
show Hannah embarrassed left
show Cly curious right
rest Hannah seated
rest Cly seated
camera two Hannah Cly cut
I: 对了。那里在很远很远的海上，不是坐个飞机就能到的地方。
Hannah [happy,reassure]: 我给你买一次传送！系统能一下把你送过来。你就跟我说，什么时候能来。
Alden [curious,phone-talk]: 我问问阿姨。不过，她不会不让我去的。
Hannah [happy,reassure]: 太好了！那就到时候见。
Alden [neutral,phone-talk]: 还有三个星期，学校就不上课了。
camera listener Hannah cut
I: 三个星期？对啊，他住在北边。我刚才还以为，自己有很多时间。
Hannah [happy,reassure]: 好！问过阿姨以后跟我说。我们一定能做到！
Alden [neutral,phone-talk]: 她会说好的。再见。
react Hannah facepalm
I: 他又不在了。我把手放在脸上，慢慢往下。刚才……应该还好吧？
I: 我还是得再看看那天的事，也许再给托马斯打个电话。孩子说的这些，还要好好了解一下。
camera two Hannah Cly cut
I: 旁边的人开始开玩笑，问我是不是跟一个叫兔子的职业的人在一起了。我一边说没有，一边找能帮我拿到票的人。
I: 这里说的兔子，是一种职业。有的人被叫去帮忙，就能拿很多钱。但很多人一直等不到，也没有学会什么有用的东西。
Cly [worried,explain]: 汉娜，他们想说的是，你刚才说，要给一个没有力量的孩子买一次传送。
choice cost
option possible "先问能不能这样做。" -> possible
option price "先问是不是太贵了。" -> price
label possible
Hannah [worried,question]: 我们可以这么做吧？我听说有人这样做过。
Cly [skeptical,question]: 可以。可是，你问过要花多少钱吗？
goto no
label price
Hannah [worried,question]: 是不是很贵？我知道有人做过，可我从来没问过要多少钱。
Cly [skeptical,explain]: 你先说能做到，才想到问这个啊。
label no
Hannah [embarrassed,hesitant]: 我以前出去工作，都是那边付钱。我自己没买过。真的很贵吗？
camera listener Hannah cut
I: 大家看看你，看看我。我手还停在那些名字上面。
camera two Hannah Cly cut
react Cly sigh
Cly [worried,reassure]: 我们……想办法让大家帮你出点钱吧。这也是在帮助人。
Cly [skeptical,explain]: 在那以前，你就多吃点面和豆子吧。
end
