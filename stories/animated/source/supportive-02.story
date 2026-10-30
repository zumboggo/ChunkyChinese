story 2
label opening
scene hospital
show Alden curious left
show Hannah worried right
rest Alden seated
rest Hannah seated
look Alden Hannah
look Hannah Alden
camera two Alden Hannah cut
I: 我们还坐在医院里。她已经看过我受伤的地方，也愿意跟我说清楚事情。
Hannah [neutral,explain]: 你的身体已经好了。医生还想多看看，怕有什么问题。
Alden [curious,question]: 因为那个银色的球？
Hannah [worried]: 对。人在里面，本来应该什么都不知道。可是，你不一样。
Hannah [sad,hesitant]: 如果我早知道，就不会让你看见那个人了。
I: 对了。我还有重要的问题。她不会一直坐在这里等我。
choice ask
option person "问房间里的那个人。" -> person
option parents "直接问爸爸妈妈的事。" -> parents
label person
Alden [worried,question]: 那天在我房间里的，就是那个坏人吗？
Hannah [sad]: 对，就是他。
goto why
label parents
Alden [worried,question]: 是那个人让我爸爸妈妈死的吗？
Hannah [sad]: 是的。没有人跟你说过吗？
label why
I: 我往后躺，两只手拉着被子。
Alden [frustrated]: 没有人真的跟我说清楚。他们说的话很好听，可是没有用。
camera listener Hannah over 0.6
Hannah [worried,hesitant]: 你应该知道。不过，也许他们也不太清楚。
Hannah [neutral,reassure]: 我可以跟你说。不一定要今天，也可以等你离开医院以后。
camera two Alden Hannah cut
Alden [worried,question]: 他为什么要杀我爸爸妈妈？是想拿我们的东西，还是在生他们的气？
I: 我想过很多次。也许知道为什么，一切就会变得明白一点。
Hannah [worried,explain]: 他的力量很特别。几个月前，他刚刚被系统选中。
Hannah [neutral]: 他应该先登记，再去有特别力量的人住的地方。可是，他没有这样做。
I: 故事里的坏人也是这样。我没想到，真的会有这样的人。
choice details
option askpower "问他的力量是什么。" -> askpower
option keepgoing "跟她说，我想听下去。" -> keepgoing
label askpower
Alden [curious,question]: 他有什么力量？
Hannah [worried,question]: 有点可怕。你真的想知道？
Alden [determined]: 想。
goto power
label keepgoing
Alden [determined]: 我想知道。你说吧。
Hannah [worried]: 好。我慢慢说。
label power
Hannah [sad,explain]: 他能拿走别人的力量和生命，变成自己的。他害的人越多，自己就越强。
Hannah [neutral]: 那天，附近有很多人在一起过节。声音很大，人也很多。
Hannah [sad]: 他就在里面。一开始，没有人发现不对。等他们叫人来，已经有人死了。
I: 她停了一下。我没有说话，等她说下去。
Hannah [worried]: 其他人都有事。他们不知道有多危险，就只让我们两个人去了。
Hannah [frustrated,explain]: 等我们到了，他已经跑得特别快。我们连想事情都没有他快。
look Hannah away
camera listener Hannah over 0.6
I: 她不说话了，眼睛看向其他地方。我不想让她停在这里。
choice herpower
option whatkind "问她有什么特别的力量。" -> whatkind
option bubble "再问那个球的事。" -> bubble
label whatkind
Alden [curious,question]: 那你呢？你有什么力量？
look Hannah Alden
Hannah [neutral]: 我可以让一个地方不再改变。这样说，有点难明白吧？
goto explainbubble
label bubble
Alden [curious,question]: 那个球，是你的力量吗？
look Hannah Alden
Hannah [neutral]: 对。用那个来说明，你可能更容易明白。
label explainbubble
camera two Alden Hannah cut
Hannah [neutral,explain]: 就像那个球。里面的东西不会变，所以你的血也不再流了。
Hannah [curious]: 我不觉得时间真的停了。可是，问过的人也没说清楚。
Alden [neutral]: 里面什么都不疼了。我不能动，也不能像以前那样怕。
Hannah [relieved]: 那就好。我还以为，你在里面会很怕。我会再好好想想。
camera listener Alden over 0.65
I: 我看看她。原来，她也不一定完全明白自己的力量。
I: 那个球救了我。可她也还有不知道的事。
choice understand
option relief "想想自己不再疼的时候。" -> relief
option surprise "想想她说的“不知道”。" -> surprise
label relief
I: 我记得那种安静。她不是什么都知道，却真的让我活了下来。
goto chase
label surprise
I: 我以为，她一定什么都明白。她说自己也不清楚，还要好好想想。
label chase
camera two Alden Hannah cut
Hannah [worried,explain]: 我们想让他慢下来，让和我一起去的人抓住他。他的力气很大，应该能做到。
Hannah [frustrated]: 可我的魔法没那么快。他又看得见，就能跑开。
Hannah [neutral]: 他跑了出去，我们就跟着。他一路还在伤害人，所以我们才能跟得上。
Hannah [worried]: 我说，得让他进一个没人的地方。不能让他继续跑了。
Alden [curious,question]: 我家对面的那座房子？
Hannah [sad]: 对。那是我们最先看见的空房子。
camera listener Alden over 0.65
I: 我记得。那里还在修。我以前希望，有别的小孩会住进来。
I: 晚上，我们就可以隔着窗户，用灯光说话。
express Alden worried
I: 现在我知道了，他们为什么会来到我家对面。可那个人，最后怎么会进了我的房间？
end
