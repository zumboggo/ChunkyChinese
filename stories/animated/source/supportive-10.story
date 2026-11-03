story 2
label opening
scene train
show Alden worried left
rest Alden seated
camera listener Alden cut
I: 我坐在去学校的车上，拿着手机。汉娜的声音来了。
I: 她说：“是我！”我不再看车里的人，好像又看见她在笑。
I: 每次见面，每次打电话，她都是这样。她总是这么开心，还是想让我开心？
choice smile
option voice "听听她的声音。" -> voice
option face "想想她的笑。" -> face
label voice
I: 她说话的声音那么亮。听起来，她就在电话那边。
goto message
label face
I: 不用看见她，我也能想到她笑起来的样子。
label message
I: “几分钟前，我收到召唤了。是真的！这是第四次，很不错吧？”
I: “我现在得走了。这次我们可能不能在说好的时间见面了。”
I: “本来说好过几天见。到时候，系统要是没叫你传送过来，可别怕。”
I: “我回来以后，我们再一起玩。有个新开的冰上公园，特别好！”
I: “到时候一起去看看。很快就能见面了！”
choice visit
option annual "想想每年的见面。" -> annual
option park "想想那个新地方。" -> park
label annual
I: 每年都会见面的。这次，她只是说晚一点。
goto second
label park
I: 一个新开的公园。她连回来以后一起去哪里，都已经想好了。
label second
express Alden worried
I: 手机有了一声响，第二条留言开始了。我的手更用力地拿着手机。
I: “我是克莱，她的朋友。我们以前见过一次。”
I: “一切都好。我就是想跟你说，她还在外面做任务。”
I: “我们觉得她很快就会回来。也许就是今天，也许就是明天。”
choice waiting
option soon "听听‘很快’这两个字。" -> soon
option away "想想她还没回来。" -> away
label soon
I: 很快。听起来，再等一下，就能等她回来了。
goto third
label away
I: 他跟我说一切都好。可是，这一次说话的人不是她。
label third
rest Alden guarded
I: 手机又有了一声响。最后一条留言来了。
I: 这是几个星期前收到的。我已经听过几十次了，可是心还是跳得更快了。
I: “你好。是……是我。”
I: “几个月前，我给你打电话的时候，就跟你说过有这个可能。可是……”
I: “她要是还不回来，我们就要为她准备葬礼。”
express Alden sad
camera listener Alden cut
I: “二月十三号。她生日那天。”
I: 我听着。他说的是我已经知道的日子，可我的心还是跳得很快。
I: “上次我说过，收到召唤的人，很少会几个星期都不回来。”
I: “现在已经半年了。我们……跟她一起的那些人，觉得不能一直这样等了。”
choice date
option birthday "想想那一天。" -> birthday
option mother "听他接着说。" -> mother
label birthday
I: 她的生日。本来是大家对她说生日快乐的日子。
goto motherline
label mother
I: 他停了一下，好像后面的话也不容易说。我没有动。
label motherline
I: “至少，我们想让她妈妈能不再这样等下去。”
I: “要不要我给你叫传送？跟我说，好吗？”
I: “你能来的话，她一定会很开心的。”
rest Alden downcast
I: 后面没有声音了。我还拿着手机。
I: 然后，系统用那个每次都一样的声音问：“要再听一遍吗？”
I: 我把系统关掉了。
end
