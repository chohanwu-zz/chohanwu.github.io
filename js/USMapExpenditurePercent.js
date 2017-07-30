var USMapExpenditurePercent = function (target) {

    // d3.selection.prototype.moveToFront = function () {
    //     return this.each(function () {
    //         this.parentNode.appendChild(this);
    //     });
    // };

    // d3.selection.prototype.moveToBack = function () {
    //     return this.each(function () {
    //         var firstChild = this.parentNode.firstChild;
    //         if (firstChild) {
    //             this.parentNode.insertBefore(this, firstChild);
    //         }
    //     });
    // };
    var mapWidth = 1000,//800, 
        mapHeight = 700;//500;
    var darkgrey = "#4c4c4c";

    function formatDecimal(amount) {
        amount = Math.round(amount * 100) / 100
        amount = amount + "%";
        return amount;
    }
    function formatDollars(amount) {
        amount = Math.round(amount);
        var ret = "";
        while (amount >= 1000) {
            ret = "," + amount % 1000 + ret;
            amount = Math.floor(amount / 1000);
        }
        ret = "$" + amount + ret;
        return ret;
    }

    d3.csv("data/Healthcare_Expenditure_2011_final.csv", function (err, data) {
        var config = { "color1": "#d3e5ff", "color2": "#08306B", "stateDataColumn": "State_Name", "valueDataColumn": "Percent" }

        var WIDTH = 1000,//800, 
            HEIGHT = 700;//500;

        var COLOR_COUNTS = 9;

        var SCALE = 0.7;

        function Interpolate(start, end, steps, count) {
            var s = start,
                e = end,
                final = s + (((e - s) / steps) * count);
            return Math.floor(final);
        }

        function Color(_r, _g, _b) {
            var r, g, b;
            var setColors = function (_r, _g, _b) {
                r = _r;
                g = _g;
                b = _b;
            };

            setColors(_r, _g, _b);
            this.getColors = function () {
                var colors = {
                    r: r,
                    g: g,
                    b: b
                };
                return colors;
            };
        }

        function hexToRgb(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        function valueFormat(d) {
            if (d > 1000000000) {
                return Math.round(d / 1000000000 * 10) / 10 + "B";
            } else if (d > 1000000) {
                return Math.round(d / 1000000 * 10) / 10 + "M";
            } else if (d > 1000) {
                return Math.round(d / 1000 * 10) / 10 + "K";
            } else {
                return d;
            }
        }

        var COLOR_FIRST = config.color1, COLOR_LAST = config.color2;

        var rgb = hexToRgb(COLOR_FIRST);

        var COLOR_START = new Color(rgb.r, rgb.g, rgb.b);

        rgb = hexToRgb(COLOR_LAST);
        var COLOR_END = new Color(rgb.r, rgb.g, rgb.b);

        var MAP_STATE = config.stateDataColumn;
        var MAP_VALUE = config.valueDataColumn;

        var width = WIDTH,
            height = HEIGHT;

        var valueById = d3.map();

        var startColors = COLOR_START.getColors(),
            endColors = COLOR_END.getColors();

        var colors = [];

        for (var i = 0; i < COLOR_COUNTS; i++) {
            var r = Interpolate(startColors.r, endColors.r, COLOR_COUNTS, i);
            var g = Interpolate(startColors.g, endColors.g, COLOR_COUNTS, i);
            var b = Interpolate(startColors.b, endColors.b, COLOR_COUNTS, i);
            colors.push(new Color(r, g, b));
        }

        // var quantize = d3.scale.quantize()
        //   .domain([0, 1.0])
        //   .range(d3.range(COLOR_COUNTS).map(function (i) { return i }));
        var quantize = d3.scaleQuantize()
            .domain([0, 1.0])
            .range(d3.range(COLOR_COUNTS).map(function (i) { return i }));

        // var svg = d3.select("#canvas-svg").append("svg")
        //     .attr("width", width)
        //     .attr("height", height);

        var path = d3.geoPath();
        // var path = d3.geoPath().projection(
        //     d3.geoAlbers().translate([width / 2, height / 2]));

        var svg = d3.select("#" + target).append("svg")
            .attr("width", width)
            .attr("height", height);

        d3.tsv("data/us-state-names.tsv", function (error, names) {
            var toolTipG;
            var toolTipWidth = 120, toolTipHeight = 70;

            name_id_map = {};
            id_name_map = {};

            for (var i = 0; i < names.length; i++) {
                name_id_map[names[i].name] = names[i].id;
                id_name_map[names[i].id] = names[i].name;
            }

            data.forEach(function (d) {
                var id = name_id_map[d[MAP_STATE]];
                valueById.set(id, +d[MAP_VALUE]);
            });
            // console.log(valueById);

            quantize.domain([d3.min(data, function (d) { return +d[MAP_VALUE] }),
            d3.max(data, function (d) { return +d[MAP_VALUE] })]);

            d3.json("data/us-10m.v1.json", function (error, us) {
                svg.append("g")
                    .attr("class", "states-choropleth")
                    .selectAll("path")
                    .data(topojson.feature(us, us.objects.states).features)
                    .enter().append("path")
                    .attr("transform", "scale(" + SCALE + ")")
                    .style("fill", function (d) {
                        if (valueById.get(d.id)) {
                            var i = quantize(valueById.get(d.id));
                            var color = colors[i].getColors();
                            return "rgb(" + color.r + "," + color.g +
                                "," + color.b + ")";
                        } else {
                            return "";
                        }
                    }).style('stroke', 'white')
                    .attr("d", path)
                    .on("mouseover", function (d) {
                        d3.select(this).attr("class", "zipRegionHover");

                        // Clean up old tooltips
                        svg.selectAll('g.tooltip').remove();
                        // Append tooltip
                        toolTipG = svg.append("g").attr('class', 'tooltip');
                        var xPos = d3.mouse(this)[0] - 15//15;
                        var yPos = d3.mouse(this)[1] - 55;
                        toolTipG.append("rect")
                            .style('position', 'absolute')
                            .style('z-index', 1001)
                            .style('width', toolTipWidth)
                            .style('height', toolTipHeight)
                            .style('fill', 'white')
                            .style('stroke', 'black')
                            .style("pointer-events", "none")
                            .style('opacity', 0.85);

                        // var priceForZipcode = zipToHousePrices[d.properties.GEOID10];
                        // if (priceForZipcode) toolTipText = formatDollars(priceForZipcode[self.year]);
                        // else toolTipText = "No data"
                        toolTipText = id_name_map[d.id];
                        var formatedDecimal = formatDecimal(valueById.get(d.id));
                        toolTipG.append("text")
                            .style("pointer-events", "none")
                            .attr("dy", "1.2em")
                            .attr("dx", "6")
                            .attr("font-family", "Open Sans")
                            .attr("font-size", "22px")
                            .text(toolTipText);
                        toolTipG.append("text")
                            .style("pointer-events", "none")
                            .attr("font-family", "Open Sans")
                            .attr("font-size", "24px")
                            .style("font-weight", 400)
                            .attr("dy", "2.4em")
                            .attr("dx", "6")
                            .text(formatedDecimal);

                        // d3.select(this).moveToFront();
                    })
                    // .on("mousemove", function (d) {
                    //     var html = "";

                    //     html += "<div class=\"tooltip_kv\">";
                    //     html += "<span class=\"tooltip_key\">";
                    //     html += id_name_map[d.id];
                    //     html += "</span>";
                    //     html += "<span class=\"tooltip_value\">";
                    //     html += valueById.get(d.id);
                    //     html += "";
                    //     html += "</span>";
                    //     html += "</div>";

                    //     $("#tooltip-container").html(html);
                    //     $(this).attr("fill-opacity", "0.8");
                    //     $("#tooltip-container").show();

                    //     var coordinates = d3.mouse(this);

                    //     var map_width = $('.states-choropleth')[0].getBoundingClientRect().width;

                    //     if (d3.event.layerX < map_width / 2) {
                    //         d3.select("#tooltip-container")
                    //             .style("top", (d3.event.layerY + 15) + "px")
                    //             .style("left", (d3.event.layerX + 15) + "px");
                    //     } else {
                    //         var tooltip_width = $("#tooltip-container").width();
                    //         d3.select("#tooltip-container")
                    //             .style("top", (d3.event.layerY + 15) + "px")
                    //             .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
                    //     }
                    // })
                    .on("click", function (d, element) {        // ON CLICK

                        svg.selectAll("path")
                            .transition()
                            .attr("stroke", "white")
                            .attr("stroke-width", 1);

                        d3.select(this)
                            .attr("class", "zipRegionSelected")
                            .transition()
                            .attr("stroke", "#131F33")
                            .attr("stroke-width", 4);
                        // d3.select(this).moveToFront();

                        // self.selectedRegion = d3.select(this);
                    })
                    .on("mouseout", function () {
                        // $(this).attr("fill-opacity", "1.0");
                        // $("#tooltip-container").hide();
                        d3.select(this).attr("class", "zipRegion")
                        svg.selectAll('g.tooltip').remove();

                        // d3.select(this).moveToBack();
                        // if (self.selectedRegion)
                        //     self.selectedRegion.moveToFront();
                    })
                    .on("mousemove", function (d) {
                        toolTipText = "" + id_name_map[d.id];
                        var xPos = d3.mouse(this)[0] - 315;
                        var yPos = d3.mouse(this)[1] - 80;
                        if (xPos - toolTipHeight < 0) {
                            // yPos = yPos + 65;
                            xPos = xPos + 300;
                        }
                        toolTipG.attr("transform", "translate(" + xPos + "," + yPos + ")");
                        //    .style('top', (yPos)+'px');
                        //tooltip.select("text").text("Zipcode: " + d.properties.GEOID10);

                    });

                // var colorKeyWidth = 20, colorKeyHeight = 325, blockHeight = 40;
                // var colorKeySVG = svg.append("g")
                //     .attr("transform", "translate(10, " + (mapHeight - colorKeyHeight - 10) + ")");

                // for (var i = 0; i < colors.length; i++) {
                //     colorKeySVG.append("rect")
                //         .datum([1.0 - (i + 1) * 0])
                //         .attr("x", 0)
                //         .attr("y", i * blockHeight)
                //         .attr("width", colorKeyWidth)
                //         .attr("height", blockHeight)
                //         .attr("fill", function (d) {
                //             return quantize(d);
                //         });
                // }

                // var colorScale = d3.scaleLinear()
                //     .domain([0, 1.0])
                //     .range([0.2, 0])
                //     .nice();

                // colorKeySVG.append("g")
                //     .call(d3.axisRight(colorScale)
                //         .tickFormat(d3.format(",%"))
                //         .tickSize(0)
                //         .tickValues(
                //         colorScale.ticks(5)
                //             .concat(colorScale.domain())))
                //     .attr("transform", "translate(" + colorKeyWidth + ", 0)")
                //     .selectAll("text")
                //     .attr("class", "unselectable")
                //     .attr("font-family", "Open Sans")
                //     .attr('font-size', "12px")
                //     .attr("fill", darkgrey)
                //     .attr("dx", "2px");

                // colorKeySVG.selectAll("path")
                //     .remove();

                // colorKeySVG.append("text")
                //     .attr("transform", "rotate(-90)")
                //     .attr("transform", "translate(0, -40)")
                //     .attr("dy", "1em")
                //     .attr("fill", darkgrey)
                //     .attr("class", "unselectable")
                //     .text("Healthcare Expenditure, %");

                // colorKeySVG.append("rect")
                //     .attr("x", 0)
                //     .attr("y", 225)
                //     .attr("width", colorKeyWidth)
                //     .attr("height", colorKeyWidth)
                //     .attr("fill", "black");

                // colorKeySVG.append("text")
                //     .attr("x", 30)
                //     .attr("y", 235)
                //     .attr("class", "unselectable")
                //     .attr("dominant-baseline", "central")
                //     .attr("font-family", "Open Sans")
                //     .attr("font-size", "12px")
                //     .text("no data");

                svg.append("path")
                    .datum(topojson.mesh(us, us.objects.states, function (a, b) { return a !== b; }))
                    .attr("class", "states")
                    .attr("transform", "scale(" + SCALE + ")")
                    .attr("d", path);
            });

        });
    });

}
