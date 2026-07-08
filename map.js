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
  // N up 3rd, left on Mission Bay Blvd N, right up 4th over the bridge,
  // right on Townsend, left up 2nd, right on Mission, right down 1st to Anthropic
  var leg1 = [
    [37.7701, -122.3893],     // 0: 1455 3rd St (OpenAI) - START
    [37.77111814524673, -122.38942225044988], // left on Mission Bay Blvd North
    [37.771021853540326, -122.3912372507816], // right on 4th St
    [37.774476307391, -122.39160244881813], // slight left to stay on 4th (bridge)
    [37.77711626979975, -122.39499403460314], // right on Townsend St
    [37.78063159078087, -122.39055144862938], // left on 2nd St
    [37.78805899667852, -122.39980306212492], // right on Mission St
    [37.789763229458174, -122.39758209999967], // right on 1st St
    [37.78853889743718, -122.39608752638394], // Howard / 1st
    [37.78838571623302, -122.39641255924988], // 500 Howard (Anthropic) - END
  ];

  // === LEG 2: 500 Howard (Anthropic) -> Rincon Park opposite 345 Spear (Google DeepMind) ===
  // Continue SE down 1st, left on Folsom NE to the Embarcadero, right to stop opposite 345 Spear
  var leg2 = [
    [37.78838571623302, -122.39641255924988], // anthropic (500 Howard)
    [37.78853889743718, -122.39608752638394], // Howard / 1st
    [37.78736370243833, -122.39453512673774], // left on Folsom
    [37.79078060887867, -122.3901469914879], // right on Embarcadero
    [37.789969, -122.389304], // Rincon Park, opposite 345 Spear (Google DeepMind) - END
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
