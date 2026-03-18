// Shared route map logic for stoptherace.ai
// Usage: initRouteMap(elementId)

function initRouteMap(elementId) {
  var map = L.map(elementId, {
    center: [37.7750, -122.4050],
    zoom: 14,
    zoomControl: true,
    scrollWheelZoom: true,
    dragging: true,
    minZoom: 11
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  // Desaturate tiles
  var tilePane = document.querySelector('#' + elementId + ' .leaflet-tile-pane');
  if (tilePane) tilePane.style.filter = 'saturate(0) brightness(0.35) contrast(1.2)';

  // === LEG 1: 500 Howard St to 1455 3rd St ===
  var leg1 = [
    [37.7884, -122.3963],    // 500 Howard St (START)
    [37.7868, -122.3983],    // Howard & 2nd
    [37.78186, -122.39209],  // 2nd & Brannan (OSM node 65315466)
    [37.77829, -122.39661],  // Brannan & 4th (OSM node 65315477)
    [37.77442, -122.39159],  // 4th & Channel (OSM node 768247156, nudged south)
    [37.77453, -122.38974],  // Channel & 3rd (OSM node 293820891)
    [37.7701, -122.3893],    // 1455 3rd St (MIDPOINT)
  ];

  // === LEG 2: 1455 3rd St to Dolores Park ===
  var leg2 = [
    [37.7701, -122.3893],    // 0: 1455 3rd St (MIDPOINT)
    [37.76693, -122.38898],  // 1: 3rd & 16th (OSM node)
    [37.76655, -122.39490],  // 2: 16th & Mississippi (nudged east)
    [37.76525, -122.39486],  // 5: Mississippi & 17th (OSM node 65317334)
    [37.76415, -122.41290],  // 6: 17th approaching Harrison (extended)
    [37.76406, -122.41313],  // 7: bend wp (OSM node 4183593002)
    [37.76388, -122.41352],  // 8: bend wp (OSM node 4183592998)
    [37.76380, -122.41375],  // 9: 17th past Treat (extended)
    [37.76370, -122.41517],  // 10: 17th & Folsom (OSM node 65317376)
    [37.76050, -122.41486],  // 11: Folsom & 19th (OSM node 65293569)
    [37.7598, -122.4259],    // 12: 19th & Dolores (END)
  ];

  var route = leg1.concat(leg2.slice(1));

  // White outline underneath for visibility
  L.polyline(route, {
    color: '#ffffff', weight: 8, opacity: 0.3, lineJoin: 'round', lineCap: 'round'
  }).addTo(map);

  // Route line
  var routeLine = L.polyline(route, {
    color: '#d62828', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round'
  }).addTo(map);

  map.fitBounds(routeLine.getBounds().pad(0.08));

  // Stop markers
  var dotStyle = { radius: 6, fillColor: '#d62828', color: '#f0ece4', weight: 2.5, fillOpacity: 1 };

  var stops = [
    { coord: leg1[0], label: 'Anthropic', sub: '500 Howard St', side: 'right' },
    { coord: leg1[6], label: 'OpenAI', sub: '1455 3rd St', side: 'right' },
    { coord: [leg2[8][0]*0.55+leg2[9][0]*0.45, leg2[8][1]*0.55+leg2[9][1]*0.45], label: 'xAI', sub: '3180 18th St', side: 'right' },
    { coord: leg2[10], label: 'Dolores Park', sub: null, side: 'left' },
  ];

  stops.forEach(function(stop) {
    L.circleMarker(stop.coord, dotStyle).addTo(map);
    var html = '<div style="white-space:nowrap;"><span style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;font-weight:700;color:#f0ece4;text-shadow:0 0 6px #0a0a0a,0 0 6px #0a0a0a;">' + stop.label + '</span>' + (stop.sub ? '<br><span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:#888;text-shadow:0 0 4px #0a0a0a,0 0 4px #0a0a0a;">' + stop.sub + '</span>' : '') + '</div>';
    L.marker(stop.coord, {
      icon: L.divIcon({ className: '', html: html, iconSize: [0, 0], iconAnchor: stop.side === 'left' ? [97, 14] : [-10, 14] }),
      interactive: false
    }).addTo(map);
  });

  // Restroom markers
  var restrooms = [
    [37.7638, -122.3987],
    [37.7613, -122.4278],
    [37.7731, -122.3937],
  ];
  var restroomSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width="14" height="14" fill="#f0ece4" style="filter:drop-shadow(0 0 4px #0a0a0a) drop-shadow(0 0 4px #0a0a0a);"><path d="M80 48a48 48 0 1 1 96 0A48 48 0 1 1 80 48zm40 304l0 128c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-154.8c-8.1 9.2-21.1 13.2-33.5 9.4c-16.9-5.3-26.3-23.2-21-40.1l30.9-99.1C44.9 155.3 82 128 124 128l8 0c42 0 79.1 27.3 91.6 67.4l30.9 99.1c5.3 16.9-4.1 34.8-21 40.1c-12.4 3.9-25.4-.2-33.5-9.4L200 480c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-128-16 0zM320 0c13.3 0 24 10.7 24 24l0 464c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-464c0-13.3 10.7-24 24-24zM464 48a48 48 0 1 1 96 0 48 48 0 1 1-96 0zM440 480l0-96-17.8 0c-10.9 0-18.6-10.7-15.2-21.1l9-26.9c-3.2 0-6.4-.5-9.5-1.5c-16.9-5.3-26.3-23.2-21-40.1l29.7-95.2C428.4 156.9 467.6 128 512 128s83.6 28.9 96.8 71.2l29.7 95.2c5.3 16.9-4.1 34.8-21 40.1c-3.2 1-6.4 1.5-9.5 1.5l9 26.9c3.5 10.4-4.3 21.1-15.2 21.1L584 384l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96-16 0 0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32z"/></svg>';
  restrooms.forEach(function(coord) {
    L.marker(coord, {
      icon: L.divIcon({ className: '', html: restroomSvg, iconSize: [14, 14], iconAnchor: [7, 7] }),
      interactive: false
    }).addTo(map);
  });

  return map;
}
