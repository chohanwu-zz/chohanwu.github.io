var USMapExpenditurePercent = function (target) {
    var self = this;
    // ~~~~~ Initialize Variables ~~~~~ //
    var mapWidth = 500;
    var mapHeight = 700;
    self.zip = -1;
    self.year = 2016;
    var darkgrey = "#4c4c4c";

    d3.selection.prototype.moveToFront = function () {
        return this.each(function () {
            this.parentNode.appendChild(this);
        });
    };

    d3.selection.prototype.moveToBack = function () {
        return this.each(function () {
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
        });
    };

    var centerCoords = [47.608013, 122.335167]; // Seattle Coordinates
    var startYearEndYear = [2010, 2016]; // min 1996, max 2016
    var loColorHiColor = ["#e3ecfc", "#173463"];
    var gradient = ["#E5F6FF", "#ACCEE1", "#73A7C4", "#3A7FA7", "#02588A"]
    var strokeColor = "white";
    var strokeHighlightColor = "#F6A600";
    var strokeWidth = 2;
    var strokeHighlightWidth = 3;
    self.year = 2016; // TODO: Change this with slider
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
    if (document.getElementById(target).clientWidth * mapHeight / mapWidth >
        document.getElementById(target).clientHeight) {
        self.svg = d3.select("#" + target).append("svg")
            .attr("height", "100%")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight);
    } else {
        self.svg = d3.select("#" + target).append("svg")
            .attr("width", "100%")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", "0 0 " + mapWidth + " " + mapHeight);
    }

    //// click event for white space ////
    self.svg.append("rect")
        .attr("width", mapWidth)
        .attr("height", mapHeight)
        .attr("fill", "white")
        .on("click", function () {
            // if (self.blankClick) {
            //     self.blankClick();
            // }
            // self.svg.selectAll("path")
            //     .transition()
            //     .attr("stroke", "white")
            //     .attr("stroke-width", strokeWidth)
        });

    var path = d3.geoPath().projection(
        d3.geoAlbers()
            .scale(115000)
            .rotate([centerCoords[1], 0]).center([0, centerCoords[0]])
            .translate([mapWidth / 2, mapHeight / 2]));
    d3.queue()
        .defer(d3.json, "data/zip-codes.json")
        .defer(d3.csv, "data/zipcode_houseprice_trim.csv")
        .await(ready);


    // Ready Function, runs when data is loaded (queue is finished)
    function ready(error, geojson, housepriceCSV) {
        if (error) throw error;

        // Load in data //
        var loValueHiValue = [Number.MAX_VALUE, Number.MIN_VALUE];
        var zipToHousePrices = {}; // Object to map from zip codes to array of data vals
        housepriceCSV.forEach(function (d) {
            var zipcodeVal = d.Zipcode;
            delete d.Zipcode;
            var yearObject = {};
            for (var year = startYearEndYear[0]; year <= startYearEndYear[1]; year++) {
                var val = +d[year];
                yearObject[year] = val;
                if (val < loValueHiValue[0])
                    loValueHiValue[0] = val;
                if (val > loValueHiValue[1])
                    loValueHiValue[1] = val;
            }
            zipToHousePrices[zipcodeVal] = yearObject;
        });



        // Create graph //
        var color = d3.scaleQuantize()
            .domain([0, 1000000])
            .range(gradient);

        var toolTipG;
        var toolTipWidth = 120, toolTipHeight = 70;
        //console.log(loValueHiValue);
        var features = geojson.features;
        self.selectedRegion;
        self.svg.append("g").attr("id", "seattleMapHousing");
        var mapG = self.svg.select("#seattleMapHousing");
        mapG.selectAll("path")
            .data(features)
            .enter().append("path")
            .attr("fill", function (d) {
                return mapFillFunct(d);
            })
            .attr("stroke", strokeColor)
            .attr("stroke-width", 2)
            .attr("d", path)
            .attr("class", "zipRegion")
            .attr("cursor", "pointer")
            .on("mouseover", function (d) { // MOUSEOVER
                d3.select(this).attr("class", "zipRegionHover");

                // Clean up old tooltips
                self.svg.selectAll('g.tooltip').remove();
                // Append tooltip
                toolTipG = self.svg.append("g").attr('class', 'tooltip');
                var xPos = d3.mouse(this)[0] - 15;
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

                var priceForZipcode = zipToHousePrices[d.properties.GEOID10];
                if (priceForZipcode) toolTipText = formatDollars(priceForZipcode[self.year]);
                else toolTipText = "No data"
                toolTipG.append("text")
                    .style("pointer-events", "none")
                    .attr("dy", "1.2em")
                    .attr("dx", "6")
                    .attr("font-family", "Open Sans")
                    .attr("font-size", "22px")
                    .text(d.properties.GEOID10);
                toolTipG.append("text")
                    .style("pointer-events", "none")
                    .attr("font-family", "Open Sans")
                    .attr("font-size", "24px")
                    .style("font-weight", 400)
                    .attr("dy", "2.4em")
                    .attr("dx", "6")
                    .text(toolTipText);


                d3.select(this).moveToFront();
            })
            .on("mouseout", function (d) {       // ON MOUSEOUT
                d3.select(this).attr("class", "zipRegion")

                // Clean up old tooltips
                self.svg.selectAll('g.tooltip').remove();

                d3.select(this).moveToBack();
                if (self.selectedRegion)
                    self.selectedRegion.moveToFront();
            })
            .on("click", function (d, element) {        // ON CLICK
                if (self.onclick) {
                    self.onclick(d, this);
                }
                self.svg.selectAll("path")
                    .transition()
                    .attr("stroke", strokeColor)
                    .attr("stroke-width", strokeWidth);

                d3.select(this)
                    .attr("class", "zipRegionSelected")
                    .transition()
                    .attr("stroke", strokeHighlightColor)
                    .attr("stroke-width", strokeHighlightWidth);
                d3.select(this).moveToFront();

                self.selectedRegion = d3.select(this);
            })
            .on("mousemove", function (d) {
                toolTipText = "" + d.properties.GEOID10;
                var xPos = d3.mouse(this)[0] - 15;
                var yPos = d3.mouse(this)[1] - 80;
                if (yPos - toolTipHeight < 0) {
                    yPos = yPos + 65;
                    xPos = xPos + 30;
                }
                toolTipG.attr("transform", "translate(" + xPos + "," + yPos + ")");
                //    .style('top', (yPos)+'px');
                //tooltip.select("text").text("Zipcode: " + d.properties.GEOID10);

            });
        var colorKeyWidth = 20, colorKeyHeight = 325, blockHeight = 40;
        var colorKeySVG = self.svg.append("g")
            .attr("transform", "translate(10, " + (mapHeight - colorKeyHeight - 10) + ")");

        ////////////////// Create color legend //////////////////////
        for (var i = 0; i < gradient.length; i++) {
            colorKeySVG.append("rect")
                .datum([1000000 - (i + 1) * 200000])
                .attr("x", 0)
                .attr("y", i * blockHeight)
                .attr("width", colorKeyWidth)
                .attr("height", blockHeight)
                .attr("fill", function (d) {
                    return color(d);
                });
        }

        var colorScale = d3.scaleLinear()
            .domain([0, 1000000])
            .range([200, 0])
            .nice();

        colorKeySVG.append("g")
            .call(d3.axisRight(colorScale)
                .tickFormat(d3.format("$,"))
                .tickSize(0)
                .tickValues(
                colorScale.ticks(5)
                    .concat(colorScale.domain())))
            .attr("transform", "translate(" + colorKeyWidth + ", 0)")
            .selectAll("text")
            .attr("class", "unselectable")
            .attr("font-family", "Open Sans")
            .attr('font-size', "12px")
            .attr("fill", darkgrey)
            .attr("dx", "2px");

        colorKeySVG.selectAll("path")
            .remove();

        colorKeySVG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("transform", "translate(0, -40)")
            .attr("dy", "1em")
            .attr("fill", darkgrey)
            .attr("class", "unselectable")
            .text("Median Home Value");

        colorKeySVG.append("rect")
            .attr("x", 0)
            .attr("y", 225)
            .attr("width", colorKeyWidth)
            .attr("height", colorKeyWidth)
            .attr("fill", "black");

        colorKeySVG.append("text")
            .attr("x", 30)
            .attr("y", 235)
            .attr("class", "unselectable")
            .attr("dominant-baseline", "central")
            .attr("font-family", "Open Sans")
            .attr("font-size", "12px")
            .text("no data");

        ////////// Create Date Slider ////////

        /** draw the slider */
        self.sliderScale = d3.scaleLinear()
            .domain([2010, 2016])
            .range([0, 250])
            .nice()
            .clamp(true)

        var slider = self.svg.append("g")
            .attr("transform", "translate(150, " + (mapHeight - 30) + ")");

        slider.append("line")
            .attr("class", "track")
            .attr("stroke-width", 2)
            .attr("stroke", "black")
            .attr("x1", self.sliderScale.range()[0])
            .attr("x2", self.sliderScale.range()[1])
            .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "track-inset")
            .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "track-overlay grabbable")
            .attr("stroke-width", "20px")
            .attr("x1", self.sliderScale.range()[0] - 10)
            .attr("x2", self.sliderScale.range()[1] + 10)
            .attr("stroke", "transparent")
            .attr("cursor", "move")
            .call(d3.drag()
                .on("start.interrupt", function () { slider.interrupt(); })
                .on("start drag", function () {
                    self.slide(self.sliderScale.invert(d3.event.x));
                })
                .on("end", function () {
                    if (self.slideStop) {
                        self.slideStop();
                    }
                }));

        slider.insert("g", ".track-overlay")
            .attr("class", "ticks")
            .attr("transform", "translate(0," + 18 + ")")
            .selectAll("text")
            .data(self.sliderScale.ticks(startYearEndYear[1] - startYearEndYear[0]))
            .enter().append("text")
            .attr("class", "unselectable")
            .style("font-weight", function (d) {
                return d === self.year ? 400 : 300;
            })
            .style("opacity", function (d) {
                return self.sliderScale.domain().includes(d) ? 1 : 0;
            })
            .attr("dy", 10)
            .attr("x", self.sliderScale)
            .attr("text-anchor", "middle")
            .text(function (d) { return d; });

        var handle = slider.insert("circle", ".track-overlay")
            .attr("cx", self.sliderScale(startYearEndYear[1]))
            .attr("class", "handle")
            .attr("fill", strokeHighlightColor)
            .attr("r", 6)

        handle.transition()
            .delay(0)
            .duration(1000)
            .style("opacity", 0.75)
            .transition("ebb")
            .duration(500)
            .on("start", function repeat() {
                d3.active(this)
                    .style("opacity", 0.5)
                    .transition("ebb")
                    .style("opacity", 0.75)
                    .transition("ebb")
                    .on("start", repeat);
            });

        //// Draw next/back buttons for slider ////
        var triangle = d3.symbolTriangle;
        var next = slider.append("polyline")
            .attr("point", "0, 50 25, 50 25, 0")
            .attr("fill", strokeHighlightColor)
            .attr("stroke", 5);



        self.slide = function (h) {

            var bisect = d3.bisector(function (d) { return d; }).left;
            var years = new Array();
            for (var i = self.sliderScale.domain()[0]; i <= self.sliderScale.domain()[1]; i++) {
                years.push(i);
            }
            var i = bisect(years, h, 1);
            var d0 = years[i - 1];
            var d1 = years[i];
            var point = h - d0 > d1 - h ? d1 : d0;
            handle.attr("cx", self.sliderScale(point));
            slider.selectAll("text")
                .style("opacity", function (d) {
                    if (d === point) {
                        return 1;
                    }
                    if (startYearEndYear.includes(d) && Math.abs(point - d) > 1) {
                        return 1;
                    }
                    return 0;
                })
                .style("font-weight", function (d) {
                    return d === point ? 400 : 300;
                });

            updateDate(point);
        }




        function updateDate(date) {
            //document.getElementById("selectedYear").innerHTML = date;
            self.year = date;
            self.svg.selectAll(".zipRegion").attr("fill", function (d) {
                return mapFillFunct(d);
            });
        }

        function mapFillFunct(d) {

            var yearsObject = zipToHousePrices[+d.properties.GEOID10];
            if (yearsObject) {
                //console.log(yearsObject[currDisplayYear] + " " + color(yearsObject[currDisplayYear]));
                return color(yearsObject[self.year]);
            } else
                // Zipcode is not defined in dataset
                // Ex: like UW zipcode contains no houses
                return "black";
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

    }

}
