// GlucoSense — FAQ.jsx 
// Accordion FAQ component

import { useState } from 'react'

//  FAQ data — array of question-answer pairs
const FAQS = [
  { q:'What is the difference between Type 1 and Type 2 diabetes?',
    a:'Type 1 is an autoimmune condition where the body produces no insulin — it is not caused by lifestyle. Type 2 is where the body does not use insulin properly — it is strongly linked to lifestyle factors and can often be prevented or delayed.' },
  { q:'What are the early warning signs of diabetes?',
    a:'Common early signs include increased thirst, frequent urination (especially at night), unexplained fatigue, blurred vision, slow-healing cuts, and tingling in hands or feet. However, many people have no symptoms at all in the early stages.' },
  { q:'What is pre-diabetes?',
    a:'Pre-diabetes means your blood sugar is higher than normal but not yet high enough to be diagnosed as Type 2 diabetes. An HbA1c of 5.7–6.4% or fasting glucose of 100–125 mg/dL indicates pre-diabetes. Without lifestyle changes, most people with pre-diabetes develop Type 2 diabetes within 5 years.' },
  { q:'Can diabetes be reversed?',
    a:'Type 2 diabetes can go into remission — meaning blood sugar returns to normal levels without medication — through significant weight loss and lifestyle changes. Type 1 diabetes cannot currently be reversed. Gestational diabetes usually resolves after pregnancy.' },
  { q:'How accurate is the GlucoSense prediction?',
    a:'GlucoSense uses an XGBoost model trained on 100,000 patient records achieving over 85% accuracy. However, it is a screening tool and not a clinical diagnosis. If you receive a high risk score, please consult a doctor for a formal blood test.' },
  { q:'Is my health data safe?',
    a:'Yes. Your data is stored securely in an encrypted database. It is never shared with third parties. You can delete your account and all associated data at any time from your Profile page.' },
  { q:'How often should I check my risk?',
    a:'We recommend checking every 3–6 months if you have risk factors (family history, overweight, high blood pressure). If your risk is low, an annual check-in is sufficient. The History page lets you track changes over time.' },
  { q:'What does the SHAP explanation mean?',
    a:'SHAP (SHapley Additive exPlanations) shows which specific health factors contributed most to your risk score. Red bars mean a factor is increasing your risk. Green bars mean a factor is reducing it. This helps you understand exactly what to focus on.' },
  { q:'What is HbA1c?',
    a:'HbA1c (glycated haemoglobin) measures your average blood sugar level over the past 2–3 months. It is the most reliable test for diagnosing and monitoring diabetes. Below 5.7% is normal, 5.7–6.4% is pre-diabetic, and 6.5% or above indicates diabetes.' },
  { q:'Can I use GlucoSense if I am already diabetic?',
    a:'Yes. GlucoSense can help you track changes in your risk score over time and monitor how lifestyle changes affect your predicted risk. Use the History page to see trends. However, always follow your doctor\'s medical advice above any app-based tool.' },
]

//  FAQ component with accordion behaviour
export default function FAQ() {
  const [open, setOpen] = useState(null)

  return (
    <div className="page">
      <h1>Frequently Asked Questions</h1>
      <p style={{ marginBottom: '32px' }}>
        Answers to common questions about diabetes, pre-diabetes, and how GlucoSense works.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {FAQS.map((faq, i) => (
          <div key={i} className="card" style={{
            cursor: 'pointer',
            borderColor: open === i ? '#4E9BFF' : 'rgba(78,155,255,0.15)',
            transition: 'border-color 0.2s'
          }} onClick={() => setOpen(open === i ? null : i)}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', color: open === i ? '#4E9BFF' : '#E8F0FF', flex: 1 }}>
                {faq.q}
              </h3>
              <span style={{
                fontSize: '18px', color: '#4E9BFF',
                transform: open === i ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s', flexShrink: 0
              }}>▼</span>
            </div>

            {open === i && (
              <p style={{
                marginTop: '14px', paddingTop: '14px',
                borderTop: '1px solid rgba(78,155,255,0.15)',
                fontSize: '13px', lineHeight: '1.7', color: '#A8B8D0'
              }}>
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
