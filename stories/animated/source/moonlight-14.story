story 2
variable stone = false hidden
variable trust = false hidden
label opening
scene hall
ambience hall
show Hyun happy left
show Instructor curious right
activity Hyun eat steady
camera two Hyun Instructor cut
I: 我以为教官不会再说这个了。他却还在想那种本事。
look Instructor Hyun
Instructor [curious]: 不过，有个问题，我一直想不明白。
Instructor [neutral]: 听说，有个人很会做这种东西。
Instructor [curious]: 他做过一样东西，用的是月光。
camera listener Hyun over 0.65
activity Hyun pause
express Hyun surprised
Hyun [surprised]: 月光？天上月亮的光？
camera listener Instructor over 0.65
react Instructor nod
Instructor [neutral]: 对。他把它做成了东西。
camera two Hyun Instructor cut
choice moon
option pebble "会不会只是一块小石头？" -> pebble ; stone = true
option light "光也能拿在手里吗？" -> light
label pebble
Hyun [happy]: 教官，也许只是个像月亮的小石头吧？
Instructor [curious]: 你也觉得，不是真的光？
goto doubt
label light
Hyun [curious]: 可是，光怎么能拿在手里呢？
Instructor [curious]: 所以，你也不相信？
Hyun [happy]: 也许是块小石头，看起来很像而已。
label doubt
activity Hyun resume
camera medium Hyun
react Hyun shrug
Hyun [happy]: 听来的话，说的人多了，就不一定还是原来的意思了。
Hyun [skeptical]: 那种小本事，怎么可能做到？
camera listener Instructor over 0.65
express Instructor curious
Instructor [neutral]: 你说得也对。可是，说这话的人，我很了解。
camera two Hyun Instructor cut
Hyun [curious]: 您是听谁说的？
Instructor [proud]: 以前做我这个工作的人。他叫梅利姆。
Instructor [proud]: 他现在是国王的骑士。
camera listener Hyun over 0.65
express Hyun surprised
Hyun [surprised]: 原来，您是听他说的。
I: 我刚才还在笑。教官说到这个人，却认真起来了。
camera two Hyun Instructor cut
Instructor [curious]: 所以，我还是想知道，到底是不是真的。
Hyun [curious]: 您想去看看？
Instructor [neutral]: 我想请你帮我，去问个明白。
camera listener Hyun over 0.65
express Hyun surprised
Hyun [surprised]: 请我？
camera two Hyun Instructor cut
choice reason
option trusted "您为什么这么相信我？" -> trusted ; trust = true
option sword "可是，您不是最喜欢剑吗？" -> sword
label trusted
Hyun [curious]: 您为什么这么相信我？
Instructor [happy]: 你对剑这么认真，我相信你是个可以放心的人。
goto request
label sword
Hyun [curious]: 可是，您不是最喜欢剑吗？
Instructor [determined]: 当然！那种本事，怎么也比不上剑。
Instructor [curious]: 可是，我不喜欢，也可以想问个明白吧？
label request
camera medium Instructor
Instructor [neutral]: 雕刻当然比不上我们的剑。不过，听来的事也要问清楚。
Instructor [happy]: 你是个可以相信的人，所以我请你帮忙。
camera listener Hyun over 0.65
express Hyun neutral
Hyun [curious]: 您想知道的，是有没有人真的做到了，对吗？
camera listener Instructor over 0.65
react Instructor nod
Instructor [happy]: 对。如果你愿意帮忙，我会很开心。
camera two Hyun Instructor cut
activity Hyun stop
sound chime
I: 这时候，眼前出现了任务。
camera medium Hyun
I: 去过王宫的人，真的做到了吗？任务要我去问清楚。
I: 任务有多难？E级。
I: 接到这个任务，要和教官有很好的交情，还没有学过这种本事。
I: 还要认真练习用剑，让教官觉得我这个人可以相信。
if stone == true -> stoneReturn else lightReturn
label stoneReturn
Hyun [curious]: 刚才还在说那不是真的，现在变成任务了。
goto finalReason
label lightReturn
Hyun [curious]: 刚才还在问，光怎么能拿在手里。现在，问题到了我手里。
label finalReason
if trust == true -> trustReturn else swordReturn
label trustReturn
I: 教官说相信我，现在真的请我帮忙了。
goto ending
label swordReturn
I: 教官还是最喜欢剑，却请我去问雕刻的事。
label ending
camera two Hyun Instructor cut
look Instructor Hyun
I: 教官在等我说话。我还没有接这个任务。
end
