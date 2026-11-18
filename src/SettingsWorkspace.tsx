import {Children,isValidElement,useState,type ReactNode} from 'react'
import './settings-workspace.css'
const groups=[
 {label:'Learning',items:['Reader','Flashcards','Goals','Appearance','Hotkeys']},
 {label:'Library & device',items:['Imports & Packs','Flight mode','AI Story Generation']},
 {label:'Account & data',items:['Account & Sync','Data Health','Backup & Export']},
]
const paths:Record<string,string>={
 Reader:'M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z',
 Flashcards:'M7 7h14v13H7zM3 16V3h14',Goals:'M20 12a8 8 0 1 1-8-8m0 4a4 4 0 1 0 4 4m-4 0 9-9m-4 0h4v4',
 Appearance:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4 2 2 0 0 1 0-4h4a3 3 0 0 0 3-3c0-4-4-7-9-7ZM7 9h.01M11 6h.01M16 7h.01M6 14h.01',
 Hotkeys:'M3 6h18v12H3zM6 9h1m3 0h1m3 0h1m3 0h.01M6 12h1m3 0h1m3 0h1M7 15h10',
 'Imports & Packs':'m12 3 9 5-9 5-9-5Zm-9 10 9 5 9-5M3 18l9 5 9-5',
 'Flight mode':'m3 10 7 2 5-8c1-2 4-2 3 1l-4 9 6 4-1 2-8-3-4 4-2-1 2-5-5-3Z',
 'AI Story Generation':'m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z',
 'Account & Sync':'M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10H7',
 'Data Health':'M2 12h5l3-8 4 16 3-8h5',
 'Backup & Export':'M12 16V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2',
}
export default function SettingsWorkspace({children}:{children:ReactNode}){
 const [selected,setSelected]=useState('Reader')
 const sections=Children.toArray(children).flatMap(child=>{
  if(!isValidElement<{children:ReactNode}>(child))return []
  const [summary,...body]=Children.toArray(child.props.children)
  if(!isValidElement<{children:ReactNode}>(summary))return []
  return [{title:Children.toArray(summary.props.children).join(''),body}]
 })
 return <div className="settings-workspace">
  <label className="settings-section-picker">Settings section<select aria-label="Settings section" value={selected} onChange={e=>setSelected(e.target.value)}>{groups.map(group=><optgroup key={group.label} label={group.label}>{group.items.map(title=><option key={title}>{title}</option>)}</optgroup>)}</select></label>
  <nav className="settings-rail" aria-label="Settings sections">{groups.map(group=><div className="settings-nav-group" key={group.label}><h2>{group.label}</h2>{group.items.map(title=><button type="button" className="settings-group-summary" key={title} aria-label={title+' settings'} aria-current={selected===title?'page':undefined} aria-controls={'settings-'+title.replaceAll(' ','-')} onClick={()=>setSelected(title)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[title]}/></svg><span>{title}</span></button>)}</div>)}</nav>
  <div className="settings-content">{sections.map(({title,body})=><section key={title} id={'settings-'+title.replaceAll(' ','-')} className="settings-category" aria-label={title} hidden={selected!==title}>{body}</section>)}</div>
 </div>
}
