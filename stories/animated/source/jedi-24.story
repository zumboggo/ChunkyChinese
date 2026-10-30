story 2
variable water = 2 range 0 40 visible
scene courtyard
show Jonathan neutral left
show Luma worried right
show Daro happy center
camera two Jonathan Luma cut
I: 屋子还不能开门。我们先研究照片。
Luma [worried, explain]: 我的皱纹很难看。我不愿意拍。
Daro [happy, explain]: 我娶你的时候，你很自信。
Luma [skeptical, explain]: 老公，你近视，看我不够清楚。
Jonathan [neutral, question]: 你想给别人看什么？我先听你说。
Luma [worried, explain]: 从前的青春。我看着照片发呆，不想看今天的我。
choice listen
option ask "问她的烦恼。" -> ask
option wait "先等她说。" -> wait
label ask
Jonathan [neutral, question]: 你不想拍，你害怕别人的批评吗？
goto hear
label wait
Jonathan [neutral, explain]: 不着急。你不答应，我就不拍。
label hear
Luma [worried, explain]: 显然，我在走下坡路。青春过去，别人还想看我吗？
Daro [neutral, explain]: 我的老婆是宝贝。皱纹又不是坏处。
Luma [skeptical, explain]: 丈夫可以这样想。我不能因为你的感情，就没有烦恼。
Jonathan [embarrassed, explain]: 我想说你绝对好看。不过，我不够耐心。
Luma [neutral, explain]: 难看也不必说谎话。我想知道，没有青春，我还有什么值得别人看。
show Nia worried far-right
camera two Jonathan Nia cut
Nia [worried, explain]: 我叫Nia。我负责照片，不过，我有痘痘，不想进去。
Luma [surprised, question]: 姑娘，你也有烦恼？我以为年轻人都自然地笑。
Nia [worried, explain]: 痘痘叫我不敢看人。别人说没事，我还是紧张。
Daro [neutral, explain]: 我近视，要戴眼镜。不过，眼镜没有解决她的烦恼。
Jonathan [neutral, explain]: 所有人的神经很紧张。我先放下相机。
I: 我放下相机，先听她们说。
choice camera
option share "说自己的紧张。" -> share
option space "问她们想不想休息。" -> space
label share
Jonathan [embarrassed, explain]: 我也怕自己难看。有时候，我笑得太用力。
goto listenagain
label space
Nia [neutral, explain]: 我想继续，不过，先别叫我笑。
label listenagain
camera two Jonathan Luma cut
Luma [neutral, explain]: 临开门，我们要亲密的照片。我可以帮忙，不过不必拍我。
Daro [neutral, explain]: 我想拍你帮忙的时候。你愿意先帮忙。
Luma [skeptical, question]: 那不是选美的照片。你不是为了表扬我吧？
Daro [neutral, explain]: 我娶你，不是买照片。我想陪着你。
camera listener Jonathan over 0.65
Luma [neutral, explain]: 我想自己选择，不想让别人替我决定。
rest Jonathan attentive
I: 我的手离开相机。我等她继续说。
camera two Jonathan Luma cut
Jonathan [neutral, explain]: 照片是你的。你可以选择，也可以不拍。
Luma [neutral, explain]: 那我想看看我帮忙时候的照片。不过，先给我看。
Daro [happy, explain]: 老婆，这样可以吗？我陪着你，不挡着你。
Luma [happy, explain]: 老公，你可以帮忙。别只负责表扬。
Nia [happy, explain]: 亲密的感情值得保护。不过，不能要求所有人表示亲密。
Jonathan [neutral, explain]: 既要考虑感情，又要给他们选择。不能只考虑照片。
Luma [happy, explain]: 我涂口红吧。我愿意，不是为了别人。
Daro [happy, explain]: 口红是你的选择。丈夫要听老婆的要求。
Nia [neutral, explain]: 我不藏痘痘。我愿意给别人看我帮忙的时候。
Jonathan [happy, explain]: 我们先列出要求。不必巧妙地保护形象。
choice photos
option work "先拍一起帮忙。" -> work
option choose "先听她们的要求。" -> choose
label work
Nia [happy, explain]: 我来帮忙，拍的时候先问我。
goto display
label choose
Luma [happy, explain]: 就在这里吧。我想和他做伴。
label display
I: 她们答应后，我拍照片。她们检查，选择哪张。
Daro [happy, explain]: 宝贝，看看这张。我忘了戴眼镜。
Luma [happy, laugh]: 哈哈，你忍不住笑，我渐渐安心了。
Nia [neutral, explain]: 这不是侥幸。你们愿意沟通，我敢继续了。
Jonathan [neutral, explain]: 我从前研究哲学，想成为哲学家。
Luma [neutral, explain]: 现实要求你先听。别只考虑结论。
Jonathan [neutral, explain]: 你的语气很严肃。我会记得。
Daro [neutral, explain]: 别说你在走下坡路。你可以难过，不过，你仍然有选择。
Luma [neutral, explain]: 我不想发呆了。我想陪Nia选择照片。
Nia [happy, explain]: 我的神经渐渐不紧张了。于是，我愿意拍了。
Jonathan [happy, explain]: 趁我们还在一起，看看谁愿意拍。
choice memory
option quiet "不拍的人也可以做伴。" -> quiet
option names "每个人选择要不要写名字。" -> names
label quiet
Luma [neutral, explain]: 不拍也可以做伴。我负责说明。
goto finish
label names
Nia [neutral, explain]: 可以不写。我不替别人答应。
label finish
I: 照片按要求放好。没有人非拍不可。
Jonathan [neutral, explain]: 想念的人，我们仍然记得。不用说出所有记忆。
Luma [happy, explain]: 我选择这张。我有皱纹，不过，我愿意。
Nia [happy, explain]: 照片检查好了。最后的检查结束，我们开门。
Jonathan [neutral, explain]: 水和从前一样。照片检查好了，屋子还要等最后的检查。
end
