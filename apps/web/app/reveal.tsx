'use client'

import {useEffect} from 'react'

export default function Reveal() {
  useEffect(()=>{
    const root=document.querySelector('.landing')
    if(!root||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        if(!entry.isIntersecting) continue
        entry.target.classList.add('revealed')
        observer.unobserve(entry.target)
      }
    },{threshold:.13})
    for(const node of root.querySelectorAll('[data-reveal]')) observer.observe(node)
    root.classList.add('motion-ready')
    return ()=>{observer.disconnect();root.classList.remove('motion-ready')}
  },[])
  return null
}
