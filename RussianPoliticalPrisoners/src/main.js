
import './style.css'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

//render main layout
document.querySelector('#app').innerHTML = `
  <div class="page">
    <header class="page-header">
      <h1>Political Prisoners Map</h1>
      <button id="loadData" class="load-btn">Load Map Data</button>
    </header>

    <div id="mapStatus" class="map-status hidden" aria-live="polite"></div>

    <section class="map-section">
      <div id="map"></div>
      <p class="map-note">
        Locations are approximate and represent reported cities or regions,
        not verified detention locations.
      </p>
    </section>

    <section class="details-panel">
      <h2>Case Details</h2>
      <div id="detailsContent" class="details-content">
        Click “Load Map Data,” then select a location to view its cases.
      </div>
    </section>
  </div>
`

//restrict map to russia bounds
const russiaBounds = [
  [41, 19],
  [82, 191]
]

//initialize map
const map = L.map('map', {
  maxBounds: russiaBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 3,
  maxZoom: 10
}).setView([61, 90], 3)

//add dark tile layer
L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; Stadia Maps, &copy; OpenMapTiles &copy; OpenStreetMap contributors'
}).addTo(map)

//layer to hold markers
let markerLayer = L.layerGroup().addTo(map)
let allPoints = []

//get dom elements
const loadBtn = document.getElementById('loadData')
const detailsContent = document.getElementById('detailsContent')
const mapStatus = document.getElementById('mapStatus')

//load map on click
loadBtn.addEventListener('click', loadMapData)

//fetch map data from backend
async function loadMapData() {
  setMapLoading(true)
  detailsContent.innerHTML = '<p>Loading map data...</p>'

  try {
    const response = await axios.get('/api/map')
    const data = response.data

    //validate response
    if (!data.points || !Array.isArray(data.points)) {
      detailsContent.innerHTML = '<p>No points array found in response.</p>'
      return
    }

    //store and render points
    allPoints = data.points
    renderMarkers()

  } catch (error) {
    console.error('Error loading map data:', error)

    detailsContent.innerHTML = `
      <div class="error-box">
        <p><strong>Error loading map data.</strong></p>
        <p>${escapeHtml(error.message || 'Unknown error')}</p>
      </div>
    `
  } finally {
    setMapLoading(false)
  }
}

//group prisoners by coordinates
function groupPointsByLocation(points) {
  const groups = new Map()

  points.forEach((point) => {
    //validate coordinates
    if (!point?.coordinates) return

    const lat = point.coordinates.lat
    const lng = point.coordinates.lng

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    //use coordinates as a unique location key
    const key = `${lat},${lng}`

    if (!groups.has(key)) {
      groups.set(key, {
        lat: lat,
        lng: lng,
        location: point.location || 'Unknown location',
        people: []
      })
    }

    groups.get(key).people.push(point)
  })

  return Array.from(groups.values())
}

//create numbered marker
function createCountMarker(count) {
  const size = count >= 100 ? 46 : count >= 10 ? 38 : 32

  return L.divIcon({
    className: 'count-marker-wrapper',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: #e21d36;
        border: 2px solid #ff7180;
        border-radius: 50%;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

//render grouped markers
function renderMarkers() {
  markerLayer.clearLayers()

  //skip if no data
  if (!Array.isArray(allPoints) || allPoints.length === 0) {
    detailsContent.innerHTML = '<p>No locations available.</p>'
    return
  }

  //group all points by location
  const locations = groupPointsByLocation(allPoints)

  locations.forEach((location) => {
    const count = location.people.length

    //create numbered marker
    const marker = L.marker(
      [location.lat, location.lng],
      {
        icon: createCountMarker(count)
      }
    )

    //sanitize location
    const safeLocation = escapeHtml(location.location)

    //popup content
    marker.bindPopup(`
      <div class="popup-card">
        <strong>${safeLocation}</strong><br>
        ${count} ${count === 1 ? 'case' : 'cases'}<br>
        <button class="popup-details-btn" type="button">
          View cases
        </button>
      </div>
    `)

    //handle popup button click
    marker.on('popupopen', (event) => {
      const popupElement = event.popup.getElement()
      if (!popupElement) return

      const button = popupElement.querySelector('.popup-details-btn')
      if (!button) return

      button.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()

        showLocationCases(location)

        //scroll to details section
        const detailsSection = document.querySelector('.details-panel')
        if (detailsSection) {
          detailsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      })
    })

    markerLayer.addLayer(marker)
  })

  //update visible count
  const totalCases = locations.reduce(
    (sum, location) => sum + location.people.length,
    0
  )

  detailsContent.innerHTML = `
    <p>${totalCases} cases displayed across
    ${locations.length} map locations.</p>
    <p>Click a numbered marker to view the cases at that location.</p>
    <p>Locations are approximate city or regional reference points,
    not confirmed prisoner locations.</p>
  `
}

//show all cases associated with a location
function showLocationCases(location) {
  const people = [...location.people].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  //render scrollable list
  detailsContent.innerHTML = `
    <div class="person-card">
      <h3>${escapeHtml(location.location)}</h3>
      <p>${people.length} ${people.length === 1 ? 'case' : 'cases'}</p>

      <div class="location-case-list" style="
        max-height: 450px;
        overflow-y: auto;
        margin-top: 15px;
      ">
        ${people.map((person, index) => `
          <div class="detail-card" style="margin-bottom: 8px;">
            <button
              class="case-select-btn"
              data-index="${index}"
              type="button"
              style="
                width: 100%;
                text-align: left;
                cursor: pointer;
                color: inherit;
                background: transparent;
                border: none;
                font: inherit;
                padding: 8px;
              "
            >
              ${escapeHtml(person.name || 'Unknown')}
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `

  //handle individual case selection
  const buttons = detailsContent.querySelectorAll('.case-select-btn')

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const index = Number(button.dataset.index)
      const person = people[index]

      if (!person || !person.id) return

      await loadPrisonerDetails(person.id)
    })
  })
}

//fetch full prisoner details
async function loadPrisonerDetails(id) {
  detailsContent.innerHTML = '<p>Loading prisoner details...</p>'

  try {
    const response = await axios.get(
      `/api/prisoner/${encodeURIComponent(id)}`
    )

    const person = response.data

    //render details
    detailsContent.innerHTML = `
      <div class="person-card">
        <div class="details-header">
          <div>
            <h3>${escapeHtml(person.name || 'Unknown')}</h3>
          </div>
        </div>

        ${
          person.photo_url
            ? `
              <img
                class="person-photo"
                src="${escapeHtml(person.photo_url)}"
                alt="${escapeHtml(person.name || 'Prisoner photo')}"
              />
            `
            : ''
        }

        <div class="detail-grid">
          ${detailRow('Gender', person.gender)}
          ${detailRow('Age', person.age)}
          ${detailRow('Region', person.location)}
          ${detailRow('Reported Detention Location', person.current_location)}
          ${detailRow('Occupation', person.occupation)}
          ${detailRow('Category', person.category)}
          ${detailRow('Case Status', person.trial_status)}
          ${detailRow('Imprisonment Start', formatDate(person.arrest_date))}
          ${detailRow('Sentence', person.sentence)}
          ${detailRow('Last Updated', formatDate(person.last_updated))}
        </div>

        <div class="story-box">
          <h4>Case Description</h4>
          <p>${escapeHtml(person.summary || 'No case description available.')}</p>
        </div>
      </div>
    `
  } catch (error) {
    console.error('Error loading prisoner details:', error)

    detailsContent.innerHTML = `
      <div class="error-box">
        <p><strong>Error loading prisoner details.</strong></p>
        <p>${escapeHtml(error.message || 'Unknown error')}</p>
      </div>
    `
  }
}

//toggle loading state
function setMapLoading(isLoading) {
  if (isLoading) {
    loadBtn.disabled = true
    loadBtn.textContent = 'Loading...'
    mapStatus.classList.remove('hidden')
    mapStatus.innerHTML = `
      <div class="spinner" aria-hidden="true"></div>
      <span>Loading map data. This may take a few seconds...</span>
    `
  } else {
    loadBtn.disabled = false
    loadBtn.textContent = 'Load Map Data'
    mapStatus.classList.add('hidden')
    mapStatus.innerHTML = ''
  }
}

//build detail card
function detailRow(label, value) {
  return `
    <div class="detail-card">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${formatValue(value)}</div>
    </div>
  `
}

//format basic values
function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Unknown'
  return escapeHtml(String(value))
}

//format date nicely
function formatDate(value) {
  if (!value) return 'Unknown'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return escapeHtml(String(value))

  return escapeHtml(
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    })
  )
}

//escape html for safety
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
