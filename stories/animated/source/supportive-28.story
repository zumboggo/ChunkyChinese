story 2
label opening
scene lobby
show Alden neutral left
show Gorgon neutral right
camera medium Alden cut
I: 我的右手上还有血。
I: 我把另一只手放在下面，走进厕所。
I: 我想把水打开，却停了下来。
I: 一个想法跑进我脑子里。
I: 这会不会太奇怪了？不是好笑的奇怪，是让人不舒服的那种。
choice idea
option now "想想为什么是现在。" -> now
option later "想想以后再问。" -> later
label now
I: 可是，现在我的手已经受伤了。
I: 我不是为了这个才让自己受伤的。
goto doorway
label later
I: 要是以后为了这个去准备，好像更奇怪。
label doorway
I: 我回到门口，用手肘开了门。他还在外面笑。
Alden: 戈尔贡？我想问你一件事。
Alden: 要是我想错了，你可别不高兴。
Alden: 你答应过，不会因为我给你东西吃就生气。
label offer
Alden: 你……想不想要一点我的血？
Alden: 我是说，吃的。
I: 这话听起来太不好了。
I: 我像电影里那个什么都不懂的人。
I: 外面的笑声停了。
I: 他生气了吗？站在门后面，我看不见他。
choice quiet
option words "想想刚才说的话。" -> words
option answer "听听他有没有说话。" -> answer
label words
I: 我明明想帮忙，怎么一说就变成这样了？
goto pattern
label answer
I: 我等了一下。他没有说好，也没有说不。
label pattern
I: 不过，他以前也很少说好，或者谢谢。
I: 能吃的东西，他一般拿过去就吃。
I: 可能，特别喜欢的时候，他才会说。
I: 不能吃的，他都会说不。
I: 只有蟋蟀那次不一样。
I: 那次他说，不吃，不过放在这里吧。
Alden: 你不说话，是什么意思啊？
I: 还是没有声音。我越来越怕。
label reasoning
I: 说不，就是不要。
I: 什么也不说，就是会吃。
I: 对吧？以前不都是这样吗？
I: 等等。也许他不是不想说话，而是不能说话。
I: 我还在门口，他看不见我的手。
I: 我这只是在问，没有真的给他吃的？
choice reason
option rule "想想以前怎么试的。" -> rule
option distance "看看自己站在哪里。" -> distance
label rule
I: 以前，我得先把吃的拿给他。
I: 他才可以说要，还是不要。
goto decide
label distance
I: 我还在门口，他当然看不见我的手。
label decide
I: 好吧。带着有血的手，
I: 过去试试。这是为了研究。没什么奇怪的研究。
label approach
I: 他还坐在那里。两条腿收在身前，中间放着那包玉米片。
I: 他的脚趾用力抓着椅子边。
I: 他看起来像一个石头做的怪物。
I: 我走过去，想让自己看起来和平常一样。
I: 可我又怕，又不好意思。
I: 这些肯定都写在脸上了。
Alden: 你要一点吗？
I: 我把受伤的右手放到他面前。
label wait
I: 我等他说不。或者，他会让我出去。
I: 可是，他只是低头看我的手。
I: 看了很久，很久。
choice waiting
option face "看看他会不会说话。" -> face
option hand "看看自己放在前面的手。" -> hand
label face
I: 他没有说话。我也不知道还能说什么。
goto still
label hand
I: 手已经放到他面前了。现在，我只能等他说话。
label still
I: 血落到那只塑料袋上。
I: 我们两个都没有动。
I: 我的心跳越来越大声，好像就在耳朵里面。
I: 耳朵里一直没停过的声音，现在好像也没有心跳大声了。
label eyes
I: 然后，他做了一件以前从来没做过的事。
I: 他把头抬了起来。
I: 第一次，他看我的眼睛。
end
