story 2
label opening
scene kitchen
show Alden neutral center
camera medium Alden cut
I: 今天，我一直很不高兴。杰里米想让我开心一点，可是没有用。
I: 晚上七点，我回到家，看见冰箱上阿姨写的话。
I: 她去加州了。她说，只是和朋友出去几天，还买了吃的东西。
I: 有事就给她打电话。她就这样走了，只有我一个人在家。
choice note
option gone "再想想她说的几天。" -> gone
option food "看看她说买了什么。" -> food
label gone
I: 几天。她写得那么简单，好像这不是什么问题。
goto protest
label food
I: 买了吃的，就可以走了吗？我看那些话，越来越生气。
label protest
Alden: 你知道，你不能这样做。
I: 我把她的留言拿下来，不想再看，就把它扔了。
label reason
I: 先别生气。慢慢想。最不好的结果，到底会是什么？
I: 我快十六岁了。我不是以前那个小孩子了。
I: 爸爸妈妈给我的钱，还有他们死后得到的钱，都有一部分是我的。
I: 那不是很多钱，可我还有以后上学能用的钱。
choice safety
option money "想想自己能用的钱。" -> money
option age "想想自己快多大了。" -> age
label money
I: 有了这些钱，应该能让我照顾自己。至少，我不会什么都没有。
goto future
label age
I: 再过几个月，我就更大一点了。他们也应该听听我自己的想法。
label future
I: 如果真的出了问题，法官也许会让我自己生活，不用再让大人照顾。
I: 我不想因为阿姨总是这样离开，就被送到别人家里，让不认识的人照顾我。
label memory
I: 可是，我小时候，有一次差一点就被送走了。
I: 那次，阿姨也这样走了。住在旁边的人发现了。
I: 他问我，是不是一个星期，家里都没有大人。
I: 我说不是。我说，阿姨只是晚上在外面工作。
I: 那不是真的。他也没有相信我的话。
label vacation
I: 没事了。都过去了。我又在心里对自己说了一次。
I: 家都是我的，没有别人。这样想，也有一点像不用上学的好日子，对吧？
label fridge
I: 我打开冰箱。里面有一个袋子，吃的东西还全在里面。
I: 有面包，有放在面包里吃的东西，还有几个很小的果汁瓶。
label bread
I: 我看了好一会儿。那些小瓶子在上面，把面包压扁了。
I: 她连里面的东西，都没有拿出来，好好地放在该在的地方。
choice bread
option flat "看看下面的面包。" -> flat
option bag "看看买来的东西。" -> bag
label flat
I: 面包本来应该好好的。现在，全在下面，变得那么小了。
goto anger
label bag
I: 把这些东西拿出袋子，能花多少时间呢？她连这点时间都没有吗？
label anger
I: 这件事好像不应该让我这么生气。可是，我就是很生气。
label dinner
I: 我煎了肉，一边吃，一边小声说着不高兴的话。
I: 别一直想那些不好的地方。我又不是今天才知道，家里是什么样子。
label bills
I: 用电的钱还没有付，账单就在微波炉上。晚了，也不是什么大事。
I: 阿姨用过的那些杯子，还没有洗。洗一洗，几分钟就好了。
label shorts
I: 客厅里，还有一条老虎花纹的短裤。
I: 那一定不是我的。我很清楚，这个家里没有我的这种短裤。
choice shorts
option funny "试着觉得它有点好笑。" -> funny
option tired "想想为什么不能笑。" -> tired
label funny
I: 如果我不这么生气，这件事可能还很好笑。老虎花纹，真有意思。
goto ending
label tired
I: 我知道，它有一点好笑。可是知道这件事，也不能让我现在就笑。
label ending
I: 可今天晚上，我就是不能那样想。
I: 以前，阿姨的生活再不好，我也能不去想那些事，不让自己难过。
I: 今天，我却做不到。我也不知道为什么。
end
