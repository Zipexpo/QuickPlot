//<editor-fold desc="Section for the force directed layout of the correlation graph"


function getGraphSize(svg) {
    if (!svg) {
        svg = d3.select(svgId);
    }
    let width = svg.node().getBoundingClientRect().width;
    let height = svg.node().getBoundingClientRect().height;
    return [width, height];
}

function createForce() {
    let graphSize = getGraphSize(),
        width = graphSize[0],
        height = graphSize[1];
    let myForce = d3.forceSimulation()
        .velocityDecay(0.5)
        .alphaDecay(0)
        .force("charge", d3.forceManyBody().strength(-100).distanceMin(4 * graphNodeRadius))
        // .force("charge", d3.forceManyBody().strength(-80).distanceMin(4 * graphNodeRadius))
        .force("collision", d3.forceCollide(2 * graphNodeRadius).strength(1))
        .force("x", d3.forceX(width / 2))
        .force("y", d3.forceY(height / 2));

    force = myForce;
    return myForce;
}



function getNodes() {
    nodes_data = seriesInfo.map(d=>({text:d.name,value:d.key}));
    return nodes_data;
}

function setLinkData(threshold) {
    nodes_data = force.nodes();
    nodes_data.forEach(n=>n.relatedLink=[]);
    let links = [];
    seriesInfo.forEach((s,si)=>{
        Object.keys(s.corr).forEach(index=>{
            let corcoef = s.corr[index];
            let type = (corcoef >= 0) ? "positive" : "negative"
            let corcoefabs = Math.abs(Math.round(corcoef * 1000) / 1000);
            if (corcoefabs >= threshold) {
                let source = nodes_data[si];
                let target = nodes_data[index];
                const l = {source, target, type: type, value: corcoefabs};
                links.push(l);
                source.relatedLink.push(l);
                target.relatedLink.push(l);
            }
        })
    })
    links_data = [];
    links.forEach(e => {
        links_data.push(e)
    });
    return links;
}

function getCorScale(links_data) {

    let maxCor = d3.max(links_data, function (d) {
        return d.value;
    });
    let minCor = d3.min(links_data, function (d) {
        return d.value;
    });
    //Make the scales before filtering
    let corScale = d3.scaleLinear().domain([minCor, maxCor]).range([minLinkWidth, maxLinkWidth]);
    return corScale;
}

//</editor-fold>
//<editor-fold desc="Draw the force directed graph">
function drawGraph() {

    let svg = d3.select(svgId);
    let graphSize = getGraphSize();
    let width = graphSize[0];
    let height = graphSize[0];

    force = createForce();

    nodes_data = getNodes();
    force.nodes(nodes_data);

    setLinkData(defaultThreshold);
    corScale = getCorScale(links_data);
    force.force("link", d3.forceLink(links_data).strength(Math.pow(defaultThreshold, linkStrengthPower)));

    let g = svg.append("g");

    //Links
    link = g.append("g")
        .selectAll("line")
        .data(links_data)
        .enter().append("line")
        .attr("stroke-width", linkWidth)
        .style("stroke", linkColor);

    let node = g.append("defs")
        .selectAll("clipPath")
        .data(nodes_data)
        .enter()
        .append("clipPath")
        .attr("id", (d) => {
            return "clipPath" + d.index;
        })
        .append("circle")
        .attr("fill","black")
        .attr("r", graphNodeRadius);

    let plot = g.append("g")
        .selectAll("circle")
        .data(nodes_data)
        .enter()
        .append("circle")
        .attr('r',graphNodeRadius).attr("fill",d=>(d.text==='FUEL GAS TO CHG PREHTR')?'#7030A0':((d.text==='175# STEAM TO RISER')?'#77933C': "steelblue"))
        .attr("id", (d) => {
            return "img" + d.index;
        })
        // .attr("clip-path", (d) => "url(#clipPath" + d.index + ")")
        // .on("click", (d) => {
        //     selectionCounter = selectionCounter % 2;
        //     $("#option" + (selectionCounter + 1) + "Container").msDropDown().data("dd").setIndexByValue(d.value);
        //     updateElement(selectionCounter);
        //     selectionCounter += 1;
        //
        // })
        .on("mouseover", function (d){
            plot.attr('opacity',0.3)
            d3.select(this).attr('opacity',1).attr("r", graphNodeRadius + mouseOverExpand);
            d3.select("#clipPath" + d.index + " circle").attr("r", graphNodeRadius + mouseOverExpand);
            d3.select("#circle" + d.index).attr("r", graphNodeRadius + mouseOverExpand);
            d3.select("#label" + d.index).attr("dy", graphNodeRadius + mouseOverExpand);

            const _d = d3.select(this).datum();
            link.attr('opacity',0.05)
            link.filter(l=>(l.source===_d)||(l.target===_d)).attr('opacity',1).each(function(d){
                if (d.source===_d){
                    d3.select('#img'+d.target.index).attr("opacity", 1);
                }else{
                    d3.select('#img'+d.source.index).attr("opacity", 1);
                }
            })
        }).on("mouseout", function(d){
            d3.select(this).attr("r", graphNodeRadius);
            d3.select("#clipPath" + d.index + " circle").attr("r", graphNodeRadius);
            d3.select("#circle" + d.index).attr("r", graphNodeRadius);
            d3.select("#label" + d.index).attr("dy", graphNodeRadius);
            link.attr('opacity',null);
            plot.attr('opacity',null)
        });

    // selectionCircle = g.append("g")
    //     .selectAll("circle")
    //     .data(nodes_data)
    //     .enter()
    //     .append("circle")
    //     .attr("id", (d) => "circle" + d.index)
    //     .attr("r", graphNodeRadius)
    //     .attr("stroke-width", selectionStrokeWidth)
    //     .attr("stroke", "black")
    //     .attr("fill", "none")
    //     .attr("visibility", (d) => (d.value === currentColumnNames[0] || (d.value === currentColumnNames[1])) ? "visible" : "hidden");


    //Plot to the images
    generateNodesWithSVGData((graphNodeRadius + mouseOverExpand) * 2, (graphNodeRadius + mouseOverExpand) * 2, nodes_data);
    //Lablel
    // let label = g.append("g")
    //     .selectAll("text")
    //     .data(nodes_data)
    //     .enter().append("text")
    //     .attr("class", "elementText")
    //     .attr("text-anchor", "middle")
    //     .text((d) => {
    //         // return d.text.split(" ")[0];
    //         return d.text;
    //     })
    //     .attr("id", (d) => "label" + d.index)
    //     .attr("dy", graphNodeRadius);

    force.on("tick", tickHandler);

    function tickHandler() {
        if (node) {
            node
                .attr("cx", function (d) {
                    return d.x = boundX(d.x);
                })
                .attr("cy", function (d) {
                    return d.y = boundY(d.y);
                });
        }
        if (plot) {
            plot
                .attr("cx", (d) => {
                    return d.x //- graphNodeRadius - mouseOverExpand;
                })
                .attr("cy", (d) => {
                    return d.y //- graphNodeRadius - mouseOverExpand;
                })
        }
        // if (selectionCircle) {
        //     selectionCircle.attr("cx", (d) => d.x);
        //     selectionCircle.attr("cy", (d) => d.y);
        // }
        //update link positions
        if (link) {
            link
                .attr("x1", function (d) {
                    return d.source.x;
                })
                .attr("y1", function (d) {
                    return d.source.y;
                })
                .attr("x2", function (d) {
                    return d.target.x;
                })
                .attr("y2", function (d) {
                    return d.target.y;
                });
        }


        //update label positions

        updatetextLayer(gLabel,nodes_data,isInBond,zoomHandler.currentZoom)
        // if (label) {
        //     label
        //         .attr("x", function (d) {
        //             return d.x;
        //         })
        //         .attr("y", function (d) {
        //             return d.y + 2;
        //         });
        // }
    }

    //Handling drag
    let dragHandler = d3.drag()
        .on("start", dragStart)
        .on("drag", dragDrag)
        .on("end", dragEnd);

    dragHandler(plot);

    function dragStart(event,d) {
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragDrag(event,d) {

        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnd(event,d) {
        d.fx = null;
        d.fy = null;
    }

    const gLabel = drawTextLayer(svg,width,height);
    //Handling zoom, we disable zoom since we need the scrolling functionality for navigation
    let zoomHandler = d3.zoom()
        .on("zoom", zoomActions);

    zoomHandler(svg);
    zoomHandler.currentZoom={};
    function zoomActions(event) {
        zoomHandler.currentZoom = event.transform;
        g.attr("transform",event.transform);
        updatetextLayer(gLabel,nodes_data,isInBond,event.transform)
    }

    function boundX(x) {
        return isOutRight(x) ? width - graphNodeRadius * 2 : (isOutLeft(x) ? graphNodeRadius * 2 : x);
    }

    function isOutLeft(x){
        return x < graphNodeRadius * 2;
    }
    function isOutRight(x){
        return (x > width - graphNodeRadius * 2);
    }

    function boundY(y) {
        return isOutBottom(y) ? height - graphNodeRadius * 2 : (isOutTop(y) ? graphNodeRadius * 2 : y);
    }

    function isOutTop(y){
        return y < graphNodeRadius * 2;
    }
    function isOutBottom(y){
        return y > height - graphNodeRadius * 2;
    }

    function isInBond(x,y){
        return (!isOutLeft(x)) && (!isOutRight(x)) && (!isOutTop(y)) && (!isOutBottom(y))
    }

    // draw text layer
    updatetextLayer(gLabel,nodes_data,isInBond,{});
    //Now draw the threshold slider
    drawThresholdSlider(svg);
}

function drawTextLayer(svg,width,height) {
    const g = svg.append('g');
    g.attr('width',width);
    g.attr('height',height);
    return g;
}
function updatetextLayer(g,data,isInBond,{x=0,y=0,k=1}){
    let orient = ({
        top: text => text.attr("text-anchor", "middle").attr("y", -6),
        right: text => text.attr("text-anchor", "start").attr("dy", "0.35em").attr("x", 6),
        bottom: text => text.attr("text-anchor", "middle").attr("dy", "0.71em").attr("y", 6),
        left: text => text.attr("text-anchor", "end").attr("dy", "0.35em").attr("x", -6)
    });
    let pointData = [];
    width = +g.attr('width');
    height = +g.attr('height');
    data.forEach((p,pi)=>{
        if (isInBond(p.x,p.y)) {
            let temp = getpos(p);
            temp = [temp.x, temp.y];
            temp.index = pi;
            temp.name = p.text;
            temp.hasLink = p.relatedLink.length;
            pointData.push(temp);
        }
    });
    let voronoi = d3.Delaunay.from(pointData)
        .voronoi([0, 0, width, height]);

    let dataLabel = [];
    pointData.forEach((d, i) => {
        const cell = voronoi.cellPolygon(i);
        if (cell&&-d3.polygonArea(cell) > 4000)
            dataLabel.push([d, cell, d.name])
    });
    g.selectAll('text').data(dataLabel)
        .join('text')
        .each(function ([[x, y], cell]) {
        const [cx, cy] = d3.polygonCentroid(cell);
        const angle = (Math.round(Math.atan2(cy - y, cx - x) / Math.PI * 2) + 4) % 4;
        d3.select(this).call(angle === 0 ? orient.right
            : angle === 3 ? orient.top
                : angle === 1 ? orient.bottom
                    : orient.left);
        })
        .attr("transform", ([d]) => `translate(${d})`)
        .style('opacity',([d])=>d.hasLink?0.8:0.2)
        .style('pointer-events','none')
        .text(([, , name]) => name);
    function getpos(p){
        return {x:(p.x*k +x),y:(p.y*k+y)}
    }
}

function resetSelectionCircles() {
    selectionCircle.attr("visibility", (d) => (d.value === currentColumnNames[0] || (d.value === currentColumnNames[1])) ? "visible" : "hidden");
}

function linkColor(d) {
    return d.type == 'positive' ? 'green' : 'red';
}

function linkWidth(d) {
    return corScale(d.value);
}

//</editor-fold>
//<editor-fold desc="Section for the slider">
function onThreshold(threshold) {
    links_data = setLinkData(threshold);
    link = link.data(links_data);
    link.exit().remove();
    let newLink = link.enter().append("line");
    link = link.merge(newLink);
    //Update the values
    link.attr("stroke-width", linkWidth)
        .style("stroke", linkColor);

    force.force("link", d3.forceLink(links_data).strength(Math.pow(threshold, linkStrengthPower)));
    force.restart();
}

function onOpacityThreshold(threshold) {
    //synchronize the two sliders
    opacitySliders[0].value(threshold);
    opacitySliders[1].value(threshold);
    d3.selectAll(".contour").selectAll(".cartesianlayer").style("opacity", threshold);

}

function drawThresholdSlider(svg, label, thresholdHandler) {
    if (!thresholdHandler) {
        thresholdHandler = onThreshold;
    }
    if (!label) {
        label = "Correlation threshold";
    }
    let corThreshold = d3.sliderHorizontal()
        .min(0)
        .max(1.0)
        .width(sliderWidth)
        .tickFormat(d3.format('.4'))
        .ticks(3)
        .default(defaultThreshold)
        .on('onchange', thresholdHandler);
    let graphSize = getGraphSize(svg);
    let graphWidth = graphSize[0];
    let graphHeight = graphSize[1];
    let sliderX = graphWidth - sliderWidth - sliderMarginRight;
    let sliderY = graphHeight - sliderHeight;
    let g = svg.append("g")
        .attr("transform", "translate(" + sliderX + "," + sliderY + ")");

    g.append("text")
        .attr("text-anchor", "start")
        .text("alignment-baseline", "ideographic")
        .attr("dy", "-.4em")
        .text(label);
    g.call(corThreshold);
    return corThreshold;
}

//</editor-fold>
//<editor-fold desc = "Section for the image generator">
/*Section for the image on the graph nodes*/
function generateNodesWithSVGData(imgWidth, imgHeight, nodes_data) {

}
// function generateNodesWithSVGData(imgWidth, imgHeight, nodes_data) {
//     let xContour = getGridNumberList(data);
//     let yContour = getGridLetterList(data);
//
//     let layout = {
//         displayModeBar: false,
//         xaxis: {
//             autorange: true,
//             showgrid: false,
//             zeroline: false,
//             showline: false,
//             autotick: true,
//             ticks: '',
//             showticklabels: false
//         },
//         yaxis: {
//             autorange: true,
//             showgrid: false,
//             zeroline: false,
//             showline: false,
//             autotick: true,
//             ticks: '',
//             showticklabels: false
//         },
//         margin: {
//             l: 0,
//             r: 0,
//             t: 0,
//             b: 0,
//             pad: 0,
//             autoexpand: false
//         }
//     };
//
//     nodes_data.forEach(function (d) {
//         let aDiv = document.createElement("div");
//         let z = getNumberColumn(data, d.value);
//         let colorScale = getContourColorScale(d.value);
//         let contourData = [
//             {
//                 x: xContour,
//                 y: yContour,
//                 z: z,
//                 type: 'contour',
//                 showscale: false,
//                 colorscale: colorScale,
//                 line: {
//                     smoothing: 0.5,
//                     color: 'rgba(0, 0, 0, 0)'
//                 }
//             }
//         ];
//         Plotly.plot(aDiv, contourData, layout).then(
//             function (gd) {
//                 Plotly.toImage(gd, {format: 'png', width: imgWidth, height: imgHeight}).then(function (svgData) {
//                     //d.svgData = svgData;
//                     d3.select("#img" + d.index).attr('width', imgWidth).attr('height', imgHeight).attr("xlink:href", svgData);
//                 });
//             }
//         );
//     });
// }

//</editor-fold>
