mapboxgl.accessToken =
  'pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg';

const clusterToggle = document.getElementById('cluster-toggle');
let groupSightings = clusterToggle.checked;
let details = document.getElementById('details');

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
  countrySelect.innerHTML = '<option value="">All countries</option>';
  [...countries]
    .sort()
    .forEach(
      (c) => (countrySelect.innerHTML += `<option value='${c}'>${c}</option>`)
    );

  updateStateFilterVisibility('');

  const stateSelect = document.getElementById('state-filter');
  stateSelect.innerHTML = '<option value="">All states</option>';
  [...states]
    .sort()
    .forEach(
      (s) => (stateSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );

  const shapeSelect = document.getElementById('shape-filter');
  shapeSelect.innerHTML = '<option value="">All shapes</option>';
  [...shapes]
    .sort()
    .forEach(
      (s) => (shapeSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );
}

function applyFilters() {
  const country = document.getElementById('country-filter').value;
  const state = document.getElementById('state-filter').value;
  const shape = document.getElementById('shape-filter').value;

  return allFeatures.filter((f) => {
    const p = f.properties;
    const y = p.datetime
      ? new Date(p.datetime).getFullYear()
      : 0;

    if (y < valueMin || y > valueMax) return false;
    if (country && p.country !== country) return false;
    if (state && p.state !== state) return false;
    if (shape && p.shape !== shape) return false;

    return true;
  });
}

function setupFilterListeners() {
  ['country-filter', 'state-filter', 'shape-filter'].forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      if (id === 'country-filter') {
        updateStateFilterVisibility(e.target.value);
      }

      ufoFeatures = applyFilters();
      updateMapVisualization();
    });
  });
}

function updateStateFilterVisibility(country) {
  const stateSelect = document.getElementById('state-filter');
  const stateFilterContainer = document.getElementById('state-filter').parentElement;
  if (country === 'us')
    stateFilterContainer.classList.remove('hidden');
  else {
    stateFilterContainer.classList.add('hidden');
    stateSelect.value = '';
  }
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

    populateFilters(rows);
    setupFilterListeners();
    updateThumbs();

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
          `<strong>${city || 'Unknown'}</strong>${state ? ', ' + state : ''
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
      <p><strong>Location:</strong> ${city || 'Unknown'}${state ? ', ' + state : ''
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

const minYear = 1908;
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

  ufoFeatures = applyFilters();
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