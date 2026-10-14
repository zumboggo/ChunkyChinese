story 2
variable joke = false hidden
variable family = false hidden
label opening
scene home
show Hyun determined center
camera medium Hyun
I: 我叫李贤。今天，我终于是大人了，可以好好工作了。
camera medium Hyun
Hyun [determined]: 每天工作，工作，再工作。身体会不会太累？
I: 我把新的身份证放在钱包里。家里需要钱。
camera wide
I: 回到家，我听到奶奶的声音。她身体不好，躺在床上休息。
move Hyun left
show Grandma worried right
rest Grandma downcast
camera close Grandma
Grandma: 回来了？
camera medium Hyun
Hyun [worried]: 妹妹呢？
camera close Grandma
Grandma: 出去了，还没回来。你是她哥哥，要照顾她啊。
choice answer
option promise "我会照顾她的。" -> promise ; family = true
option gentle "她那么聪明，不会有事的。" -> gentle
label promise
camera medium Hyun
Hyun [determined, reassure]: 我会努力的。她应该去大学学习。
I: 可是，努力这两个字，不能拿去买药。
goto homeEnd
label gentle
camera medium Hyun
Hyun [happy, reassure]: 也许以后，是她照顾我呢。
I: 我笑了一下。可是，我还是希望她能去大学学习。
goto homeEnd
label homeEnd
camera close Hyun
I: 父亲和母亲已经死了。这个家，只有我们这些人。
I: 奶奶照顾我们那么多年。现在，应该是我照顾她了。
camera medium Hyun
Hyun [sad]: 明天就去找工作。
label computer
move Grandma exit
camera wide
move Hyun right
I: 我回到自己的房间，打开旧电脑。它很慢，可是还能玩我最喜欢的游戏。
camera medium Hyun
Hyun [happy]: Continent of Magic。又见面了。
I: 在这里，我叫 Weed。我一个人玩，一个人变强。
camera medium Hyun
camera medium Hyun
Hyun [proud]: 我的等级已经不能再高了。最可怕的对手，我都能赢。
I: 在游戏里，我什么都有。可是，家里连看医生的钱都没有。
camera medium Hyun
Hyun [disappointed]: 玩新游戏需要很多钱。那些钱，还是给家人用。
I: 明天开始，我要把时间用来工作。今晚，我打算删除游戏账号。
camera medium Hyun
Hyun [worried]: 删除以后，就真的没有了。
choice goodbye
option proud "最后再看看我的东西。" -> proud ; joke = true
option quiet "想想家里需要的钱。" -> quiet
label proud
camera medium Hyun
Hyun [proud]: 卖了这些好东西，能买找工作穿的衣服吗？
camera medium Hyun
Hyun [laughing]: 游戏里的高手，连衣服钱都要算。
goto delete
label quiet
camera medium Hyun
Hyun [sad]: 药要钱。去大学学习要钱。什么都要钱。
I: 这个游戏，我玩了那么久。现在，我一时没有动。
goto delete
label delete
camera close Hyun
I: 电脑问我：真的要删除吗？
I: 我的手停了下来。
camera wide
camera medium Hyun
Hyun [surprised]: 等等。有人会买游戏账号，对不对？
camera medium Hyun
Hyun [excited]: 如果有人愿意买，为什么要删除？
label listing
camera medium Hyun
I: 我找到一个买卖游戏账号的地方。我得给钱，然后就可以看别人卖多少钱。
camera medium Hyun
Hyun [skeptical]: 还没卖东西，就要给钱？不行。
I: 我给大家看自己的游戏。等级，东西，全都看得清楚。
camera medium Hyun
Hyun [curious]: 从50,000韩元开始。要的钱太多，也许没人买。
I: 我开始拍卖。谁愿意给更多的钱，谁就可以买走它。
camera medium Hyun
Hyun [determined]: 只等一天。明天找工作，我需要衣服。
choice hope
option clothes "希望能买衣服。" -> clothes
option medicine "希望还能买点药。" -> medicine
label clothes
if joke == true -> clothesJoke else clothesPlain
label clothesJoke
camera medium Hyun
Hyun [happy]: 好，游戏高手。最后帮我买衣服。
goto posted
label clothesPlain
camera medium Hyun
Hyun [determined]: 穿得好一点，应该容易找到工作。
goto posted
label medicine
if family == true -> medicinePromise else medicinePlain
label medicinePromise
camera medium Hyun
Hyun [worried]: 我说了要照顾家人。从买药开始。
goto posted
label medicinePlain
camera medium Hyun
Hyun [worried]: 她已经生病好几天。希望这次能帮助她。
goto posted
label posted
camera wide
camera medium Hyun
Hyun [relieved]: 好了。现在，就等有人来买。
I: 我没有删除账号。我让别人来买。
camera close Hyun
camera medium Hyun
Hyun [neutral]: 明天早上，还要去找工作呢。
I: 我去睡觉了。不知道有没有人愿意出50,000韩元。
end
