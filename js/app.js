/* 
  Basic app functionality for the mobile survey. 
*/

// TODO: Abstract these into an object that can be passed around
var map, marker, circle;
var selected_polygon = false;
var selected_centroid = false;
var selected_parcel_json = false;


var StarIcon = L.Icon.extend({
    iconUrl: 'img/icons/star-solid-18.png',
    shadowUrl: 'img/icons/star-solid-18.png',
		iconSize: new L.Point(18, 18),
		shadowSize: new L.Point(18, 18),
		iconAnchor: new L.Point(9, 9),
		popupAnchor: new L.Point(9, 9)
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


function setFormParcelCarto(data) {
  console.log(data);
  var blocklot = data.blklot;
  var human_readable_location = data.from_st;
  if (data.from_st != data.to_st) {
    human_readable_location += "-" + data.to_st;
  };
  human_readable_location += " " + data.street + " " + data.st_type;
  
  $('.parcel_id').val(blocklot);
  $('h2 .parcel_id').text(human_readable_location);
  
  // loadDataForParcel(blocklot);   // TODO
}


function setFormParcelPostGIS(data) {
  console.log(data);
  var parcel_id = data.parcel_id;
  var human_readable_location = data.address;
  
  $('.parcel_id').val(parcel_id);
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
  // Get all parcels in the window by survey_id
  
  // For eacn that has results, add a check mark.??
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
      fillColor: 'transparent',
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
  Trim function: strips whitespace from a string. 
  Use: " dog".trim() === "dog" //true
*/
if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function() 
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
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


/* 
 Get the polygon from the UTF Grid 
 Only works if there actually is the info embedded in the grid data.
*/  
function getPolygonFromInteraction(o) {
  var polygon_text = o.data.polygon;
  polygon_text = polygon_text.replace('\\','');
  var polygon_json = jQuery.parseJSON(polygon_text);
  return polygon_json;
}


/* 
 Get the centroid from the UTF Grid 
 Only works if there actually is the info embedded in the grid data.
*/  
function getCentroidFromInteraction(o) {
  var centroid_text = o.data.centroid;
  centroid_text = centroid_text.replace('\\','');
  var centroid_json = jQuery.parseJSON(centroid_text);
  return centroid_json;
}


/*
  Given the interaction data, gets the polygon and centroid and adds it to
  the map
*/
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
Serialize an HTML form for submission to the API
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


function drawMap() {
  /*
    Draw the parcel map on the survey page
  */
  map = new L.Map('map-div');
  
  // Add a bing layer to the map
  bing = new L.BingLayer(settings.bing_key, 'Aerial', {maxZoom:20});
  map.addLayer(bing);
   
  // Add the TileMill maps. 
  // Get the JSON url from the settings.
  wax.tilejson(maps[locale]['json'], function(tilejson) {
    map.addLayer(new wax.leaf.connector(tilejson));

    // Highlight parcels when clicked
    map.on('click', function(e) {
      // e contains information about the interaction. 
     console.log(e);
     getPostgresData(e.latlng, function(data){
       selected_parcel_json = data;
       setFormParcelPostGIS(data);
       highlightPolygon(map, data);
       selectParcel();
     });
    });
    
    // Used for centering the map when we're using geolocation.
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    // Center the map 
    // var sf = new L.LatLng(37.77555050754543, -122.41365958293713);
    // For Detroit testing: 
    var detroit = new L.LatLng(42.305213, -83.126260);
    map.setView(detroit, 18);

    // Mark a location on the map. 
    // Primarily used with browser-based geolocation (aka "where am I?")
    function onLocationFound(e) {
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
};


/* 
 * Given a map object, return the bounds as a string
 */
function getMapBounds(m) {
  bounds = "";
  bounds += m.getBounds().getNorthWest().toString();
  bounds += " " + m.getBounds().getSouthEast().toString();  
  return bounds;
};


/*
 * Overrides the default behavior of a form.
 * Data will be submitted to the action URL in the form.
 * The user will not leave the current page
 * successCallback will be called if the submission is successfull
 */
function ajaxFormSubmit(event, form, successCallback) {
  event.preventDefault(); // stop form from submitting normally
  url = form.attr('action'); 
  
  // TODO: make submit button inactive. 

  // serialize the form
  serialized = form.serializeObject();
  console.log("POST url: " + url);
  console.log(serialized);

  // Post the form
  var jqxhr = $.post(url, {responses: [{parcel_id:serialized, responses: serialized}]}, 
   function() {
     console.log("Form posted");
   },
   "text"
  ).error(function(){ 
    var result = "";
    for (var key in jqxhr) {
      result += key + ": " + jqxhr[key] + "\n";
    }
    console.log("error: " + result);
  }).success(
    successCallback()
  );
};


/* 
 * Main set of event listeners
 */
$(document).ready(function(){
  
  /*
   * Show the survey & hide the front page after the sign-in form has been 
   * submitted
   */
  $("#collector-name-submit").click(function(event) {
    console.log("Button clicked");
    // Get the value of the collector name
    // Set a cookie with the name
    var collector_name = $("#collector_name").val();
    console.log(collector_name);
    $.cookie("collector-name", collector_name, { path: '/' });
    $("#startpoint h2").html("Welcome, " + collector_name + "<br>Select a parcel to begin");
    $(".collector").val(collector_name);
    
    // Hide the homepage, show the survey, draw the map
    $('#home-container').slideToggle();
    $('#survey-container').slideToggle();
    drawMap();
    
    // Change the body ID
    $("body").attr("id","survey");
  });
  
  
  /*
   * Show the feedback bar
   */
  $("#feedback-show").click(function(event) {
    $('#feedback-show').slideToggle();
    $('#feedback-in').slideToggle();
  });
  
  
  /*
   * Submit the feedback form 
   */
  $("#feedback-form").submit(function(event){ 
    // set the bounds for debugging.
    event.preventDefault();
    $('.bounds').val(getMapBounds(map));
    ajaxFormSubmit(event, $("#feedback-form"), function() { 
      console.log("Feedback form submitted successfully");
      $('#feedback-show').slideToggle();
      $('#feedback-in').slideToggle();
    });
  });
 
 
  /* 
   * Handle the parcel survey form being submitted
   */
  $("#parcelform").submit(function(event) {
    event.preventDefault(); // stop form from submitting normally
    url = $(this).attr('action'); 
          
    // serialize the form
    serialized = $('#parcelform').serializeObject();
    console.log("POST url: " + url);
    console.log(serialized);
  
    // TODO: show the spinner. 
  
    // Post the form
    var jqxhr = $.post(url, {responses: [{parcel_id:serialized, responses: serialized}]}, 
      function() {
        console.log("Form successfully posted");
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
  
}); // end onready
  