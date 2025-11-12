mapboxgl.accessToken = 'pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/estevaoabreu/clv76r3ur00nh01qve6re2wvh',
  center: [-100, 40],
  zoom: 3.5,
  projection: 'mercator'
});

map.on('load', () => {
  d3.csv("data.csv").then(rows => {
    const features = rows.map(d => {
      const obj = {};
      for (const [key, val] of Object.entries(d)) {
        obj[key.trim().toLowerCase()] = val;
      }
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [+obj.longitude, +obj.latitude]
        },
        properties: {
          city: obj.city,
          state: obj.state,
          datetime: obj.datetime
        }
      };
    }).filter(d => !isNaN(d.geometry.coordinates[0]) && !isNaN(d.geometry.coordinates[1]));

    console.log("Loaded points:", features.length);

    map.addSource("ufoSightings", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features
      }
    });

    map.addLayer({
      id: "ufoSightings",
      type: "circle",
      source: "ufoSightings",
      paint: {
        "circle-radius": 3,
        "circle-color": "crimson",
        "circle-stroke-color": "white",
        "circle-stroke-width": 0.5,
        "circle-opacity": 0.7
      }
    });

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.on('mouseenter', 'ufoSightings', e => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      const { city, state, datetime } = f.properties;
      const coordinates = f.geometry.coordinates.slice();
      const html = `
            <strong>${city || 'Unknown'}</strong>${state ? ', ' + state : ''}<br>
            <em>${datetime || 'No date'}</em>
          `;
      popup.setLngLat(coordinates).setHTML(html).addTo(map);
    });

    map.on('mouseleave', 'ufoSightings', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

  }).catch(err => console.error("Error loading CSV:", err));
});