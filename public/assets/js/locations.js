const zoom = 13
const markers = []
const addresses = document.querySelectorAll('.address')
const firstAddress = document.querySelector('.address')
const firstLat = '52.51884422874101'
const firstLng = '13.322981455896103'

const counter = 0

const map = L.map('map', {
  center: [firstLat, firstLng],
  zoom: zoom,
  attributionControl: false,
  popupPane: false
})

// https://osm-tileserver.medienhaus.udk-berlin.de/osm_tiles/{z}/{x}/{y}.{ext} https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}
const Stamen_TonerLite = L.tileLayer('https://osm.udk-berlin.de/tile/{z}/{x}/{y}.{ext}', {
  minZoom: 11,
  maxZoom: 20,
  ext: 'png'
}).addTo(map)

function randomIntFromInterval (min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function getIcon () {
  randomMarkerNo = randomIntFromInterval(1, 10)
  return L.icon({
    iconUrl: '/assets/img/marker/mushroom' + randomMarkerNo + '.svg',
    iconSize: [45, 64], // size of the icon
    shadowSize: [50, 64], // size of the shadow
    iconAnchor: [22, 55], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62], // the same for the shadow
    popupAnchor: [-5, -60] // point from which the popup should open relative to the iconAnchor
  })
}

function getMarker (latLon, icon = false) {
  if (icon) {
    return L.marker(latLon, { icon: icon }).addTo(map)
  }
  return L.marker(latLon).addTo(map)
}

function removeActiveClass () {
  if (document.querySelector('.address.active')) {
    document.querySelector('.address.active').classList.remove('active')
  }
}

function addressClickHandler (el, index) {

  const latLon = L.latLng(el._latlng)
  el.openPopup(latLon)
 // markers[index].openPopup(latLon)

  map.setView(latLon, 18, {
    animate: true,
    pan: {
      duration: 0.5
    }
  })

  removeActiveClass()
 // el.classList.add('active')
}

function markerClickHandler (e) {
  const lat = e.latlng.lat
  removeActiveClass()
}



function createMarker (lat, lng, name, author, thumbnailUrl,id) {
  const icon = getIcon()
  const latLon = L.latLng(lat, lng)
  const marker = getMarker(latLon, icon)

  marker.on('click', markerClickHandler)

  markers.push(marker)
  const popup = L.popup()
    .setLatLng(latLon)
    .setContent(`
            <h3>${name}</h3>
            ${author}
            <img src="${thumbnailUrl}" ?>
            <a href="/en/c/${id}">click </a>
        `)

  popup.on('remove', removeActiveClass)

  marker.bindPopup(popup)

  marker.addEventListener('click', function () {
    addressClickHandler(marker)
  })
}

if (window.location.hash) {
  const hash = document.querySelector(window.location.hash)
  if (hash && hash.classList.contains('address')) {
    hash.click()
  }
}

/** DRAGGABLE LIST VIEW **/
const slider = document.querySelector('.container')
let mouseDown = false
let startX, scrollLeft

const startDragging = function (e) {
  mouseDown = true
  startX = e.pageX - slider.offsetLeft
  scrollLeft = slider.scrollLeft
}
const stopDragging = function (event) {
  mouseDown = false
}

slider.addEventListener('mousemove', (e) => {
  e.preventDefault()
  if (!mouseDown) { return }
  const x = e.pageX - slider.offsetLeft
  const scroll = x - startX
  slider.scrollLeft = scrollLeft - scroll
})

// Add the event listeners
slider.addEventListener('mousedown', startDragging, false)
slider.addEventListener('mouseup', stopDragging, false)
slider.addEventListener('mouseleave', stopDragging, false)

/// /// adding zooming on location if get paramter exists
const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get('coords')) {
  const urlCoords = urlParams.get('coords').split(',')
  map.setView(L.latLng(urlCoords[0].trim(), urlCoords[1].trim()), 18, {
    animate: true,
    pan: {
      duration: 0
    }
  })
}
