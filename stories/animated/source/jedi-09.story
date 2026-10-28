story 2
variable eastern = 0 range 0 2 hidden
variable mei = true hidden
label opening
scene home
show Jonathan worried left
show Ren worried right
show Mother sad far-right
camera wide
I: Ren在屋子外面等。妈妈答应了，他慢慢走来。
Mother [worried, explain]: 孩子在睡觉。请小声说。
choice opening
option plain "Ren，亲自回答。不要替她说话。" -> plain
option space "你不愿意听的话，我们可以等。" -> space
label plain
Ren [sad, explain]: 是我要求机器再说的。我想，人们会来帮忙。
goto account
label space
camera two Jonathan Mother cut
Mother [determined, explain]: 我愿意听。不过，不要替我回答。
Ren [sad, explain]: 是我要求机器再说的。你没有答应，我还叫它说。
goto account
label account
camera two Ren Mother cut
Ren [sad, explain]: 我会诚实地记录这些事。你可以看，也可以不要。
camera listener Ren over 0.65
Mother [determined, explain]: 我愿意听。不表示我原谅你了。
rest Ren attentive
Ren [sad, explain]: 我知道。
rest Mother seated
I: 他不再要求她回答。妈妈慢慢坐下来。
camera two Jonathan Mother cut
choice support
option help "我们可以怎样帮忙？" -> help
option boundary "谁可以替你回答？" -> boundary
label help
Mother [determined, explain]: 先通知朋友。要帮忙的话，可以去哪里找你们？
goto eastern
label boundary
Mother [determined, explain]: 不可以替我回答。要我的声音，就先和我沟通。
Jonathan [determined, explain]: 好。是你选择，不是我。
goto eastern
label eastern
camera wide
if eastern == 0 -> taken else active
label taken
Jonathan [worried, explain]: 我捎走了钥匙。机器接不到新的要求了。
Ren [determined, explain]: 今天，我在这里等。要帮忙的话，可以来找我。
I: 我们记录了这个消息。钥匙还在我这里。
goto handover
label active
if eastern == 1 -> trusted else shared
label trusted
Jonathan [determined, explain]: 钥匙还在Ren那里。新的要求可以传来。
Ren [sad, explain]: 我还可以开从前的声音。不过，我不会开。今天的要求，我都会记录。
Mother [skeptical, explain]: 我会看记录。相信你，不表示不检查。
goto handover
label shared
Jonathan [determined, explain]: 从前声音的开关锁好了。钥匙在我这里。新的要求还开着。
Mother [determined, explain]: 今天，我愿意帮忙看着。只帮今天。孩子和我一起去安全的屋子。
Ren [determined, explain]: 好。我教你接到要求以后，怎么回答。
I: 她试一试。Ren接到信息，回答了。从前的声音没有传来。
goto handover
label handover
camera two Ren Mother cut
I: Ren记录了从前的选择，向妈妈说明。妈妈没有表示原谅。
Ren [determined, explain]: 这里，我负责。明天要朋友帮忙，我会先和他们沟通，不替他们答应。
scene ravine
show Jonathan curious left
show An determined right
camera two Jonathan An cut
I: 我们慢慢去西边。An走平路，不爬，也不搬东西。
An [determined, explain]: 我们沟通好了。不过，从前牺牲的人和东西，没有回来。
Jonathan [sad, explain]: 我记得。牺牲了什么，答应了什么，我们都要记得。
scene station
show Jonathan curious left
show Min worried right
show An worried far-right
camera two Jonathan Min cut
I: 门修好了。Min在门前看管子。管子里的水还在流。
Min [worried, explain]: 别喝。这里的水，不是给人喝的。
choice question
option water "是你开了这里的水吗？" -> water
option silence "为什么从前没有告诉我们？" -> silence
label water
Min [determined, explain]: 是我。这里的管子是我接的。水流过那边的屋子。
goto motive
label silence
Min [sad, explain]: 我害怕你们说我偷水，不听我为什么开它。
Jonathan [determined, explain]: 我会听。不过，所有的代价，你要说明。
goto motive
label motive
if mei == true -> living else grief
label living
Min [worried, explain]: Mei还活着。她和其他病人，都要凉快的屋子。
goto cool
label grief
Min [sad, explain]: Mei去世了。我救不了她。不过，还有病人要帮忙。
goto cool
label cool
camera listener Jonathan over 0.65
Jonathan [sad, explain]: 我没有忘记她。
I: Min慢慢呼吸。我耐心等他回答。
camera two Jonathan Min cut
Min [determined, explain]: 水在屋子外面的管子里，保护屋子，不让它太热。病人不喝这些水。
An [curious, question]: 水从哪里来？地下还有水吗？
choice inspect
option inlet "先找水从哪里来。" -> inlet
option outlet "先检查水流到哪里。" -> outlet
label inlet
react Jonathan crouch
I: 我检查管子。水是山上水箱里的，不是地下的。
Min [determined, explain]: 上面的水，可以流到下面。不需要开机器。
goto trace
label outlet
react Jonathan crouch
I: 我检查屋子外面的管子。下面有水箱，水都在这里。
An [determined, explain]: 喝水的管子是分开的。我们还要检查上面。
goto trace
label trace
camera wide
I: Min陪我们检查。山上有水箱，屋子外面有管子，下面还有水箱。管子连着它们。
Min [worried, explain]: 上面的水越来越少。没有水补充。下面的水不干净，不能喝。
I: 我们开小门，检查地下的水池。那里没有水，都是干石头。
An [determined, explain]: 从前的声音是录音。从前的水还在流，没有新的水。
camera two Jonathan Min cut
Min [worried, explain]: 是我开了水。不过，我不是水的主人。
I: 管子漏水了。Min叫我们去安全的地方。
Min [worried, explain]: 管子快坏了。我知道。不过，我不敢关。
An [determined, explain]: 不关，管子会破。病人可以先去凉快的山洞，朋友陪他们。
Min [sad, explain]: 好。先通知他们。大家安全了，就关水。
I: Min回去说明。朋友答应帮忙。病人安全移动以后，他回来了。
choice close
option together "我陪你。我们一起关。" -> together
option own "你亲自关。我在这里看着。" -> own
label together
Min [relieved, explain]: 好。你看着管子，我关水。
I: 我点头。Min慢慢关好开关，水停下来。
goto ending
label own
Min [determined, explain]: 我会负责。我来关。
I: Min关好开关。我检查管子，水停了。
goto ending
label ending
camera wide
I: 我们记录了水箱和坏管子。能喝的水没有变多。
An [determined, explain]: 从前答应的事，还要负责。修管子，不表示可以重新分水。
Min [determined, explain]: 明天，我来修。不会偷偷开水了。
Jonathan [determined, explain]: 我们一起修。首先，管子要安全。然后，找能喝的水。
camera two Jonathan An cut
An [curious, question]: 不去找藏起来的人了？
Jonathan [relieved, explain]: 不去了。人就在这里。我们知道要修什么了。
I: 我们记得从前的代价。明天，不管从前选择了什么，我们一起修。
I: 明天，我们一起回来修管子。
end
