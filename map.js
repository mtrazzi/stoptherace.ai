// Shared route map logic for stoptherace.ai
// Usage: initRouteMap(elementId)

function initRouteMap(elementId) {
  var map = L.map(elementId, {
    center: [37.7820, -122.3970],
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

  // === LEG 1: 1455 3rd St (OpenAI) -> 500 Howard (Anthropic) ===
  // N up 3rd to Channel, W on Channel to 4th, NW up 4th to Howard, NE on Howard to Anthropic
  var leg1 = [
    [37.7701, -122.3893],     // 0: 1455 3rd St (OpenAI) - START
    [37.77646659734041, -122.39011389051585], // 3rd bridge
    [37.77709691866833, -122.39059424543301], // post bridge
    [37.785000222708426, -122.40050793066582], // 3rd / Howard
    [37.78838571623302, -122.39641255924988], // anthropic
  ];

  // === LEG 2: 500 Howard (Anthropic) -> Rincon Park opposite 345 Spear (Google DeepMind) ===
  // NE on Howard to Spear, SE on Spear past 345 Spear, wrap around the south side of
  // the block, then NW to the gathering point on the Embarcadero / Rincon Park side
  var leg2 = [
    [37.78838571623302, -122.39641255924988], // anthropic
    [37.7913253940075, -122.3925230058142], // howard / spear
    [37.788883, -122.389469], // 4: south corner of wrap
    [37.789528, -122.388621], // 5: east corner of wrap
    [37.789969, -122.389304], // 6: Rincon Park, opposite 345 Spear (Google DeepMind) - END
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

  map.fitBounds(routeLine.getBounds().pad(0.10));

  // Stop markers
  var dotStyle = { radius: 6, fillColor: '#d62828', color: '#f0ece4', weight: 2.5, fillOpacity: 1 };

  var stops = [
    { coord: leg1[0], label: 'OpenAI', sub: '1455 3rd St', side: 'right' },
    { coord: leg1[leg1.length - 1], label: 'Anthropic', sub: '500 Howard St', side: 'left' },
    { coord: leg2[leg2.length - 1], label: 'Google DeepMind', sub: '345 Spear St', side: 'right' },
  ];

  stops.forEach(function(stop) {
    L.circleMarker(stop.coord, dotStyle).addTo(map);
    var html = '<div style="white-space:nowrap;"><span style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;font-weight:700;color:#f0ece4;text-shadow:0 0 6px #0a0a0a,0 0 6px #0a0a0a;">' + stop.label + '</span>' + (stop.sub ? '<br><span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:#888;text-shadow:0 0 4px #0a0a0a,0 0 4px #0a0a0a;">' + stop.sub + '</span>' : '') + '</div>';
    L.marker(stop.coord, {
      icon: L.divIcon({ className: '', html: html, iconSize: [0, 0], iconAnchor: stop.side === 'left' ? [110, 14] : [-10, 14] }),
      interactive: false
    }).addTo(map);
  });

  return map;
}
