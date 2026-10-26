import {useEffect,useState} from 'react'
import type {Release} from './animation/storage'
export const categoryOf=(r:Release)=>r.category??(r.id.startsWith('moonlight-')?'lms':'daily-life')
export const episodeNumber=(r:Release)=>r.episode??Number(r.id.match(/^moonlight-(\d+)/)?.[1]??0)
export function orderedEpisodes(items:Release[],category:string){return items.filter(r=>categoryOf(r)===category).sort((a,b)=>episodeNumber(a)-episodeNumber(b)||a.created.localeCompare(b.created)||a.id.localeCompare(b.id))}
export function nextEpisode(items:Release[],current:Release){if(categoryOf(current)==='practice')return undefined;const list=orderedEpisodes(items,categoryOf(current)),i=list.findIndex(r=>r.id===current.id);return i<0?undefined:list[i+1]}
const books=[{id:'lms',name:'Legendary Moonlight Sculptor'},{id:'name-of-the-wind',name:'The Name of the Wind'},{id:'jedi',name:'The Voices Beneath the Water',cover:'stories/animated/jedi/series-cover.jpg'},{id:'daily-life',name:'Daily Life'}]
const shortTitle=(r:Release)=>r.pack.title.replace(/^(?:Moonlight Sculptor\s*\d+\s*·|The Name of the Wind\s*\d+\s*·|.*?Episode\s*\d+\s*[:—–-])\s*/i,'')
export default function EpisodeLibrary({items,onPlay,onExport,onEdit,preferencesKey='story2:library',opening=false,playMessage=''}:{opening?:boolean;playMessage?:string;preferencesKey?:string;items:Release[];onPlay:(r:Release,restart?:boolean)=>void;onExport:(r:Release)=>void;onEdit:(r:Release)=>void}){
 const saved=()=>{try{const value=JSON.parse(localStorage.getItem(preferencesKey)??'{}');return value&&typeof value==='object'?value:{}}catch{return {}}}
 const [category,setCategory]=useState(()=>books.some(b=>b.id===saved().category)?saved().category as string:'lms'),[selected,setSelected]=useState<Record<string,string>>(()=>{const value=saved().selected;return value&&typeof value==='object'?value:{}}),[query,setQuery]=useState('')
 useEffect(()=>{try{localStorage.setItem(preferencesKey,JSON.stringify({category,selected}))}catch{/* Selection still works without storage. */}},[category,selected,preferencesKey])
 const episodes=orderedEpisodes(items,category),filtered=episodes.filter(r=>`${episodeNumber(r)} ${r.pack.title}`.toLowerCase().includes(query.trim().toLowerCase()))
 const active=filtered.find(r=>r.id===selected[category])??filtered[0],index=active?episodes.indexOf(active):-1
 const choose=(r:Release)=>setSelected(old=>({...old,[category]:r.id}))
 const book=books.find(b=>b.id===category)!,background=book.cover?`${import.meta.env.BASE_URL}${book.cover}`:active&&Object.values(active.pack.assets.backgrounds)[0]?.src
 return <div className="episode-library">
  <div className="episode-navigation">
   <label>Book<select aria-label="Book" value={category} onChange={e=>{setCategory(e.target.value);setQuery('')}}>{books.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
   <label>Find an episode<input type="search" aria-label="Find an episode" placeholder="Title or number" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label className="episode-select">Episode<select aria-label="Episode" value={active?.id??''} disabled={!filtered.length} onChange={e=>setSelected(old=>({...old,[category]:e.target.value}))}>{filtered.length?filtered.map((r,i)=><option key={r.id} value={r.id}>{String(episodeNumber(r)||i+1).padStart(2,'0')} · {shortTitle(r)}</option>):<option value="">{episodes.length?'No matching episodes':'No episodes yet'}</option>}</select></label>
  </div>
  <div className="episode-paging"><button disabled={index<=0} onClick={()=>{setQuery('');choose(episodes[index-1])}}>← Previous</button><p aria-live="polite">{active?`${index+1} of ${episodes.length} episodes`:`${episodes.length} episodes`}</p><button disabled={index<0||index>=episodes.length-1} onClick={()=>{setQuery('');choose(episodes[index+1])}}>Next →</button></div>
  <h2 className="library-section-title">{book.name}</h2>
  {active?<article className="featured-episode">{background&&<img className="episode-cover" src={background} alt=""/>}<div><p className="game-kicker">EPISODE {episodeNumber(active)||index+1}</p><h2>{shortTitle(active)}</h2><p>{active.pack.description}</p><button className="episode-primary" disabled={opening} aria-busy={opening} onClick={()=>onPlay(active)}>Play / resume episode <span aria-hidden="true">→</span></button>{playMessage&&<p role="status" className="episode-open-status">{playMessage}</p>}<div className="episode-utilities"><button disabled={opening} onClick={()=>onPlay(active,true)}>Restart episode</button><button onClick={()=>onExport(active)}>Export episode ZIP</button>{active.created&&<button onClick={()=>onEdit(active)}>Edit a copy</button>}</div></div></article>:<div className="empty-category"><h3>{episodes.length?'No matching episodes':book.name}</h3><p>{episodes.length?'Try another title or episode number.':`No ${book.name} episodes yet. New episodes will appear here in order.`}</p>{query&&<button onClick={()=>setQuery('')}>Clear search</button>}</div>}
 </div>
}
