import type {StoryState} from './shared/engine/story-engine.js'
import {evaluateOutcomeScorecard,type OutcomeScorecard as Definition} from './outcomeScorecard'
import './outcome-scorecard.css'
export default function OutcomeScorecard({definition,state}:{definition:Definition;state:StoryState}){
 const result=evaluateOutcomeScorecard(definition,state)
 return <section className="outcome-scorecard" aria-label="Your outcome"><h2>{definition.title}</h2><p className="outcome-balance">Balance: <strong>{result.balance}/100</strong></p><p>{definition.note}</p>
 <div className="outcome-values">{result.categories.map(c=><section key={c.id}><h3>{c.label}: {c.score}/100</h3><meter min="0" max="100" value={c.score} aria-label={c.label}/><p>{c.description}</p><ul>{c.reasons.map((r,i)=><li key={i}>{r}</li>)}</ul></section>)}</div>
 <h3>What remains</h3><ul>{result.resources.map(r=><li key={r.variable}>{r.label}: {String(r.value)} {r.unit}</li>)}{result.facts.map((f,i)=><li key={i}>{f}</li>)}</ul><details><summary>How balance is calculated</summary><p>The three scores are multiplied, then their cube root is rounded. A severe loss in one value cannot be erased by a high score in another. These are this episode’s stated priorities, not a judgment of your character. Earlier casualties and shipment losses earn no penalties here.</p></details></section>
}
