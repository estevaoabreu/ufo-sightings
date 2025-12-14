mapboxgl.accessToken = "pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg";

let allFeatures = [];
let ufoFeatures = [];

const countrySelect = document.getElementById("country-filter");
const stateSelect = document.getElementById("state-filter");
const shapeSelect = document.getElementById("shape-filter");

const minYear = 1906;
const maxYear = 2014;
let valueMin = minYear;
let valueMax = maxYear;

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

// Function to get UFO shape as EMOJI (120px size)
function getUfoShapeEmoji(shape) {
  const normalizedShape = (shape || "unknown").toLowerCase().trim();
  
  // EMOJI MAPPING:
  // circle → ⭕ (Red circle)
  // disk → 🛸 (Flying saucer)
  // triangle → 🔺 (Red triangle pointed up)
  // light → 💡 (Light bulb)
  // sphere → 🔮 (Crystal ball)
  // fireball → 🔥 (Fire)
  // oval → 🥚 (Egg)
  // cylinder → 🎫 (Ticket)
  // diamond → 💎 (Gem stone)
  // rectangle → ▬ (Black rectangle)
  // chevron → ⏶ (Black medium up-pointing triangle)
  // egg → 🥚 (Egg)
  // cigar → 🚬 (Cigarette)
  // cone → 🍦 (Ice cream cone)
  // cross → ✖️ (Heavy multiplication X)
  // flash → ⚡ (High voltage sign)
  // formation → ✨ (Sparkles)
  // changing → 🔄 (Counterclockwise arrows button)
  // unknown → ❓ (Question mark)
  
  const shapeEmojis = {
    circle: "⭕",           // Red circle
    disk: "🛸",             // Flying saucer
    triangle: "🔺",       // Red triangle pointed up
    light: "💡",          // Light bulb
    sphere: "🔮",         // Crystal ball
    fireball: "🔥",       // Fire
    oval: "🥚",           // Egg
    cylinder: "🎫",       // Ticket
    diamond: "💎",        // Gem stone
    rectangle: "▬",      // Black rectangle
    chevron: "⏶",        // Black medium up-pointing triangle
    egg: "🥚",            // Egg
    cigar: "🚬",         // Cigarette
    cone: "🍦",          // Ice cream cone
    cross: "✖️",         // Heavy multiplication X
    flash: "⚡",          // High voltage sign
    formation: "✨",     // Sparkles
    changing: "🔄",      // Counterclockwise arrows button
    unknown: "❓",        // Question mark
  };
  
  const emoji = shapeEmojis[normalizedShape] || shapeEmojis.unknown;
  
  // Return emoji wrapped in a styled div for large display
  return `<div style="font-size: 120px; text-align: center; line-height: 1;">${emoji}</div>`;
}

function closeDetailsPanel() {
  detailsPanel.classList.add("hidden");
}

function populateFilters(rows) {
  const countries = new Set();
  countryToStatesMap = {};
  countryStateToShapesMap = {};

  rows.forEach((d) => {
    if (d.country) countries.add(d.country);

    if (d.state && d.country) {
      if (!countryToStatesMap[d.country])
        countryToStatesMap[d.country] = new Set();
      countryToStatesMap[d.country].add(d.state);
    }

    if (d.shape) {
      const key = `${d.country || ""}-${d.state || ""}`;
      if (!countryStateToShapesMap[key])
        countryStateToShapesMap[key] = new Set();
      countryStateToShapesMap[key].add(d.shape);
    }
  });

  countrySelect.innerHTML = '<option value="">All countries</option>';
  [...countries].sort().forEach((c) => {
    countrySelect.innerHTML += `<option value='${c}'>${c}</option>`;
  });

  updateStateFilterVisibility("");
  updateStateFilterOptions("");
  updateShapeFilterOptions();
}

function setupFilterListeners() {
  [countrySelect, stateSelect, shapeSelect].forEach((el) => {
    el.addEventListener("change", (e) => {
      closeDetailsPanel();
      if (activePopup) {
        activePopup.remove();
        activePopup = null;
      }

      const id = e.target.id;
      const val = e.target.value;

      if (id === "country-filter") {
        updateStateFilterVisibility(val);
        updateStateFilterOptions(val);
        if (!val) {
          map.easeTo({ center: initialCenter, zoom: initialZoom });
        } else {
          const features = allFeatures.filter((f) => f.properties.country === val);
          zoomToArea(features, countryZoomLevel);
        }
      }

      if (id === "country-filter" || id === "state-filter") {
        updateShapeFilterOptions();
      }

      if (id === "state-filter") {
        zoomToState(val);
      }

      ufoFeatures = applyFilters();
      updateMapVisualization();
      updateCharts();
    });
  });
}

function updateStateFilterOptions(country) {
  stateSelect.innerHTML = '<option value="">All states</option>';
  let statesToShow = [];
  if (country && countryToStatesMap[country]) {
    statesToShow = [...countryToStatesMap[country]].sort();
  }
  statesToShow.forEach((s) => {
    stateSelect.innerHTML += `<option value='${s}'>${s}</option>`;
  });
  stateSelect.value = "";
}

function updateStateFilterVisibility(country) {
  const container = stateSelect.parentElement;
  if (country === "United States" || country === "Canada") {
    container.classList.remove("hidden");
  } else {
    container.classList.add("hidden");
    stateSelect.value = "";
  }
}

function updateShapeFilterOptions() {
  const country = countrySelect.value;
  const state = stateSelect.value;
  shapeSelect.innerHTML = '<option value="">All shapes</option>';

  const key = `${country || ""}-${state || ""}`;
  let shapesToShow = [];

  if (countryStateToShapesMap[key]) {
    shapesToShow = [...countryStateToShapesMap[key]].sort();
  } else if (country) {
    const countryShapes = new Set();
    Object.entries(countryStateToShapesMap).forEach(([k, sSet]) => {
      if (k.startsWith(country)) sSet.forEach((s) => countryShapes.add(s));
    });
    shapesToShow = [...countryShapes].sort();
  } else {
    const allShapes = new Set();
    Object.values(countryStateToShapesMap).forEach((sSet) => {
      sSet.forEach((s) => allShapes.add(s));
    });
    shapesToShow = [...allShapes].sort();
  }

  shapesToShow.forEach((s) => {
    shapeSelect.innerHTML += `<option value='${s}'>${s}</option>`;
  });
  shapeSelect.value = "";
}

function applyFilters() {
  const country = countrySelect.value;
  const state = stateSelect.value;
  const shape = shapeSelect.value;

  return allFeatures.filter((f) => {
    const p = f.properties;
    if (p.year < valueMin || p.year > valueMax) return false;
    if (country && p.country !== country) return false;
    if (state && p.state !== state) return false;
    if (shape && p.shape !== shape) return false;
    return true;
  });
}

const mapDiv = document.getElementById("map");
const clusterToggle = document.getElementById("cluster-toggle");
const initialCenter = [-50, 40];
const initialZoom = 1.0;
const countryZoomLevel = 6;
const stateZoomLevel = 8;
let activePopup = null;
let groupSightings = clusterToggle.checked;

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/estevaoabreu/clv76r3ur00nh01qve6re2wvh",
  center: initialCenter,
  zoom: initialZoom,
  minZoom: 2,
  projection: "mercator",
});

function updateMapVisualization() {
  if (map.getLayer("cluster-count")) map.removeLayer("cluster-count");
  if (map.getLayer("clusters")) map.removeLayer("clusters");
  if (map.getLayer("unclustered-point")) map.removeLayer("unclustered-point");
  if (map.getSource("ufoSightings")) map.removeSource("ufoSightings");

  updateStats(ufoFeatures);

  const sourceOptions = {
    type: "geojson",
    data: { type: "FeatureCollection", features: ufoFeatures },
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
          "step", ["get", "point_count"],
          "rgba(100, 200, 255, 0.25)", 250,
          "rgba(100, 200, 255, 0.5)", 500,
          "rgba(100, 200, 255, 0.75)", 750,
          "rgba(100, 200, 255, 1)",
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          15, 250, 25, 1000, 35, 5000, 45,
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
      paint: { "text-color": "#e8e7e7" },
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

function zoomToState(state) {
  if (!state) {
    const country = countrySelect.value;
    if (country) {
      const features = allFeatures.filter((f) => f.properties.country === country);
      zoomToArea(features, countryZoomLevel);
    }
    return;
  }
  const features = allFeatures.filter((f) => f.properties.state === state);
  zoomToArea(features, stateZoomLevel);
}

function initMapInteractions() {
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  map.on("mouseenter", "unclustered-point", (e) => {
    map.getCanvas().style.cursor = "pointer";
    const f = e.features[0];
    let { comments, city, state, country, datetime, shape, durationFull } = f.properties;

    city = city.replace(/\b\w/g, (char) => char.toUpperCase());
    const dateObj = new Date(datetime);
    const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString("en-US") : "Unknown";
    const formattedTime = !isNaN(dateObj) ? dateObj.toLocaleTimeString("en-US") : "N/A";

    if (activePopup) activePopup.remove();

    activePopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })
      .setLngLat(f.geometry.coordinates)
      .setHTML(`
        <div class='ufo-box'>
            <h3>UFO Sighting Details</h3>
            <div class='sighting-info'>
                <div class='sighting-item'><div class='sighting-item-icon'>📍</div><div><div class='sighting-item-label'>Location</div><div class='sighting-item-value'>${city || "Unknown"}${state ? ", " + state : ""}${country ? ", " + country : ""}</div></div></div>
                <div class='sighting-item'><div class='sighting-item-icon'>📅</div><div><div class='sighting-item-label'>Date</div><div class='sighting-item-value'>${formattedDate}</div></div></div>
                <div class='sighting-item'><div class='sighting-item-icon'>🕐</div><div><div class='sighting-item-label'>Time</div><div class='sighting-item-value'>${formattedTime}</div></div></div>
                <div class='sighting-item'><div class='sighting-item-icon'>🛸</div><div><div class='sighting-item-label'>Shape</div><div class='sighting-item-value'>${shape || "Unknown"}</div></div></div>
                <div class='sighting-item'><div class='sighting-item-icon'>⏱️</div><div><div class='sighting-item-label'>Duration</div><div class='sighting-item-value'>${durationFull || "Unknown"}</div></div></div>
            </div>
        </div>
      `)
      .addTo(map);

      // Details panel with EMOJI instead of random avatar
      if (comments) {
        const commenterName = generateRandomName(comments);
        const shapeEmoji = getUfoShapeEmoji(shape);

        detailsContent.innerHTML = `
            <div class='comment-card'>
                <div class='comment-image-container'>${shapeEmoji}</div>
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

  map.on("click", "clusters", (e) => {
    if (!groupSightings) return;
    e.originalEvent.stopPropagation();
    closeDetailsPanel();
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
    const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
    const clusterId = features[0].properties.cluster_id;
    map.getSource("ufoSightings").getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom + 0.75 });
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

  bubbleMin.style.left = leftMin + "px";
  bubbleMax.style.left = leftMax + "px";

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
  chartContainer.innerHTML = "";
  const yearCounts = {};
  features.forEach((f) => {
    const year = f.properties.year;
    if (year) yearCounts[year] = (yearCounts[year] || 0) + 1;
  });

  const data = Object.entries(yearCounts)
    .map(([year, count]) => ({ year: parseInt(year), count: parseInt(count) }))
    .sort((a, b) => a.year - b.year);

  if (data.length === 0) {
    chartContainer.innerHTML = "<p class='no-data-msg'>No data for the selected period.</p>";
    return;
  }

  const margin = { top: 30, right: 30, bottom: 50, left: 70 };
  const containerRect = chartContainer.getBoundingClientRect();
  const width = containerRect.width - margin.left - margin.right;
  const height = containerRect.height - margin.top - margin.bottom;

  const xScale = d3.scaleLinear().domain(d3.extent(data, (d) => d.year)).range([0, width]);
  const yScale = d3.scaleLinear().domain([0, d3.max(data, (d) => d.count) || 1]).range([height, 0]);

  const svg = d3.select("#chart-container").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""))
    .selectAll("line").attr("stroke", "#e8e7e7").attr("stroke-width", 1);

  const line = d3.line().x((d) => xScale(d.year)).y((d) => yScale(d.count));

  const path = g.append("path").datum(data).attr("class", "line")
    .attr("d", line).attr("stroke", "lightblue").attr("fill", "none");
  const pathLength = path.node().getTotalLength();

  path.attr("stroke-dasharray", pathLength).attr("stroke-dashoffset", pathLength)
    .transition().duration(1000).ease(d3.easeLinear).attr("stroke-dashoffset", 0);

  g.selectAll(".dot").data(data).enter().append("circle")
    .attr("class", "dot")
    .attr("cx", (d) => xScale(d.year))
    .attr("cy", (d) => yScale(d.count))
    .attr("fill", "lightblue").attr("r", 0).attr("opacity", 0)
    .on("mouseover", function (event, d) {
      d3.select(this).transition().duration(300).attr("r", 7);
      g.append("text").attr("class", "tooltip-text")
        .attr("x", xScale(d.year)).attr("y", yScale(d.count) - 20)
        .attr("text-anchor", "middle").attr("fill", "#e8e7e7")
        .attr("font-size", "13px").attr("font-weight", "bold")
        .style("text-shadow", "0 0 4px #0e0e0e")
        .text(`${d.year}: ${d.count} sightings`)
        .transition().duration(200).attr("opacity", 1);
    })
    .on("mouseout", function () {
      d3.select(this).transition().duration(300).attr("r", 4);
      g.selectAll(".tooltip-text").remove();
    })
    .transition().delay((d, i) => (i / data.length) * 1000).duration(1000)
    .ease(d3.easeElasticOut).attr("r", 4).attr("opacity", 1);

  g.append("g").attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
    .append("text").attr("class", "axis-label").attr("x", width / 2).attr("y", 40)
    .attr("text-anchor", "middle").text("Year");

  g.append("g").call(d3.axisLeft(yScale)).append("text")
    .attr("class", "axis-label").attr("transform", "rotate(-90)")
    .attr("x", -height / 2).attr("y", -50)
    .attr("text-anchor", "middle").text("Number of Sightings");
}

function drawShapesChart(features) {
  chartContainer.innerHTML = '<canvas id="chart-canvas"></canvas>';
  const ctx = document.getElementById("chart-canvas").getContext("2d");
  const counts = {};
  features.forEach((f) => {
    const shape = f.properties.shape || "Unknown";
    counts[shape] = (counts[shape] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (currentChart) currentChart.destroy();

  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((e) => e[0]),
      datasets: [{ label: "Count per shape", data: sorted.map((e) => e[1]), backgroundColor: "#64C8FF" }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { ticks: { color: "#e8e7e7" } }, y: { ticks: { color: "#e8e7e7" } } },
      plugins: {
        legend: { labels: { color: "#e8e7e7" } },
        tooltip: { enabled: true, callbacks: { label: (c) => `${c.label}: ${c.raw} sightings` } },
      },
    },
  });
}

function drawMonthlyChart(features) {
  chartContainer.innerHTML = '<canvas id="chart-canvas"></canvas>';
  const ctx = document.getElementById("chart-canvas").getContext("2d");
  const monthsCount = Array(12).fill(0);
  features.forEach((f) => {
    if (f.properties.month !== undefined) monthsCount[f.properties.month] += 1;
  });

  if (currentChart) currentChart.destroy();
  currentChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [{ label: "Sightings per month", data: monthsCount, backgroundColor: "#64C8FF" }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { ticks: { color: "#e8e7e7" } }, y: { ticks: { color: "#e8e7e7" } } },
      plugins: { legend: { labels: { color: "#e8e7e7" } } },
    },
  });
}

const detailsPanel = document.getElementById("comment-card");
const thumbMin = document.getElementById("thumb-min");
const thumbMax = document.getElementById("thumb-max");
const bubbleMin = document.getElementById("bubble-min");
const bubbleMax = document.getElementById("bubble-max");

const firstNames = ["Alex", "Jordan", "Morgan", "Casey", "Riley", "Taylor", "Dakota", "Quinn", "Avery", "Cameron", "Blake", "Skylar", "River", "Sam", "Jamie", "Whitney", "Reese", "Phoenix", "Sage", "Storm"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

function generateRandomName(seed) {
  const hash = seed.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  return `${firstNames[Math.abs(hash % firstNames.length)]} ${lastNames[Math.abs(((hash / firstNames.length) | 0) % lastNames.length)]}`;
}

function getUfoShapeEmoji(shape) {
  const map = {
    circle: "⭕", disk: "🛸", triangle: "🔺", light: "💡", sphere: "🔮", fireball: "🔥",
    oval: "🥚", cylinder: "🎫", diamond: "💎", rectangle: "▬", chevron: "⏶", egg: "🥚",
    cigar: "🚬", cone: "🍦", cross: "✖️", flash: "⚡", formation: "✨", changing: "🔄", unknown: "❓",
  };
  return `<div style="font-size: 120px; text-align: center; line-height: 1;">${map[(shape || "").toLowerCase().trim()] || map.unknown}</div>`;
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

aboutBtn.addEventListener("click", () => {
  overlay.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
  overlay.style.display = "none";
});