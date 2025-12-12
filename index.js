mapboxgl.accessToken =
  "pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg";

const clusterToggle = document.getElementById("cluster-toggle");
let groupSightings = clusterToggle.checked;
const detailsPanel = document.getElementById("details-panel");
const detailsContent = document.getElementById("details");

clusterToggle.addEventListener("change", () => {
  groupSightings = clusterToggle.checked;
  updateMapVisualization();
});

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/estevaoabreu/clv76r3ur00nh01qve6re2wvh",
  center: [-50, 40],
  zoom: 1.0,
  minZoom: 2,
  projection: "mercator",
});

let ufoFeatures = [];
let allFeatures = [];
let countryToStatesMap = {};
let countryStateToShapesMap = {};
let activePopup = null;
let popupClickListener = false;

const firstNames = [
  "Alex",
  "Jordan",
  "Morgan",
  "Casey",
  "Riley",
  "Taylor",
  "Dakota",
  "Quinn",
  "Avery",
  "Cameron",
  "Blake",
  "Skylar",
  "River",
  "Sam",
  "Jamie",
  "Whitney",
  "Reese",
  "Phoenix",
  "Sage",
  "Storm",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
];

function generateRandomName(seed) {
  const hash = seed
    .split("")
    .reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const firstIdx = Math.abs(hash % firstNames.length);
  const lastIdx = Math.abs(((hash / firstNames.length) | 0) % lastNames.length);
  return `${firstNames[firstIdx]} ${lastNames[lastIdx]}`;
}

// New function to get UFO shape icon as SVG
function getUfoShapeIcon(shape) {
  const normalizedShape = (shape || "unknown").toLowerCase().trim();
  
  const shapeIcons = {
    circle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <circle cx="50" cy="50" r="40" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    disk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <ellipse cx="50" cy="50" rx="45" ry="15" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    triangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <polygon points="50,15 90,85 10,85" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <circle cx="50" cy="50" r="25" fill="#FFE066" stroke="#FFD700" stroke-width="3"/>
      <circle cx="50" cy="50" r="35" fill="none" stroke="#FFE066" stroke-width="2" opacity="0.5"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="#FFE066" stroke-width="1" opacity="0.3"/>
    </svg>`,
    
    sphere: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <defs>
        <radialGradient id="sphereGrad">
          <stop offset="0%" stop-color="#8ED8FF"/>
          <stop offset="100%" stop-color="#64C8FF"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#sphereGrad)" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    fireball: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <circle cx="50" cy="50" r="30" fill="#FF6B35" stroke="#FF4500" stroke-width="3"/>
      <circle cx="50" cy="50" r="20" fill="#FFD700" opacity="0.8"/>
    </svg>`,
    
    oval: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <ellipse cx="50" cy="50" rx="45" ry="30" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    cylinder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <rect x="25" y="20" width="50" height="60" rx="5" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    diamond: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <polygon points="50,10 85,50 50,90 15,50" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    rectangle: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <rect x="20" y="35" width="60" height="30" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    chevron: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <polygon points="50,20 90,50 75,50 50,35 25,50 10,50" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    egg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <ellipse cx="50" cy="55" rx="30" ry="40" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    cigar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <ellipse cx="50" cy="50" rx="45" ry="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    cone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <polygon points="50,15 80,85 20,85" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    cross: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <rect x="42" y="15" width="16" height="70" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
      <rect x="15" y="42" width="70" height="16" fill="#64C8FF" stroke="#4AA8D8" stroke-width="3"/>
    </svg>`,
    
    flash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <polygon points="55,10 40,50 60,50 45,90 70,45 50,45" fill="#FFD700" stroke="#FFA500" stroke-width="3"/>
    </svg>`,
    
    formation: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <circle cx="30" cy="40" r="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="2"/>
      <circle cx="50" cy="25" r="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="2"/>
      <circle cx="70" cy="40" r="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="2"/>
      <circle cx="40" cy="60" r="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="2"/>
      <circle cx="60" cy="60" r="12" fill="#64C8FF" stroke="#4AA8D8" stroke-width="2"/>
    </svg>`,
    
    changing: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <circle cx="50" cy="50" r="35" fill="none" stroke="#64C8FF" stroke-width="3" stroke-dasharray="10 5"/>
      <circle cx="50" cy="50" r="25" fill="none" stroke="#8ED8FF" stroke-width="2" stroke-dasharray="5 3"/>
    </svg>`,
    
    unknown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
      <text x="50" y="65" font-size="60" text-anchor="middle" fill="#64C8FF">?</text>
    </svg>`,
  };
  
  // Return the icon for the shape, or unknown if not found
  return shapeIcons[normalizedShape] || shapeIcons.unknown;
}

function closeDetailsPanel() {
  detailsPanel.classList.add("hidden");
}

function populateFilters(rows) {
  const countries = new Set();
  const states = new Set();
  const shapes = new Set();
  const years = [];

  countryToStatesMap = {};
  countryStateToShapesMap = {};

  rows.forEach((d) => {
    if (d.country) countries.add(d.country);

    if (d.state && d.country) {
      states.add(d.state);
      if (!countryToStatesMap[d.country]) {
        countryToStatesMap[d.country] = new Set();
      }
      countryToStatesMap[d.country].add(d.state);
    }

    if (d.shape) {
      shapes.add(d.shape);
      const key = `${d.country || ""}-${d.state || ""}`;
      if (!countryStateToShapesMap[key]) {
        countryStateToShapesMap[key] = new Set();
      }
      countryStateToShapesMap[key].add(d.shape);
    }

    if (d.datetime) years.push(new Date(d.datetime).getFullYear());
  });

  const countrySelect = document.getElementById("country-filter");
  countrySelect.innerHTML = '<option value="">All countries</option>';
  [...countries]
    .sort()
    .forEach(
      (c) => (countrySelect.innerHTML += `<option value='${c}'>${c}</option>`)
    );

  updateStateFilterVisibility("");
  updateStateFilterOptions("");
  updateShapeFilterOptions();
}

function updateShapeFilterOptions() {
  const country = document.getElementById("country-filter").value;
  const state = document.getElementById("state-filter").value;
  const shapeSelect = document.getElementById("shape-filter");

  shapeSelect.innerHTML = '<option value="">All shapes</option>';

  const key = `${country || ""}-${state || ""}`;

  let shapesToShow = [];

  if (countryStateToShapesMap[key]) {
    shapesToShow = [...countryStateToShapesMap[key]].sort();
  } else if (country) {
    const countryShapes = new Set();
    for (const [map_key, shapeSet] of Object.entries(countryStateToShapesMap)) {
      if (map_key.startsWith(country)) {
        shapeSet.forEach((shape) => countryShapes.add(shape));
      }
    }
    shapesToShow = [...countryShapes].sort();
  } else {
    const allShapes = new Set();
    for (const shapeSet of Object.values(countryStateToShapesMap)) {
      shapeSet.forEach((shape) => allShapes.add(shape));
    }
    shapesToShow = [...allShapes].sort();
  }

  shapesToShow.forEach(
    (s) => (shapeSelect.innerHTML += `<option value='${s}'>${s}</option>`)
  );

  shapeSelect.value = "";
}

function applyFilters() {
  const country = document.getElementById("country-filter").value;
  const state = document.getElementById("state-filter").value;
  const shape = document.getElementById("shape-filter").value;

  return allFeatures.filter((f) => {
    const p = f.properties;
    const y = p.datetime ? new Date(p.datetime).getFullYear() : 0;

    if (y < valueMin || y > valueMax) return false;
    if (country && p.country !== country) return false;
    if (state && p.state !== state) return false;
    if (shape && p.shape !== shape) return false;

    return true;
  });
}

function setupFilterListeners() {
  ["country-filter", "state-filter", "shape-filter"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (e) => {
      closeDetailsPanel();
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      if (id === "country-filter") {
        const selectedCountry = e.target.value;
        updateStateFilterVisibility(selectedCountry);
        updateStateFilterOptions(selectedCountry);
      }

      if (id === "country-filter" || id === "state-filter") {
        updateShapeFilterOptions();
      }

      ufoFeatures = applyFilters();
      updateMapVisualization();
      updateCharts();
    });
  });

  document.getElementById("state-filter").addEventListener("change", (e) => {
    zoomToState(e.target.value);
  });
}

function updateStateFilterOptions(country) {
  const stateSelect = document.getElementById("state-filter");
  stateSelect.innerHTML = '<option value="">All states</option>';

  let statesToShow = [];

  if (country && countryToStatesMap[country]) {
    statesToShow = [...countryToStatesMap[country]].sort();
  }

  statesToShow.forEach(
    (s) => (stateSelect.innerHTML += `<option value='${s}'>${s}</option>`)
  );

  stateSelect.value = "";
}

function updateStateFilterVisibility(country) {
  const stateSelect = document.getElementById("state-filter");
  const stateFilterContainer =
    document.getElementById("state-filter").parentElement;
  if (country === "United States" || country === "Canada")
    stateFilterContainer.classList.remove("hidden");
  else {
    stateFilterContainer.classList.add("hidden");
    stateSelect.value = "";
  }
}

function updateMapVisualization() {
  if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
  if (map.getLayer("clusters")) map.removeLayer("clusters");
  if (map.getLayer("unclustered-point")) map.removeLayer("unclustered-point");
  if (map.getSource("ufoSightings")) map.removeSource("ufoSightings");
  updateStats(ufoFeatures);

  const sourceOptions = {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: ufoFeatures,
    },
  };

  if (groupSightings) {
    sourceOptions.cluster = true;
    sourceOptions.clusterMaxZoom = 6;
    sourceOptions.clusterRadius = 40;
  }

  map.addSource("ufoSightings", sourceOptions);

  if (groupSightings) {
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "ufoSightings",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          "rgba(100, 200, 255, 0.25)",
          250,
          "rgba(100, 200, 255, 0.5)",
          500,
          "rgba(100, 200, 255, 0.75)",
          750,
          "rgba(100, 200, 255, 1)",
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          15,
          250,
          25,
          1000,
          35,
          5000,
          45,
        ],

        "circle-stroke-color": "#e8e7e7",
        "circle-stroke-width": 1,
      },
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "ufoSightings",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "ufoSightings",
    filter: groupSightings ? ["!", ["has", "point_count"]] : ["all"],
    paint: {
      "circle-color": "#64C8FF",
      "circle-radius": 4,
    },
  });
}

function updateStats(features) {
  const totalSightings = features.length;
  document.querySelector("#total-sightings .stat-value").textContent =
    totalSightings;

  const citiesSet = new Set(
    features.map((f) => f.properties.city).filter((c) => c)
  );
  document.querySelector("#total-cities .stat-value").textContent =
    citiesSet.size;

  const shapeCounts = {};
  features.forEach((f) => {
    const shape = f.properties.shape || "Unknown";
    shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
  });
  const commonShape = Object.keys(shapeCounts).length
    ? Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0][0]
    : "N/A";
  document.querySelector("#common-shape .stat-value").textContent = commonShape;

  const durations = features
    .map((f) => parseFloat(f.properties.durationSeconds))
    .filter((d) => !isNaN(d));
  const avgDuration = durations.length
    ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
    : "N/A";
  document.querySelector("#avg-duration .stat-value").textContent =
    avgDuration + (avgDuration !== "N/A" ? " seconds" : "");
}

map.on("load", () => {
  d3.csv("data.csv").then((rows) => {
    allFeatures = rows.map((d) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [+d.longitude, +d.latitude] },
      properties: {
        city: d.city,
        state: d.state,
        country: d.country,
        shape: d.shape || "",
        datetime: d.datetime,
        comments: d.comments,
        durationSeconds: d.durationSeconds,
        durationFull: d.durationFull,
      },
    }));

    updateStats(allFeatures);

    populateFilters(rows);
    setupFilterListeners();
    updateThumbs();

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("mouseenter", "unclustered-point", (e) => {
      map.getCanvas().style.cursor = "pointer";

      const f = e.features[0];
      const { comments, city, state, country, datetime, shape, durationFull } =
        f.properties;

      // Pop-up Mapbox
      const dateObj = new Date(datetime);
      const formattedDate = !isNaN(dateObj)
        ? dateObj.toLocaleDateString("en-US")
        : "Unknown";
      const formattedTime = !isNaN(dateObj)
        ? dateObj.toLocaleTimeString("en-US")
        : "N/A";

      if (activePopup) activePopup.remove();

      activePopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
      })
        .setLngLat(f.geometry.coordinates)
        .setHTML(
          `
        <div class='ufo-box'>
            <h3>UFO Sighting Details</h3>
            <div class='sighting-info'>
                <div class='sighting-item'>
                    <div class='sighting-item-icon'>📍</div>
                    <div>
                        <div class='sighting-item-label'>Location</div>
                        <div class='sighting-item-value'>${city || "Unknown"}${state ? ", " + state : ""
          }${country ? ", " + country : ""}</div>
                    </div>
                </div>
                <div class='sighting-item'>
                    <div class='sighting-item-icon'>📅</div>
                    <div>
                        <div class='sighting-item-label'>Date</div>
                        <div class='sighting-item-value'>${formattedDate}</div>
                    </div>
                </div>
                <div class='sighting-item'>
                    <div class='sighting-item-icon'>🕐</div>
                    <div>
                        <div class='sighting-item-label'>Time</div>
                        <div class='sighting-item-value'>${formattedTime}</div>
                    </div>
                </div>
                <div class='sighting-item'>
                    <div class='sighting-item-icon'>🛸</div>
                    <div>
                        <div class='sighting-item-label'>Shape</div>
                        <div class='sighting-item-value'>${shape || "Unknown"
          }</div>
                    </div>
                </div>
                <div class='sighting-item'>
                    <div class='sighting-item-icon'>⏱️</div>
                    <div>
                        <div class='sighting-item-label'>Duration</div>
                        <div class='sighting-item-value'>${durationFull || "Unknown"
          }</div>
                    </div>
                </div>
            </div>
        </div>
    `
        )
        .addTo(map);

      // Details panel with UFO shape icon instead of random avatar
      if (comments) {
        const commenterName = generateRandomName(comments);
        const shapeIcon = getUfoShapeIcon(shape);

        detailsContent.innerHTML = `
            <div class='comment-card'>
                <div class='comment-image-container'>${shapeIcon}</div>
                <div class='comment-details'>
                    <p class='comment-name'>${commenterName}</p>
                    <p class='comment-text'>${comments}</p>
                </div>
            </div>
        `;
        detailsPanel.classList.remove("hidden");
      } else {
        closeDetailsPanel();
      }
    });

    map.on("mouseleave", "unclustered-point", () => {
      map.getCanvas().style.cursor = "";
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      closeDetailsPanel();
    });

    map.on("mouseleave", "unclustered-point", () => {
      if (popupClickListener) {
        popupClickListener = false;
        return;
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: ["unclustered-point"],
      });

      if (features.length === 0) {
        closeDetailsPanel();
        if (activePopup) {
          activePopup.remove();
          activePopup = null;
        }
      }
    });

    map.on("click", "clusters", (e) => {
      if (!groupSightings) return;
      e.originalEvent.stopPropagation();
      closeDetailsPanel();
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource("ufoSightings");
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom + 0.75,
        });
      });
    });

    map.on(
      "mouseenter",
      "clusters",
      () => (map.getCanvas().style.cursor = "pointer")
    );
    map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
  });
});

const thumbMin = document.getElementById("thumb-min");
const thumbMax = document.getElementById("thumb-max");
const yearDisplay = document.getElementById("year-display");

const minYear = 1906;
const maxYear = 2014;
let valueMin = minYear;
let valueMax = maxYear;
const rangeWidth = 250;

const bubbleMin = document.getElementById("bubble-min");
const bubbleMax = document.getElementById("bubble-max");

function updateThumbs() {
  const leftMin = ((valueMin - minYear) / (maxYear - minYear)) * rangeWidth;
  const leftMax = ((valueMax - minYear) / (maxYear - minYear)) * rangeWidth;

  thumbMin.style.left = leftMin + "px";
  thumbMax.style.left = leftMax + "px";

  // Update bubble positions
  bubbleMin.style.left = leftMin + "px";
  bubbleMax.style.left = leftMax + "px";

  // Update bubble text
  bubbleMin.textContent = valueMin;
  bubbleMax.textContent = valueMax;

  ufoFeatures = applyFilters();
  updateMapVisualization();
  updateCharts();
}

function dragThumb(thumb, isMin) {
  thumb.onmousedown = function (e) {
    e.preventDefault();
    document.onmousemove = function (event) {
      const rect = thumb.parentElement.getBoundingClientRect();
      let x = event.clientX - rect.left;
      x = Math.max(0, Math.min(rangeWidth, x));
      const val = Math.round((x / rangeWidth) * (maxYear - minYear) + minYear);
      if (isMin) valueMin = Math.min(val, valueMax);
      else valueMax = Math.max(val, valueMin);
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

const mapButtons = document.querySelectorAll(".map-btn");
const mapDiv = document.querySelector("#map");
const timelineDiv = document.querySelector("#timeline-container");
const shapesDiv = document.querySelector("#shapes-container");
const monthlyDiv = document.querySelector("#monthly-container");

let timelineChart, shapesChart, monthlyChart;

const initialCenter = [-50, 40];
const initialZoom = 1.0;

mapButtons.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    mapButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    mapDiv.style.display = index === 0 ? "block" : "none";
    timelineDiv.style.display = index === 1 ? "block" : "none";
    shapesDiv.style.display = index === 2 ? "block" : "none";
    monthlyDiv.style.display = index === 3 ? "block" : "none";

    closeDetailsPanel();
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }

    if (index === 0) {
      map.resize();
      map.easeTo({ center: initialCenter, zoom: initialZoom, duration: 1000 });
    }
    if (index === 1) drawTimelineChart(ufoFeatures);
    if (index === 2) drawShapesChart(ufoFeatures);
    if (index === 3) drawMonthlyChart(ufoFeatures);
  });
});

function drawTimelineChart(features) {
  timelineDiv.innerHTML = "";

  const yearCounts = {};
  features.forEach((f) => {
    const year = new Date(f.properties.datetime).getFullYear();
    if (!isNaN(year)) {
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });

  const data = Object.entries(yearCounts)
    .map(([year, count]) => ({ year: parseInt(year), count: parseInt(count) }))
    .sort((a, b) => a.year - b.year);

  if (data.length === 0) {
    timelineDiv.innerHTML =
      "<p class='no-data-msg'>No data for the selected period.</p>";
    return;
  }

  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const containerRect = timelineDiv.getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = containerRect.height - margin.top - margin.bottom;

  const xScale = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.year))
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.count) || 1])
    .range([height, 0]);

  const svg = d3
    .select("#timeline-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const line = d3
    .line()
    .x((d) => xScale(d.year))
    .y((d) => yScale(d.count));

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""))
    .selectAll("line")
    .attr("stroke", "#e8e7e7")
    .attr("stroke-width", 1);

  const path = g
    .append("path")
    .datum(data)
    .attr("class", "line")
    .attr("d", line)
    .attr("stroke", "lightblue")
    .attr("fill", "none");

  const pathLength = path.node().getTotalLength();
  path
    .attr("stroke-dasharray", pathLength)
    .attr("stroke-dashoffset", pathLength)
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  g.selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.count))
    .attr("fill", "lightblue")
    .attr("r", 0)
    .attr("opacity", 0)
    .on("mouseover", function (event, d) {
      d3.select(this)
        .transition()
        .duration(300)
        .attr("r", 7)

      g.append("text")
        .attr("class", "tooltip-text")
        .attr("x", xScale(d.year))
        .attr("y", yScale(d.count) - 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#e8e7e7")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("pointer-events", "none")
        .style("text-shadow", "0 0 4px #0e0e0e")
        .text(`${d.year}: ${d.count} sightings`)
        .transition()
        .duration(200)
        .attr("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this)
        .transition()
        .duration(300)
        .attr("r", 4)
        .attr("filter", "");

      g.selectAll(".tooltip-text").remove();
    })
    .transition()
    .delay((d, i) => (i / data.length) * 1000)
    .duration(1000)
    .ease(d3.easeElasticOut)
    .attr("r", 4)
    .attr("opacity", 1);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", 40)
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Number of Sightings");
}

function drawShapesChart(features) {
  const ctx = document.getElementById("shapes-chart").getContext("2d");

  const counts = {};
  features.forEach((f) => {
    const shape = f.properties.shape || "Unknown";
    counts[shape] = (counts[shape] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map((entry) => entry[0]);
  const data = sorted.map((entry) => entry[1]);

  if (shapesChart) shapesChart.destroy();

  shapesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Count per shape",
          data: data,
          backgroundColor: "#64C8FF",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#e8e7e7" } },
        y: { ticks: { color: "#e8e7e7" } },
      },
      plugins: {
        legend: { labels: { color: "#e8e7e7" } },
        tooltip: {
          enabled: true,
          callbacks: {
            label: function (context) {
              return `${context.label}: ${context.raw} sightings`;
            },
          },
        },
      },
    },
  });
}

function drawMonthlyChart(features) {
  const ctx = document.getElementById("monthly-chart").getContext("2d");
  const monthsCount = Array(12).fill(0);
  features.forEach((f) => {
    const dt = new Date(f.properties.datetime);
    if (!isNaN(dt)) monthsCount[dt.getMonth()] += 1;
  });
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Sightings per month",
          data: monthsCount,
          backgroundColor: "#64C8FF",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#e8e7e7" } },
        y: { ticks: { color: "#e8e7e7" } },
      },
      plugins: { legend: { labels: { color: "#e8e7e7" } } },
    },
  });
}

function updateCharts() {
  const activeBtn = Array.from(mapButtons).findIndex((b) =>
    b.classList.contains("active")
  );
  if (activeBtn === 1) drawTimelineChart(ufoFeatures);
  if (activeBtn === 2) drawShapesChart(ufoFeatures);
  if (activeBtn === 3) drawMonthlyChart(ufoFeatures);
}

function zoomToArea(features, maxZoom) {
  if (features.length === 0) return;
  const lons = features.map((f) => f.geometry.coordinates[0]);
  const lats = features.map((f) => f.geometry.coordinates[1]);
  const bounds = [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
  map.fitBounds(bounds, { padding: 50, maxZoom: maxZoom, duration: 1000 });
}

const countryFilter = document.getElementById("country-filter");
countryFilter.addEventListener("change", (e) => {
  const country = e.target.value;
  if (!country) return map.easeTo({ center: [-50, 40], zoom: 1.0 });
  const features = allFeatures.filter((f) => f.properties?.country === country);
  zoomToArea(features, 6);
});

function zoomToState(state) {
  if (!state) {
    const country = document.getElementById("country-filter").value;
    if (country) {
      const features = allFeatures.filter(
        (f) => f.properties?.country === country
      );
      zoomToArea(features, 6);
    }
    return;
  }

  const features = allFeatures.filter((f) => f.properties?.state === state);
  zoomToArea(features, 8);
}

const aboutBtn = document.querySelector(".about-us");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-overlay");

// Abrir overlay
aboutBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
});

// Fechar overlay
closeBtn.addEventListener("click", () => {
  overlay.style.display = "none";
});