story 2
label opening
scene lobby
show Alden neutral left
show Gorgon neutral right
camera two Alden Gorgon cut
Alden: 对了，下次我给你带点蟋蟀。
label watch_19_beat_1
Alden: 活的。
label watch_19_beat_2
Gorgon: 那声音会很大。
label watch_19_beat_3
Alden: 吃得快一点，就不会了。
label watch_19_beat_4
I: 我等了一下。也许他能让我知道点什么。
label watch_19_beat_5
I: 可他什么也没说。
label watch_19_beat_6
choice hint
option hint_a "听听他没说什么。" -> hint_a
option hint_b "想想我还不知道什么。" -> hint_b
label hint_a
I: 他没有说可以，也没有说不可以。
label watch_19_beat_7
goto hint_join
label hint_b
I: 他到底能吃什么，我还是不知道。
label watch_19_beat_8
label hint_join
Alden: 我不知道，这个你能不能说。
label watch_19_beat_9
Alden: 要是我带来很奇怪的东西，你不会生气吧？
label watch_19_beat_10
Alden: 我想，你吃的东西，跟我们应该很不一样。
label watch_19_beat_11
Alden: 我想找到对的东西，可不想让你不高兴。
label watch_19_beat_12
choice care
option care_a "记住他不是人。" -> care_a
option care_b "记住我为什么要问。" -> care_b
label care_a
I: 我觉得奇怪的东西，对他也许不奇怪。
label watch_19_beat_13
goto care_join
label care_b
I: 我是想帮忙，不是想让他不开心。
label watch_19_beat_14
label care_join
Gorgon: 啊，你们和我们不一样，能认识也不容易。
label watch_19_beat_15
I: 他低头看了看自己的手。
label watch_19_beat_16
I: 魔法绑着他的手腕，下面的皮都破了。
label watch_19_beat_17
I: 我以前从来没有发现。
label watch_19_beat_18
Gorgon: 我不会生气。
label watch_19_beat_19
Gorgon: 不过，我本来，真的不想跟你说吃的。
label watch_19_beat_20
Gorgon: 你带来的东西，我很喜欢，也真的谢谢你。
label watch_19_beat_21
Gorgon: 在这里，没有什么好玩的事。至少，它们有点意思。
label watch_19_beat_22
Gorgon: 我今天说的那些话……
label watch_19_beat_23
Alden: 说你不是只吃菜的那些话？
label watch_19_beat_24
Gorgon: 对，就是那些话。
label watch_19_beat_25
Gorgon: 那是一时的伤心……却有不小的代价。
label watch_19_beat_26
Gorgon: 这不是要你来帮忙的事。
label watch_19_beat_27
choice cost
option cost_a "想想他说的伤心。" -> cost_a
option cost_b "想想他说的代价。" -> cost_b
label cost_a
I: 原来，他那时是在伤心？
label watch_19_beat_28
goto cost_join
label cost_b
I: 这个代价，到底是什么？
label watch_19_beat_29
label cost_join
I: 我还以为，他只是在开玩笑。
label watch_19_beat_30
I: 代价是什么，我也不明白。
label watch_19_beat_31
I: 不过，要买那些特别的肉，我可能真的要花不少钱。
label watch_19_beat_32
Alden: 我明白了。
label watch_19_beat_33
Alden: 可是，明明可以说朋友，你却说只是认识？
label watch_19_beat_34
choice friends
option friends_a "开个小玩笑。" -> friends_a
option friends_b "想想他说的认识。" -> friends_b
label friends_a
I: 我没有很认真地说这些话。
label watch_19_beat_35
goto friends_join
label friends_b
I: 说是朋友，不是更容易吗？
label watch_19_beat_36
label friends_join
Alden: 也许应该生气的是我。
label watch_19_beat_37
Gorgon: 你还是会带蟋蟀来的，对吧？
label watch_19_beat_38
I: 他的声音又特别平静。
label watch_19_beat_39
Alden: 唧，唧。
label watch_19_beat_40
I: 我对他眨了一下眼。
label watch_19_beat_41
Alden: 晚安，戈尔贡！
label watch_19_beat_42
end
