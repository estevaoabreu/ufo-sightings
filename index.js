mapboxgl.accessToken = 'pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg'

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/estevaoabreu/clv76r3ur00nh01qve6re2wvh',
  center: [-100, 40],
  zoom: 3.5,
  projection: 'mercator'
})

map.on('load', () => {
  d3.csv("data.csv").then(rows => {
    const features = rows.map(d => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [+d.longitude, +d.latitude]
      },
      properties: {
        city: d.city,
        state: d.state,
        datetime: d.datetime,
        comments: d.comments
      }
    }))

    map.addSource("ufoSightings", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features
      },
      cluster: true,
      clusterMaxZoom: 6,
      clusterRadius: 40
    })

    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'ufoSightings',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          'rgba(255, 0, 0, 0.25)', 250,
          'rgba(255, 0, 0, 0.5)', 500,
          'rgba(255, 0, 0, 0.75)', 750,
          'rgba(255, 0, 0, 1)'
        ],
        'circle-radius': [
          'step', ['get', 'point_count'],
          15, 250,
          25, 1000,
          35, 5000,
          45
        ]
      }
    })

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'ufoSightings',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': 'red',
        'circle-radius': 4
      }
    })

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    })

    map.on('mouseenter', 'unclustered-point', e => {
      map.getCanvas().style.cursor = 'pointer'
      const f = e.features[0]
      const { city, state, datetime } = f.properties
      popup
        .setLngLat(f.geometry.coordinates)
        .setHTML(`
          <strong>${city || 'Unknown'}</strong>${state ? ', ' + state : ''}<br>
          <em>${datetime || 'No date'}</em>
        `)
        .addTo(map)
    })

    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = ''
      popup.remove()
    })
  })
})
