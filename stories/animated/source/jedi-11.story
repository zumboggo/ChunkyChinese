story 2
variable water = 0 range 0 30 visible
label opening
scene station
show Jonathan curious left
show Min worried right
show An determined far-right
camera wide
I: Min提前来了。他记录了从前的选择，包括所有马虎的地方。
Min [worried, explain]: 这里是我马虎的地方。今天，先检查它。
An [determined, explain]: 好。这段管子和喝水的管子，分开了。
Jonathan [curious, question]: 要用能喝的水吗？
An [determined, explain]: 不用。我们用空气试一试。有专门的机器。所有人要听好安全要求。
choice preparation
option gauge "我看气压表。" -> gauge
option joint "我检查修过的地方。" -> joint
label gauge
Min [determined, explain]: 好。我记录。表变了，就叫停。
goto first
label joint
An [determined, explain]: 好。我看表。我们分别检查，不替别人回答。
goto first
label first
I: Min检查好机器。我们先听An说明安全要求，然后试一试。
camera two Jonathan Min cut
I: 气压慢慢下来。Min记录了，停了机器。
Min [worried, explain]: 不合格。我们修得不好。
choice response
option evidence "先别下结论。我们还要检查。" -> evidence
option hope "我想它合格。不过，想法不是记录。" -> hope
label evidence
Min [worried, explain]: 气压变了。我还不知道为什么。
goto honesty
label hope
Min [sad, explain]: 我想听你说合格。不过，你没有说谎。
goto honesty
label honesty
Min [sad, explain]: 我害怕修不好，就没有人要我帮忙了。
camera listener Min over 0.65
Jonathan [worried, explain]: 我不能替机器答应合格。不过，我会陪你检查。
rest Min attentive
I: Min慢慢点头。我耐心等着，不再替他回答。
camera two Jonathan An cut
An [determined, explain]: 我们要先试一试，然后相信。首先，检查机器。其次，检查修好的管子。
I: 机器停好了。An检查安全以后，叫我们来。
choice check
option hose "先检查机器的管子。" -> hose
option independent "An，请你也检查。" -> independent
label hose
react Jonathan crouch
I: 我看出来了。机器的管子没有接好。这里漏气，不是新的接口。
An [determined, explain]: 这里坏了，不表示别处就合格。修好以后，我们还要试一试。
goto retry
label independent
An [curious, explain]: 机器的管子没有接好。记录包括它的问题。
Jonathan [determined, explain]: 那我们还不知道修好的管子合格不合格。
goto retry
label retry
camera wide
I: Min换了机器的管子，记录好了。我们去安全的地方。
Min [determined, explain]: 我们试一试。不管合格不合格，我都记录。
I: An严格检查。气压没有变，新的接口没有漏气。
An [relieved, explain]: 这段管子合格。不过，还要清洗。水也要检查，合格了才能喝。
Min [relieved, question]: 不是我不合格，是还有地方要修？
Jonathan [happy, explain]: 对。现在，我们知道了。不用害怕记录不合格。
scene landing
show Jonathan relieved left
show Mother determined right
show An curious far-right
camera wide
I: 飞船来了。妈妈愿意来帮忙。她今天没有答应替Ren负责。
Mother [determined, explain]: 船员捎来2桶干净的水。桶有封口，水有合格的检查记录。
An [determined, explain]: 首先，检查记录和封口。然后，看水有多少。不能马虎。
I: 我们一起检查。记录合格，封口没有坏，是2桶水。
camera two Jonathan Mother cut
choice delivery
option ledger "我记录，请你检查。" -> ledger ; water += 2
option count "我们一起看有多少，然后记录。" -> count ; water += 2
label ledger
Mother [determined, explain]: 2桶，我检查了。要记录：这是今天捎来的。
goto common
label count
Mother [relieved, explain]: 好。是2桶。你看，我也请别人检查。
goto common
label common
I: 水收好了。我们保留从前的记录，补充今天捎来的水。
An [determined, explain]: 从前答应怎样分水，还要负责。我们先记录，不偷偷分水。
Jonathan [determined, explain]: 好。管子还关着。能喝的水，今天多了2桶。
camera two Jonathan An cut
An [happy, question]: 今天有什么收获？
Jonathan [relieved, explain]: 不光是水。我们可以说不合格，然后一起修好。
I: 我们捎着水回去。明天，一起清洗和检查管子。
end
