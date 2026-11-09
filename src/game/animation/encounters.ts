export interface EncounterOptions {chinese:boolean;english:boolean;showChinese:boolean;showPinyin:boolean;showGloss:boolean}
export interface EncounterSettings {count:number;encounters:EncounterOptions[];englishPause:number;readingSeconds:number;automaticChoices:boolean;choiceDelay:number}
export const encounterFields = [['showChinese','Chinese characters'],['showPinyin','Pinyin'],['showGloss','English text'],['chinese','Spoken Chinese'],['english','Spoken English']] as const
export function defaultEncounters(supportive=false):EncounterSettings {
 const audioOnly={chinese:true,english:false,showChinese:false,showPinyin:false,showGloss:false}
 return {count:supportive?3:2,encounters:[{...audioOnly,showChinese:true,showPinyin:true,showGloss:true},{...audioOnly,showChinese:supportive},{...audioOnly}],englishPause:3,readingSeconds:5,automaticChoices:false,choiceDelay:0}
}
export function validEncounter(value:unknown):value is EncounterOptions {
 if(!value||typeof value!=='object')return false
 const v=value as Record<string,unknown>
 return encounterFields.every(([key])=>typeof v[key]==='boolean')&&encounterFields.some(([key])=>v[key]===true)
}
export function readEncounters(key:string,supportive:boolean):EncounterSettings {
 const defaults=defaultEncounters(supportive)
 try {
  const value=JSON.parse(localStorage.getItem(key)??'null')
  if(!value||![1,2,3].includes(value.count)||!Array.isArray(value.encounters)||value.encounters.length!==3||!value.encounters.every(validEncounter))return defaults
  return {count:value.count,encounters:value.encounters,englishPause:[0,1,2,3,5,10].includes(value.englishPause)?value.englishPause:3,readingSeconds:[3,5,10,15,20,30].includes(value.readingSeconds)?value.readingSeconds:5,automaticChoices:value.automaticChoices===true,choiceDelay:[0,3,5,10].includes(value.choiceDelay)?value.choiceDelay:0}
 }catch{return defaults}
}
