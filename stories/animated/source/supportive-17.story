story 2
label opening
scene lecture
show Alden worried left
show Jeremy neutral right
rest Alden seated
rest Jeremy seated
look Jeremy front
look Alden down
camera two Alden Jeremy cut
I: 汉娜已经六个月没有消息了。我想成为英雄的心，也越来越强。
I: 她不在了，我才发现，她说过的话对我有多重要。
label missing_light
camera two Alden Jeremy cut
look Alden down
I: 我一直以为，我们只是因为那件可怕的事才认识的。
I: 可每次收到她的消息，我都很开心。她的世界和我的完全不一样。
I: 有时候，我需要一个真正的大人帮忙，就会找她。
label real_adult
camera close Alden cut
express Alden embarrassed
I: 对，一个真正的大人。不是康妮阿姨。
choice remember
option help "想想她怎么帮我。" -> help
option distance "想想我们有多不一样。" -> distance
label help
I: 她忙着救人，还愿意听我说学校里的事。
goto school
label distance
I: 她有力量，去过那么多地方。我却连自己想上什么课都不知道。
label school
I: 刚上高中的时候，我还打电话问她，怎么选课。
label algebra
camera close Alden cut
react Alden facepalm
I: 我用魔法给一个英雄打电话，问的却是数学课！
I: 她一点也没觉得奇怪。可打完电话，我的脸就热了。
I: 我对自己说，以后不能什么事都去找她。
label too_important
camera close Alden cut
express Alden sad
I: 可不知道从什么时候起，我已经把她看得那么重要了。
choice memory
option voice "想想她说过的话。" -> voice
option light "想想她给我的感觉。" -> light
label voice
I: 英雄应该做什么，能做到什么。我以前听她说，现在还在想。
goto nowhere
label light
I: 她好像带着一种光。现在，我到处找，却哪里都找不到。
label nowhere
camera two Alden Jeremy cut
express Jeremy worried
look Jeremy Alden
I: 我还坐在教室里，心却又跑到她那里去了。
label check_in
camera listener Alden cut
express Alden worried
Jeremy: 你还好吗？
I: 他还在小声说那些特别的话，一边说，一边问我。
label eyes_up
look Alden Jeremy
express Alden surprised
I: 大概是我的表情太难看了。我把眼睛打开一点，看向他。
label seen
camera listener Alden cut
express Alden surprised
look Alden Jeremy
I: 也许，他真的比我想的更会看人。
choice reply
option notice "想想他看见了什么。" -> notice
option protect "先不说心里的事。" -> protect
label notice
look Alden Jeremy
express Alden relieved
react Alden nod
I: 我还没说话，他就知道我不太好。
goto answer
label protect
look Alden down
express Alden worried
I: 我现在还不想说这些事。
label answer
camera two Alden Jeremy cut
look Jeremy front
Alden: 嗯，我没事。
I: 下午三点，博和杰里米回家了。我继续上最后一门课。
I: 这门课教我们认外星人的字。有些字看起来一样，却差了一点点。
label more_class
move Jeremy exit
look Alden down
rest Alden seated
camera close Alden cut
express Alden worried
I: 教室里只有六个学生。四个特别喜欢外星人的东西。
I: 还有一个人做研究，需要学这些字。那我呢？
I: 今天不上学，我也不想那么早回家。
label empty_home
camera close Alden cut
look Alden down
I: 回去以后，大概又只有我和猫，不知道阿姨会不会回来。
I: 也许她会带晚饭。也许只会用手机问我：我去见朋友，今晚你自己可以吧？
I: 我长大以后，她更少照顾我了。
label staying_busy
camera close Alden cut
express Alden worried
I: 我让自己忙一点，就不用一直担心她，也不那么容易生气。
choice study
option shapes "看看卡片上的字。" -> shapes
option time "先过好眼前的两个小时。" -> time
label shapes
look Alden down
express Alden curious
I: 两个字看起来差不多，可老师说，它们的意思完全不一样。
goto cards
label time
look Alden front
express Alden determined
I: 先把这些字记住。家里的事，晚一点再想。
label cards
I: 我拿出很多很多卡片，一张又一张。
label learning
camera close Alden cut
look Alden down
express Alden determined
I: 老师一个地方一个地方地讲。我看了又看，努力记住。
I: 两个小时以后，课终于上完了。我的头好疼。
I: 我去了洗手间。再走出来的时候，其他人都走了。
label still_here
scene lobby
show Alden worried left
show Gorgon neutral right
camera two Alden Gorgon cut
I: 现在这里只有我。还有戈尔贡。
I: 外面很冷。我不想出去，也不想回家。
label desk
camera two Alden Gorgon cut
look Alden Gorgon
I: 所以，我又走到他的桌子前。这里还有一个人。
end
