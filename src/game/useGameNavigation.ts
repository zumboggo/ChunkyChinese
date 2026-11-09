import {useEffect, type RefObject} from 'react'

// Keep navigation tied to the rendered controls, including newly revealed choices.
export function useGameNavigation(root: RefObject<HTMLElement | null>) {
 useEffect(()=>{
  const element=root.current
  if(!element)return
  const section:HTMLElement=element
  let active=false, frame=0, previous=new Set<string>(), repeatAt=0
  const visible=(el:HTMLElement)=>el.getClientRects().length>0&&!el.closest('[hidden],[inert]')&&getComputedStyle(el).visibility!=='hidden'
  const controls=()=>{
   const dialog=Array.from(section.querySelectorAll<HTMLElement>('dialog[open],[role="dialog"]')).filter(visible).at(-1)
   return Array.from((dialog??section).querySelectorAll<HTMLElement>('button,a[href],summary,input,select,textarea,[tabindex="0"]')).filter(el=>visible(el)&&!el.matches(':disabled,[aria-disabled="true"]'))
  }
  const focus=(el:HTMLElement|undefined)=>{el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest',inline:'nearest'})}
  const current=()=>controls().find(el=>el===document.activeElement)
  function move(delta:number){const items=controls(),index=items.indexOf(document.activeElement as HTMLElement);focus(items[index<0?0:(index+delta+items.length)%items.length])}
  function adjust(delta:number){
   const el=current()
   if(el instanceof HTMLSelectElement){
    const options=Array.from(el.options).filter(o=>!o.disabled),index=options.indexOf(el.selectedOptions[0])
    const next=options[Math.max(0,Math.min(options.length-1,index+delta))]
    if(next){el.value=next.value;el.dispatchEvent(new Event('change',{bubbles:true}))}return true
   }
   if(el instanceof HTMLInputElement&&el.type==='range'){
    const value=Math.max(Number(el.min||0),Math.min(Number(el.max||100),Number(el.value)+delta*Number(el.step==='any'?0.1:el.step||1)))
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set?.call(el,String(value))
    el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true
   }return false
  }
  function back(){
   const el=current(),details=el?.closest('details[open]')??Array.from(section.querySelectorAll<HTMLDetailsElement>('details[open]')).filter(visible).at(-1)
   if(details instanceof HTMLDetailsElement){details.open=false;focus(details.querySelector('summary')??undefined);return}
   const expanded=Array.from(section.querySelectorAll<HTMLButtonElement>('button[aria-expanded="true"]')).find(visible)
   if(expanded){expanded.click();focus(expanded);return}
   section.querySelector<HTMLButtonElement>('.cinema-back')?.click()
  }
  function action(key:string){
   active=true;section!.dataset.controller='true'
   if(key==='up'||key==='previous')move(-1)
   else if(key==='down'||key==='next')move(1)
   else if(key==='left'||key==='right'){const delta=key==='left'?-1:1;if(!adjust(delta))move(delta)}
   else if(key==='accept'){const el=current();if(el)el.click();else move(1)}
   else if(key==='back')back()
  }
  const keyboard=(event:KeyboardEvent)=>{
   if(event.ctrlKey||event.metaKey||event.altKey)return
   const target=event.target as HTMLElement
   if(target!==document.body&&!section.contains(target))return
   if(target?.matches('textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"])')||target?.isContentEditable)return
   // Passage arrows belong to playback; settings and controller arrows still move focus.
   if(['ArrowLeft','ArrowRight'].includes(event.key)&&(target.closest('.animated-story')||(target===document.body&&section.querySelector('.animated-story')&&!section.querySelector('.episode-settings[open]')))&&!target.closest('details,input,select,textarea,.episode-chunk'))return
   const key=({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'accept',Escape:'back'} as Record<string,string>)[event.key]
   if(!key)return
   event.preventDefault();event.stopImmediatePropagation()
   if(!event.repeat||['up','down','left','right'].includes(key))action(key)
  }
  function poll(now:number){
   if(!document.hidden&&document.hasFocus()){
    let pads:(Gamepad|null)[]=[]
    try{pads=Array.from(navigator.getGamepads?.()??[])}catch{/* Browser may disable this API. */}
    const pressed=new Set<string>()
    for(const pad of pads){if(!pad?.connected)continue
     const button=(i:number)=>pad.buttons[i]?.pressed
     if(button(0))pressed.add('accept');if(button(1))pressed.add('back')
     if(button(4))pressed.add('previous');if(button(5))pressed.add('next')
     if(button(12)||(pad.axes[1]??0)<-0.55)pressed.add('up')
     if(button(13)||(pad.axes[1]??0)>0.55)pressed.add('down')
     if(button(14)||(pad.axes[0]??0)<-0.55)pressed.add('left')
     if(button(15)||(pad.axes[0]??0)>0.55)pressed.add('right')
    }
    for(const key of pressed){const fresh=!previous.has(key);if(fresh||(['up','down','left','right','previous','next'].includes(key)&&now>=repeatAt)){action(key);repeatAt=now+(fresh?400:140)}}
    previous=pressed
    if(active&&!current())move(1)
   }else{previous=new Set()}
   frame=requestAnimationFrame(poll)
  }
  window.addEventListener('keydown',keyboard,true)
  frame=requestAnimationFrame(poll)
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyboard,true);delete section.dataset.controller}
 },[root])
}
