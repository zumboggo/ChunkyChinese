story 2
label opening
scene hospital
show Alden sad left
rest Alden seated
orient Alden front
camera listener Alden cut
I: 两个星期了。我还在医院里，外面又在下雨。
I: Wummy就在我旁边。它是我的玩具，一直跟我在一起。
I: 游戏机叫了一声。我马上把它关掉。我的耳朵里，也一直有这样的声音。
I: 那天晚上，我家出了事。我受伤了，爸爸妈妈再也没有回来。
I: 一位女英雄救了我。可是，谁来跟我说清楚，到底出了什么事？
choice waiting
option window "看看外面。" -> window
option wummy "看看旁边的Wummy。" -> wummy
label window
I: 外面一直在下雨。这里什么都不对，连安静的时候也不对。
goto visitor
label wummy
I: 它还在这里。那天晚上，她连它也一起带走了。
label visitor
show Amanda worried right
camera two Alden Amanda cut
Amanda [worried,reassure]: 有人来看你。不过，你不想见她也没关系。
Alden [curious,question]: 谁？
Amanda [neutral]: 那位女英雄。
camera listener Alden over 0.6
I: 我一下子不动了。那天晚上的房间，又回到了我的眼前。
I: 她把我放在一个银色的球里。我不疼了，却不能动，也不能说话。
I: 她写给我看：你很安全。我们会带你去一个安全的地方。
I: 我心里一直在问：爸爸妈妈呢？你也带走他们了吗？
camera two Alden Amanda cut
Amanda [worried,reassure]: 我可以请她回去。就算她是英雄，也不能想做什么就做什么。
Alden [determined,insist]: 我想见她！她在哪里？
Amanda [neutral,reassure]: 她在下面等。等一下，我去请她上来。
I: 她知道那天晚上的事。也许，她会把事情说清楚。
scene hall
show Hannah worried center
rest Hannah guarded
camera listener Hannah cut
I: 门外，她也在等。她觉得自己早就应该来看这个孩子了。
I: 她本来想先找到他的家人，问过以后再来。可是，他们一直找不到。
I: 现在，她得走进那个房间。她不知道该怎么面对他。
scene hospital
show Alden curious left
show Hannah worried right
rest Alden seated
rest Hannah attentive
look Alden Hannah
look Hannah Alden
camera two Alden Hannah cut
I: 护士终于让我们说一会儿话。她走进来，却没有马上走近。
Hannah [worried,hesitant]: 我来看你。可以吗？
choice permission
option nod "点点头。" -> nod
option welcome "点点头，看看她。" -> welcome
label nod
react Alden nod
I: 我点点头。她这才走到床边，在椅子上坐下。
goto settling
label welcome
react Alden nod
I: 我看看她，点点头。她没有再等，走过来坐在床边。
label settling
rest Hannah seated
camera two Alden Hannah cut
I: 椅子发出了声音。我们看看对方，一时间谁也没说话。
Hannah [embarrassed,hesitant]: 你还记得我吗？那天晚上，我和另一个人……
Alden [neutral]: 我记得。
I: 我怎么会不记得呢？
Hannah [worried,question]: 现在感觉怎么样？身体好些了吗？
Alden [neutral]: 我还好。就是耳朵里一直有声音。他们还要看看我的肚子。
Hannah [sad,reassure]: 那块金属从窗户进来，让你受伤了。一定很疼。真的对不起。
choice metal
option curious "我想知道那是什么。" -> curious
option unseen "我一直不知道它是什么样子。" -> unseen
label curious
Alden [curious,question]: 那到底是什么？我都没见过。
goto ask
label unseen
Alden [neutral]: 我一直不知道那块东西是什么样子。
label ask
Hannah [confused,question]: 什么东西？
Alden [curious]: 让我受伤的那块东西。我想看看，可是这里没有人知道它在哪。
camera listener Hannah over 0.6
I: 她看了我一会儿。没有说小孩子不应该问这些，也没有叫我别想了。
Hannah [neutral,reassure]: 我明白。我也会想看。不过，他们可能已经不要它了。
Hannah [curious,question]: 你想让我问问吗？
camera listener Alden over 0.6
Alden [determined]: 想。也帮我问问，能不能把它给我。
I: 跟她说话，原来没有那么难。
camera two Alden Hannah cut
Hannah [happy,reassure]: 好。我会问的。我看得很清楚，应该是一块锯片。
Alden [surprised,question]: 锯片？
Hannah [neutral,explain]: 对，有这么大。
react Hannah point
I: 她用手比了一下。我低头看了看自己的肚子。
choice scar
option direct "让她看看伤疤。" -> direct
option purple "先说那道紫色的伤疤。" -> purple
label direct
Alden [curious,question]: 你想看看我的伤疤吗？
Hannah [surprised,question]: 什么？
Alden [neutral]: 那块锯片造成的。是紫色的。
goto scaranswer
label purple
Alden [curious]: 那里有一道紫色的伤疤。你想看看吗？
Hannah [surprised,question]: 你是说，那块锯片造成的？
Alden [neutral]: 对。你想看吗？
label scaranswer
camera listener Alden over 0.65
express Alden curious
Hannah [happy,reassure]: 当然想看！
I: 她笑了。我让她看了看那道长长的伤疤。
express Alden happy
I: 医生和护士都说它很不错。现在，我想听听她怎么说。
camera two Alden Hannah cut
Hannah [happy,explain]: 对我们来说，有意思的伤疤就像收藏品。你这个很不错。
Alden [relieved]: 现在已经不怎么疼了。
camera listener Alden over 0.65
I: 她没有觉得小孩什么都不明白。这一会儿，我们终于能好好说话了。
express Alden curious
I: 可我还有最重要的问题没有问。那天晚上，爸爸妈妈到底出了什么事？
end
