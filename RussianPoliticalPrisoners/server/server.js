
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Load the local ODINT dataset
const dataPath = path.join(
  __dirname,
  '..',
  'data_imprisoned_with_coordinates.json'
)

function loadData() {
  const raw = fs.readFileSync(dataPath, 'utf8')
  return JSON.parse(raw).data
}

// Return map markers
app.get('/api/map', (req, res) => {
  try {
    const people = loadData()

    const points = people
      .filter(person =>
        Number.isFinite(person.coordinates?.lat) &&
        Number.isFinite(person.coordinates?.lng)
      )
      .map(person => ({
        id: person.persecution_id,
        name: person.name_en,
        coordinates: person.coordinates,
        location: person.coordinate_label ||
          person.persecution_region_en?.[0] ||
          'Unknown',
        coordinate_precision: person.coordinate_precision
      }))

    res.json({ points })
  } catch (error) {
    console.error('MAP ERROR:', error.message)
    res.status(500).json({ error: 'Failed to load map data' })
  }
})

// Return individual prisoner details
app.get('/api/prisoner/:id', (req, res) => {
  try {
    const people = loadData()

    const person = people.find(
      p => p.persecution_id === req.params.id
    )

    if (!person) {
      return res.status(404).json({ error: 'Person not found' })
    }

    res.json({
      name: person.name_en,
      photo_url: person.photo?.[0],
      gender: person.gender_en,
      age: person.age,
      location: person.persecution_region_en?.join(', '),
      current_location: person.imprisonment_location_en,
      occupation: person.persecution_occupation_en?.join(', '),
      category: person.persecution_subject_en?.join(', '),
      trial_status: person.persecution_case_person_state_en,
      arrest_date: person.persecution_imprisonment_started,
      summary: person.case_name_en,
      sentence: person.verdict_essence_en,
      last_updated: person.last_updated
    })
  } catch (error) {
    console.error('PRISONER ERROR:', error.message)
    res.status(500).json({ error: 'Failed to load details' })
  }
})

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'dist')))

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
