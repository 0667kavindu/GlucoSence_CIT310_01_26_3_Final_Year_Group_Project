// GlucoSense — Prevention.jsx

import { useState } from 'react'
export default function Prevention() {
  // List of prevention tips with icons, titles, and descriptions
  const tips = [
    { icon:'🏃', title:'Stay Active', desc:'At least 150 minutes of moderate exercise per week cuts Type 2 diabetes risk by up to 58%.'},
    { icon:'🥗', title:'Eat Well', desc:'Choose low-glycemic foods, whole grains, vegetables, and lean proteins. Reduce sugar and processed foods.'},
    { icon:'⚖️', title:'Healthy Weight', desc:'Losing just 5–7% of body weight if overweight significantly reduces your risk.'},
    { icon:'🚭', title:'Quit Smoking', desc:'Smokers are 30–40% more likely to develop Type 2 diabetes than non-smokers.'},
    { icon:'🧘', title:'Manage Stress', desc:'Chronic stress raises cortisol, which increases blood glucose. Practise mindfulness or yoga.'},
    { icon:'😴', title:'Sleep 7–9 Hours', desc:'Poor sleep disrupts insulin sensitivity and hunger hormones. Aim for 7–9 quality hours nightly.'},
    { icon:'💧', title:'Stay Hydrated', desc:'Water is the best drink. Avoid sugary drinks and fruit juices — they spike blood sugar fast.'},
    { icon:'🩺', title:'Regular Screening', desc:'Get your fasting glucose and HbA1c checked at least once a year if you have risk factors.'},
  ]
  const [checked, setChecked] = useState({})
  const toggle = k => setChecked(c => ({...c,[k]:!c[k]}))
  const score = Object.values(checked).filter(Boolean).length

  return (
    <div className="page">
      <h1>Prevention Guide</h1>
      <p style={{marginBottom:'8px'}}>Evidence-based strategies to reduce your diabetes risk. Check off the habits you already follow.</p>
      <div style={{background:'rgba(78,155,255,0.1)',borderRadius:'10px',padding:'12px 16px',marginBottom:'28px',display:'inline-block'}}>
        <span style={{fontWeight:700,color:'#4E9BFF'}}>{score}/{tips.length}</span>
        <span style={{color:'#A8B8D0',fontSize:'13px'}}> healthy habits checked</span>
      </div>
      <div className="grid-2">
        {tips.map((t,i) => (
          <div key={i} className="card" style={{cursor:'pointer',borderColor:checked[i]?'#2EE080':'rgba(78,155,255,0.15)'}}
            onClick={()=>toggle(i)}>
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <span style={{fontSize:'1.8rem'}}>{t.icon}</span>
              <div style={{flex:1}}>
                <h3 style={{color:checked[i]?'#5DF8D8':'#E8F0FF',marginBottom:'6px'}}>{t.title}</h3>
                <p style={{fontSize:'13px'}}>{t.desc}</p>
              </div>
              <span style={{fontSize:'1.2rem'}}>{checked[i]?'✅':'⬜'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
