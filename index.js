mapboxgl.accessToken = "pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg";

let allFeatures = [];
let ufoFeatures = [];

const mapDiv = document.getElementById("map");
const initialCenter = [-50, 40];
const initialZoom = 1.0;
const countryZoomLevel = 6;
const stateZoomLevel = 8;
let activePopup = null;

const clusterToggle = document.getElementById("cluster-toggle");
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
          "rgba(100, 200, 255, 0.5)", 1500,
          "rgba(100, 200, 255, 0.75)", 7500,
          "rgba(100, 200, 255, 1)",
        ],
        "circle-radius": [
          "step", ["get", "point_count"],
          15, 250,
          30, 1500,
          45, 7500,
          60,
        ],
        "circle-stroke-color": "#e8e7e7",
        "circle-stroke-width": 0.5,
      },
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "ufoSightings",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
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

  updateStats(ufoFeatures);
}

const countrySelect = document.getElementById("country-filter");
const stateSelect = document.getElementById("state-filter");
const shapeSelect = document.getElementById("shape-filter");

const minYear = 1906;
const maxYear = 2014;
let valueMin = minYear;
let valueMax = maxYear;

let countryToStatesMap = {};
let countryStateToShapesMap = {};

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
        const container = stateSelect.parentElement;
        if (val === "United States" || val === "Canada")
          container.classList.remove("hidden");
        else {
          container.classList.add("hidden");
          stateSelect.value = "";
        }
        updateStateFilterOptions(val);

        if (!val)
          map.easeTo({ center: initialCenter, zoom: initialZoom });
        else {
          const features = allFeatures.filter((f) => f.properties.country === val);
          zoomToArea(features, countryZoomLevel);
        }
      }

      if (id === "country-filter" || id === "state-filter")
        updateShapeFilterOptions();

      if (id === "state-filter")
        zoomToState(val);

      ufoFeatures = applyFilters();
      updateMapVisualization();
      updateCharts();
    });
  });
}

function updateStateFilterOptions(country) {
  stateSelect.innerHTML = '<option value="">All states</option>';
  let statesToShow = [];
  if (country && countryToStatesMap[country])
    statesToShow = [...countryToStatesMap[country]].sort();
  statesToShow.forEach((s) => {
    stateSelect.innerHTML += `<option value='${s}'>${s}</option>`;
  });
  stateSelect.value = "";
}

function updateShapeFilterOptions() {
  const country = countrySelect.value;
  const state = stateSelect.value;
  shapeSelect.innerHTML = '<option value="">All shapes</option>';

  const key = `${country || ""}-${state || ""}`;
  let shapesToShow = [];

  if (countryStateToShapesMap[key])
    shapesToShow = [...countryStateToShapesMap[key]].sort();
  else if (country) {
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

    if (comments) {
      detailsPanel.innerHTML = `
        <div class='comment-image-container'>${getUfoShapeEmoji(shape)}</div>
        <div class='comment-details'>
            <p class='comment-name'>${generateRandomName(comments)}</p>
            <p class='comment-text'>${comments}</p>
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

  map.on("mouseenter", "clusters", () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", "clusters", () => (map.getCanvas().style.cursor = ""));
}

const chartContainer = document.getElementById("chart-container");
let currentChart = null;

function updateCharts() {
  const activeBtnIndex = Array.from(document.querySelectorAll(".map-btn")).findIndex((b) =>
    b.classList.contains("active")
  );
  if (activeBtnIndex === 1) drawTimelineChart(ufoFeatures);
  if (activeBtnIndex === 2) drawShapesChart(ufoFeatures);
  if (activeBtnIndex === 3) drawMonthlyChart(ufoFeatures);
}

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

function updateStats(features) {
  document.querySelector("#total-sightings .stat-value").textContent = features.length;
  document.querySelector("#total-cities .stat-value").textContent = new Set(features.map((f) => f.properties.city).filter(Boolean)).size;

  const shapeCounts = {};
  features.forEach((f) => {
    const s = f.properties.shape || "Unknown";
    shapeCounts[s] = (shapeCounts[s] || 0) + 1;
  });
  const commonShape = Object.keys(shapeCounts).length ? Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0][0] : "N/A";
  document.querySelector("#common-shape .stat-value").textContent = commonShape;

  const durations = features.map((f) => f.properties.durationSeconds).filter((d) => !isNaN(d));
  const avg = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : "N/A";
  document.querySelector("#avg-duration .stat-value").textContent = avg + (avg !== "N/A" ? " seconds" : "");
}

function closeDetailsPanel() {
  detailsPanel.classList.add("hidden");
}

function updateThumbs() {
  const rangeWidth = 250;
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

function setupSlider() {
  const rangeWidth = 250;
  function dragThumb(thumb, isMin) {
    thumb.onmousedown = (e) => {
      e.preventDefault();
      document.onmousemove = (event) => {
        const rect = thumb.parentElement.getBoundingClientRect();
        let x = Math.max(0, Math.min(rangeWidth, event.clientX - rect.left));
        const val = Math.round((x / rangeWidth) * (maxYear - minYear) + minYear);
        if (isMin) valueMin = Math.min(val, valueMax);
        else valueMax = Math.max(val, valueMin);
        updateThumbs();
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
  }
  dragThumb(thumbMin, true);
  dragThumb(thumbMax, false);
}

function setupUIInteractions() {
  clusterToggle.addEventListener("change", () => {
    groupSightings = clusterToggle.checked;
    updateMapVisualization();
  });

  const mapButtons = document.querySelectorAll(".map-btn");
  mapButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
      mapButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      mapDiv.style.display = index === 0 ? "block" : "none";
      chartContainer.style.display = index === 0 ? "none" : "block";

      closeDetailsPanel();
      if (activePopup) { activePopup.remove(); activePopup = null; }

      if (index === 0) {
        map.resize();
        map.easeTo({ center: initialCenter, zoom: initialZoom, duration: 1000 });
      } else {
        updateCharts();
      }
    });
  });

  const overlay = document.getElementById("overlay");
  document.querySelector(".about").addEventListener("click", () => overlay.style.display = "flex");
  document.getElementById("close-overlay").addEventListener("click", () => overlay.style.display = "none");
}

map.on("load", () => {
  d3.csv("data.csv").then((rows) => {
    allFeatures = rows.map((d) => {
      const dt = new Date(d.datetime);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [+d.longitude, +d.latitude] },
        properties: {
          city: d.city, state: d.state, country: d.country,
          shape: d.shape || "", datetime: d.datetime, comments: d.comments,
          durationSeconds: parseFloat(d.durationSeconds), durationFull: d.durationFull,
          year: !isNaN(dt) ? dt.getFullYear() : 0,
          month: !isNaN(dt) ? dt.getMonth() : undefined
        },
      };
    });

    populateFilters(rows);
    setupFilterListeners();
    setupSlider();
    setupUIInteractions();
    initMapInteractions();
    updateThumbs();
  });
});