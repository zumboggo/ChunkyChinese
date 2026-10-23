story 2
label opening
scene home
ambience none
show Hyun surprised left
show Attendant neutral right
look Hyun front
look Attendant Hyun
camera listener Hyun cut
I: 老侍女刚讲完，我眼前出现了过去的画面。
I: 一个男孩拿着小刀，用木头雕刻一个女孩。
I: 女孩不好意思地看着他认真地雕刻。
I: 男孩把做好的雕像给了她。
I: 他答应，有一天，要送她世界上最美的雕像。
choice promise
option gift "我看看她手里的礼物。" -> gift
option boy "我看看那个认真的男孩。" -> boy
label gift
I: 那只是木头做的，却和她一样。她开心地收下了。
goto years
label boy
I: 他现在只能用木头雕刻，却已经想着以后要送她什么。
label years
I: 后来，她成了王后，却不快乐。
I: 他回来了。可手里是剑，不是小时候的小刀。
express Hyun sad
I: 她以为，他不记得约定了。那个约定，对她来说就是一切。
I: 后来，那些人来杀国王和王后时，他手里的剑，让月光跳起了舞。
express Hyun surprised
I: 画面结束了。新的消息出现在眼前。
I: 任务完成！扎哈布完成了小时候的约定。
I: 原来，他已经是一位雕刻大师。
I: 我的等级，从一级变成了三级！
choice reward
option levels "一次任务，我就从一级到了三级？" -> levels
option power "原来雕刻也能变得这么强。" -> power
label levels
I: 我还没开心多久，又一条消息出现了。
goto offer
label power
I: 我刚见过那种力量，新的消息就来了。
label offer
I: 我可以选择一个隐藏职业：月光雕刻师。
I: 这个职业，有一般职业学不到的技能。
I: 很多人到处找隐藏职业，可真正找到的，一千个人里，也不到一个。
express Hyun skeptical
I: 这么少见的职业，就在我眼前。
choice consider
option skill "我想想那些特别的技能。" -> skill
option money "我想想自己最需要什么。" -> money
label skill
I: 那些技能也许很有意思。可是，有意思就能赚钱吗？
goto refuse
label money
I: 我来这里，是为了赚钱。少见，也不一定能赚钱。
label refuse
express Hyun determined
look Hyun front
Hyun [determined]: 我拒绝。
I: 消息又问了一次：真的不选择月光雕刻师吗？
Hyun [determined]: 我拒绝。
I: 我可不想一直在小房间里，做别人不想买的雕像。
I: 就算学好了会很有意思，我也需要一个能赚钱的职业。
camera two Hyun Attendant cut
look Hyun Attendant
express Attendant curious
I: 我回过神来，老侍女还在看我。
Hyun [happy]: 故事真好。谢谢您愿意讲给我听。
Attendant [happy]: 不用客气。能把他们的故事讲给别人，我也很开心。
Attendant [happy]: 年轻人，我想送你一个小礼物。你愿意收下吗？
choice present
option polite "人家好心送我，怎么能不收？" -> polite
option useful "礼物，可能对我有用。" -> useful
label polite
I: 这么好心的礼物，我当然要好好谢谢她。
goto accept
label useful
I: 还不知道是什么呢，先拒绝可不聪明。
label accept
Hyun [happy]: 我很愿意。谢谢您！
express Attendant happy
camera listener Hyun over 0.5
I: 隐藏职业，我可以不要。送到手边的礼物，我可不会拒绝。
I: 她要送我的，到底是什么？
end
