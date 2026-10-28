story 2
variable water = 6 range 0 40 visible
scene home
show Jonathan curious left
show Min worried center
show Mother determined right
camera two Min Mother cut
I: Min看着记录，没有提前走。他还记得最后一家。
Mother [curious, question]: 要帮忙吗？我们可以一起搬。
Min [determined, explain]: 我答应捎水。我可以负责。
Mother [determined, explain]: 我问你要不要帮忙，不是叫你说明自己多好。
choice start
option record "首先，检查谁要接到水。" -> record
option people "妈妈，你知道他们在哪里吗？" -> people
label record
Min [determined, explain]: 从前答应怎样分水，记录还在。我没有偷偷改变。
goto road
label people
Mother [determined, explain]: 知道。我陪你们去。不管怎样，从前答应的话还要负责。
goto road
label road
I: 我们捎着4桶水出发，分别送给记录上的人。没有提前给谁多分。
Min [worried, explain]: 最后一家还在等。他们害怕我们不来了。
Jonathan [determined, explain]: 那就去说明：我们还在路上。
camera two Jonathan Mother cut
Mother [determined, explain]: 我先去说明。你们慢慢来，不要为了赶路冒险。
choice pace
option rest "先停下来，检查安全不安全。" -> rest
option share "我陪Min一起搬，我们一起负责。" -> share
label rest
Min [worried, question]: 你不相信我可以负责了吗？
Jonathan [determined, explain]: 停，不表示失败。我们还记得从前的教训。
goto door
label share
Min [worried, explain]: 我本来想，不叫别人帮忙，他们就会相信我。
Jonathan [determined, explain]: 我们要捎水，不是要表扬。
goto door
label door
camera wide
I: 最后一家门前有石头。妈妈回来了，叫我们先把水放好。
Mother [determined, explain]: 这里不好走。我们一起看，别偷偷冒险。
react Jonathan crouch
I: 我检查石头旁边的路。Min还紧紧抓着桶。
rest Jonathan attentive
camera two Jonathan Min cut
choice burden
option ask "Min，叫我帮忙，不表示你失败了。" -> ask
option offer "我们一起搬。你说什么时候停。" -> offer
label ask
Min [sad, explain]: 我害怕叫人帮忙，别人就叫我走。
goto request
label offer
Min [worried, question]: 我说停，你真的会停吗？
Jonathan [determined, explain]: 会。你看着路，我听你的声音。
goto request
label request
camera two Min Mother cut
Min [worried, question]: 你为什么还愿意陪我？
camera listener Min over 0.65
Mother [determined, explain]: 因为我需要你帮忙，不是需要你证明自己。
rest Min attentive
I: Min慢慢点头。他不再偷偷冒险了。
camera two Jonathan Min cut
Min [determined, explain]: Jonathan，陪我一起搬。这里要慢慢来。
Jonathan [relieved, explain]: 好。没有人需要一个人负责所有事。
camera wide
I: 我们分别抓好桶的两边，妈妈在旁边帮忙看路。没有人抢着走。
Min [determined, explain]: 停。先放下来。
I: 我们一起停，把水放好。最后一家的人出来了。
Mother [determined, explain]: 我们来了。先检查记录，再接水。
I: 所有人检查好了。4桶水都交给了记录上的人，谁也没有偷偷多拿。
choice receipt
option check "一起检查最后的记录。" -> check ; water -= 4
option confirm "请接到水的人也确认。" -> confirm ; water -= 4
label check
Min [determined, explain]: 4桶都交好了。站里少了4桶，是捎给他们，不是丢了。
goto done
label confirm
Mother [determined, explain]: 他们确认了。我们仍然保留从前答应的分水，不偷偷改。
goto done
label done
camera two Min Mother cut
Min [curious, question]: 今天，你相信我了吗？
Mother [determined, explain]: 今天，你来了。下次，也要来。
Min [relieved, explain]: 好。下次，我会提前叫人帮忙。
camera wide
I: 我们一起回去。风渐渐大了，外面的管子还等着我们保护。
Jonathan [determined, explain]: 水捎到了。接下来，我们一起保护管子。
end
