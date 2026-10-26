story 2
label opening
scene waystone
show Kote sad right
show PatronA neutral left
show PatronB worried center
rest PatronA seated
rest PatronB seated
camera wide cut
I: 晚上，旅店很安静。没有风，也没有人唱歌。
I: 两个男人坐着喝酒。有些事情让人担心，他们都不想说。
camera listener Kote over 0.6
I: 红头发的老板还在擦桌子。桌子已经很干净了。
I: 他看向那边，好像在等什么，又好像什么也不想等了。
choice silence
option room "先看看这间旅店。" -> room
option owner "先看看老板。" -> owner
label room
camera wide over 0.5
I: 杯子、木头和石头都在。少的，是说话声和笑声。
goto gathering
label owner
I: 他的手还在动，眼里却没有一点希望。
label gathering
scene waystone
show Cob happy far-left
show Graham neutral left
show Jake skeptical center
show Shep worried right
show Boy curious far-right
rest Cob seated
rest Graham seated
rest Jake seated
rest Shep seated
rest Boy seated
look Cob Boy
camera wide cut
I: 后来，五个老客人又来了。他们坐在吧台边，听老人讲故事。
I: 老板在后面的房间里，一边听，一边笑。这个故事，他早就知道。
camera listener Cob over 0.5
Cob [happy,explain]: 那个有名的人醒来时，发现自己不能离开那座塔。
Cob [worried]: 剑没了，他的东西也让人拿走了。
Cob [scared]: 更可怕的是，那里的火焰变成了蓝色！
camera listener Boy over 0.5
I: 年轻的学徒听得很认真。旁边的三个人早就听过这些故事。
choice attention
option fire "想一想蓝色的火焰。" -> fire
option faces "看看大家的表情。" -> faces
label fire
I: 火焰为什么是蓝色的？故事里，这一定不是好事。
goto question
label faces
I: 三个人点点头。年轻人还在等老人接着说。
label question
camera two Cob Boy cut
Cob [curious,question]: 孩子，你知道那是什么意思吗？
Boy [worried]: 是钱德里安。
Cob [proud]: 对。看见蓝色的火焰，就知道他们来了。
Boy [curious,question]: 可是，他们怎么找到他的？为什么让他活着？
camera listener Jake over 0.5
Jake [frustrated,insist]: 先别问了。听他讲完，你就知道了。
camera listener Graham over 0.5
Graham [neutral,reassure]: 他只是想知道。你喝你的酒吧。
choice sides
option curious "我知道那个年轻人怎么想。" -> curious
option patient "我也想听完故事。" -> patient
label curious
camera listener Boy over 0.5
I: 越想知道，就越想问个清楚。
goto thirsty
label patient
camera listener Cob over 0.5
I: 可是，一直这样问，老人就不能接着讲了。
label thirsty
camera listener Jake over 0.5
Jake [frustrated]: 我的酒早就喝完了！老板还在后面干什么？
react Jake point
I: 他用空杯子敲了敲桌子，对着后面的房间大叫。
Jake [angry,insist]: 老板！我们还要喝酒！
scene waystone
show Kote neutral right
show Jake skeptical left
rest Jake seated
look Kote Jake
camera two Kote Jake cut
I: 老板带来五碗热汤，还有两个面包。
I: 他又给三个客人加了酒，动作很快。
camera listener Kote over 0.5
I: 他没有接着讲故事，只是把晚饭送到大家面前。
choice supper
option food "先看看热汤。" -> food
option teller "看看讲故事的老人。" -> teller
label food
I: 大家先不听故事了，低头吃起晚饭。
goto pause
label teller
I: 老人也不说话了。他吃得比别人快多了。
label pause
scene waystone
show Cob happy far-left
show Graham neutral left
show Jake neutral center
show Shep worried right
show Boy curious far-right
rest Cob seated
rest Graham seated
rest Jake seated
rest Shep seated
rest Boy seated
camera wide cut
I: 别人还在吹热汤，老人已经吃完了。
camera listener Cob over 0.5
Cob [happy,explain]: 好，接着讲。
I: 大家又等着听了。那个人，到底怎么离开那座塔呢？
end
