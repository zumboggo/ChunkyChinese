story 2
label opening
scene hospital
show Alden worried left
show Hannah sad right
rest Alden seated
rest Hannah seated
look Alden Hannah
look Hannah Alden
camera two Alden Hannah cut
I: 她还坐在床边。那天晚上，他们把坏人带进了我家对面的空房子。
I: 可我记得，他最后是在我的房间里。这中间，到底出了什么事？
Hannah [worried,explain]: 和我一起去的人进去跟他打。我留在外面，不让他从其他地方跑掉。
Hannah [neutral]: 我也得让房子不会倒下来，伤到旁边的人。
choice focus
option partner "想想里面的那个人。" -> partner
option outside "想想留在外面的她。" -> outside
label partner
I: 他在里面打。可他能不能用出自己的力量，还得看外面的她。
goto support
label outside
I: 她没有进去。可是，房子里面和外面的人，都需要她。
label support
Hannah [worried,explain]: 他力气太大。真打起来，旁边的东西就很容易出问题。
Hannah [neutral]: 所以，我才跟他一起做事。这样，他打的时候就不用一直想这些。
Hannah [sad,hesitant]: 我要让旁边的人安全，也要跟他说，什么可以做，什么不能做。
look Hannah away
camera listener Hannah over 0.6
I: 她停了。这一次，停了很久。
I: 我看看她。她很不好受。是不是因为，后来出了问题？
choice silence
option face "看看她的脸。" -> face
option wait "安静地等她说下去。" -> wait
label face
I: 她没有看我。我想问，可是看她那个样子，又没有说话。
goto force
label wait
I: 我没有再问。事情还没有说清楚，我得等她说下去。
label force
look Hannah Alden
camera two Alden Hannah cut
Hannah [worried,explain]: 我用我的力量，让他要打的地方不会出问题。可我一个人做不过来。
Hannah [frustrated]: 那个人又用了一种我们还不明白的力量。连我的力量也没有用了。
Hannah [sad]: 房子里的东西飞了出来。让你受伤的那个东西，就是这样飞进你家的。
look Hannah away
I: 她看了看我的肚子。我知道她在想什么。
look Hannah Alden
Hannah [worried]: 我只好把力量放在更小的地方，让那些地方更强，什么都过不去。
Hannah [sad,hesitant]: 然后……我做错了。错得很可怕。
choice mistake
option listen "看她，听清楚。" -> listen
option hold "想让自己安静下来，再听下去。" -> hold
label listen
I: 我看看她。这一次，我不要好听的话。我要知道发生了什么。
goto floors
label hold
I: 我还是不能放松下来。她的声音很近，我却觉得有点远。
label floors
camera two Alden Hannah cut
Hannah [worried,explain]: 他问我，七楼那面墙，能不能让他用力打。我说，能。
Hannah [sad]: 可我太急了，数错了窗户。我让八楼变强了，不是七楼。
camera listener Alden over 0.65
express Alden shocked
I: 七楼。八楼。只差一点。
Hannah [sad,hesitant]: 他用力撞了那个人。他们一起撞破了墙，飞到马路对面，进了你们家。
I: 我耳朵里的声音，好像一下子更大了。我的嘴在发抖。
I: 我终于知道了发生的事。可是，我一点也没有觉得好过。
camera two Alden Hannah cut
express Hannah sad
Hannah [sad]: 真的对不起。这是我的错。
Hannah [determined,insist]: 别人可能会说很多不一样的话。可是，你应该知道发生了什么。
Hannah [sad,explain]: 和我一起去的人没有做错。他是在那个时候，做了应该做的事。
Hannah [sad]: 你的爸爸妈妈死了，是因为一个年轻人想做坏人，也因为我做错了事。
camera listener Alden over 0.65
express Alden sad
I: 她的眼睛里有眼泪。我的眼前，也越来越不清楚。
choice grief
option stop "想让自己不要哭。" -> stop
option pillow "把脸转过去。" -> pillow
label stop
I: 我想让自己不要哭。可是，我做不到。心里那种难受，怎么也停不下来。
goto tears
label pillow
look Alden away
I: 我不想让她看我的脸。可是，我已经开始哭了。
label tears
I: 我哭了。就像第一次听说爸爸妈妈死了的时候一样。
I: 身体到处都疼。我哭得枕头都湿了。我不知道自己还能怎么办。
show Amanda worried far-right
rest Amanda attentive
camera action Alden Hannah cut
I: 护士马上跑了进来。
Alden [angry,insist]: 出去！别管我！
I: 我叫得太大声，连喉咙都疼了。
move Hannah exit
camera two Alden Amanda cut
I: 她跑出去了。那个让我活下来的人，好像我对她做了什么可怕的事，跑开了。
look Amanda Alden
I: 护士却走过来，小声跟我说话，想让我好过一点。
camera listener Alden over 0.65
express Alden sad
look Alden away
I: 我明明叫她们走。可是，跑走的人，我想让她在这里。还在这里的人，我却想让她走。
I: 我想要什么，连自己都不能说清楚。她已经跟我说清楚了事情。现在，她却走了。
end
