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
option gift "先看礼物，他到底做出了什么？" -> gift
option boy "先看他的手，小刀怎么动？" -> boy
label gift
I: 那只是木头做的，却和她一样。她开心地收下了。
goto years
label boy
I: 小刀上下动着。他认真做，女孩认真看。
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
option levels "先看等级，这一回赚到了。" -> levels
option power "再想那把剑，雕刻真没用吗？" -> power
label levels
I: 我还没开心多久，又一条消息出现了。
goto offer
label power
I: 刚才的月光那么强，我还能说没用吗？
label offer
I: 我可以选择一个隐藏职业：月光雕刻师。
I: 这个职业，有一般职业学不到的技能。
I: 很多人到处找隐藏职业，可真正找到的，一千个人里，也不到一个。
express Hyun skeptical
I: 这么少见的职业，就在我眼前。
choice consider
option skill "先看能学什么，再决定。" -> skill
option money "先问能不能赚钱，少见不一定好。" -> money
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
I: 月光是很好，可谁会给我钱？
I: 就算学好了会很有意思，我也需要一个能赚钱的职业。
camera two Hyun Attendant cut
look Hyun Attendant
express Attendant curious
I: 我回过神来，老侍女还在看我。
Hyun [happy]: 故事真好。谢谢您愿意讲给我听。
Attendant [happy]: 不用客气。能把他们的故事讲给别人，我也很开心。
Attendant [happy]: 年轻人，我想送你一个小礼物。你愿意收下吗？
choice present
option polite "您愿意送我，我就好好收下。" -> polite
option useful "是什么礼物？我当然愿意。" -> useful
label polite
camera listener Attendant over 0.5
Attendant [happy]: 那就好。这些东西在我这里很久了。
goto accept
label useful
Attendant [happy]: 别急，我拿给你看。
label accept
Hyun [happy]: 我很愿意。谢谢您！
express Attendant happy
camera listener Hyun over 0.5
I: 职业不要，礼物要。这回不用再问，我已经说好了。
I: 她要送我的，到底是什么？
end
