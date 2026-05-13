// GlucoSense — Home.jsx 
// Landing page: hero, stats, how it works, health page links

import { Link } from 'react-router-dom'
import BMICalculator from '../components/BMICalculator'

export default function Home() {   //  Data for stats, how-it-works steps, and health page links
  const stats = [
    { num:'537M',  label:'Adults with diabetes globally (IDF 2023)' },
    { num:'1 in 5',label:'Sri Lankan adults with diabetes or pre-diabetes' },
    { num:'58%',   label:'Risk reduction with early detection (ADA)' },
    { num:'100K',  label:'Patient records used to train our AI model' },
  ]

  const steps = [
    { icon:'📝', title:'Enter Your Data',  desc:'Fill in your health metrics in our simple 3-step form. No medical knowledge needed.' },
    { icon:'🤖', title:'AI Analysis',      desc:'Our XGBoost model analyses your data against 100,000 real patient records.' },
    { icon:'📊', title:'Get Your Results', desc:'Receive your risk score, AI explanation, and personalised health recommendations instantly.' },
  ]

  const healthPages = [
    { to:'/prevention', icon:'🛡️', title:'Prevention Guide',    desc:'Evidence-based tips to lower your diabetes risk' },
    { to:'/diet',       icon:'🥗', title:'Diet & Nutrition',     desc:'Glycemic index guide and diabetic-friendly meal plans' },
    { to:'/exercise',   icon:'🏃', title:'Exercise & Fitness',   desc:'Weekly workout plans with blood glucose impact charts' },
    { to:'/numbers',    icon:'🔢', title:'Know Your Numbers',    desc:'Normal ranges for HbA1c, glucose, BMI, and blood pressure' },
    { to:'/faq',        icon:'❓', title:'FAQ',                  desc:'Common questions about diabetes types and symptoms' },
  ]

  return (
    <div>
      {/*  Hero  */}
      <section style={{
        background:'linear-gradient(160deg, #0D1B2A 0%, #1A3050 100%)',
        padding:'100px 20px 60px', textAlign:'center'
      }}>
        <div style={{maxWidth:'700px',margin:'0 auto'}}>
          <h1 style={{fontSize:'3rem', marginBottom:'16px'}}>
            Know Your <span style={{color:'#5DF8D8'}}>Diabetes Risk</span> Today
          </h1>
          <p style={{fontSize:'1.1rem', marginBottom:'32px', color:'#A8B8D0'}}>
            GlucoSense uses AI trained on 100,000 patient records to assess your diabetes
            risk in minutes — free, private, and no doctor visit required.
          </p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <Link to="/predict" className="btn btn-success" style={{fontSize:'16px',padding:'14px 32px'}}>
              🔍 Check My Risk Now
            </Link>
            <Link to="/register" className="btn btn-outline" style={{fontSize:'16px',padding:'14px 32px'}}>
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/*  Stats  */}
      <section style={{background:'#112235', padding:'40px 20px'}}>
        <div style={{maxWidth:'1000px',margin:'0 auto'}}>
          <div className="grid-4">
            {stats.map(s => (
              <div key={s.num} style={{textAlign:'center',padding:'16px'}}>
                <div style={{fontSize:'2rem',fontWeight:800,color:'#4E9BFF'}}>{s.num}</div>
                <div style={{fontSize:'12px',color:'#A8B8D0',marginTop:'6px'}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*  How it works  */}
      <section style={{padding:'60px 20px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <h2 className="section-title" style={{marginBottom:'32px'}}>How It Works</h2>
          <div className="grid-3">
            {steps.map((s,i) => (
              <div key={i} className="card" style={{textAlign:'center'}}>
                <div style={{fontSize:'2.5rem',marginBottom:'12px'}}>{s.icon}</div>
                <h3 style={{marginBottom:'8px'}}>{s.title}</h3>
                <p style={{fontSize:'13px'}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*  BMI Calculator  */}
      <section style={{padding:'20px 20px 60px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <h2 className="section-title" style={{marginBottom:'24px'}}>Quick BMI Calculator</h2>
          <BMICalculator />
        </div>
      </section>

      {/*  Health pages  */}
      <section style={{background:'#0A1628', padding:'60px 20px'}}>
        <div style={{maxWidth:'1000px',margin:'0 auto'}}>
          <h2 className="section-title" style={{marginBottom:'32px'}}>Health Education</h2>
          <div className="grid-3" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
            {healthPages.map(hp => (
              <Link key={hp.to} to={hp.to} style={{textDecoration:'none'}}>
                <div className="card" style={{textAlign:'center',transition:'all .2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#4E9BFF'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(78,155,255,0.15)'}>
                  <div style={{fontSize:'2rem',marginBottom:'10px'}}>{hp.icon}</div>
                  <h3 style={{color:'#E8F0FF',marginBottom:'6px',fontSize:'14px'}}>{hp.title}</h3>
                  <p style={{fontSize:'12px'}}>{hp.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
