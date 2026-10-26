story 2
variable water = 4 range 0 30 visible
variable preparations = 3 range 0 3 visible
variable promised = false hidden
variable evacuated = false hidden
label opening
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 我们回来了。在Neri的时候，是什么结局？
choice recap
option tao-lost "Tao去世了。Q还在。所有的水捎回来了。" -> tao-lost ; water = 12
option half "他们安全了，不过只有一半的水。" -> half ; water = 8
option empty "他们安全了，不过没有水。" -> empty
option q-lost "Tao安全了。Q牺牲了。所有的水捎回来了。" -> q-lost ; water = 12
label tao-lost
I: Tao没有回来。Q有录音。去世的人不能回来。
goto honesty
label half
I: Tao和Q安全了。我们捎了4桶水回来。
goto honesty
label empty
I: Tao知道找水的路。不过今天没有水捎回来。
goto honesty
label q-lost
I: Q没有了。录音没有了。Tao看着Q的地方，不说话。
goto honesty
label honesty
choice honesty
option honest "在Neri的时候，我没有说谎。" -> honest
option concealed "在Neri的时候，我想说谎。" -> concealed
label honest
An [determined, reassure]: 我答应和你一起回答。今天一样。
goto arrival
label concealed
move An far-right
An [determined, insist]: 我没有替你说谎。今天我不替你回答。
goto arrival
label arrival
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 山上面的人，和河那里的人，在等水。这里本来有4桶水。
An [worried, explain]: 风暴要来了。我们可以做3件事。然后要回来。
I: 慢慢看，慢慢想。没有读书的时间限制。
show Min worried right
camera two Jonathan Min cut
Min [pleading, hesitant]: 我妻子Mei有重病。先陪她去山上面。医生有药，有干净的水。
Min [worried, insist]: 她在这里的话，今天晚上要给她4桶水。水不够，她会去世。
Jonathan [worried, question]: 4桶？不是给她一杯水吗？
Min [sad, explain]: 她要喝水。伤口要洗干净，屋子要干净。
goto prep-none
label prep-none
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做3件事。
choice prepare-none
option prep-pump "检查机器。知道为什么坏了。" -> task-none-pump ; preparations -= 1
option prep-listen "听所有人说的话。考虑一起负责。" -> task-none-listen ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-none-reserve ; preparations -= 1, water += 4
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-none-evacuate ; preparations -= 1, evacuated = true
label task-none-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto prep-pump
label task-none-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto prep-listen
label task-none-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto prep-reserve
label task-none-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto prep-evacuate
label prep-pump
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做2件事。
choice prepare-pump
option prep-listen "听所有人说的话。考虑一起负责。" -> task-pump-listen ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-pump-reserve ; preparations -= 1, water += 4
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-pump-evacuate ; preparations -= 1, evacuated = true
label task-pump-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto prep-pump-listen
label task-pump-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto prep-pump-reserve
label task-pump-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto prep-pump-evacuate
label prep-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做2件事。
choice prepare-listen
option prep-pump "检查机器。知道为什么坏了。" -> task-listen-pump ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-listen-reserve ; preparations -= 1, water += 4
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-listen-evacuate ; preparations -= 1, evacuated = true
label task-listen-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto prep-pump-listen
label task-listen-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto prep-listen-reserve
label task-listen-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto prep-listen-evacuate
label prep-reserve
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做2件事。
choice prepare-reserve
option prep-pump "检查机器。知道为什么坏了。" -> task-reserve-pump ; preparations -= 1
option prep-listen "听所有人说的话。考虑一起负责。" -> task-reserve-listen ; preparations -= 1
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-reserve-evacuate ; preparations -= 1, evacuated = true
label task-reserve-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto prep-pump-reserve
label task-reserve-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto prep-listen-reserve
label task-reserve-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto prep-reserve-evacuate
label prep-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做2件事。
choice prepare-evacuate
option prep-pump "检查机器。知道为什么坏了。" -> task-evacuate-pump ; preparations -= 1
option prep-listen "听所有人说的话。考虑一起负责。" -> task-evacuate-listen ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-evacuate-reserve ; preparations -= 1, water += 4
label task-evacuate-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto prep-pump-evacuate
label task-evacuate-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto prep-listen-evacuate
label task-evacuate-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto prep-reserve-evacuate
label prep-pump-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-pump-listen
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-pump-listen-reserve ; preparations -= 1, water += 4
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-pump-listen-evacuate ; preparations -= 1, evacuated = true
label task-pump-listen-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto ready-pump-listen-reserve
label task-pump-listen-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto ready-pump-listen-evacuate
label prep-pump-reserve
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-pump-reserve
option prep-listen "听所有人说的话。考虑一起负责。" -> task-pump-reserve-listen ; preparations -= 1
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-pump-reserve-evacuate ; preparations -= 1, evacuated = true
label task-pump-reserve-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto ready-pump-listen-reserve
label task-pump-reserve-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto ready-pump-reserve-evacuate
label prep-pump-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-pump-evacuate
option prep-listen "听所有人说的话。考虑一起负责。" -> task-pump-evacuate-listen ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-pump-evacuate-reserve ; preparations -= 1, water += 4
label task-pump-evacuate-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto ready-pump-listen-evacuate
label task-pump-evacuate-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto ready-pump-reserve-evacuate
label prep-listen-reserve
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-listen-reserve
option prep-pump "检查机器。知道为什么坏了。" -> task-listen-reserve-pump ; preparations -= 1
option prep-evacuate "陪Mei去山上面。医生可以保护她。" -> task-listen-reserve-evacuate ; preparations -= 1, evacuated = true
label task-listen-reserve-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto ready-pump-listen-reserve
label task-listen-reserve-evacuate
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
move Jonathan center
move Min far-right
camera wide
I: 我和Min陪着Mei，慢慢走向山上面。
Min [relieved, reassure]: 医生接到她了。水够，药够。今天晚上她安全了。
goto ready-listen-reserve-evacuate
label prep-listen-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-listen-evacuate
option prep-pump "检查机器。知道为什么坏了。" -> task-listen-evacuate-pump ; preparations -= 1
option prep-reserve "找偷偷放的水。可以多4桶。" -> task-listen-evacuate-reserve ; preparations -= 1, water += 4
label task-listen-evacuate-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto ready-pump-listen-evacuate
label task-listen-evacuate-reserve
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 门开了，有4桶水。山上面的人放在这里的。
An [skeptical, question]: 他们害怕明天没有水。我们要记得是谁给的。
Jonathan [determined, explain]: 我记录了是谁给的。他们愿意给所有人4桶水。
goto ready-listen-reserve-evacuate
label prep-reserve-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [worried, question]: 还可以做1件事。
choice prepare-reserve-evacuate
option prep-pump "检查机器。知道为什么坏了。" -> task-reserve-evacuate-pump ; preparations -= 1
option prep-listen "听所有人说的话。考虑一起负责。" -> task-reserve-evacuate-listen ; preparations -= 1
label task-reserve-evacuate-pump
scene storage
show Jonathan worried left
show An worried right
camera two Jonathan An cut
react Jonathan bow
I: 我在机器面前弯腰。管子下面有沙。
Jonathan [determined, explain]: 给机器4桶水，沙就出来了。然后可以修好。明天才有水。
goto ready-pump-reserve-evacuate
label task-reserve-evacuate-listen
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [determined, explain]: 山上面的人负责机器。河那里的人修管子。他们要一起工作。
Jonathan [curious, question]: 一起检查，一起分水，给所有人看记录，可以吗？
An [neutral, explain]: 他们愿意。不过先要修好机器。
goto ready-listen-reserve-evacuate
label ready-pump-listen-reserve
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
effect shake
I: 风暴来了。我们要停下来。
An [worried, explain]: 山上面的人愿意给2桶水。不过要求先给他们6桶，而且他们负责机器。
Jonathan [skeptical, question]: 他们的孩子要喝水。不过河那里的人没有选择。
choice promise-pump-listen-reserve
option pledge "答应先给他们6桶，而且他们负责机器。他们就给2桶。" -> pledged-pump-listen-reserve ; promised = true, water += 2
option decline "不答应。他们不给2桶，我们还可以考虑。" -> declined-pump-listen-reserve
label pledged-pump-listen-reserve
An [worried, insist]: 我记录了你答应的话。以后不一样，要说为什么。
goto bargain-pump-listen-reserve
label declined-pump-listen-reserve
An [neutral, explain]: 他们捎着2桶水走了。还可以谈话，不过没有那2桶水。
goto bargain-pump-listen-reserve
label bargain-pump-listen-reserve
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 我摸着水壶。面前的人伸出手。这一壶水，不能给这个人又给那个人。
An [worried, insist]: Mei还在下面。要给她4桶。不够的话，她会去世。
An [determined, explain]: 你检查过，听过他们说的话。他们愿意一起负责，不过先要给机器4桶水。
An [neutral, explain]: 他们说可以不先给6桶。给过的2桶，不要求还。
choice agreement-pump-listen-reserve
option exclusive "给山上面的人6桶。他们负责机器。河那里的人要向他们要水。" -> exclusive ; water -= 6
option emergency "先给需要水的人。机器不是他们的。他们可能不再相信我。" -> emergency
option shared "给机器4桶水。所有人一起负责。" -> shared ; water -= 4
label ready-pump-listen-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
effect shake
I: 风暴来了。我们要停下来。
An [worried, explain]: 山上面的人愿意给2桶水。不过要求先给他们6桶，而且他们负责机器。
Jonathan [skeptical, question]: 他们的孩子要喝水。不过河那里的人没有选择。
choice promise-pump-listen-evacuate
option pledge "答应先给他们6桶，而且他们负责机器。他们就给2桶。" -> pledged-pump-listen-evacuate ; promised = true, water += 2
option decline "不答应。他们不给2桶，我们还可以考虑。" -> declined-pump-listen-evacuate
label pledged-pump-listen-evacuate
An [worried, insist]: 我记录了你答应的话。以后不一样，要说为什么。
goto bargain-pump-listen-evacuate
label declined-pump-listen-evacuate
An [neutral, explain]: 他们捎着2桶水走了。还可以谈话，不过没有那2桶水。
goto bargain-pump-listen-evacuate
label bargain-pump-listen-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 我摸着水壶。面前的人伸出手。这一壶水，不能给这个人又给那个人。
An [determined, explain]: 你检查过，听过他们说的话。他们愿意一起负责，不过先要给机器4桶水。
An [neutral, explain]: 他们说可以不先给6桶。给过的2桶，不要求还。
if water >= 6 -> full-pump-listen-evacuate else limited-pump-listen-evacuate
label full-pump-listen-evacuate
choice agreement-pump-listen-evacuate
option exclusive "给山上面的人6桶。他们负责机器。河那里的人要向他们要水。" -> exclusive ; water -= 6
option emergency "先给需要水的人。机器不是他们的。他们可能不再相信我。" -> emergency
option shared "给机器4桶水。所有人一起负责。" -> shared ; water -= 4
label limited-pump-listen-evacuate
An [worried, explain]: 水不够6桶。不能答应给6桶。
choice limited-pump-listen-evacuate
option emergency "先给需要水的人。机器不是他们的。他们可能不再相信我。" -> emergency
option shared "给机器4桶水。所有人一起负责。" -> shared ; water -= 4
label ready-pump-reserve-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
effect shake
I: 风暴来了。我们要停下来。
An [worried, explain]: 山上面的人愿意给2桶水。不过要求先给他们6桶，而且他们负责机器。
Jonathan [skeptical, question]: 他们的孩子要喝水。不过河那里的人没有选择。
choice promise-pump-reserve-evacuate
option pledge "答应先给他们6桶，而且他们负责机器。他们就给2桶。" -> pledged-pump-reserve-evacuate ; promised = true, water += 2
option decline "不答应。他们不给2桶，我们还可以考虑。" -> declined-pump-reserve-evacuate
label pledged-pump-reserve-evacuate
An [worried, insist]: 我记录了你答应的话。以后不一样，要说为什么。
goto bargain-pump-reserve-evacuate
label declined-pump-reserve-evacuate
An [neutral, explain]: 他们捎着2桶水走了。还可以谈话，不过没有那2桶水。
goto bargain-pump-reserve-evacuate
label bargain-pump-reserve-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 我摸着水壶。面前的人伸出手。这一壶水，不能给这个人又给那个人。
An [sad, explain]: 还不知道怎么办。说一起负责，不够。
choice agreement-pump-reserve-evacuate
option exclusive "给山上面的人6桶。他们负责机器。河那里的人要向他们要水。" -> exclusive ; water -= 6
option emergency "先给需要水的人。机器不是他们的。他们可能不再相信我。" -> emergency
label ready-listen-reserve-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
effect shake
I: 风暴来了。我们要停下来。
An [worried, explain]: 山上面的人愿意给2桶水。不过要求先给他们6桶，而且他们负责机器。
Jonathan [skeptical, question]: 他们的孩子要喝水。不过河那里的人没有选择。
choice promise-listen-reserve-evacuate
option pledge "答应先给他们6桶，而且他们负责机器。他们就给2桶。" -> pledged-listen-reserve-evacuate ; promised = true, water += 2
option decline "不答应。他们不给2桶，我们还可以考虑。" -> declined-listen-reserve-evacuate
label pledged-listen-reserve-evacuate
An [worried, insist]: 我记录了你答应的话。以后不一样，要说为什么。
goto bargain-listen-reserve-evacuate
label declined-listen-reserve-evacuate
An [neutral, explain]: 他们捎着2桶水走了。还可以谈话，不过没有那2桶水。
goto bargain-listen-reserve-evacuate
label bargain-listen-reserve-evacuate
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 我摸着水壶。面前的人伸出手。这一壶水，不能给这个人又给那个人。
An [sad, explain]: 还不知道怎么办。说一起负责，不够。
choice agreement-listen-reserve-evacuate
option exclusive "给山上面的人6桶。他们负责机器。河那里的人要向他们要水。" -> exclusive ; water -= 6
option emergency "先给需要水的人。机器不是他们的。他们可能不再相信我。" -> emergency
label exclusive
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
An [sad, explain]: 他们有了6桶水。答应明天修机器。不过河那里的人不能选择。
goto medical
label emergency
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
if promised == true -> broken else independent
label broken
An [worried, insist]: 你说的话不一样了。他们没有要回2桶，不过不愿意帮忙修管子了。
goto medical
label independent
An [neutral, explain]: 我们没有说谎。今天晚上先给需要水的人。明天谁修管子？还不知道。
goto medical
label shared
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 4桶水给了机器。沙出来了。机器好了，不过今天晚上没有新水。
An [relieved, explain]: 他们答应一起负责。所有人可以看记录。不是山上面的人说了就算。
goto medical
label medical
if evacuated == true -> safe-high else supply-check
label supply-check
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
if water >= 4 -> medical-choice else no-water
label medical-choice
Min [pleading, insist]: 她还在等。4桶水可以保护她。不过明天会少4桶。
choice medical
option treat "给Mei4桶。保护她。明天再找水。" -> treated ; water -= 4
option keep "留下4桶，明天用。Mei今天晚上会去世。" -> lost
label no-water
Min [sad, hesitant]: 水不够4桶。不能陪她去上面了。
I: 医生陪着她。Mei还是去世了。Min说过，先陪她去上面。
goto close
label lost
Min [sad, hesitant]: 水还在。她不在了。
I: Mei去世了。我选择不给她水。我会记得。
goto close
label treated
Min [relieved, reassure]: 她的呼吸好了。今天晚上安全了。明天我陪你们找水。
goto close
label safe-high
scene home
show Jonathan worried left
show Min worried right
camera two Jonathan Min cut
Min [relieved, reassure]: 上面的医生说，Mei安全了。我们提前走，就不需要这里的4桶水。
goto close
label close
scene home
show Jonathan worried left
show An worried right
camera two Jonathan An cut
I: 风暴过去了。谁负责水，谁能开门，不一样了。
An [worried, explain]: 看那里的石头。有裂缝。明天找水，要考虑这条路。
Jonathan [determined, explain]: 先记录今天晚上的选择。明天，我们去看裂缝。
end
