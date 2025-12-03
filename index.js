mapboxgl.accessToken =
  "pk.eyJ1IjoiZXN0ZXZhb2FicmV1IiwiYSI6ImNsdjc2bzMyZDA2dnIyam50Z3NjYml2eHoifQ.iadMiy9yZwDOaIRXqUVgMg";

const clusterToggle = document.getElementById("cluster-toggle");
let groupSightings = clusterToggle.checked;
let details = document.getElementById("details");

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

  const countrySelect = document.getElementById("country-filter");
  countrySelect.innerHTML = '<option value="">All countries</option>';
  [...countries]
    .sort()
    .forEach(
      (c) => (countrySelect.innerHTML += `<option value='${c}'>${c}</option>`)
    );

  updateStateFilterVisibility("");

  const stateSelect = document.getElementById("state-filter");
  stateSelect.innerHTML = '<option value="">All states</option>';
  [...states]
    .sort()
    .forEach(
      (s) => (stateSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );

  const shapeSelect = document.getElementById("shape-filter");
  shapeSelect.innerHTML = '<option value="">All shapes</option>';
  [...shapes]
    .sort()
    .forEach(
      (s) => (shapeSelect.innerHTML += `<option value='${s}'>${s}</option>`)
    );
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
      if (id === "country-filter") {
        updateStateFilterVisibility(e.target.value);
      }

      ufoFeatures = applyFilters();
      updateMapVisualization();
      updateCharts();
    });
  });
}

function updateStateFilterVisibility(country) {
  const stateSelect = document.getElementById("state-filter");
  const stateFilterContainer =
    document.getElementById("state-filter").parentElement;
  if (country === "United States")
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
          "rgba(33, 11, 60, 0.25)",
          250,
          "rgba(33, 11, 60, 0.5)",
          500,
          "rgba(33, 11, 60, 0.75)",
          750,
          "rgba(33, 11, 60, 1)",
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
      "circle-color": "rgba(33, 11, 60, 1)",
      "circle-radius": 4,
    },
  });
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
        duration: d.durationMinutes || d.durationSeconds || null,
      },
    }));

    function updateStats(features) {
      // Total Sightings
      const totalSightings = features.length;
      document.querySelector("#total-sightings .stat-value").textContent =
        totalSightings;

      // Total Cities
      const citiesSet = new Set(
        features.map((f) => f.properties.city).filter((c) => c)
      );
      document.querySelector("#total-cities .stat-value").textContent =
        citiesSet.size;

      // Most Common Shape
      const shapeCounts = {};
      features.forEach((f) => {
        const shape = f.properties.shape || "Unknown";
        shapeCounts[shape] = (shapeCounts[shape] || 0) + 1;
      });
      const commonShape = Object.keys(shapeCounts).length
        ? Object.entries(shapeCounts).sort((a, b) => b[1] - a[1])[0][0]
        : "N/A";
      document.querySelector("#common-shape .stat-value").textContent =
        commonShape;

      // Average Duration
      const durations = features
        .map((f) => parseFloat(f.properties.duration))
        .filter((d) => !isNaN(d));
      const avgDuration = durations.length
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)
        : "N/A";
      document.querySelector("#avg-duration .stat-value").textContent =
        avgDuration + (avgDuration !== "N/A" ? " min" : "");
    }

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
      const { city, state, country, datetime, comments, shape } = f.properties;
      popup
        .setLngLat(f.geometry.coordinates)
        .setHTML(
          `<div class='ufo-box'>
            <h3>UFO Sighting</h3>
            <p><strong>Location:</strong> ${city || "Unknown"}${
            state ? ", " + state : ""
          }<br>${country || ""}</p>
            <p><strong>Date/Time:</strong> ${datetime || "No date"}</p>
            <p><strong>Shape:</strong> ${shape || "Unknown shape"}</p>
            <p><strong>Comments:</strong> ${comments || "No comments"}</p>
          </div>`
        )
        .addTo(map);
    });

    map.on("mouseleave", "unclustered-point", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "clusters", (e) => {
      details.classList.add("hidden");
      if (!groupSightings) return;
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

const minYear = 1910;
const maxYear = 2015;
let valueMin = minYear;
let valueMax = maxYear;
const rangeWidth = 250;

function updateThumbs() {
  const leftMin = ((valueMin - minYear) / (maxYear - minYear)) * rangeWidth;
  const leftMax = ((valueMax - minYear) / (maxYear - minYear)) * rangeWidth;
  thumbMin.style.left = leftMin + "10px";
  thumbMax.style.left = leftMax + "px";
  yearDisplay.textContent = `${valueMin} - ${valueMax}`;

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

    if (index === 0) {
      map.resize();
      map.easeTo({ center: initialCenter, zoom: initialZoom, duration: 1000 });
    }
    if (index === 1) drawTimelineChart(ufoFeatures);
    if (index === 2) drawShapesChart(ufoFeatures);
    if (index === 3) drawMonthlyChart(ufoFeatures);
  });
});

// Gráficos

function drawTimelineChart(features) {
  const ctx = document.getElementById("timeline-chart").getContext("2d");
  const years = features
    .map((f) => new Date(f.properties.datetime).getFullYear())
    .filter((y) => !isNaN(y));
  const counts = {};
  years.forEach((y) => (counts[y] = (counts[y] || 0) + 1));
  const sortedYears = Object.keys(counts).sort();
  const values = sortedYears.map((y) => counts[y]);
  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedYears,
      datasets: [
        {
          label: "Sightings per year",
          data: values,
          borderWidth: 2,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } },
      },
      plugins: { legend: { labels: { color: "white" } } },
    },
  });
}

function drawShapesChart(features) {
  const ctx = document.getElementById("shapes-chart").getContext("2d");

  const counts = {};
  features.forEach((f) => {
    const shape = f.properties.shape || "Unknown";
    counts[shape] = (counts[shape] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const data = labels.map((l) => counts[l]);

  const backgroundColors = labels.map(
    (_, i) => `hsl(${(i * 360) / labels.length}, 70%, 50%)`
  );

  if (shapesChart) shapesChart.destroy();

  shapesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Count per shape",
          data: data,
          backgroundColor: backgroundColors,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } },
      },
      plugins: {
        legend: { labels: { color: "white" } },
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
          backgroundColor: "rgba(54, 162, 235, 0.8)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "white" } },
        y: { ticks: { color: "white" } },
      },
      plugins: { legend: { labels: { color: "white" } } },
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

const countryFilter = document.getElementById("country-filter");
countryFilter.addEventListener("change", (e) => {
  const country = e.target.value;
  if (!country) return map.easeTo({ center: [-50, 40], zoom: 1.0 });
  const features = allFeatures.filter((f) => f.properties?.country === country);
  if (features.length === 0) return;
  const lons = features.map((f) => f.geometry.coordinates[0]);
  const lats = features.map((f) => f.geometry.coordinates[1]);
  const bounds = [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
  map.fitBounds(bounds, { padding: 50, maxZoom: 6, duration: 1000 });
});
