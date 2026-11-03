story 2
label opening
scene lobby
show Alden embarrassed left
show Gorgon neutral right
camera two Alden Gorgon cut
I: 我快十六岁了，还想得到超能力。在他面前说这些，真的有点不好意思。
Gorgon: 所以，你很会想。人可不知道系统会选择谁。
Alden: 我以前说的那个人，她自己也有超能力。
Gorgon: 她对你的身体做过什么很不好的事吗？没有的话，这就说明不了多少。
I: 我知道，不一定会有那一天。可是，十三岁那年，她说过的话，我一直记得。
I: 那天，我们在等着买票。每年夏天，我都会去找她，她都会带我去做点什么。
I: 她用那个能让人等待的魔法，试过几百个人和动物，想多了解一点。
I: 她跟我说，在里面还醒着的人，除了我，只有三个。他们的爸爸妈妈都有超能力。
choice hope
option evidence "想想自己为什么不一样。" -> evidence
option warning "记住她说的，不一定。" -> warning
label evidence
I: 那么多人里，只有我们四个。我当然会想，自己是不是也有可能。
goto chance
label warning
I: 她没有说我一定会被选择。我不能只听自己想听的话。
label chance
I: 她觉得，我身体里可能有一种特别的力量。名字叫混沌潜能。
I: 这种力量高的人，被系统选择的可能也高。可是，这只是一种想法，我们还不知道是不是这样。
I: 有超能力的人的孩子，更容易被选择。是身体的原因，还是长大的地方？谁也不知道。
I: 她让我别太相信。我记得。可我也记得，她觉得我有可能。
Gorgon: 我能帮你找厕所，跟你说电梯在哪里。还有呢？
choice services
option practical "有了超能力以后呢？" -> practical
option special "这些是只给我的帮助吗？" -> special
label practical
Alden: 要是我真的有了超能力，你能做什么？
Gorgon: 我可以帮你登记，让政府知道。
goto limits
label special
Alden: 这些帮助，是因为我给你带了东西吗？
Gorgon: 不是。谁走进来，我都做一样的事。
label limits
Gorgon: 你有了超能力，我可以帮你登记。你要在能力固定以前跟别人交换，我也可以做见证。
Gorgon: 可是，我不能跟你说要选什么能力，不能说那些人不让你知道的事。
Gorgon: 我也不能把自己的力量给你。你看，我能做的事就这么多。
I: 他停了一下。
Gorgon: 对了，我可以给你很多笔。你想要多少都可以。
express Alden worried
camera listener Alden cut
Gorgon: 现在你知道了。我帮不上你什么忙，你还想给我送东西吗？
I: 我看桌子后面的他。他不能走，可我想走就能走。
choice kindness
option promise "我还是会给你带吃的。" -> promise
option confinement "一直不能离开，很不舒服吧。" -> confinement
label promise
Alden: 我还是会给你带吃的。
I: 我点点头。他没有马上说话。
goto offer
label confinement
Alden: 你一直不能离开这里，一定很不舒服。
I: 我没有走。就算他帮不上忙，我也还是想给他带点东西。
label offer
express Alden determined
camera two Alden Gorgon cut
Alden: 下次来，我还会带东西。你有没有特别想吃的？
I: 他在看我头上的什么地方，很久都没有说话。我不知道，我们是不是已经说完了。
Gorgon: 我不是不吃肉。
I: 他的声音听起来有点不对，好像说这些很难。
choice food
option meat "那下次给你带肉？" -> meat
option assumption "我是不是想错了？" -> assumption
label meat
Alden: 那下次给你带肉？对不起，我以为你不吃。
Gorgon: 你带来的那些，我不能吃。
goto refused
label assumption
Alden: 你不要以前那些东西，我就以为你不吃肉。
Gorgon: 不是不想吃。是不能吃。
label refused
I: 我想起以前带过的东西：虾、鸡蛋、奶，还有肉。那些，他都没有吃。
express Alden confused
Alden: 那……你只吃虫子吗？
I: 他还是在看别的地方，呼吸比刚才重了一点。
Gorgon: 对不起，这个我不能跟你说。我也不能说自己想要什么。
Gorgon: 你得自己想一想。
express Alden worried
camera listener Alden cut
Alden: 知道了。
I: 其实，我一点也不明白。连想吃什么，他都不能说？
camera two Alden Gorgon cut
I: 我以前以为，只是系统的事不能说。现在，我真的想知道这是为什么。
I: 也许，让他不能吃喜欢的东西，只是一种惩罚？这样，也太不好了。
I: 要是吃了一些东西会出大事，他们应该不会让谁都能给他送吃的。可是，我也不知道是不是这样。
express Alden curious
Alden: 那我们就一个一个试试看？
Gorgon: 真让人期待。
I: 这次，我听出他好像在说反话。我决定，他是把我当朋友才这样说。
I: 我不知道下次要带什么。可我还是会来。
end
