mapboxgl.accessToken =
  'pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg';

const clusterToggle = document.getElementById('cluster-toggle');
let groupSightings = clusterToggle.checked;
const details = document.querySelector('#details');

clusterToggle.addEventListener('change', () => {
  groupSightings = clusterToggle.checked;
  updateMapVisualization();
});

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/estevaoabreu/clv76r3ur00nh01qve6re2wvh',
  center: [-100, 40],
  zoom: 3.5,
  minZoom: 2,
  projection: 'mercator',
});

let ufoFeatures = [];
let allFeatures = [];

function populateFilters(rows) {
  const countries = new Set();
  const states = new Set();
  const shapes = new Set();
  const years = [];

  rows.forEach((d) => {
    if (d.country) countries.add(d.country);
    if (d.state) states.add(d.state);
    if (d.shape) shapes.add(d.shape);
    if (d.datetime) years.push(new Date(d.datetime).getFullYear());
  });

  const countrySelect = document.getElementById('country-filter');
  countrySelect.innerHTML = '<option>Todos</option>';
  [...countries]
    .sort()
    .forEach(
      (c) => (countrySelect.innerHTML += `<option value='${c}'>${c}</option>`)
    );

  const stateSelect = document.getElementById('state-filter');
  stateSelect.innerHTML = '<option>Todos</option>';
  [...states]
    .sort()
    .forEach(
      (s) => (stateSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );

  const shapeSelect = document.getElementById('shape-filter');
  shapeSelect.innerHTML = '<option>Todas</option>';
  [...shapes]
    .sort()
    .forEach(
      (s) => (shapeSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );

  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const yearRange = document.getElementById('year-filter');
  const yearValue = document.getElementById('year-value');
  yearRange.min = minYear;
  yearRange.max = maxYear;
  yearRange.value = maxYear;
  yearValue.textContent = maxYear;
}

function applyFilters() {
  const country = document.getElementById('country-filter').value;
  const state = document.getElementById('state-filter').value;
  const shape = document.getElementById('shape-filter').value;
  const maxYear = +document.getElementById('year-filter').value;

  return allFeatures.filter((f) => {
    const p = f.properties;
    const year = p.datetime ? new Date(p.datetime).getFullYear() : 0;

    if (country && p.country !== country) return false;
    if (state && p.state !== state) return false;
    if (shape && p.shape !== shape) return false;
    if (year > maxYear) return false;

    return true;
  });
}

function setupFilterListeners() {
  ['country-filter', 'state-filter', 'shape-filter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      ufoFeatures = applyFilters();
      updateMapVisualization();
    });
  });

  const yearRange = document.getElementById('year-filter');
  const yearValue = document.getElementById('year-value');

  yearRange.addEventListener('input', () => {
    yearValue.textContent = yearRange.value;
    ufoFeatures = applyFilters();
    updateMapVisualization();
  });
}

function updateMapVisualization() {
  if (map.getLayer('clusters')) map.removeLayer('clusters');
  if (map.getLayer('unclustered-point')) map.removeLayer('unclustered-point');
  if (map.getSource('ufoSightings')) map.removeSource('ufoSightings');

  const sourceOptions = {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: ufoFeatures,
    },
  };

  if (groupSightings) {
    sourceOptions.cluster = true;
    sourceOptions.clusterMaxZoom = 6;
    sourceOptions.clusterRadius = 40;
  }

  map.addSource('ufoSightings', sourceOptions);

  if (groupSightings) {
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'ufoSightings',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          'rgba(255, 0, 0, 0.25)',
          250,
          'rgba(255, 0, 0, 0.5)',
          500,
          'rgba(255, 0, 0, 0.75)',
          750,
          'rgba(255, 0, 0, 1)',
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          15,
          250,
          25,
          1000,
          35,
          5000,
          45,
        ],
      },
    });
  }

  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'ufoSightings',
    filter: groupSightings ? ['!', ['has', 'point_count']] : ['all'],
    paint: {
      'circle-color': 'red',
      'circle-radius': 4,
    },
  });
}

map.on('load', () => {
  d3.csv('data.csv').then((rows) => {
    allFeatures = rows.map((d) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [+d.longitude, +d.latitude] },
      properties: {
        city: d.city,
        state: d.state,
        country: d.country,
        shape: d.shape || '',
        datetime: d.datetime,
        comments: d.comments,
      },
    }));

    ufoFeatures = [...allFeatures];

    populateFilters(rows);
    setupFilterListeners();

    debugger;

    updateMapVisualization();

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on('mouseenter', 'unclustered-point', (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features[0];
      const { city, state, datetime } = f.properties;
      popup
        .setLngLat(f.geometry.coordinates)
        .setHTML(
          `<strong>${city || 'Unknown'}</strong>${
            state ? ', ' + state : ''
          }<br><em>${datetime || 'No date'}</em>`
        )
        .addTo(map);
    });

    map.on('mouseleave', 'unclustered-point', () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    map.on('click', 'unclustered-point', (e) => {
      details.classList.remove('hidden');
      const f = e.features[0];
      const { city, state, datetime, comments } = f.properties;
      details.innerHTML = `
        <h2>UFO Sighting Details</h2>
        <p><strong>Location:</strong> ${city || 'Unknown'}${
        state ? ', ' + state : ''
      }</p>
        <p><strong>Date/Time:</strong> ${datetime || 'No date'}</p>
        <p><strong>Comments:</strong> ${comments || 'No comments'}</p>
      `;
    });

    map.on('click', 'clusters', (e) => {
      details.classList.add('hidden');
      if (!groupSightings) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource('ufoSightings');
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom + 0.75,
        });
      });
    });

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
  });
});

const thumbMin = document.getElementById('thumb-min');
const thumbMax = document.getElementById('thumb-max');
const yearDisplay = document.getElementById('year-display');

const minYear = 1906;
const maxYear = 2014;
let valueMin = minYear;
let valueMax = maxYear;

const rangeWidth = 250;

function updateThumbs() {
  const leftMin = ((valueMin - minYear) / (maxYear - minYear)) * rangeWidth;
  const leftMax = ((valueMax - minYear) / (maxYear - minYear)) * rangeWidth;
  thumbMin.style.left = leftMin + 'px';
  thumbMax.style.left = leftMax + 'px';
  yearDisplay.textContent = `${valueMin} - ${valueMax}`;

  ufoFeatures = allFeatures.filter((f) => {
    const y = f.properties.datetime
      ? new Date(f.properties.datetime).getFullYear()
      : 0;
    return y >= valueMin && y <= valueMax;
  });
  updateMapVisualization();
}

function dragThumb(thumb, isMin) {
  thumb.onmousedown = function (e) {
    e.preventDefault();
    document.onmousemove = function (event) {
      let rect = thumb.parentElement.getBoundingClientRect();
      let x = event.clientX - rect.left;
      x = Math.max(0, Math.min(rangeWidth, x));
      const val = Math.round((x / rangeWidth) * (maxYear - minYear) + minYear);

      if (isMin) {
        valueMin = Math.min(val, valueMax);
      } else {
        valueMax = Math.max(val, valueMin);
      }
      updateThumbs();
    };
    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

dragThumb(thumbMin, true);
dragThumb(thumbMax, false);

updateThumbs();
