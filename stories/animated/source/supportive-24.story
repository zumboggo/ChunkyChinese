story 2
label opening
scene kitchen
show Alden neutral center
camera medium Alden cut
I: 门外有猫叫。我马上站起来，去开门。
label watch_24_opening_1
I: 有点其他事做，真好。我不想再想下去了。
label watch_24_opening_2
Alden: 维克多，今天晚上，你愿意来我这里了？
label watch_24_opening_3
Alden: 外面又冷，天气又不好。你为什么还要出去呢？
label watch_24_opening_4
choice arrival
option company "看看来找我的猫。" -> company
option weather "看看外面的天气。" -> weather
label company
I: 刚才，只有我一个人。现在，至少还有它。
label watch_24_company_1
goto victor
label weather
I: 这样的天气，我可不想出去。不过，它已经回来了。
label watch_24_weather_1
label victor
I: 它是一只橘色的猫。身体上，还有以前受伤的地方。
label watch_24_victor_1
I: 我给它起名叫维克多。我喜欢想，它和其他猫打过很多次，而且赢了。
label watch_24_victor_2
I: 它在我旁边走来走去，一直叫，还掉了好多毛。
label watch_24_victor_3
I: 我低下头，摸摸它耳朵后面。它要吃晚饭了。
Alden: 来，给你找点吃的。
label watch_24_victor_5
label cupboard
I: 我打开柜子。猫吃的东西一直放在这里，可是现在没有了。
label watch_24_cupboard_1
I: 不对啊。我记得很清楚，应该还有好几罐。
label watch_24_cupboard_2
I: 上次买那些小虫的时候，我也在那家店给它买了吃的。
label watch_24_cupboard_3
choice missing
option remember "再想想上次买的东西。" -> remember
option moved "也许阿姨拿到其他地方了。" -> moved
label remember
I: 我明明买了。怎么现在一点也没有？
label watch_24_remember_1
goto search
label moved
I: 也许东西还在，只是放在其他地方了。先找找看。
label watch_24_moved_1
label search
I: 我又到其他地方找，连抽屉也打开了。
label watch_24_search_1
I: 我又看了冰箱。也没有。那些吃的到底在哪里？
label watch_24_search_2
I: 也许她走以前，给猫吃了太多，然后把空罐子扔了。
label watch_24_search_3
I: 我连垃圾都找了，还是没有。什么都没有。
label watch_24_search_4
label suspect
I: 难道她拿错了，把猫吃的东西也带走了？
label watch_24_suspect_1
I: 我又看了一眼那条有老虎花纹的短裤。
label watch_24_suspect_2
I: 穿那个东西的人，不会把猫吃的东西拿走了吧？
label watch_24_suspect_3
choice suspect
option aunt "也许是阿姨拿错了。" -> aunt
option shorts "再看一眼那个东西。" -> shorts
label aunt
I: 我不知道她做了什么。现在，只能问她。
label watch_24_aunt_1
goto message
label shorts
I: 我连那个人是谁都不知道。当然，也不知道是不是他拿的。
label watch_24_shorts_1
label message
I: 我拿出手机，给阿姨写了一条消息：猫粮在哪里？
I: 她没有马上给我消息。猫还在等。
label watch_24_message_2
choice waiting
option phone "再看看手机。" -> phone
option cat "先看看还没吃饭的猫。" -> cat
label phone
I: 现在还没有消息。可我不能让它一直等下去。
label watch_24_phone_1
goto dinner
label cat
I: 它还没有吃晚饭。这件事，我必须先想个办法。
label watch_24_cat_1
label dinner
I: 我给了它一小块午餐肉，先让它有点吃的。
label watch_24_dinner_1
label shower
I: 洗澡以后，我又看了一次手机。
I: 我又写了一条消息：阿姨？猫粮呢？
label watch_24_shower_2
I: 还是没有消息。
label watch_24_shower_3
label ending
I: 我站在自己的房间里，用毛巾擦头发。
I: 先不要觉得都是她不好。我一边擦，一边努力这样想。
label watch_24_ending_2
end

