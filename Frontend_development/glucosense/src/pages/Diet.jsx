// GlucoSense — Diet.jsx
import { useState } from 'react'

// Sample data for glycemic index foods and meal plans
const GI_FOODS = [
  {
    category: 'Low GI (eat freely)',
    color: '#2EE080',
    bg: 'rgba(46,224,128,.08)',
    foods: [
      'Broccoli',
      'Spinach',
      'Lentils',
      'Chickpeas',
      'Oats',
      'Brown rice',
      'Apple',
      'Pear',
      'Greek yoghurt',
      'Nuts',
      'Quinoa',
      'Carrots',
      'Cucumber',
      'Tomatoes',
      'Cauliflower',
      'Green beans',
      'Peanuts',
      'Almonds',
      'Cashews',
      'Milk',
      'Strawberries',
      'Blueberries',
      'Peach',
      'Orange',
      'Avocado',
      'Tofu',
      'Eggs',
      'Whole wheat pasta',
      'Barley',
      'Black beans'
    ]
  },

  {
    category: 'Medium GI (eat moderately)',
    color: '#FFD60A',
    bg: 'rgba(255,214,10,.08)',
    foods: [
      'Sweet potato',
      'Basmati rice',
      'Corn',
      'Banana',
      'Orange juice',
      'Wholegrain bread',
      'Pineapple',
      'Raisins',
      'Beetroot',
      'Couscous',
      'Popcorn',
      'Brown bread',
      'Muesli',
      'Boiled potato',
      'Mango',
      'Papaya',
      'Honey',
      'Rice noodles',
      'Pumpkin',
      'Granola'
    ]
  },

  {
    category: 'High GI (limit or avoid)',
    color: '#FF5A5A',
    bg: 'rgba(255,90,90,.08)',
    foods: [
      'White bread',
      'White rice',
      'Potato (baked)',
      'Corn flakes',
      'Soft drinks',
      'Candy',
      'Pastries',
      'French fries',
      'Sugary cereals',
      'Ice cream',
      'Doughnuts',
      'Cake',
      'Cookies',
      'Pizza',
      'Instant noodles',
      'Sugary tea',
      'Energy drinks',
      'Milk chocolate',
      'Burger buns',
      'Sweet desserts'
    ]
  }
]

//  Sample meal plans for each day of the week
export default function Diet() {
  const [open, setOpen] = useState(null)

  const mealPlans = [
    {
      day: 'Monday',
      meals: [
        'Breakfast: Oats with berries and nuts',
        'Lunch: Grilled chicken with lentil salad',
        'Dinner: Stir-fried vegetables with brown rice',
        'Snack: Apple with almond butter'
      ]
    },

    {
      day: 'Tuesday',
      meals: [
        'Breakfast: Greek yoghurt with seeds',
        'Lunch: Chickpea and spinach curry',
        'Dinner: Baked salmon with sweet potato',
        'Snack: Handful of mixed nuts'
      ]
    },

    {
      day: 'Wednesday',
      meals: [
        'Breakfast: Whole grain toast with avocado',
        'Lunch: Vegetable lentil soup',
        'Dinner: Grilled tofu with broccoli',
        'Snack: Pear with cottage cheese'
      ]
    },

    {
      day: 'Thursday',
      meals: [
        'Breakfast: Smoothie with banana and oats',
        'Lunch: Brown rice with grilled fish',
        'Dinner: Chicken vegetable soup',
        'Snack: Orange slices with peanuts'
      ]
    },

    {
      day: 'Friday',
      meals: [
        'Breakfast: Scrambled eggs with wholegrain toast',
        'Lunch: Quinoa salad with vegetables',
        'Dinner: Baked chicken with green beans',
        'Snack: Greek yoghurt with strawberries'
      ]
    },

    {
      day: 'Saturday',
      meals: [
        'Breakfast: Oat pancakes with blueberries',
        'Lunch: Tuna salad with avocado',
        'Dinner: Stir-fried tofu with quinoa',
        'Snack: Mixed nuts and apple slices'
      ]
    },

    {
      day: 'Sunday',
      meals: [
        'Breakfast: Wholegrain cereal with milk',
        'Lunch: Lentil curry with brown rice',
        'Dinner: Grilled salmon with vegetables',
        'Snack: Carrot sticks with hummus'
      ]
    }
  ]

  return (
    <div className="page">
      <h1>Diet & Nutrition</h1>

      <p style={{ marginBottom: '32px' }}>
        What you eat directly affects your blood sugar levels and diabetes risk.
        Use this guide to make better food choices.
      </p>

      {/* ================= GI GUIDE ================= */}

      <h2
        className="section-title"
        style={{ marginBottom: '20px' }}
      >
        Glycemic Index Guide
      </h2>

      <p
        style={{
          marginBottom: '20px',
          fontSize: '13px'
        }}
      >
        The Glycemic Index (GI) measures how quickly food raises blood sugar.
        Choose low-GI foods to keep your glucose stable.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '40px'
        }}
      >
        {GI_FOODS.map(g => (
          <div
            key={g.category}
            style={{
              background: g.bg,
              borderRadius: '10px',
              padding: '14px 16px',
              borderLeft: `3px solid ${g.color}`
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: g.color,
                marginBottom: '10px'
              }}
            >
              {g.category}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              {g.foods.map(f => (
                <span
                  key={f}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#E8F0FF'
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ================= MEAL PLANS ================= */}

      <h2
        className="section-title"
        style={{ marginBottom: '20px' }}
      >
        Sample Meal Plans
      </h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {mealPlans.map((plan, i) => (
          <div
            key={i}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3>{plan.day}</h3>
              <span>{open === i ? '▲' : '▼'}</span>
            </div>

            {open === i && (
              <ul
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {plan.meals.map((m, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: '13px',
                      color: '#A8B8D0',
                      borderLeft: '2px solid #4E9BFF',
                      paddingLeft: '12px'
                    }}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}