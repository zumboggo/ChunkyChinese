story 2
label opening
scene lecture
show Alden neutral center
camera medium Alden cut
I: 今天上课，我们学的是怎么说这些话，得到一点好运。
label watch_22_opening_1
I: 这些话，我早就会了。妈妈最先教我的，就是这个。
label watch_22_opening_2
I: 可每次说这些话，我心里都会有一点不舒服。
label watch_22_opening_3
label loud
I: 老师正在帮一个人。她还是喜欢大声喊那些话。
label watch_22_loud_1
I: 我在这边，慢慢地让自己安静下来，把话说清楚。
label watch_22_loud_2
label memory
I: 在汉娜保护我的那天晚上，我也在心里说过这些话。
label watch_22_memory_1
choice memory
option words "想想妈妈教过的话。" -> words
option hands "看看现在的手。" -> hands
label words
I: 我还记得那些声音。过了这么多年，它们还在。
label watch_22_words_1
goto gesture
label hands
I: 现在，我的手已经比那时候大了很多。
label watch_22_hands_1
label gesture
I: 我让手指弯起来，做出了那个很小的手势。
I: 那天晚上，我最需要它的时候，却做不到。
label watch_22_gesture_2
label blame
I: 也许，就是因为这个，那时候才没有用？
label watch_22_blame_1
I: 不。不能这样想。这个想法，会带我去一个很不好的地方。
label watch_22_blame_2
choice stop
option breath "先让自己安静下来。" -> breath
option voice "再听听自己的声音。" -> voice
label breath
I: 先慢慢地呼吸。现在，我在这里上课。不是在那个晚上。
label watch_22_breath_1
goto callback
label voice
I: 声音还在。我可以把这些话说完，再从头开始。
label watch_22_voice_1
label callback
I: 就算我不去葬礼，也应该给她的朋友回个电话。
label watch_22_callback_1
I: 人家还在等。我不能一直什么都不说，好像没有这件事一样。
label watch_22_callback_2
choice waiting
option call "想想还在等电话的人。" -> call
option days "想想还有多少时间。" -> days
label call
I: 她想帮我。我至少应该让她知道，我收到了她的话。
label watch_22_call_1
goto whisper
label days
I: 还有十天。我不能把这些事，都留到最后一天。
label watch_22_days_1
label whisper
I: 我低声说完，又从头开始。
label watch_22_whisper_1
label luck
Alden: 一点好运，能帮我做什么呢？
label watch_22_luck_1
I: 如果今天真的有了它，我也没有什么重要的事可以用它。
label ten
I: 还有十天，就是葬礼了。
label watch_22_ten_1
I: 我知道，她很可能已经不在了。可是，谁也没有给我一个清楚的消息。
label watch_22_ten_2
label search
I: 我用电脑找过。被叫走以后，过了几个星期还没回来的人，真的很少。
label watch_22_search_1
I: 只有很少很少的人，会花那么长的时间。
label news
I: 有时候，他们会送来消息，告诉地球这边，有人死了。
label watch_22_news_1
I: 可更多的时候，他们什么都不说。这怎么可以？
label watch_22_news_2
label task
I: 她到底被叫去做什么，我也不知道。
label watch_22_task_1
I: 我只希望，那是一件真正重要的事。是她真正想做的事。
label watch_22_task_2
label hannah
I: 她真的想活得有意义。比我认识的每个人，都更认真。
label watch_22_hannah_1
choice meaning
option said "想想她说过的话。" -> said
option did "想想她做过的事。" -> did
label said
I: 有些人说想让世界变好，说完就不再想了。她不是这样。
label watch_22_said_1
goto work
label did
I: 她一直在为这个做准备。不是等好事自己发生。
label watch_22_did_1
label work
I: 她想好自己应该怎么做，然后真的去做，也真的担心自己做得不好。
label watch_22_work_1
I: 我知道，如果是为了对的事，她会愿意去死。
label watch_22_work_2
label ending
I: 我希望，想到这一点，会让我好受一些。
label watch_22_ending_1
I: 可是，我还是很难受。
label watch_22_ending_2
end

