import {useEffect, type RefObject} from 'react'

const bindings=[[0,'next'],[1,'sentence-back'],[2,'primary'],[3,'secondary'],[4,'previous'],[5,'next'],
 [12,'up'],[13,'down'],[14,'left'],[15,'right']] as const

// Keep navigation tied to the rendered controls, including newly revealed choices.
export function useGameNavigation(root: RefObject<HTMLElement | null>) {
 useEffect(()=>{
  const element=root.current
  if(!element)return
  const section:HTMLElement=element
  let frame=0, previous=new Map<string,number>()
  const visible=(el:HTMLElement)=>{
   if(!el.getClientRects().length||el.closest('[hidden],[inert],[aria-hidden=true]')||getComputedStyle(el).visibility==='hidden')return false
   for(let parent=el.parentElement;parent;parent=parent.parentElement){
    if(parent instanceof HTMLDetailsElement&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(el))return false
   }
   return true
  }
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
   section.querySelector<HTMLElement>('.animated-story')?.dispatchEvent(new CustomEvent('mangmi-action',{detail:'back'}))
  }
  function activate(el:HTMLElement){
   if(el instanceof HTMLSelectElement){
    try{el.showPicker()}catch{/* D-pad left and right can still change the selection. */}
   }else el.click()
  }
  function action(key:string){
   section!.dataset.controller='true'
   if(key==='up'||key==='previous')move(-1)
   else if(key==='down'||key==='next')move(1)
   else if(key==='left'||key==='right'){const delta=key==='left'?-1:1;if(!adjust(delta))move(delta)}
   else if(key==='accept'){const el=current();if(el)activate(el);else move(1)}
   else if(key==='back')back()
  }
  function click(selector:string,index=0){
   const el=Array.from(section.querySelectorAll<HTMLElement>(selector)).filter(visible)[index]
   if(!el)return false
   if(!el.matches(':disabled,[aria-disabled="true"]'))el.click()
   return true
  }
  function handheld(key:string){
   section.dataset.controller='true'
   if(key==='next'||key==='previous'){move(key==='next'?1:-1);return}
   if(key==='up'||key==='down'){
    // Scroll the nearest scrollable panel, or the document, without moving focus.
    const top=key==='up'?-90:90
    const canScroll=(el:HTMLElement)=>/^(auto|scroll)$/.test(getComputedStyle(el).overflowY)
      && (top<0?el.scrollTop>0:el.scrollTop+el.clientHeight<el.scrollHeight-1)
    let el=current()??section
    while(el!==document.body){
     if(canScroll(el)){el.scrollBy({top,behavior:'instant'});return}
     if(!el.parentElement)break
     el=el.parentElement
    }
    const panel=Array.from(section.querySelectorAll<HTMLElement>('dialog[open],.episode-settings-panel,.story-dialogue,.pocket-audio')).find(el=>visible(el)&&canScroll(el))
    if(panel)panel.scrollBy({top,behavior:'instant'})
    else window.scrollBy({top,behavior:'instant'})
    return
   }
   if(key==='left'||key==='right'){adjust(key==='left'?-1:1);return}
   const story=section.querySelector<HTMLElement>('.animated-story')
   if(key==='sentence-back'){
    if(story)story.dispatchEvent(new CustomEvent('mangmi-action',{detail:'back'}))
    else click('[data-game-previous]')
    return
   }
   if(key==='primary'){
    const el=current()
    // Focused settings remain operable after A tabs to them.
    if(el?.closest('.episode-settings,.story-slide-toggles,dialog,[role="dialog"],.cinema-more')){activate(el);return}
    if(story){story.dispatchEvent(new CustomEvent('mangmi-action',{detail:'continue'}));return}
    if(click('[data-game-choice]')||click('[data-game-next]'))return
    if(el&&!el.matches('.cinema-back'))activate(el);else move(1)
   }
   if(key==='secondary'){
    if(story)story.dispatchEvent(new CustomEvent('mangmi-action',{detail:'audio'}))
    else if(!click('[data-game-choice]',1))click('[data-game-replay]')
   }
  }
  const keyboard=(event:KeyboardEvent)=>{
   if(event.defaultPrevented||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return
   const target=event.target as HTMLElement
   if(target!==document.body&&!section.contains(target))return
   if(target?.matches('textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"])')||target?.isContentEditable)return
   const handheldKey=({a:'next',b:'sentence-back',x:'primary',y:'secondary',BrowserBack:'sentence-back'} as Record<string,string>)[event.key.length===1?event.key.toLowerCase():event.key]
   if(handheldKey){
    event.preventDefault();event.stopImmediatePropagation()
    if(!event.repeat)handheld(handheldKey)
    return
   }
   const settings=target.closest('details,input,select,textarea,dialog,[role="dialog"]')
   const story=section.querySelector<HTMLElement>('.animated-story')
   const passage=story||section.querySelector('.episode-intro,.episode-context,.pocket-audio')
   // While reading, the keyboard arrows navigate passages even after focusing a chunk.
   if(!settings&&passage&&(target===document.body||section.classList.contains('game-playing')||passage.contains(target))){
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
     if(!story&&!event.repeat&&click(event.key==='ArrowLeft'?'[data-game-previous]':'[data-game-next]')){
      event.preventDefault();event.stopImmediatePropagation()
     }
     return
    }
    if(event.key===' '&&(story||passage.matches('.episode-intro,.pocket-audio'))){
     event.preventDefault();event.stopImmediatePropagation()
     if(!event.repeat){
      if(story)story.dispatchEvent(new CustomEvent('mangmi-action',{detail:'playback'}))
      else click('[data-game-playback]')
     }
     return
    }
   }
   const key=({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'accept',Escape:'back'} as Record<string,string>)[event.key]
   if(!key)return
   event.preventDefault();event.stopImmediatePropagation()
   if(!event.repeat||['up','down','left','right'].includes(key))action(key)
  }
  function poll(now:number){
   if(!document.hidden&&document.hasFocus()){
    let pads:(Gamepad|null)[]=[]
    try{pads=Array.from(navigator.getGamepads?.()??[])}catch{/* Browser may disable this API. */}
    const held=new Map<string,number>()
    for(const pad of pads){
     if(!pad?.connected)continue
     const horizontal=pad.axes[0]??0,vertical=pad.axes[1]??0
     const directions={12:-vertical,13:vertical,14:-horizontal,15:horizontal} as Record<number,number>
     for(const [index,key] of bindings){
      if(!pad.buttons[index]?.pressed&&!(directions[index]>0.55))continue
      const id=`${pad.index}:${index}`
      const repeatAt=previous.get(id)
      if(repeatAt===undefined){
       handheld(key)
       held.set(id,now+400)
      }else if((key==='up'||key==='down')&&now>=repeatAt){
       handheld(key)
       held.set(id,now+140)
      }else held.set(id,repeatAt)
     }
    }
    previous=held
   }
   frame=requestAnimationFrame(poll)
  }
  window.addEventListener('keydown',keyboard,true)
  frame=requestAnimationFrame(poll)
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyboard,true);delete section.dataset.controller}
 },[root])
}
