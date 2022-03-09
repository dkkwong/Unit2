var map;
var dataStats = {}; 

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    map = L.map('mapid', {
        center: [20, 0],
        zoom: 2
    });
    var Stamen_Toner = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
        ext: 'png'
    }).addTo(map);
    //call data function
    getData()

};

function calcStats(data){
    //create empty array to store all data values
    var allValues = [];
    //loop through each country
    for(var country of data.features){
        //loop through each year
        for(var year = 1980; year <= 2015; year+=5){
              //get output for current year
              var value = country.properties["Power_"+ String(year)];
              //add value to array
              allValues.push(value);
        }
    }
    //get min, max, mean stats for our array
    //min value is zero, so I added the minimum non-zero value 0.326
    dataStats.min = Math.min(...allValues)+0.326;
    dataStats.max = Math.max(...allValues);

    //calculate meanValue
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum/ allValues.length;

    
} 
//0.5715

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //constant factor adjusts symbol sizes evenly
    var minRadius = 3;
    //min value is zero, so I use  0.326 for dataStats.min
    var radius = 1.0083 * Math.pow(attValue/(dataStats.min),0.3) * minRadius
    
    return radius;
};

function createPopupContent(properties, attribute){
    //build popup content string 
    var popupContent = "<p><b>Country:</b> " + properties.Feature + "</p>";

    //add formatted attribute to popup content string
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Nuclear Power in " + year + ":</b> " + properties[attribute] + " billion kWh</p>";

    return popupContent;
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng){
    //Determine which attribute to visualize with proportional symbols
    var attribute = "Power_1980";

    //create marker options
    var options = {
        fillColor: "#ffff00",
        color: "#000",
        weight: .7,
        opacity: 1,
        fillOpacity: 0.7    
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    var popupContent = createPopupContent(feature.properties, attribute);

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius) 
    });
    
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
    
};



//Add circle markers for point features to the map
function createPropSymbols(data, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);
};

//Step 10: Resize proportional symbols according to new attribute values
function updatePropSymbols(attribute){

    var year = attribute.split("_")[1];
    //update temporal legend
    document.querySelector("span.year").innerHTML = year;

    map.eachLayer(function(layer){
        if (layer.feature){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            var popupContent = createPopupContent(props, attribute); 

            //update popup content            
            popup = layer.getPopup();            
            popup.setContent(popupContent).update();
        };
    });
};


function createSequenceControls(attributes){
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            //add skip buttons
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse">Reverse</button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward">Forward</button>');

             //disable any mouse event listeners for the container
             L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });
    
    //add listeners 
    map.addControl(new SequenceControl());

    //set slider attributes, 8 columns of data
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;


    //Step 5: click listener for buttons
    document.querySelectorAll('.step').forEach(function(step){
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;
            
            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward'){
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 7 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 0 ? 7 : index;
            };
            //Step 8: update slider
            document.querySelector('.range-slider').value = index;

            updatePropSymbols(attributes[index]);
        })
    })
    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function(){
        //Step 6: get the new index value
        var index = this.value;
        

        updatePropSymbols(attributes[index]);
    });
};

function createLegend(attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //create temporal legend
            container.innerHTML = '<b class="temporalLegend">Nuclear Power <span class="year">1980 </span></b>';
            
            //create svg element
            var svg = '<svg id="attribute-legend" width="210px" height="90px">';

            //array of circle names to base loop on  
            var circles = ["max", "mean", "min"]; 

            //Step 2: loop to add each circle and text to svg string  
            for (var i=0; i<circles.length; i++){  

                //Step 3: assign the r and cy attributes  
                var radius = calcPropRadius(dataStats[circles[i]]);  
                var cy = 80 - radius;  

                
                //dynamically assign circle values based on calculated proportional symbols, assign same color and fill 
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#ffff00" fill-opacity="0.7" stroke="#000000" cx="50"/>';  
                
                var textY = i * 20 +35;            

                //text string            
                svg += '<text id="' + circles[i] + '-text" x="90" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + " billion kWh" + '</text>';
              
            
            };  

            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Power") > -1){
            attributes.push(attribute);
        };
    };
    //check result
    console.log(attributes);
    return attributes;
};

//Step 2: Import GeoJSON data
function getData(){
    //load the data
    fetch("data/NuclearPower.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            //create an attributes array
            var attributes = processData(json);
            calcStats(json);
            //call function to create proportional symbols
            createPropSymbols(json,attributes);
            createSequenceControls(attributes);
            createLegend(attributes);
            
        })
};

//create a new div element call description
var description = document.querySelector('#description')



var iframe = '<iframe src="https://data.worldbank.org/share/widget?end=2015&indicators=EG.ELC.NUCL.ZS&start=1980&view=chart" width="450" height="300" frameBorder="0" scrolling="no" ></iframe>'
//add infographic to page

description.insertAdjacentHTML('beforeend',iframe)

document.addEventListener('DOMContentLoaded',createMap)
