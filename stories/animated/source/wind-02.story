story 2
label opening
scene waystone
show Cob happy far-left
show Graham neutral left
show Jake skeptical center
show Shep neutral right
show Boy curious far-right
rest Cob seated
rest Graham seated
rest Jake seated
rest Shep seated
rest Boy seated
camera wide cut
I: 晚饭还没吃完，老人已经接着讲了。大家都想知道，那个人怎么离开。
camera listener Cob over 0.5
Cob [neutral,explain]: 他看了看四周。没有门，也没有窗户，只有石头。没有人能从这里出去。
Cob [proud]: 可是，他知道一切东西的名字。他说的话，石头也得听。
choice stone
option wall "想想那个没有门的房间。" -> wall
option name "想想他知道的名字。" -> name
label wall
I: 四周全是石头。这里真的能出去吗？
goto breaking
label name
I: 知道名字，就能让石头听话？我想听老人说下去。
label breaking
camera listener Cob cut
Cob [excited,insist]: 他对石头说：破！石头就破开了，眼前一下子多了一条路。
Cob [happy]: 外面是天空。他终于能好好地呼吸了。
Cob [neutral]: 他走到边上，低头看了一眼，就走了出去。
camera listener Boy over 0.5
Boy [shocked,question]: 不会吧！他真的走出去了？
camera listener Cob over 0.5
Cob [neutral]: 对。他掉了下去，却一点也不担心。
Cob [proud,explain]: 他知道风的名字。风听了他的话，就接住了他。
Cob [happy]: 风把他送到地上。他好好地站着，一点事也没有。
camera listener Boy over 0.5
I: 年轻人的眼睛都大了。老人点点头，一点也不觉得奇怪。
choice landing
option danger "我刚才还担心他会死。" -> danger
option trust "原来，他知道风会帮他。" -> trust
label danger
I: 从那么高的地方掉下来，还能好好地站起来！
goto wound
label trust
I: 没有路的时候，他走向了风。
label wound
camera listener Cob cut
Cob [curious,explain]: 他再看看身上受伤的地方，发现也没什么大事。
Cob [skeptical]: 也许只是运气好。也许，是衣服下面的护身符帮了他。
camera listener Boy over 0.5
Boy [curious,question]: 什么护身符？
I: 年轻人嘴里还有吃的，就开始问了。老人坐得更舒服了，准备慢慢讲。
camera listener Cob over 0.5
Cob [happy,explain]: 几天前，他在路上遇到一个帮人修东西的老人。
Cob [neutral]: 自己的晚饭不多，他还是分了一些给老人吃。
camera listener Graham over 0.5
Graham [happy,reassure]: 这样做就对了。你帮这种人一次，他会还你两次。
camera listener Jake over 0.5
Jake [frustrated,insist]: 不对！不是这样说的。你连最重要的都不记得了。
choice saying
option kindness "想想分出去的那一点晚饭。" -> kindness
option quarrel "听听他们到底怎么说。" -> quarrel
label kindness
I: 自己也没多少吃的，还愿意分给别人。这可不只是说句好话。
goto interruption
label quarrel
I: 两个人都说自己记得，却说得不一样。谁说得对呢？
label interruption
scene waystone
show Graham curious left
show Jake skeptical center
show Kote neutral right
rest Graham seated
rest Jake seated
look Graham Kote
look Jake Kote
camera two Jake Kote cut
Kote [neutral,explain]: 其实，你们连一半都没记住。
I: 老板站在后面的门口。今天晚上，他第一次接了大家的话。
camera listener Kote over 0.5
Kote [neutral]: 跟他买卖东西，他一定会还你。白白帮他的忙，他会加倍还你。
Kote [neutral]: 可是，你要是骂他，他就会还你三倍。
camera listener Graham over 0.5
I: 大家看看老板，好像现在才发现他也在这里。
I: 他们来了这么多次，老板从来没有这样接过话。
choice silence
option faces "看看安静下来的客人。" -> faces
option owner "看看现在的老板。" -> owner
label faces
I: 刚才还说个不停的人，现在谁也不说话了。
goto stranger
label owner
camera listener Kote over 0.5
I: 他知道的比别人多。可是，现在大家一看他，他就不好意思了。
label stranger
camera listener Kote cut
I: 他在这里才住了大约一年。对这些人来说，他还是个外人。
Kote [embarrassed]: 只是以前听别人说过。
scene waystone
show Cob neutral far-left
show Graham neutral left
show Jake skeptical center
show Shep curious right
show Boy curious far-right
rest Cob seated
rest Graham seated
rest Jake seated
rest Shep seated
rest Boy seated
camera listener Cob cut
I: 老人点点头，又接着讲护身符。
Cob [proud,explain]: 那东西本来要一大桶金币才能买到！可老人只收了三枚钱。
Cob [neutral]: 一枚铁的，一枚铜的，还有一枚银的。因为他分了晚饭给老人。
Cob [neutral]: 那东西很黑，也很冷。只要带在身上，就不用怕那些可怕的东西。
camera wide over 0.5
I: 故事里的人安全了。我却还想着老板刚才的话。他还知道什么呢？
end
