story 2
label opening
scene lobby
show Alden happy left
show Gorgon neutral right
camera two Alden Gorgon cut
Alden: 我明白。不过，你为什么说我们只是认识？
Alden: 明明可以说是朋友啊。
I: 我看着他笑了。我还是想告诉他，我们不只是认识。
choice friend
option word "想想我们的事。" -> word
option distance "想想他为什么这样说。" -> distance
label word
I: 只是认识的话，我还会一直想着他能吃什么吗？
goto joke
label distance
I: 他把话说得很远。我却不想站得那么远。
label joke
Alden: 这样说，我可要不高兴了。
Gorgon: 你还是会带蟋蟀来吧？
I: 他的声音一点也没变。可他没有忘记这件事。
label chirp
I: 我学着小虫的声音叫了两声，还对他眨了眨眼。
Alden: 晚安，戈尔贡！
label arrival
I: 后来，我真的买了三十只带过去。
I: 这一次，我觉得一定没问题。我都买了三十只啊。
label uneaten
I: 结果，他一只也没吃。
I: 我看看他，再看看那些小东西。等等，为什么又不行？
choice sure
option compare "想想上次吃的东西。" -> compare
option certain "想想自己有多相信。" -> certain
label compare
I: 他连会飞的小虫都吃了。这些也是活的，也没有毒啊。
goto puzzle
label certain
I: 买的时候，我没想过他会不吃。现在想起来，我是不是太相信自己了？
label puzzle
I: 难道，他们那边的人，只能吃会飞的那一种？不可能吧。
label smile
I: 可是，他不是不喜欢。
I: 有一次，他以为我没在看。我看见他看那些小东西，笑了一下。
I: 那个笑，真的很像人。我以前可没见过他这样。
choice notice
option face "记住他的样子。" -> face
option gift "再看那些小东西。" -> gift
label face
I: 原来，他也会这样笑。我差一点就没看见。
goto plants
label gift
I: 它们还活着。他看着它们的时候，好像很高兴。
label plants
I: 他把它们全都送到了房间的花草里面。
I: 我想给他找吃的。他却给它们找了一个住的地方。
label hunting
I: 等等。会不会要他自己去抓，才可以吃？
choice hunt
option idea "再想想这个可能。" -> idea
option watch "看看他接下来做什么。" -> watch
label idea
I: 如果是这样，那我把东西送到他面前，就做错了？
goto no_chase
label watch
I: 它们就在那边。他现在想去找，应该很容易。
label no_chase
I: 可是，他没有去。他让它们留在那里，自己还在桌子后面。
label weeks
I: 几个星期以后，下午的时候，我还听得到它们的声音。
I: 看来，自己去抓这个想法，也不对。
label city
I: 要是真的只能吃自己抓来的动物，在这个城市里，我去哪里找？
I: 不能去抓猫吧。我家还有一只呢。我和它相处得还不错。
label takeout
I: 我还是每次上课都给他带吃的。有肉的和没有肉的，都给他带。
I: 还是不行。我开始想，他上次吃那只小虫，会不会只是因为他不喜欢它？
label ending
I: 吃的问题还是个问题。可是，那三十只小东西已经有了家。
I: 我还是不知道他能吃什么。不过，我看见了他的笑。
end
