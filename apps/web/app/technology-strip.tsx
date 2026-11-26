'use client'

import {useState} from 'react'
import {Pause,Play} from 'lucide-react'

const technologies=[
  ['Next.js','nextdotjs'],['React','react'],['TypeScript','typescript'],['Neon','neon'],
  ['PostgreSQL','postgresql'],['Better Auth','betterauth'],['Vercel','vercel']
]

export default function TechnologyStrip() {
  const [paused,setPaused]=useState(false)

  return <section className="landing-stack" aria-labelledby="stack-title" data-reveal>
    <div className="stack-heading"><h2 id="stack-title">Teknologi yang digunakan</h2>
      <button className="stack-control" type="button" aria-label={paused?'Putar logo':'Jeda logo'} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>
    </div>
    <div className="stack-window">
      <div className="stack-track" data-paused={paused}>
        {[false,true].map(copy=><ul className="stack-group" key={String(copy)} aria-hidden={copy||undefined}>
          {technologies.map(([name,icon])=><li key={name}><img src={'/stack/'+icon+'.svg'} alt="" width={24} height={24}/><span>{name}</span></li>)}
        </ul>)}
      </div>
    </div>
  </section>
}
