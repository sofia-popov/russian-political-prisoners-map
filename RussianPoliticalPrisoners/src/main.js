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

    <section class="controls-panel">
      <h2>Urgency Level</h2>
      <div class="filter-row">
        <label class="filter-pill">
          <input type="checkbox" id="filter-red" checked />
          <span class="dot-preview red"></span>
          High
        </label>

        <label class="filter-pill">
          <input type="checkbox" id="filter-orange" checked />
          <span class="dot-preview orange"></span>
          Medium
        </label>

        <label class="filter-pill">
          <input type="checkbox" id="filter-green" checked />
          <span class="dot-preview green"></span>
          Low
        </label>
      </div>
    </section>

    <section class="map-section">
      <div id="map"></div>
    </section>

    <section class="details-panel">
      <h2>Case Details</h2>
      <div id="detailsContent" class="details-content">
        Click “Load Map Data,” then click a dot and choose “See full details.”
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

//filter checkboxes
const filterRed = document.getElementById('filter-red')
const filterOrange = document.getElementById('filter-orange')
const filterGreen = document.getElementById('filter-green')

//disable filters before load
setFiltersEnabled(false)

//load map on click
loadBtn.addEventListener('click', loadMapData)

//update markers when filters change
filterRed.addEventListener('change', renderMarkers)
filterOrange.addEventListener('change', renderMarkers)
filterGreen.addEventListener('change', renderMarkers)

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
    setFiltersEnabled(true)

    detailsContent.innerHTML = `<p>Map loaded. Use the filters above, then click a dot and press <strong>See full details</strong>.</p>`
  } catch (error) {
    console.error('Error loading map data:', error)
    setFiltersEnabled(false)
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

//render markers based on filters
function renderMarkers() {
  markerLayer.clearLayers()

  //skip if no data
  if (!Array.isArray(allPoints) || allPoints.length === 0) return

  let visibleCount = 0

  allPoints.forEach((point) => {
    //validate coordinates
    if (!point?.coordinates) return
    if (typeof point.coordinates.lat !== 'number' || typeof point.coordinates.lng !== 'number') return

    const lat = point.coordinates.lat
    const lng = point.coordinates.lng

    //determine color and apply filter
    const markerColor = getMarkerColor(point)
    if (!shouldShowColor(markerColor)) return

    //sanitize values
    const safeName = escapeHtml(point.name || point.name_english || 'Unknown')
    const safeLocation = escapeHtml(point.location || point.current_location || 'Unknown location')
    const safeId = escapeHtml(String(point.id || ''))

    //create marker
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: markerColor,
      fillColor: markerColor,
      fillOpacity: 0.9,
      weight: 1.5
    })

    //popup content
    marker.bindPopup(`
      <div class="popup-card">
        <strong>${safeName}</strong><br>
        ${safeLocation}<br>
        <button class="popup-details-btn" data-prisoner-id="${safeId}" type="button">
          See full details
        </button>
      </div>
    `)

    //handle popup button click
    marker.on('popupopen', (event) => {
      const popupElement = event.popup.getElement()
      if (!popupElement) return

      const button = popupElement.querySelector('.popup-details-btn')
      if (!button) return

      button.addEventListener('click', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await loadPrisonerDetails(point.id)

        //scroll to details section
        const detailsSection = document.querySelector('.details-panel')
        if (detailsSection) {
          detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    })

    markerLayer.addLayer(marker)
    visibleCount += 1
  })

  //update visible count
  detailsContent.innerHTML = `<p>${visibleCount} dots currently visible. Click a dot, then click <strong>See full details</strong>.</p>`
}

//fetch full prisoner details
async function loadPrisonerDetails(id) {
  detailsContent.innerHTML = '<p>Loading prisoner details...</p>'

  try {
    const response = await axios.get(`/api/prisoner/${id}`)
    const person = response.data

    //render details
    detailsContent.innerHTML = `
      <div class="person-card">
        <div class="details-header">
          <div>
            <h3>${escapeHtml(person.name_english || person.name || 'Unknown')}</h3>
            <p class="details-subtitle">${escapeHtml(person.name_native || person.name_russian || '')}</p>
          </div>
        </div>

        ${
          person.photo_url
            ? `
              <img
                class="person-photo"
                src="${escapeHtml(person.photo_url)}"
                alt="${escapeHtml(person.name_english || person.name || 'Prisoner photo')}"
              />
            `
            : ''
        }

        <div class="detail-grid">
          ${detailRow('Gender', person.gender)}
          ${detailRow('Age', person.age)}
          ${detailRow('Location', person.location)}
          ${detailRow('Current Location', person.current_location)}
          ${detailRow('Occupation', person.occupation)}
          ${detailRow('Category', person.category || person.case_category)}
          ${detailRow('Urgency', person.urgency_level || person.urgencyLevel)}
          ${detailRow('Trial Status', person.trial_status || person.trialStatus)}
          ${detailRow('Arrest Date', formatDate(person.arrest_date))}
          ${detailRow('Sentence (Years)', person.sentence_years)}
          ${detailRow('International Attention', formatBoolean(person.international_attention))}
          ${detailRow('Torture Reported', formatBoolean(person.torture_reported))}
          ${detailRow('Source', formatLink(person.url), true)}
        </div>

        <div class="story-box">
          <h4>Summary / Story</h4>
          <p>${escapeHtml(person.summary_english || person.summary || 'No summary available.')}</p>
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

//map urgency to color
function getMarkerColor(point) {
  const urgency = (point.urgencyLevel || point.urgency_level || '').toLowerCase()

  if (urgency === 'critical' || urgency === 'high') return 'red'
  if (urgency === 'medium') return 'orange'
  if (urgency === 'low') return 'lime'
  return 'deepskyblue'
}

//check if color passes filters
function shouldShowColor(color) {
  if (color === 'red') return filterRed.checked
  if (color === 'orange') return filterOrange.checked
  if (color === 'lime') return filterGreen.checked
  return false
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
function detailRow(label, value, isHtml = false) {
  const displayValue = isHtml ? value : formatValue(value)

  return `
    <div class="detail-card">
      <div class="detail-label">${escapeHtml(label)}</div>
      <div class="detail-value">${displayValue}</div>
    </div>
  `
}

//format basic values
function formatValue(value) {
  if (value === null || value === undefined || value === '') return 'Unknown'
  return escapeHtml(String(value))
}

//format boolean values
function formatBoolean(value) {
  if (value === null || value === undefined) return 'Unknown'
  return value ? 'Yes' : 'No'
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
      day: 'numeric'
    })
  )
}

//format link safely
function formatLink(url) {
  if (!url) return 'Unavailable'
  const safeUrl = escapeHtml(url)
  return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open source page</a>`
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

//enable or disable filters
function setFiltersEnabled(enabled) {
  filterRed.disabled = !enabled
  filterOrange.disabled = !enabled
  filterGreen.disabled = !enabled
}