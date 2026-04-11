const express = require('express')
const axios = require('axios')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/map', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.prisonerwatch.org/api/analytics/map-data?source=ovd_api_optimized',
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('MAP ERROR:', error.response?.status, error.response?.data || error.message)
    res.status(500).json({ error: 'Failed to fetch map data' })
  }
})

app.get('/api/prisoner/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.prisonerwatch.org/api/prisoners/${req.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('PRISONER ERROR:', error.response?.status, error.response?.data || error.message)
    res.status(500).json({ error: 'Failed to fetch prisoner details' })
  }
})

//serve built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')))

//send frontend for all non-api routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})