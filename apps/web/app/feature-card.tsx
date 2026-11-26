'use client'

import {useId,useState} from 'react'
import type {ReactNode} from 'react'
import {ArrowUpRight,RotateCcw} from 'lucide-react'

export default function FeatureCard({title,description,icon}:{title:string;description:string;icon:ReactNode}) {
  const [open,setOpen]=useState(false)
  const details=useId()

  return <article className="landing-flip-slot" data-reveal>
    <button type="button" className="landing-flip" aria-label={'Detail '+title} aria-expanded={open} aria-controls={details} onClick={()=>setOpen(value=>!value)}>
      <span className="landing-flip-inner">
        <span className="landing-flip-face landing-flip-front" aria-hidden={open}>
          <span className="deck-suit" aria-hidden="true">{icon}</span>
          <span className="deck-art" aria-hidden="true">{icon}</span>
          <span className="landing-flip-title">{title}</span>
          <span className="landing-flip-action" aria-hidden="true">Lihat detail <ArrowUpRight size={15}/></span>
        </span>
        <span id={details} className="landing-flip-face landing-flip-back" aria-hidden={!open}>
          <span className="deck-suit" aria-hidden="true">{icon}</span>
          <span className="landing-flip-title">{title}</span>
          <span className="landing-flip-description">{description}</span>
          <span className="landing-flip-action" aria-hidden="true">Kembali <RotateCcw size={14}/></span>
        </span>
      </span>
    </button>
  </article>
}
