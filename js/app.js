/* 
  Basic app functionality for the mobile survey. 
*/

// TODO: Abstract these into an object that can be passed around
var map, marker, circle;
var selected_polygon = false;
var selected_parcel_json = false;



var StarIcon = L.Icon.extend({
    iconUrl: 'img/icons/star-solid-18.png',
    shadowUrl: 'img/icons/star-solid-18.png',
		iconSize: new L.Point(18, 18),
		shadowSize: new L.Point(18, 18),
		iconAnchor: new L.Point(9, 9),
		popupAnchor: new L.Point(9, 9),
});                       


$.fn.clearForm = function() {
  return this.each(function() {
    var type = this.type, tag = this.tagName.toLowerCase();
    if (tag == 'form')
      return $(':input',this).clearForm();
    if (type == 'text' || type == 'password' || tag == 'textarea')
      this.value = '';
    else if (type == 'checkbox' || type == 'radio')
      this.checked = false;
    else if (tag == 'select')
      this.selectedIndex = -1;
  });
};

/*
Generates the URL to retrieve results for a given parcel
*/
function getParcelDataURL(parcel_id) {
  return BASEURL + '/surveys/' + SURVEYID + '/parcels/' + parcel_id + '/responses';
}

/*
Gets the data for a given parcel and displays it.
*/
function loadDataForParcel(parcel_id) {
  console.log("Getting data for parcel");
  $.getJSON(getParcelDataURL(parcel_id), function(data) {
    console.log("Hey thar");
    console.log(data);
  });
}


/*
Update the hidden parcel_id field to set the parcel the user
has selected. Will need to be different for every city. 
*/
function setFormParcelSF(id) {
  // Get the block+lot from the interaction data. 
  // Later on, this will need to be a variable / paramaterized; or 
  // standardized per base layer dataset.
  var blocklot = id.data.blklot;
  var human_readable_location = id.data.from_st;
  if (id.data.from_st != id.data.to_st) {
    human_readable_location += "-" + id.data.to_st;
  };
  human_readable_location += " " + id.data.street + " " + id.data.st_type;
  
  $('#parcel_id').val(blocklot);
  $('h2 .parcel_id').text(human_readable_location);
  
  console.log(id.data);
  // loadDataForParcel(blocklot);   // TODO
}


function setFormParcelCarto(data) {
  console.log(data);
  var blocklot = data.blklot;
  var human_readable_location = data.from_st;
  if (data.from_st != data.to_st) {
    human_readable_location += "-" + data.to_st;
  };
  human_readable_location += " " + data.street + " " + data.st_type;
  
  $('#parcel_id').val(blocklot);
  $('h2 .parcel_id').text(human_readable_location);
  
  // loadDataForParcel(blocklot);   // TODO
}


function setFormParcelPostGIS(data) {
  console.log(data);
  var parcel_id = data.parcel_id;
  var human_readable_location = data.address;
  
  $('#parcel_id').val(parcel_id);
  $('h2 .parcel_id').text(human_readable_location);
  
}


/*
Moves the marker to indicate the selected parcel.
*/
function selectParcel(m, latlng) {
  // m.setLatLng(latlng);
  if(!$('#form').is(":visible")) {
      $('#form').slideToggle();
  }
  if($('#startpoint').is(":visible")) {
    $('#startpoint').slideToggle();
  }
  if($('#thanks').is(":visible")) {
    $('#thanks').slideToggle();
  
  }
  map.removeLayer(circle);
}

/* 
Clear the form and thank the user after a successful submission
TODO: pass in selected_parcel_json
*/
function successfulSubmit() {
  console.log("Successful submit");
  console.log(selected_parcel_json);
  
  var done = new L.LatLng(selected_parcel_json.centroid.coordinates[1], selected_parcel_json.centroid.coordinates[0]);
  addDoneMaker(done);
    
  $('#form').slideToggle();
  $('#thanks').slideToggle();
}


function markDoneParcels(map) {
  // Get all parcels by survey_id
  
}

/*
Adds a checkbox marker to the given point
*/
function addDoneMaker(latlng) {
  var doneIcon = new StarIcon();
  console.log(latlng);
  icon = new L.Marker(latlng, {icon: doneIcon});
  map.addLayer(icon);
  return icon;
}


/* 
Outline the given polygon
*/
function highlightPolygon(map, selected_parcel_json) {
  // expects format: 
  // {coordinates: [[x,y], [x,y], ...] }
  
  polygon_json = selected_parcel_json.polygon;
  
  // Remove existing highlighting 
  if(selected_polygon) {
    map.removeLayer(selected_polygon);
  }

  console.log("Polygon JSON");
  console.log(polygon_json);
  
  // Add the new polygon
  var polypoints = new Array();  
  for (var i = polygon_json.coordinates[0].length - 1; i >= 0; i--){
    console.log(polygon_json.coordinates[0][i]);
    point = new L.LatLng(polygon_json.coordinates[0][i][1], polygon_json.coordinates[0][i][0]);
    polypoints.push(point);
  };
  options = {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5
  };
  selected_polygon = new L.Polygon(polypoints, options);
  map.addLayer(selected_polygon);
  
  return selected_polygon;  
}


// Get the centroid of a parcel given its ID.
function getCartoCentroid(parcel_id, callback) {
  query = "SELECT ST_AsGeoJSON(ST_Centroid(the_geom)) FROM clipped_sf_parcels WHERE blklot ='" + parcel_id + "'";
  console.log(query);
  $.getJSON('http://'+ CARTO_ACCOUNT +'.cartodb.com/api/v2/sql/?format=GeoJSON&q='+query, function(data){
     $.each(data.rows, function(key, val) {
       // Only need one.
       callback(val);
     });
  });
}

/* 
Given a point, get data about the parcel at that point from Carto.
*/
function getCartoData(latlng, callback) {
  var lat = latlng.lat;
  var lng = latlng.lng;

  query = "SELECT blklot, from_st, to_st, street, st_type, ST_AsGeoJSON(the_geom) FROM clipped_sf_parcels where ST_Contains(ST_SetSRID(the_geom, 4326), ST_SetSRID(st_geomfromtext('POINT(" + lng + " " + lat + ")'), 4326)) = 't'"; 
  console.log(query);
  
  $.getJSON('http://'+ CARTO_ACCOUNT +'.cartodb.com/api/v2/sql/?q='+query, function(data){
     $.each(data.rows, function(key, val) {
       console.log("Result: ");
       console.log(val);
       callback(val);
     });
  });
}


// Trim function: strips whitespace from a string. 
// Use: " dog".trim() === "dog" //true
if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function() 
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}


function getPostgresWindow(bounds, callback) {
  
}

// Given a Leaflet latlng object, return a JSON object that describes the 
// parcel.
// Attributes: parcel_id (string), address (string), polygon (GeoJSON)
function getPostgresData(latlng, callback) {
  var lat = latlng.lat;
  var lng = latlng.lng; //http://stormy-mountain-3909.herokuapp.com
  var url = 'http://stormy-mountain-3909.herokuapp.com/detroit/parcel?lat=' + lat + '&lng=' + lng;
  console.log(url);
  $.getJSON(url, function(data){
    // Process the results. Strip whitespace. Convert the polygon to geoJSON
    var result = {
      parcel_id: data[0].trim(), 
      address: data[3].trim(),
      polygon: jQuery.parseJSON(data[4]),
      centroid: jQuery.parseJSON(data[5])
    };
    callback(result);
  });
}

function getPolygonFromInteraction(o) {
  var polygon_text = o.data.polygon;
  polygon_text = polygon_text.replace('\\','');
  var polygon_json = jQuery.parseJSON(polygon_text);
  return polygon_json;
}

function getCentroidFromInteraction(o) {
  var centroid_text = o.data.centroid;
  centroid_text = centroid_text.replace('\\','');
  var centroid_json = jQuery.parseJSON(centroid_text);
  return centroid_json;
}

// Given the interaction data, gets the polygon and centroid and adds it to
// the map
function GeoJSONify(o) {
  polygon_json = getPolygonFromInteraction(o);
  centroid_json = getCentroidFromInteraction(o);
  
  // Add the polygon to the map.
  selected = highlightPolygon(map, polygon_json); 
  
  // Add the point to the map
  //var donePos = new L.LatLng(centroid_json.coordinates[1],centroid_json.coordinates[0]);
  // addDoneMaker(donePos);
}

/*
Serialize a form for submission
usage: $('#myform').serializeObject();
*/ 
$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};


$(document).ready(function(){
  /* 
  Set up the map
  */
  wax.tilejson(maps[locale]['json'],
    function(tilejson) {
      map = new L.Map('map-div');
      map.addLayer(new wax.leaf.connector(tilejson));
      wax.leaf.interaction()
        .map(map)
        .tilejson(tilejson)
        .on('on', function(o) {
            // Interaction: Handles clicks/taps
            if (o.e.type == 'mouseup') { // was mousemove
                //  console.log(o.formatter({format:'full'}, o.data));
                getPostgresData(map.mouseEventToLatLng(o.e), function(data){
                  console.log("YAY!");
                  console.log(data);
                  selected_parcel_json = data;
                  //var poly = jQuery.parseJSON(data.st_asgeojson);
                  setFormParcelPostGIS(data);
                  highlightPolygon(map, data);
                  selectParcel();
                  //console.log(poly);
                });
                
                
                // getCartoData(map.mouseEventToLatLng(o.e), function(data){
                //   setFormParcelCarto(data);
                //   var poly = jQuery.parseJSON(data.st_asgeojson);
                //   highlightPolygon(map, poly);
                //   selectParcel();
                // });              
                // selectParcel(marker, map.mouseEventToLatLng(o.e));
                // setFormParcelSF(o);

                // GeoJSONify(o);

            }
        });

  		map.on('locationfound', onLocationFound);
  		map.on('locationerror', onLocationError);
  		//map.locateAndSetView(18);
  	  //var sf = new L.LatLng(37.77555050754543, -122.41365958293713);
  	 // marker = new L.Marker(sf);
  	  // For Detroit testing: 
 	    var detroit = new L.LatLng(42.305213, -83.126260);
 		  map.setView(detroit, 18);
  	  // map.addLayer(detroit);  		  

  	  //map.setView(sf, 18);

  		function onLocationFound(e) {
  		  // When we find the 
  	    marker = new L.Marker(e.latlng);
  		  map.addLayer(marker);  		  

        // Add the accuracy circle to the map
  			var radius = e.accuracy / 2;
  			circle = new L.Circle(e.latlng, radius);
  			map.addLayer(circle);
  		}

  		function onLocationError(e) {
  			alert(e.message);
  		}
  });

  
  
  
  $("#parcelform").submit(function(event) {
    event.preventDefault(); // stop form from submitting normally
    url = $(this).attr('action'); 
        
    // serialize the form
    serialized = $('#parcelform').serializeObject();
    console.log("POST url: " + url);
    console.log(serialized);
    
    // TODO: show the spinner. 
    
    // Post the form
    var jqxhr = $.post(url, {responses: [{parcel_id:serialized.parcel_id, responses: serialized}]}, 
      function() {
        console.log("Form successfully posted");
        // hide the spinner
      },
      "text"
    ).error(function(){ 
      var result = "";
      for (var key in jqxhr) {
        result += key + ": " + jqxhr[key] + "\n";
      }
      console.log("error: " + result);
    }).success(function(){
      successfulSubmit();
    });
  });      
});
  
