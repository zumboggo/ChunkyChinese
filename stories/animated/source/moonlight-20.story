story 2
label opening
scene square
ambience none
show Hyun happy left
camera wide
activity Hyun walk right steady
I: 我离开商店，去找诗人。
I: 我太开心了，差点唱起歌来。
I: 不过，我要找的，不是和我一样来玩游戏的人。
choice search
option local "要找在这里生活很久的人。" -> local
option old "年纪大一点，也许更好。" -> old
label local
I: 他知道这里的事，可能也知道五十年前的故事。
goto pubs
label old
I: 唱得好不好，不是最重要的。知道得多才有用。
label pubs
activity Hyun stop
scene tavern
show Hyun neutral left
camera wide
I: 我找了好几家酒吧，终于找到一个我想找的人。
show Bard neutral right
look Hyun Bard
look Bard Hyun
camera two Hyun Bard cut
I: 他四十多岁，应该知道不少故事。
react Hyun cheer
Hyun [happy]: 唱得真好！不好意思，我想问您几个问题。
Hyun [curious]: 五十年前，王宫里发生的事，您知道吗？
react Bard reach
I: 他把手放到我面前。我当然明白，这是什么意思。
express Hyun skeptical
I: 要钱啊。
I: 可是，能不花的钱，为什么要花？
Hyun [happy]: 您的歌，写得好，唱得也好。
choice praise
option voice "光是听您的声音，就让人不想走了。" -> voice
option charm "年轻的时候，一定有很多女孩喜欢您吧？" -> charm
label voice
express Bard skeptical
I: 他没有说话，手还放在那里。
goto flattery
label charm
express Bard skeptical
I: 我等他笑。他却还在等我的钱。
label flattery
Hyun [happy]: 现在喜欢您的人，一定也不少！
Hyun [happy]: 诗人喜欢去很多地方，也喜欢爱情。我也一样。
react Bard reach
I: 我说了这么多，他的手还是没有收回去。
camera listener Bard cut
Bard [angry]: 别再说这些好听的话了！
Bard [angry]: 给钱，或者走人！
camera listener Hyun over 0.4
express Hyun worried
I: 这次，说好话没有用了。
choice decide
option quit "要不，就不做这个任务了？" -> quit
option later "可后面的奖励，也许很好呢。" -> later
label quit
I: 不做，也不会有什么问题。可奖励也拿不到了。
goto coin
label later
I: 现在就走，我可能会错过好东西。
label coin
camera two Hyun Bard cut
express Hyun neutral
react Hyun reach
I: 我从口袋里拿出一个银币。
express Hyun shocked
I: 等一下！我的口袋里，只有两个银币！
I: 那是教官给我的钱。我没有先换成铜币！
perform Hyun give Bard repeat 1 steady
I: 还没等我想清楚，他就拿走了那个银币。
camera listener Hyun cut
express Hyun frustrated
react Hyun facepalm
I: 一个银币，就这样没了。
I: 我怎么会做出这种事！
camera two Hyun Bard cut
Bard [neutral]: 这是秘密，不要跟别人说。
Bard [neutral]: 王后和那个雕刻家，从小就喜欢在一起。
choice meaning
option clarify "喜欢在一起，是什么意思？" -> clarify
option friends "您是说，他们很喜欢一起玩？" -> friends
label clarify
Bard [skeptical]: 这还不明白？他们爱着对方！
goto secret
label friends
Bard [skeptical]: 不只是一起玩。他们爱着对方！
label secret
camera listener Hyun over 0.65
express Hyun surprised
I: 原来，他们相爱。
Hyun [neutral]: 我明白了。
I: 我也明白，为什么不能让王家骑士知道了。
I: 为了不让人说她不好，他们可能会不让我再说话。
camera two Hyun Bard cut
express Hyun worried
I: 花了一个银币，我终于知道了他们的事。
I: 可是，他们相爱，怎么会和雕刻月光有关？
end
