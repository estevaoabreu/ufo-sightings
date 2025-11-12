const svg = d3.select("svg");
const width = window.innerWidth;
const height = window.innerHeight;
d3.csv("data.csv", function(data) {
    console.log(data);
});

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const url = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

d3.json(url).then(data => {
  const states = topojson.feature(data, data.objects.states).features;

  svg.selectAll("path")
    .data(states)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#cccccc")
    .attr("stroke", "#333")
    .attr("stroke-width", 1);
});