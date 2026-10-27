story 2
label opening
scene shop
ambience none
show Hyun neutral left
show Shopkeeper skeptical right
camera wide
look Hyun away
I: 再走几步就出去了。我却又看了一眼店里的雕像。
express Hyun surprised
Hyun [surprised]: 真了不起！
camera listener Shopkeeper over 0.65
look Shopkeeper Hyun
Shopkeeper [curious]: 你说哪一个？
camera two Hyun Shopkeeper cut
look Hyun Shopkeeper
Hyun [excited]: 那只金子做的老鹰，有两个头的那个。
Hyun [curious]: 这么好的东西，是给国王做的吗？
choice praise
option alive "它好像真的会动。" -> alive
option master "做它的人，一定很了不起。" -> master
label alive
Shopkeeper [curious]: 你认真看过了？说说看，哪里好？
goto eagle
label master
Shopkeeper [curious]: 光说了不起可不够。你看出什么来了？
label eagle
camera medium Hyun
Hyun [excited]: 我差点以为，它真的会动呢！
Hyun [happy]: 能在这里看见它，真是太好了。
Hyun [proud]: 这么好的东西，就应该放在您这里。
camera listener Shopkeeper over 0.65
express Shopkeeper happy
I: 刚才他只看我的衣服。现在，他等着我继续说。
camera two Hyun Shopkeeper cut
Shopkeeper [curious]: 原来，你也喜欢雕刻？
I: 刚才他还要我出去。现在，他愿意听我说话了。
choice interest
option peaceful "看这些东西，心里就安静了。" -> peaceful
option beauty "这么美的东西，谁会不喜欢呢？" -> beauty
label peaceful
Shopkeeper [happy]: 外面那么吵，这里倒能让你安心？
goto welcome
label beauty
Shopkeeper [happy]: 喜欢看的人多，肯认真看的人可不多。
label welcome
Hyun [happy]: 我只希望，自己也能多了解一点。
camera two Hyun Shopkeeper cut
react Shopkeeper nod
Shopkeeper [happy]: 来，坐吧。正好和我说说话。
Hyun [relieved]: 谢谢您。
I: 刚才没时间听我的问题，现在却有时间和我说话了。
Shopkeeper [curious]: 要不要喝点茶？
Hyun [curious]: 如果有冰的蜂蜜水，就太好了。
Hyun [neutral]: 没有的话，给我一点冷水就好。
Shopkeeper [happy]: 有，当然有！
perform Shopkeeper give Hyun repeat 1 steady
I: 他给我拿来了蜂蜜水。
camera medium Hyun
I: 我喝了一口。又冷又甜，真好喝。
choice drink
option tired "先喝一口，好好休息一下。" -> tired
option thankful "先说谢谢，再接着喝。" -> thankful
label tired
I: 喝下去，好像连身上的累都少了一点。
goto question
label thankful
Hyun [relieved]: 这水来得正好。谢谢您，我真的累了。
Shopkeeper [happy]: 你慢慢喝。
label question
camera two Hyun Shopkeeper cut
Shopkeeper [curious]: 现在，说说吧。到底什么事让你这么担心？
Hyun [neutral]: 是有个问题，想请您帮忙。
Hyun [curious]: 不过，能不能先让我看看这些雕像？
choice tour
option regret "现在就走，我会一直想着这里的东西。" -> regret
option linger "我还想多看一会儿。" -> linger
label regret
Shopkeeper [happy]: 这回可没人赶你。好好看吧。
goto permission
label linger
Shopkeeper [happy]: 难得有人愿意多看一会儿。
label permission
Hyun [happy]: 我的事可以等。这么好的东西，我想先好好看看。
camera listener Shopkeeper over 0.65
react Shopkeeper nod
Shopkeeper [proud]: 做出好东西，就是给喜欢它的人看的。
Shopkeeper [happy]: 你想看多久，就看多久。
camera medium Hyun
express Hyun happy
I: 刚才要出去，现在能坐下。这水真甜。
I: 同样的衣服，同样的人。他对我说的话，全变了。
camera two Hyun Shopkeeper cut
look Hyun away
I: 看来，他想要的，是一个愿意认真看这些东西的人。
I: 先看。月光的事还没问，可这次他会听了。
end
