import {useEffect, type RefObject} from 'react'

// Keep navigation tied to the rendered controls, including newly revealed choices.
export function useGameNavigation(root: RefObject<HTMLElement | null>) {
 useEffect(()=>{
  const element=root.current
  if(!element)return
  const section:HTMLElement=element
  let frame=0, previous=new Set<string>(), repeatAt=0
  const visible=(el:HTMLElement)=>{
   if(!el.getClientRects().length||el.closest('[hidden],[inert]')||getComputedStyle(el).visibility==='hidden')return false
   for(let parent=el.parentElement;parent;parent=parent.parentElement){
    if(parent instanceof HTMLDetailsElement&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(el))return false
   }
   return true
  }
  const controls=()=>{
   const dialog=Array.from(section.querySelectorAll<HTMLElement>('dialog[open],[role="dialog"]')).filter(visible).at(-1)
   return Array.from((dialog??section).querySelectorAll<HTMLElement>('button,a[href],summary,input,select,textarea,[tabindex="0"]')).filter(el=>visible(el)&&!el.matches(':disabled,[aria-disabled="true"]')&&!(section.querySelector('.cinema-back')&&el.matches('.cinema-back')))
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
  function action(key:string){
   section!.dataset.controller='true'
   if(key==='up'||key==='previous')move(-1)
   else if(key==='down'||key==='next')move(1)
   else if(key==='left'||key==='right'){const delta=key==='left'?-1:1;if(!adjust(delta))move(delta)}
   else if(key==='accept'){const el=current();if(el)el.click();else move(1)}
   else if(key==='back')back()
  }
  function handheld(key:string){
   section.dataset.controller='true'
   if(key==='next'||key==='previous'){move(key==='next'?1:-1);return}
   if(key==='up'||key==='down'){
    // Scroll the nearest scrollable panel, or the document, without moving focus.
    let el=document.activeElement instanceof HTMLElement?document.activeElement.parentElement:null
    while(el&&el!==document.body){if(/auto|scroll/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight){el.scrollBy({top:key==='up'?-90:90});return}el=el.parentElement}
    window.scrollBy({top:key==='up'?-90:90});return
   }
   if(key==='left'||key==='right'){adjust(key==='left'?-1:1);return}
   const story=section.querySelector<HTMLElement>('.animated-story')
   if(key==='sentence-back'){story?.dispatchEvent(new CustomEvent('mangmi-action',{detail:'back'}));return}
   if(key==='primary'){
    const el=current()
    // Focused settings remain operable after A tabs to them.
    if(el?.closest('.episode-settings,dialog,[role="dialog"],.cinema-more')||el?.matches('footer button')){el.click();return}
    if(story){story.dispatchEvent(new CustomEvent('mangmi-action',{detail:'continue'}));return}
    if(el&&!el.matches('.cinema-back'))el.click();else move(1)
   }
   if(key==='secondary')story?.dispatchEvent(new CustomEvent('mangmi-action',{detail:'audio'}))
  }
  const keyboard=(event:KeyboardEvent)=>{
   if(event.ctrlKey||event.metaKey||event.altKey)return
   const target=event.target as HTMLElement
   if(target!==document.body&&!section.contains(target))return
   if(target?.matches('textarea,input:not([type="range"]):not([type="checkbox"]):not([type="radio"])')||target?.isContentEditable)return
   {
    const handheldKey=({a:'next',b:'sentence-back',x:'primary',y:'secondary',BrowserBack:'sentence-back'} as Record<string,string>)[event.key.length===1?event.key.toLowerCase():event.key]
    if(handheldKey){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat||['up','down','left','right'].includes(handheldKey))handheld(handheldKey);return}
   }
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
     if(button(0))pressed.add('next');if(button(1))pressed.add('sentence-back');if(button(2))pressed.add('primary');if(button(3))pressed.add('secondary')
     if(button(4))pressed.add('previous');if(button(5))pressed.add('next')
     if(button(12)||(pad.axes[1]??0)<-0.55)pressed.add('up')
     if(button(13)||(pad.axes[1]??0)>0.55)pressed.add('down')
     if(button(14)||(pad.axes[0]??0)<-0.55)pressed.add('left')
     if(button(15)||(pad.axes[0]??0)>0.55)pressed.add('right')
    }
    for(const key of pressed){const fresh=!previous.has(key);if(fresh||(['up','down','left','right'].includes(key)&&now>=repeatAt)){handheld(key);repeatAt=now+(fresh?400:140)}}
    previous=pressed
   }else{previous=new Set()}
   frame=requestAnimationFrame(poll)
  }
  window.addEventListener('keydown',keyboard,true)
  frame=requestAnimationFrame(poll)
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',keyboard,true);delete section.dataset.controller}
 },[root])
}
