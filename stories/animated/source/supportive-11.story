story 2
label opening
scene train
show Alden sad left
rest Alden seated
camera listener Alden cut
I: 系统关掉了。我看窗户外面，房子一座座过去。以前的家，就在这附近。
label watch_train_phone
I: 出事的房子已经重新做好了。那个死过很多人的地方，也和以前一样了。
I: 城市看起来没有伤疤了。至少，眼睛看得见的地方没有。
choice city
option home "想想以前的家。" -> home
option news "想想昨天晚上的消息。" -> news
label home
I: 我还记得房间在哪里。可外面的房子，看起来像什么也没发生过。
goto hero
label news
I: 大家已经在说新的坏人，新的危险了。昨天晚上，又有一个英雄上了电视。
label hero
I: 那个英雄能控制水。他花了一个小时，才让那个能改变地面的坏人停下来。
I: 有些房子进了水，地下让水走的路也出了问题。不过，受伤的人不多，而且很快就能好。
I: 只有那个坏人，还在医院里，需要医生一直在旁边。他差一点死在水里。
I: 大家觉得，这样已经很好了。他救了人。可是，他笑起来好像很累。
I: 我想起第一次去岛上见她的时候。那年我十一岁，带了一本子的问题，什么都想知道。
scene restaurant
show YoungAlden curious left
show Hannah happy right
rest YoungAlden seated
rest Hannah seated
camera two YoungAlden Hannah cut
I: 那时候，我们面对面坐着。我喝草莓奶昔，我们还一起吃薯条。
label watch_restaurant_seat
Hannah [happy,explain]: 以前上大学的时候，老师让我们想想，以后做事，最想记住的是什么。
Hannah [happy,explain]: 我说的是：“很高兴能帮忙！”很多人都这样说，对吧？
Hannah [neutral,hesitant]: 可现在做了一段时间，我想说：“我们还可以做得更好。”
YoungAlden [worried,insist]: 这样说不好。大家不会喜欢这样的英雄。听起来太伤心了。
choice motto
option sad "问她自己会不会伤心。" -> sad
option public "问这话要对谁说。" -> public
label sad
YoungAlden [worried,question]: 你每天这样跟自己说，不会更伤心吗？
Hannah [worried,hesitant]: 也许会吧。可是，我想记住的，不只是做得好的地方。
goto private
label public
YoungAlden [curious,question]: 那你还要这样对大家说吗？
Hannah [neutral,explain]: 不一定。我想，这更像是对我自己说的话。
label private
Hannah [neutral,explain]: 有了超能力，很容易出错。事情发生得太快，你的脑子还没想好，就已经过去了。
Hannah [worried,explain]: 有时候，我们觉得一定会发生的事，却不会发生。自己的能力，还有坏人的能力，都可能比自己大太多。
I: 她拿了一根薯条。刚才我还觉得，这只是想说得好听一点。
label watch_hannah_fry
Hannah [neutral,explain]: 等事情过去，说“我已经很努力了”，很容易。不去看做错的地方，也很容易。
Hannah [sad,hesitant]: 因为错的地方，总是那么多。就算你已经很努力，还是会觉得自己一点用也没有。
choice mistakes
option effort "问已经很努力了还不行吗。" -> effort
option look "问她为什么还要看。" -> look
label effort
YoungAlden [worried,question]: 可是，已经很努力了，还不行吗？
Hannah [sad,reassure]: 我知道你想说什么。努力过，也不一定每件事都做对。
goto choice
label look
YoungAlden [curious,question]: 那你为什么还要去看那些地方？
Hannah [determined,explain]: 我想下次少错一点。哪怕只是少一点，也很好。
label choice
Hannah [determined,explain]: 所以，我想做那个愿意去看的人。这样，下次也许就能少做错一些事。
express YoungAlden worried
camera listener YoungAlden cut
I: 我不再喝东西了。她不是在说怎么让大家喜欢她。
label watch_alden_listens
camera two YoungAlden Hannah cut
Hannah [neutral,hesitant]: 也许我去看了，和我一起做事的人，就不需要看得那么不好受。
Hannah [neutral,explain]: 和力气特别大，或者能控制别人想法的能力比起来，我的能力，让我心里没那么伤心。
YoungAlden [confused,question]: 为什么？这有什么不一样？
I: 她没有直接跟我说为什么。我那时候不明白，可是，这些年，我一直记着她的话。
scene train
show Alden neutral left
rest Alden seated
camera listener Alden cut
I: 她很少站在大家最容易看见的地方。她选的能力，是为了帮助其他英雄。
I: 昨天那个人，常常喜欢跟孩子们玩，也常常帮大家做事。他不是喜欢让别人受伤的样子。
I: 也许，他不开心，是因为最后只能让水进到那个坏人的身体里，才能让他停下来。
I: 这只是我的想法。可那个坏人停下来的地方是大路上，不是在水里。
I: 旁边都是房子。他不能让一个会在地下走的人，想去哪里就去哪里。他需要一个助手。
I: 汉娜就能帮他。等等，这样想不太好。她的球，本来就正好能让那个人不能动。
choice support
option speed "想想能让他更快的人。" -> speed
option distance "想想能从很远的地方帮忙的人。" -> distance
label speed
I: 要是有人让他跑得更快，也许还在那片水旁边，就已经让坏人停下来了。
goto risk
label distance
I: 要是有人能从很远的地方打到坏人，他就不一定要一个人做这些事。
label risk
I: 可是，以前有很多英雄带着助手。后来，助手死得太多了，大家就不愿意再这样做。
I: 有一段时间，他们真的遇到能力很强的坏人，活下来的，只有百分之十二。
I: 本来，他们只是帮没有能力的人离开危险的地方，或者让大家知道别人在说什么。可坏人不会因为这样，就不杀他们。
I: 能力没那么强的人，大多留在那里。有些人让大家看他们的能力，用这样的方法赚钱。很少有人还像她一样，选的都是帮助别人的能力。
I: 这样选，一个人遇到坏人的时候，会更危险。她知道。可是，说到这件事，她的眼睛会亮起来。
scene restaurant
show YoungAlden curious left
show Hannah excited right
rest YoungAlden seated
rest Hannah seated
camera two YoungAlden Hannah cut
Hannah [excited,explain]: 两个人一起打，当然很好。可是，如果一个人的能力，正好能帮上另外一个人呢？
Hannah [happy,explain]: 那就不是两个人加起来那么简单了。你们一起能做到的，会比两个人分开做，多得多！
scene train
show Alden determined left
rest Alden seated
camera listener Alden cut
I: 我看外面的房子。她说的“更好”，不只是再多救一个人。也可能是，让另外一个人不用什么都自己做。
label watch_train_reflection
end
