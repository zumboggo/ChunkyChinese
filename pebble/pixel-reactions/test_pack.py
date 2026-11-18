import json, tempfile, unittest
from pathlib import Path
from PIL import Image
from pack import pack, encode, decode, EMOTIONS

class PackingTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        self.palette=[(0,0,0),(85,85,85),(170,85,0),(255,170,85)]
        self.image=Image.new('RGBA',(32,32))
        for y in range(32):
            for x in range(32):
                if (x+y)%5:self.image.putpixel((x,y),(*self.palette[(x+y)%4],255))
        self.image.save(self.root/'frame.png')
        self.manifest={'character':'test','palette':['#000000','#555555','#aa5500','#ffaa55'],
                       'animations':{e:[{'file':'frame.png','ms':200},{'file':'frame.png','ms':400}] for e in EMOTIONS}}
    def tearDown(self):self.tmp.cleanup()
    def run_pack(self):
        p=self.root/'manifest.json';p.write_text(json.dumps(self.manifest));return pack(p,self.root/'out')
    def test_round_trip_all_four_colors_and_transparency(self):
        data=encode(self.root/'frame.png',self.palette)
        self.assertEqual(len(data),512)
        self.assertEqual(list(self.image.getdata()),list(decode(data,self.palette).getdata()))
    def test_five_colors_plus_transparency(self):
        palette=self.palette+[(255,255,170)]
        self.image.putpixel((16,16),(*palette[4],255));self.image.save(self.root/'frame.png')
        self.assertEqual(list(self.image.getdata()),list(decode(encode(self.root/'frame.png',palette),palette).getdata()))
    def test_approved_animation_frames_and_timing(self):
        root=Path(__file__).resolve().parent/'characters/alden-chibi'
        manifest=json.loads((root/'manifest.json').read_text())
        palette=[tuple(bytes.fromhex(c[1:])) for c in manifest['palette']]
        self.assertEqual(len(palette),5)
        for entries in manifest['animations'].values():
            frames=[encode(root/e['file'],palette) for e in entries]
            self.assertGreater(len(set(frames)),1)
            self.assertLessEqual(sum(e['ms'] for e in entries),2000)
    def test_deduplication_and_finite_preview(self):
        result=self.run_pack();self.assertEqual(result['uniqueFrames'],1);self.assertEqual(result['resourceBytes'],612)
        with Image.open(self.root/'out/previews/idle.gif') as gif:self.assertNotIn('loop',gif.info)
    def test_invalid_dimensions_alpha_and_fifth_color(self):
        for size,color in [((31,32),(0,0,0,255)),((32,32),(0,0,0,127)),((32,32),(255,255,255,255))]:
            with self.subTest(size=size,color=color):
                Image.new('RGBA',size,color).save(self.root/'frame.png')
                with self.assertRaises(ValueError):self.run_pack()
    def test_missing_emotion_invalid_timing_and_palette(self):
        del self.manifest['animations']['happy']
        with self.assertRaises(ValueError):self.run_pack()
        self.manifest['animations']['happy']=[{'file':'frame.png','ms':1}]*2
        with self.assertRaises(ValueError):self.run_pack()
        self.manifest['animations']['happy'][0]['ms']=200;self.manifest['palette'][0]='#010101'
        with self.assertRaises(ValueError):self.run_pack()

if __name__=='__main__':unittest.main()
