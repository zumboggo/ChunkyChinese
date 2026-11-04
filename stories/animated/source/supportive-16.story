story 2
label opening
scene counter
show Alden curious left
show Boe neutral center
show Jeremy worried right
camera wide cut
Alden: 对吧？我上课的时候一直在想，为什么他不能说自己想吃什么。
Alden: 也许有人就是不想让他好过。还有什么原因，我就不知道了。
Boe: 要是他能开口，会不会要一点谁都不想看见的东西？
Jeremy: 也许是人的血。
Alden: 他又不是吸血鬼！
choice lunch
option defend "帮他说说话。" -> defend
option admit "想想我自己想过什么。" -> admit
label defend
Alden: 他什么时候说过自己要喝血了？他什么也没说。
goto cheap
label admit
I: 话是这样说，我自己刚才想过的东西也没好到哪里去。
label cheap
Boe: 不过，用自己的血，一定很便宜。买别人的要多少钱，我就不知道了。
I: 他又用嘴打开一包酱，好像只是在帮我算钱。
Alden: 好，我会想想。你们知道哪里能买到蟋蟀吗？
express Jeremy frustrated
camera listener Jeremy cut
Jeremy: 早上的话不算了。现在你们两个都是最恶心的！
I: 好吧。这次我们两个成了一样的人。
scene lecture
show Alden neutral left
show Jeremy neutral right
rest Alden seated
rest Jeremy seated
camera two Alden Jeremy cut
I: 午饭后，博去上文化课。我们两个学的是怎么把这些特别的话连起来说。
I: 他选这门课，因为下课以后就不用再学了。我选它，却会想起妈妈。
choice future
option mother "想想妈妈走过的路。" -> mother
option hannah "想想汉娜走过的路。" -> hannah
label mother
I: 有一天，我也许会去学医。要是像妈妈一样照顾病人，这门课也许用得上。
goto waiting
label hannah
I: 要是我也能像汉娜一样去救人呢？现在学的东西，也许有一天就用得上。
label waiting
I: 又来了。我一想以后，怎么就把这种事也算进去了？
I: 可我们这个年纪的人不都在等吗？系统大概不会选我，可它也有可能会。
I: 我在一个小垫子上坐好。上面有很多特别的字，可我还是觉得，它就像平时做运动用的那种。
Jeremy: 哎哟！
I: 他一下子坐到我旁边。老师说，今天是我们给，不是我们收。
I: 她要我们把心里的平静送给别人。不用那么大声，声音大也不会让这些话更有力量。
I: 我小声说：“我把心里的平静送给你。”
I: 也许有个人不在我们这个世界，却希望收到它。我不知道有没有用。
choice listen
option there "想想那边的人。" -> there
option here "听听旁边的声音。" -> here
label there
I: 对不起，我今天心里有点乱。这样的平静，给了你，真的能帮到你吗？
goto slip
label here
I: 旁边的人声音很小，一个字一个字地说，听得出他很认真。
label slip
camera two Alden Jeremy cut
I: 杰里米好认真。可有个字他说错了。他刚刚答应把自己的脑子送给别人了。
express Alden embarrassed
camera listener Alden cut
I: 我差点笑了。再一想，他是真的想给。我的话全说对了，可我的心又在哪里？
I: 这一段话我已经会说了。以前我给得多，收得少，今天我就想点自己的事吧。
choice odds
option change "想想以后会有什么变化。" -> change
option news "想想每天听到的事。" -> news
label change
I: 我可以把以后要做的事都想好。明天的一件事，也可能让这一切都变了。
goto close
label news
I: 每天都听说又有一个年轻人得到了力量。今天是他，明天是她。我怎么能不想这件事。
label close
I: 看网上那些消息，好像下一个就是我。可系统选了别人，不是说一定会选我。
I: 是啊，我是想得有点多。可一天不知道答案，我就还没办法不去想。
end
