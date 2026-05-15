// GlucoSense — Exercise.jsx  
export default function Exercise() {

  // WORKOUT PLANS
const plans = [

    // BEGINNER
    {
      level: '🚶 Beginner',
      color: '#2EE080',
      bg: 'rgba(46,224,128,.08)',

      schedule: [
        { day: 'Mon', activity: '20-min brisk walk', intensity: 'Low' },
        { day: 'Tue', activity: 'Light stretching or yoga', intensity: 'Low' },
        { day: 'Wed', activity: '15-min bodyweight exercises', intensity: 'Low' },
        { day: 'Thu', activity: '20-min cycling', intensity: 'Low' },
        { day: 'Fri', activity: '20-min brisk walk', intensity: 'Low' },
        { day: 'Sat', activity: 'Outdoor activity or dancing', intensity: 'Low' },
        { day: 'Sun', activity: 'Rest and recovery', intensity: 'Rest' },
      ]
    },

    // INTERMEDIATE
    {
      level: '🚴 Intermediate',
      color: '#FFD60A',
      bg: 'rgba(255,214,10,.08)',

      schedule: [
        { day: 'Mon', activity: '30-min jog or brisk walk', intensity: 'Moderate' },
        { day: 'Tue', activity: '20-min strength training', intensity: 'Moderate' },
        { day: 'Wed', activity: '30-min cycling', intensity: 'Moderate' },
        { day: 'Thu', activity: 'Yoga and stretching', intensity: 'Low' },
        { day: 'Fri', activity: '30-min swim or dance workout', intensity: 'Moderate' },
        { day: 'Sat', activity: '45-min hike or sport', intensity: 'Moderate' },
        { day: 'Sun', activity: 'Rest and mobility exercises', intensity: 'Rest' },
      ]
    },

    // ADVANCED
    {
      level: '🏃 Advanced',
      color: '#FF8C42',
      bg: 'rgba(255,140,66,.08)',

      schedule: [
        { day: 'Mon', activity: '45-min running', intensity: 'High' },
        { day: 'Tue', activity: '30-min HIIT workout', intensity: 'High' },
        { day: 'Wed', activity: '45-min weight training', intensity: 'High' },
        { day: 'Thu', activity: 'Core and flexibility training', intensity: 'Moderate' },
        { day: 'Fri', activity: '1-hour sport or swimming', intensity: 'High' },
        { day: 'Sat', activity: 'Long walk or cycling', intensity: 'Moderate' },
        { day: 'Sun', activity: 'Active recovery and stretching', intensity: 'Rest' },
      ]
    },
  ]

  // EXERCISE BENEFITS
 const impacts = [
    {
      type: '🚶 Walking (30 min)',
      drop: 'Helps lower blood glucose and improve heart health'
    },

    {
      type: '🚴 Cycling (30 min)',
      drop: 'Improves insulin sensitivity and burns calories'
    },

    {
      type: '🏋️ Strength Training',
      drop: 'Builds muscle and supports long-term glucose control'
    },

    {
      type: '🏃 HIIT (20 min)',
      drop: 'Can improve glucose usage and cardiovascular fitness'
    },

    {
      type: '🧘 Yoga & Stretching',
      drop: 'Reduces stress and supports healthy blood sugar levels'
    },
  ]

  // CALORIES SECTION
const calories = [
    { activity: 'Walking', burn: '120–150 kcal / 30 min' },
    { activity: 'Cycling', burn: '200–300 kcal / 30 min' },
    { activity: 'Swimming', burn: '250–350 kcal / 30 min' },
    { activity: 'Jogging', burn: '250–400 kcal / 30 min' },
    { activity: 'Yoga', burn: '100–180 kcal / 30 min' },
  ]

  // EXERCISE TIPS
const tips = [
    'Drink enough water before and after exercise',
    'Start slowly and increase intensity gradually',
    'Wear comfortable shoes and clothing',
    'Exercise consistently for the best results',
    'Warm up before workouts and stretch afterward',
    'Stop exercising if you feel dizzy or unwell',
  ]

  // COMPONENT
return (
    <div className="page">

      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}

      <h1>Exercise & Fitness</h1>

      <p style={{ marginBottom: '32px' }}>
        Regular physical activity helps control blood sugar, improves heart
        health, boosts energy, and reduces the risk of type 2 diabetes.
      </p>

      {/* ================================================================ */}
      {/* BENEFITS SECTION */}
      {/* ================================================================ */}

      <h2
        className="section-title"
        style={{ marginBottom: '24px' }}
      >
        Benefits of Exercise
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '40px'
        }}
      >
        {impacts.map((imp, i) => (

          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              padding: '14px 16px',
              background:
                i % 2 === 0
                  ? 'rgba(78,155,255,.07)'
                  : 'rgba(46,224,128,.05)',
              borderRadius: '10px',
              borderLeft: '3px solid #4E9BFF'
            }}
          >

            <span
              style={{
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              {imp.type}
            </span>

            <span
              style={{
                fontSize: '12px',
                color: '#2EE080',
                textAlign: 'right'
              }}
            >
              {imp.drop}
            </span>

          </div>

        ))}
      </div>

      {/* ================================================================ */}
      {/* WEEKLY PLANS */}
      {/* ================================================================ */}

      <h2
        className="section-title"
        style={{ marginBottom: '24px' }}
      >
        Weekly Workout Plans
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          marginBottom: '40px'
        }}
      >

        {plans.map(plan => (

          <div
            key={plan.level}
            style={{
              background: plan.bg,
              border: `1px solid ${plan.color}33`,
              borderRadius: '14px',
              padding: '18px'
            }}
          >

            <h3
              style={{
                color: plan.color,
                marginBottom: '16px'
              }}
            >
              {plan.level}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))',
                gap: '10px'
              }}
            >

              {plan.schedule.map((s, i) => (

                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    padding: '12px'
                  }}
                >

                  <div
                    style={{
                      fontWeight: 700,
                      color: plan.color,
                      fontSize: '12px',
                      marginBottom: '6px'
                    }}
                  >
                    {s.day}
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: '#E8F0FF',
                      marginBottom: '6px',
                      lineHeight: '1.5'
                    }}
                  >
                    {s.activity}
                  </div>

                  <div
                    style={{
                      fontSize: '10px',
                      color: '#A8B8D0'
                    }}
                  >
                    Intensity: {s.intensity}
                  </div>

                </div>

              ))}

            </div>

          </div>

        ))}

      </div>

      {/* ================================================================ */}
      {/* CALORIES SECTION */}
      {/* ================================================================ */}

      <h2
        className="section-title"
        style={{ marginBottom: '20px' }}
      >
        Estimated Calories Burned
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '40px'
        }}
      >

        {calories.map((c, i) => (

          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px'
            }}
          >

            <span style={{ fontSize: '13px' }}>
              {c.activity}
            </span>

            <span
              style={{
                fontSize: '12px',
                color: '#FFD60A'
              }}
            >
              {c.burn}
            </span>

          </div>

        ))}

      </div>

      {/* ================================================================ */}
      {/* EXERCISE TIPS */}
      {/* ================================================================ */}

      <h2
        className="section-title"
        style={{ marginBottom: '20px' }}
      >
        Exercise Tips
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '30px'
        }}
      >

        {tips.map((tip, i) => (

          <div
            key={i}
            style={{
              background: 'rgba(78,155,255,.06)',
              borderLeft: '3px solid #4E9BFF',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#DCE7FF'
            }}
          >
            ✅ {tip}
          </div>

        ))}

      </div>

    </div>
  )
}