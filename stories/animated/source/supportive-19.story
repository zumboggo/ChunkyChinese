story 2
label opening
scene lobby
show Alden worried left
show Gorgon neutral right
camera two Alden Gorgon cut
I: 可他不想让我觉得他可怜。他好像能把这种感觉闻出来。
I: 我把心里的那种感觉收起来，站直了身体。
I: 我想，还是先说吃的事吧。
label crickets
Alden: 那，下次我给你带蟋蟀来。活的。
Gorgon: 那声音可不小。
Alden: 你吃得快一点，就不会了。
label waiting
camera listener Alden cut
I: 我说完以后，没有马上接着说。我在等他。
choice hint
option answer "等他多说一点。" -> answer
option quiet "听听他会不会继续说。" -> quiet
label answer
I: 也许这次，他能让我知道一点，自己到底能吃什么。
goto no_hint
label quiet
I: 我先不说话，给他一点时间。
label no_hint
I: 可他没有再说。我还是不知道，蟋蟀是不是对的。
label careful
camera two Alden Gorgon cut
Alden: 我不知道你能不能说。不过，我给你带特别奇怪的东西吃，你不会生气吧？
Alden: 你一般吃的，应该跟人吃的很不一样。
Alden: 我想找到你能吃的东西。可我不想让你不开心。
choice care
option food "想想为什么要找。" -> food
option feelings "想想他的感觉。" -> feelings
label food
I: 我想帮上忙，不只是拿点东西来试试。
goto different
label feelings
I: 对我来说奇怪的东西，对他来说也许一点都不奇怪。
label different
camera two Alden Gorgon cut
Gorgon: 我们这么不一样，想认识对方，真不容易。
label hands
look Gorgon down
I: 他低下头，看了看自己的手。
I: 手腕上，魔法让他的皮肤破了。我以前从来没有看见过。
choice look
option wrists "看看他的手。" -> wrists
option missed "想想自己以前没看见的事。" -> missed
label wrists
I: 那些东西一直在他身上。我现在才看见，它们给他带来了什么。
goto reassurance
label missed
I: 我来过这里这么多次，却还有这么多事不知道。
label reassurance
camera two Alden Gorgon cut
Gorgon: 我不会生气。可是，奥尔登，今天我本来不想跟你说吃的事。
Gorgon: 你带来的东西，我一直很喜欢。谢谢你。
Gorgon: 我的日子没什么意思。至少，你带来的东西能让我觉得有意思一点。
label received
camera listener Alden cut
I: 他喜欢那些东西。听他这样说，我知道自己没有白带。
label earlier
camera two Alden Gorgon cut
Gorgon: 今天早些时候，我说过的话……
Alden: 你说，你不是不吃肉的？
Gorgon: 对，就是那个。
label cost
Gorgon: 那是因为……我那时候有点伤心。那时候，我付出的代价很高。
Gorgon: 这不是要你来解决的问题。
label listener
camera listener Alden cut
express Alden worried
I: 伤心？他今天早些时候，是在伤心？
I: 我还以为，他是在说反话。
choice meaning
option sadness "想想他说的伤心。" -> sadness
option price "想想他为什么这样说。" -> price
label sadness
I: 我连他伤心的时候是什么样子，都没看明白。
goto expensive
label price
I: 他刚才说的话，到底是什么意思？
label expensive
I: 要是我真去买那些特别少见的肉，花的钱一定不少。
I: 可他说的，是花钱这件事吗？我还不知道。
label ending
camera two Alden Gorgon cut
I: 我带来的东西，让他的日子好过了一点。这一点，他已经告诉我了。
end
