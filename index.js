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
    zoom: 2,
    minZoom: 1,
    projection: "mercator",
});

let ufoFeatures = [];
let allFeatures = [];
let countryToStatesMap = {};
let countryStateToShapesMap = {};

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
            const key = `${d.country || ''}-${d.state || ''}`;
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

    const key = `${country || ''}-${state || ''}`;

    let shapesToShow = [];

    if (countryStateToShapesMap[key]) {
        shapesToShow = [...countryStateToShapesMap[key]].sort();
    } else if (country) {
        const countryShapes = new Set();
        for (const [map_key, shapeSet] of Object.entries(countryStateToShapesMap)) {
            if (map_key.startsWith(country)) {
                shapeSet.forEach(shape => countryShapes.add(shape));
            }
        }
        shapesToShow = [...countryShapes].sort();
    } else {
        const allShapes = new Set();
        for (const shapeSet of Object.values(countryStateToShapesMap)) {
            shapeSet.forEach(shape => allShapes.add(shape));
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
            updateStats(ufoFeatures);
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
    document.querySelector("#common-shape .stat-value").textContent =
        commonShape;

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
                durationSeconds: d.duration_seconds,
                durationFull: d.duration_full,
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
            let { city, state, country, datetime, comments, shape } = f.properties;

            city = city.toLowerCase().split(' ');
            const capitalized = city.map(word => {
                return word.charAt(0).toUpperCase() + word.slice(1);
            });
            city = capitalized.join(' ');

            popup
                .setLngLat(f.geometry.coordinates)
                .setHTML(
                    `<div class='ufo-box'>
            <h3>UFO Sighting</h3>
            <p><strong>Location:</strong> ${city || "Unknown"}${state ? ", " + state : ""
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

const minYear = 1906;
const maxYear = 2014;
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
    updateStats(ufoFeatures);
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

    if (data.length === 0) return;

    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const containerRect = timelineDiv.getBoundingClientRect();
    const width = containerRect.width - margin.left - margin.right;
    const height = containerRect.height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .range([height, 0]);

    const svg = d3.select("#timeline-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count));

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "rgba(150, 150, 150, 0.4)")
        .attr("stroke-width", 1);

    const path = g.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

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
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.count))
        .attr("r", 0)
        .attr("opacity", 0)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(300)
                .attr("r", 7)
                .attr("filter", "drop-shadow(0 0 6px rgba(100, 200, 255, 0.8))");

            g.append("text")
                .attr("class", "tooltip-text")
                .attr("x", xScale(d.year))
                .attr("y", yScale(d.count) - 20)
                .attr("text-anchor", "middle")
                .attr("fill", "rgba(255, 255, 255, 0.9)")
                .attr("font-size", "13px")
                .attr("font-weight", "bold")
                .attr("pointer-events", "none")
                .style("text-shadow", "0 0 4px rgba(0, 0, 0, 0.8)")
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
            const features = allFeatures.filter((f) => f.properties?.country === country);
            zoomToArea(features, 6);
        }
        return;
    }

    const features = allFeatures.filter((f) => f.properties?.state === state);
    zoomToArea(features, 8);
}