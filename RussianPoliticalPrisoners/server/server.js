const express = require('express')
const axios = require('axios')
const cors = require('cors')
require('dotenv').config()

const app = express()

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
    console.error(error.response?.data || error.message)
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
    console.error(error.response?.data || error.message)
    res.status(500).json({ error: 'Failed to fetch prisoner details' })
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})