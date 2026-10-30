import {readFileSync,mkdirSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {chromium} from '@playwright/test'
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)]}))
if(!args.source?.endsWith('.svg')||!args.output?.endsWith('.png')||!resolve(args.output).startsWith(resolve('.local')+'/'))throw Error('Use --source=authored.svg --output=.local/scene.png')
const svg=readFileSync(args.source,'utf8')
if(/<script|<foreignObject|\bon\w+\s*=|(?:href|url)\s*[=(]/i.test(svg))throw Error('Use self-contained SVG shapes without scripts or external references.')
mkdirSync(dirname(args.output),{recursive:true})
const browser=await chromium.launch()
try{const page=await browser.newPage({viewport:{width:1280,height:720}});await page.route('**/*',route=>route.abort());await page.goto('data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'));await page.screenshot({path:args.output});console.log(args.output)}finally{await browser.close()}
