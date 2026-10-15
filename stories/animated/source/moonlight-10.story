story 2
variable curious = false hidden
variable money = false hidden
label opening
scene hall
ambience hall
environment dust
show Hyun determined left
show Dummy neutral right
prop Hyun sword
look Hyun Dummy
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 steady
I: 我还在练习。那个稻草人，好像也怕了。
I: 是我看错了吗？剑又打了下去。
move Dummy exit
show Watcher confused right
move Watcher turn
camera medium Watcher
Watcher [confused]: 为什么一直打这个东西？
Watcher [skeptical]: 想学会打，出去打兔子不是更好吗？
express Hyun embarrassed
look Hyun away
camera listener Hyun over 0.65
I: 大家又在说我了。我不能离开城市，又能去哪里呢？
camera medium Watcher
Watcher [skeptical]: 你看，只是一直打。好像在生气。
move Hyun exit
show Pluto neutral left
look Pluto Watcher
look Watcher Pluto
camera two Pluto Watcher cut
I: 一个骑士也开始说话了。
Pluto [neutral, explain]: 也许是想让属性变好。
express Watcher surprised
camera listener Watcher over 0.6
Watcher [surprised]: 只打这个东西，也能变强？
camera medium Pluto
Pluto [neutral]: 对，可以。
I: 这个人叫普鲁托。等级不低，知道的也多。
camera medium Watcher
Watcher [curious, question]: 那为什么大家还要那么累，去升级？
camera medium Pluto
Pluto [neutral, explain]: 身体一直用，体力就会慢慢变好。
Pluto [neutral]: 用魔法也是一样。一直用，也会变。
Pluto [neutral]: 可是，打半天，可能只多一点、两点。
Pluto [neutral]: 等级每升一级，却能多五点。
express Watcher skeptical
react Watcher shake-head
camera listener Watcher over 0.6
I: 旁边一个女人觉得，这样做真是太傻了。
move Watcher exit
show Hyun determined right
move Hyun turn
prop Hyun sword
look Hyun Pluto
camera listener Hyun over 0.6
choice question
option reason "想听听，这样做到底有什么用。" -> reason ; curious = true
option wait "先不想别人的话。" -> wait
label reason
Hyun [curious]: 这个人知道我的想法吗？
goto benefit
label wait
Hyun [determined]: 一点、两点，也是我一直练习得到的。
label benefit
move Hyun exit
show Watcher skeptical right
move Watcher turn
look Watcher Pluto
camera medium Pluto
Pluto [determined, insist]: 不，这样做有用。
express Watcher surprised
camera listener Watcher over 0.6
Watcher [surprised]: 什么？
camera medium Pluto
Pluto [neutral, explain]: 等级越高，再改变就越难。
Pluto [neutral]: 打比自己差的怪物，得到的经验很少。
Pluto [neutral]: 一开始就多练习，以后打起来更容易。
Pluto [neutral]: 今天做的事，以后一直会有用。
camera two Pluto Watcher cut
Watcher [curious]: 那你也这样做过吧？大家知道了，不都会来吗？
express Pluto skeptical
react Pluto shake-head
camera listener Pluto over 0.6
Pluto [skeptical]: 不一定。知道，不是说就会去做。
camera medium Pluto
Pluto [neutral, question]: 为了多一点力量，你愿意打十个小时吗？
express Watcher embarrassed
rest Watcher downcast
look Watcher down
camera listener Watcher over 0.6
I: 刚才问得很快的人，现在不说话了。
camera medium Pluto
Pluto [neutral]: 而且，不能一直这样变强。这个东西太差了。
Pluto [neutral]: 我想，力量最多也就多四十点吧。
Pluto [skeptical]: 要打至少一个月。你愿意吗？
Pluto [disappointed]: 我做几天，就不想做了。
camera medium Watcher
react Watcher nod
Watcher [neutral]: 我还是想找个好用的武器。
I: 能让你多四十点力量的东西，不是哪里都有，却也不难找到。
camera medium Pluto
Pluto [neutral]: 这对不能离开城市的新人有用。
Pluto [neutral]: 以前也有人这样做，后来不做了。
Pluto [disappointed]: 太没意思，也太累了。
move Watcher exit
show Hyun frustrated right
move Hyun turn
prop Hyun sword
look Hyun Pluto
camera listener Hyun over 0.65
I: 没意思？我听着，心里却不这样想。
choice reward
option progress "想想自己一点点变强。" -> progress
option earn "想想以后可以得到更多钱。" -> earn ; money = true
label progress
Hyun [determined]: 今天比刚来时强一点，这就很好。
goto return
label earn
Hyun [determined]: 现在多做一点，以后就能多得到一点。
label return
move Pluto exit
move Hyun left
show Dummy neutral right
look Hyun Dummy
camera action Hyun Dummy cut
perform Hyun sword-strike Dummy repeat 3 steady
I: 我更用力地打下去。
if curious == true -> understood else kept
label understood
camera listener Hyun over 0.6
Hyun [relieved]: 刚才想知道为什么。原来，也有人觉得这样做有用。
goto purpose
label kept
camera listener Hyun over 0.6
Hyun [determined]: 刚才不想听别人的话。现在，我还是做自己的事。
label purpose
if money == true -> cash else growth
label cash
Hyun [determined]: 身体更强，就能打更强的怪物，也能得到更多钱。
goto joy
label growth
Hyun [happy]: 一点点变强，以后能做的事就更多了。
label joy
Hyun [happy]: 大家觉得没意思。我却从来没有这么开心。
move Dummy exit
show Instructor proud right
move Instructor turn
look Instructor Hyun
camera two Hyun Instructor cut
I: 我还是在练习。教官一直在看我。
camera listener Instructor over 0.65
express Instructor proud
rest Instructor attentive
react Instructor nod
I: 大家只觉得这样太累。教官的眼里，却是满意。
end
