'use client'

import {useState} from 'react'
import {Plus} from 'lucide-react'

export default function LandingFaq({questions}:{questions:string[][]}) {
  const [active,setActive]=useState<number|null>(0)

  return <div className="faq-accordion">{questions.map(([question,answer],index)=>{
    const open=active===index
    const id='faq-answer-'+index
    return <article className="faq-item" key={question} data-open={open} data-reveal>
      <h3><button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setActive(open?null:index)}>
        {question}<span aria-hidden="true"><Plus size={19}/></span>
      </button></h3>
      <div className="faq-answer" id={id} aria-hidden={!open}><div><p>{answer}</p></div></div>
    </article>
  })}</div>
}
