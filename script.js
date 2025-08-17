// Global variables
let map;
let currentMarker;
let destinationMarker;
let currentLocation = null;
let destinationLocation = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    setupTabs();
    loadDefaultValues();
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map').setView([40.7128, -74.0060], 10);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add additional map layers
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 19
    });
    
    const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap',
        maxZoom: 17
    });
    
    // Store layers for toggle functionality
    window.mapLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }),
        satellite: satelliteLayer,
        terrain: terrainLayer
    };
    
    // Add default street layer
    window.mapLayers.street.addTo(map);
}

// Setup event listeners
function setupEventListeners() {
    // Get current location button
    document.getElementById('getLocation').addEventListener('click', getCurrentLocation);
    
    // Search button
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    
    // Manual coordinate inputs
    document.getElementById('lat').addEventListener('input', updateFromManualInput);
    document.getElementById('lon').addEventListener('input', updateFromManualInput);
    document.getElementById('destLat').addEventListener('input', updateDestinationFromManual);
    document.getElementById('destLon').addEventListener('input', updateDestinationFromManual);
    
    // Map control buttons
    document.getElementById('centerMap').addEventListener('click', centerMapOnCurrent);
    document.getElementById('toggleLayers').addEventListener('click', toggleMapLayers);
    
    // Radio calculation inputs
    document.getElementById('frequency').addEventListener('input', updateRadioCalculations);
    document.getElementById('power').addEventListener('input', updateRadioCalculations);
    document.getElementById('antenna').addEventListener('input', updateRadioCalculations);
    
    // Search input enter key
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchLocation();
        }
    });
}

// Setup tab functionality
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding pane
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Load default values
function loadDefaultValues() {
    document.getElementById('frequency').value = '146.52';
    document.getElementById('power').value = '5';
    document.getElementById('antenna').value = '2';
}

// Get current location using GPS
function getCurrentLocation() {
    const btn = document.getElementById('getLocation');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
    btn.disabled = true;
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                currentLocation = { lat, lon };
                
                // Update input fields
                document.getElementById('lat').value = lat.toFixed(6);
                document.getElementById('lon').value = lon.toFixed(6);
                
                // Update map
                updateMapMarkers();
                centerMapOnCurrent();
                
                // Update calculations if destination exists
                if (destinationLocation) {
                    calculateBearingAndDistance();
                }
                
                // Update Maidenhead grid
                updateMaidenheadGrid();
                
                btn.innerHTML = '<i class="fas fa-check"></i> Location Set!';
                btn.classList.add('success');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.classList.remove('success');
                }, 2000);
            },
            function(error) {
                console.error('Error getting location:', error);
                btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Location Error';
                btn.classList.add('error');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.classList.remove('error');
                }, 3000);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Search for a location using Nominatim
async function searchLocation() {
    const searchInput = document.getElementById('searchInput').value.trim();
    if (!searchInput) return;
    
    const btn = document.getElementById('searchBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=1`);
        const data = await response.json();
        
        if (data.length > 0) {
            const result = data[0];
            destinationLocation = {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                name: result.display_name
            };
            
            // Update input fields
            document.getElementById('destLat').value = destinationLocation.lat.toFixed(6);
            document.getElementById('destLon').value = destinationLocation.lon.toFixed(6);
            
            // Update map
            updateMapMarkers();
            
            // Calculate bearing and distance
            if (currentLocation) {
                calculateBearingAndDistance();
            }
            
            // Update Maidenhead grid
            updateMaidenheadGrid();
            
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.add('success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.remove('success');
            }, 2000);
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Search error:', error);
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        btn.classList.add('error');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.classList.remove('error');
        }, 3000);
    }
}

// Update from manual coordinate input
function updateFromManualInput() {
    const lat = parseFloat(document.getElementById('lat').value);
    const lon = parseFloat(document.getElementById('lon').value);
    
    if (!isNaN(lat) && !isNaN(lon)) {
        currentLocation = { lat, lon };
        updateMapMarkers();
        updateMaidenheadGrid();
        
        if (destinationLocation) {
            calculateBearingAndDistance();
        }
    }
}

// Update destination from manual coordinate input
function updateDestinationFromManual() {
    const lat = parseFloat(document.getElementById('destLat').value);
    const lon = parseFloat(document.getElementById('destLon').value);
    
    if (!isNaN(lat) && !isNaN(lon)) {
        destinationLocation = { lat, lon };
        updateMapMarkers();
        updateMaidenheadGrid();
        
        if (currentLocation) {
            calculateBearingAndDistance();
        }
    }
}

// Update map markers
function updateMapMarkers() {
    // Clear existing markers
    if (currentMarker) map.removeLayer(currentMarker);
    if (destinationMarker) map.removeLayer(destinationMarker);
    
    // Add current location marker
    if (currentLocation) {
        currentMarker = L.marker([currentLocation.lat, currentLocation.lon], {
            icon: L.divIcon({
                className: 'current-marker',
                html: '<div style="background-color: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map);
        
        currentMarker.bindPopup('<b>Your Location</b><br>Lat: ' + currentLocation.lat.toFixed(6) + '<br>Lon: ' + currentLocation.lon.toFixed(6));
    }
    
    // Add destination marker
    if (destinationLocation) {
        destinationMarker = L.marker([destinationLocation.lat, destinationLocation.lon], {
            icon: L.divIcon({
                className: 'destination-marker',
                html: '<div style="background-color: #e53e3e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map);
        
        const popupContent = destinationLocation.name ? 
            '<b>Destination</b><br>' + destinationLocation.name + '<br>Lat: ' + destinationLocation.lat.toFixed(6) + '<br>Lon: ' + destinationLocation.lon.toFixed(6) :
            '<b>Destination</b><br>Lat: ' + destinationLocation.lat.toFixed(6) + '<br>Lon: ' + destinationLocation.lon.toFixed(6);
        
        destinationMarker.bindPopup(popupContent);
    }
    
    // Draw line between points if both exist
    if (currentLocation && destinationLocation) {
        const line = L.polyline([
            [currentLocation.lat, currentLocation.lon],
            [destinationLocation.lat, destinationLocation.lon]
        ], {
            color: '#667eea',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5'
        }).addTo(map);
        
        // Store line reference for removal
        if (window.connectionLine) map.removeLayer(window.connectionLine);
        window.connectionLine = line;
    }
}

// Calculate bearing and distance
function calculateBearingAndDistance() {
    if (!currentLocation || !destinationLocation) return;
    
    const bearing = calculateBearing(currentLocation, destinationLocation);
    const distance = calculateDistance(currentLocation, destinationLocation);
    
    // Update compass needle
    updateCompassNeedle(bearing);
    
    // Update bearing display
    document.getElementById('bearingDegrees').textContent = Math.round(bearing) + '°';
    document.getElementById('bearingDirection').textContent = getBearingDirection(bearing);
    document.getElementById('distanceKm').textContent = distance.toFixed(1) + ' km';
    
    // Update radio calculations
    updateRadioCalculations();
}

// Calculate bearing between two points
function calculateBearing(point1, point2) {
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const deltaLon = (point2.lon - point1.lon) * Math.PI / 180;
    
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in kilometers
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
    const deltaLon = (point2.lon - point1.lon) * Math.PI / 180;
    
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
               Math.cos(lat1) * Math.cos(lat2) *
               Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
}

// Get bearing direction
function getBearingDirection(bearing) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}

// Update compass needle
function updateCompassNeedle(bearing) {
    const needle = document.getElementById('compassNeedle');
    needle.style.transform = `translate(-50%, -100%) rotate(${bearing}deg)`;
}

// Update radio calculations
function updateRadioCalculations() {
    if (!currentLocation || !destinationLocation) return;
    
    const frequency = parseFloat(document.getElementById('frequency').value) || 146.52;
    const power = parseFloat(document.getElementById('power').value) || 5;
    const antennaHeight = parseFloat(document.getElementById('antenna').value) || 2;
    
    const distance = calculateDistance(currentLocation, destinationLocation);
    
    // Calculate free space loss
    const freeSpaceLoss = 32.44 + 20 * Math.log10(frequency) + 20 * Math.log10(distance);
    
    // Calculate path loss (simplified - add terrain factor)
    const terrainFactor = Math.min(distance * 0.1, 10); // Simplified terrain factor
    const pathLoss = freeSpaceLoss + terrainFactor;
    
    // Calculate signal strength
    const antennaGain = 2.15; // Dipole antenna gain in dBi
    const signalStrength = 10 * Math.log10(power * 1000) - pathLoss + antennaGain;
    
    // Calculate QSO probability (simplified)
    let qsoProbability = 100;
    if (signalStrength < -120) qsoProbability = 10;
    else if (signalStrength < -100) qsoProbability = 30;
    else if (signalStrength < -80) qsoProbability = 60;
    else if (signalStrength < -60) qsoProbability = 80;
    
    // Update display
    document.getElementById('freeSpaceLoss').textContent = freeSpaceLoss.toFixed(1) + ' dB';
    document.getElementById('pathLoss').textContent = pathLoss.toFixed(1) + ' dB';
    document.getElementById('signalStrength').textContent = signalStrength.toFixed(1) + ' dBm';
    document.getElementById('qsoProbability').textContent = qsoProbability + '%';
}

// Update Maidenhead grid
function updateMaidenheadGrid() {
    if (currentLocation) {
        document.getElementById('yourGrid').textContent = latLonToMaidenhead(currentLocation.lat, currentLocation.lon);
    }
    
    if (destinationLocation) {
        document.getElementById('destGrid').textContent = latLonToMaidenhead(destinationLocation.lat, destinationLocation.lon);
    }
    
    if (currentLocation && destinationLocation) {
        const gridDistance = calculateGridDistance(
            latLonToMaidenhead(currentLocation.lat, currentLocation.lon),
            latLonToMaidenhead(destinationLocation.lat, destinationLocation.lon)
        );
        document.getElementById('gridDistance').textContent = gridDistance.toFixed(1) + ' km';
    }
}

// Convert lat/lon to Maidenhead grid
function latLonToMaidenhead(lat, lon) {
    // Field (A-R)
    const field1 = Math.floor((lon + 180) / 20);
    const field2 = Math.floor((lat + 90) / 10);
    
    // Square (0-9)
    const square1 = Math.floor(((lon + 180) % 20) / 2);
    const square2 = Math.floor(((lat + 90) % 10));
    
    // Subsquare (a-x)
    const subsquare1 = Math.floor(((lon + 180) % 2) * 12);
    const subsquare2 = Math.floor(((lat + 90) % 1) * 24);
    
    const field1Char = String.fromCharCode(65 + field1);
    const field2Char = String.fromCharCode(65 + field2);
    const square1Char = square1.toString();
    const square2Char = square2.toString();
    const subsquare1Char = String.fromCharCode(97 + subsquare1);
    const subsquare2Char = String.fromCharCode(97 + subsquare2);
    
    return field1Char + field2Char + square1Char + square2Char + subsquare1Char + subsquare2Char;
}

// Calculate distance between Maidenhead grids
function calculateGridDistance(grid1, grid2) {
    // Convert grids back to lat/lon for distance calculation
    const pos1 = maidenheadToLatLon(grid1);
    const pos2 = maidenheadToLatLon(grid2);
    
    return calculateDistance(pos1, pos2);
}

// Convert Maidenhead grid to lat/lon
function maidenheadToLatLon(grid) {
    if (grid.length < 6) return { lat: 0, lon: 0 };
    
    const field1 = grid.charCodeAt(0) - 65;
    const field2 = grid.charCodeAt(1) - 65;
    const square1 = parseInt(grid.charAt(2));
    const square2 = parseInt(grid.charAt(3));
    const subsquare1 = grid.charCodeAt(4) - 97;
    const subsquare2 = grid.charCodeAt(5) - 97;
    
    const lon = (field1 * 20) + (square1 * 2) + (subsquare1 / 12) - 180;
    const lat = (field2 * 10) + square2 + (subsquare2 / 24) - 90;
    
    return { lat, lon };
}

// Center map on current location
function centerMapOnCurrent() {
    if (currentLocation) {
        map.setView([currentLocation.lat, currentLocation.lon], 12);
    }
}

// Toggle map layers
function toggleMapLayers() {
    const layers = Object.values(window.mapLayers);
    const currentLayer = layers.find(layer => map.hasLayer(layer));
    const currentIndex = layers.indexOf(currentLayer);
    const nextIndex = (currentIndex + 1) % layers.length;
    
    // Remove current layer
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }
    
    // Add next layer
    window.mapLayers[Object.keys(window.mapLayers)[nextIndex]].addTo(map);
}

// Utility function to format coordinates
function formatCoordinate(coord, type) {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    const direction = type === 'lat' ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    
    return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

// Export functions for debugging
window.appFunctions = {
    getCurrentLocation,
    searchLocation,
    calculateBearingAndDistance,
    updateRadioCalculations,
    updateMaidenheadGrid
};
