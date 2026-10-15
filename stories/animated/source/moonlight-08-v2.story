story 2
variable quiet = false hidden
variable proof = false hidden
label opening
scene hall
show Hyun embarrassed left
show Instructor determined right
move Instructor turn
rest Instructor arms-crossed
look Instructor Hyun
camera wide
I: 我走进训练场。教官马上看我。
camera medium Instructor
Instructor [determined]: 年轻人，你是刚来的吧？
express Hyun embarrassed
rest Hyun downcast
look Hyun down
camera close Hyun
I: 第一天就让别人取笑，我心里还不舒服。
look Hyun auto
Hyun [neutral, hesitant]: 是的。
camera medium Instructor
Instructor [neutral, explain]: 以后要打怪物，就必须学会用剑。
Instructor [curious]: 需要我教你吗？
camera wide
rest Instructor attentive
react Instructor point
Instructor [neutral]: 找一个没人在用的稻草人，想怎么打都可以。
Instructor [neutral]: 前面有木头做的剑。可以用那把剑。
camera medium Hyun
Hyun [neutral]: 谢谢。这样就很好，不用再说了。
camera medium Instructor
Instructor [neutral]: 希望你有好运气。
move Instructor exit
express Hyun determined
rest Hyun attentive
camera medium Hyun
choice approach
option corner "找个离别人远一点的地方。" -> corner ; quiet = true
option begin "我想马上开始练习。" -> begin
label corner
Hyun [embarrassed]: 这里没有路上那么多人看我吧。
goto target
label begin
Hyun [determined]: 不再想刚才的事了。先用剑练习。
label target
show Dummy neutral right
look Hyun Dummy
camera wide
react Hyun reach
I: 剑在手里。我走到最远的地方，找到一个稻草人。
I: 它不说话。我也不说话。
perform Hyun sword-strike Dummy repeat 1 steady
I: 一下。
perform Hyun sword-strike Dummy repeat 1 steady
I: 两下。
perform Hyun sword-strike Dummy repeat 1 steady
I: 三下。我慢慢觉得，手里的剑不那么奇怪了。
camera medium Hyun
Hyun [determined]: 手要知道怎么动。只有想法，没有用。
I: 新来的四个星期，我不能离开城市去打怪物，等级也不会变。
I: 别人做任务，得到钱，也认识更多人。
camera wide
I: 我还是在打面前的它。
perform Hyun sword-strike Dummy repeat 3 steady
I: 这里有差不多一千个草做的人，也有很多木头做的剑。
I: 可是，大家开始看我了。
look Hyun auto
move Dummy exit
show Watcher surprised right
move Watcher turn
camera medium Watcher
Watcher [surprised]: 这个人真强！
camera close Hyun
I: 我听到声音，手却没有停。
camera medium Watcher
Watcher [confused]: 怎么会有人一直这样练习？
camera wide
Watcher [skeptical]: 一下都不休息？
express Hyun determined
prop Hyun sword
rest Hyun attentive
camera close Hyun
choice watching
option watch "想看就看吧。我有要做的事。" -> watch
option change "我想知道，这样练习会不会有用。" -> change ; proof = true
label watch
Hyun [determined]: 他们说他们的。我做我的。
goto hours
label change
Hyun [curious]: 现在没有变，不是说以后也不会变。
label hours
move Watcher exit
show Dummy neutral right
look Hyun Dummy
camera wide
I: 汗越来越多。衣服已经贴在身上了。
perform Hyun sword-strike Dummy repeat 3 tiring
I: 我没有休息。一下，又一下。
I: 六个小时过去了。
camera medium Hyun
I: 这时候，我听到系统的声音。
I: 力量增加了一点。
express Hyun surprised
prop Hyun sword
react Hyun nod
rest Hyun attentive
camera close Hyun
Hyun [surprised]: 真的变强了？
I: 手里的剑，好像轻了一点。
if proof == true -> proofReturn else watchReturn
label proofReturn
Hyun [relieved]: 刚才我想知道有没有用。现在，我知道了。
goto quietReturn
label watchReturn
Hyun [relieved]: 一直做下去，终于变了。
label quietReturn
if quiet == true -> cornerReturn else beginReturn
label cornerReturn
Hyun [determined]: 我来这里，不只是为了不让别人看。
goto stats
label beginReturn
Hyun [determined]: 刚才开始练习。现在，我还想拿着它。
label stats
camera medium Hyun
Hyun [neutral]: 打开属性窗口。
I: 我的名字是杂草。等级还是一，职业还是没有。
I: 力量是十一。只是多了一点，我还不强。
camera close Hyun
Hyun [determined]: 但是，这一点，是我一直练习才得到的。
camera wide
perform Hyun sword-strike Dummy repeat 3 steady
I: 面前还是那个稻草人。手里的剑，又动了。
end
