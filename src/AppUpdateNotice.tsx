import {useEffect,useState} from 'react'
import './app-update.css'

/** An activated worker cannot replace JavaScript in an already-open study session. */
export default function AppUpdateNotice(){
 const [available,setAvailable]=useState(false)
 useEffect(()=>{
  const current=import.meta.env.VITE_APP_COMMIT
  if(!import.meta.env.PROD||!current)return
  let disposed=false,lastCheck=0,controller:AbortController|undefined
  const check=async()=>{
   if(document.hidden||!navigator.onLine||Date.now()-lastCheck<60000)return
   lastCheck=Date.now();controller?.abort();controller=new AbortController()
   const timer=window.setTimeout(()=>controller?.abort(),8000)
   try{
    const response=await fetch(`${import.meta.env.BASE_URL}release.json`,{cache:'no-store',signal:controller.signal})
    if(!response.ok)return
    const release=await response.json() as {commit?:string}
    if(!disposed&&typeof release.commit==='string'&&/^[a-f0-9]{40}$/.test(release.commit)&&release.commit!==current)setAvailable(true)
   }catch{/* Offline readers keep their downloaded app without an update prompt. */}
   finally{clearTimeout(timer)}
  }
  void check()
  const interval=window.setInterval(()=>void check(),60000)
  window.addEventListener('online',check);document.addEventListener('visibilitychange',check)
  return()=>{disposed=true;controller?.abort();clearInterval(interval);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check)}
 },[])
 if(!available)return null
 return <aside className="app-update-notice" role="status"><span>A new version is ready. Your reading place and downloads will be kept.</span><a href={`${import.meta.env.BASE_URL}update.html`}>Update app</a></aside>
}
