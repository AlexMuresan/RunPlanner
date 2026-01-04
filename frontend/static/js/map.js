class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.routePolyline = null;
        this.autoRouting = false;
        this.routingProfile = 'foot'; // default to foot for running/walking
        this.totalDistance = 0; // in meters
        this.userLocationMarker = null;
        this.lastKnownPosition = null; // Cache last known position
        this.init();
    }

    init() {
        this.map = L.map('map').setView([37.7749, -122.4194], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(this.map);

        this.map.on('click', (e) => this.handleMapClick(e));

        // Add geolocation button listener
        document.getElementById('geolocateBtn').addEventListener('click', () => this.showUserLocation());

        // Add region detection button listener
        document.getElementById('detectRegionBtn').addEventListener('click', () => this.detectAndSuggestRegion());

        // Modal close button
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('regionSetupModal').classList.add('hidden');
        });

        // Copy command button
        document.getElementById('copyCommand').addEventListener('click', () => {
            const command = document.getElementById('setupCommand').textContent;
            navigator.clipboard.writeText(command).then(() => {
                const btn = document.getElementById('copyCommand');
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = 'Copy Command', 2000);
            });
        });
    }

    detectAndSuggestRegion() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        const btn = document.getElementById('detectRegionBtn');
        btn.disabled = true;
        btn.textContent = 'Detecting location...';

        const options = {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 30000
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Show modal
                document.getElementById('regionSetupModal').classList.remove('hidden');

                // Get location name using reverse geocoding
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                    const data = await response.json();
                    const locationName = data.address.city || data.address.town || data.address.county || data.address.state || 'Unknown';
                    document.getElementById('detectedLocation').textContent = `${locationName}, ${data.address.country}`;

                    // Suggest region based on location
                    const region = this.suggestRegion(lat, lng, data.address);
                    document.getElementById('suggestedRegion').textContent = region.name;
                    document.getElementById('setupCommand').textContent = './setup-osrm.sh';

                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                    document.getElementById('detectedLocation').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    document.getElementById('suggestedRegion').textContent = 'Unable to detect - please select manually';
                }

                btn.disabled = false;
                btn.textContent = '📍 Setup Map Data for My Location';
            },
            (error) => {
                btn.disabled = false;
                btn.textContent = '📍 Setup Map Data for My Location';

                let message = 'Unable to get your location to suggest a region.';
                if (error.code === error.POSITION_UNAVAILABLE) {
                    message += '\n\nPlease ensure location services are enabled in your system settings.';
                }
                alert(message);
            },
            options
        );
    }

    suggestRegion(lat, lng, address) {
        // Simple region suggestion based on country
        const country = address.country_code?.toUpperCase();

        const regions = {
            'US': { name: 'United States - Select your state', geofabrik: 'north-america/us' },
            'GB': { name: 'United Kingdom - England', geofabrik: 'europe/great-britain' },
            'DE': { name: 'Germany', geofabrik: 'europe/germany' },
            'FR': { name: 'France', geofabrik: 'europe/france' },
            'IT': { name: 'Italy', geofabrik: 'europe/italy' },
            'ES': { name: 'Spain', geofabrik: 'europe/spain' },
            'NL': { name: 'Netherlands', geofabrik: 'europe/netherlands' },
            'BE': { name: 'Belgium', geofabrik: 'europe/belgium' },
            'CH': { name: 'Switzerland', geofabrik: 'europe/switzerland' },
            'AT': { name: 'Austria', geofabrik: 'europe/austria' },
        };

        return regions[country] || { name: address.country || 'Your country', geofabrik: '' };
    }

    showUserLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        const btn = document.getElementById('geolocateBtn');
        btn.style.opacity = '0.5';
        btn.disabled = true;

        // If we have a cached position, use it immediately while we try to get a fresh one
        if (this.lastKnownPosition) {
            this.updateLocationMarker(this.lastKnownPosition.lat, this.lastKnownPosition.lng);
        }

        const options = {
            enableHighAccuracy: false,  // Use network location (faster) instead of GPS
            timeout: 5000,               // 5 second timeout (shorter, will fallback to cache)
            maximumAge: 300000           // Accept cached position up to 5 minutes old
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Cache this position for future use
                this.lastKnownPosition = { lat, lng };

                this.updateLocationMarker(lat, lng);

                btn.style.opacity = '1';
                btn.disabled = false;
            },
            (error) => {
                btn.style.opacity = '1';
                btn.disabled = false;

                // If we have a cached position, use it instead of showing an error
                if (this.lastKnownPosition) {
                    this.updateLocationMarker(this.lastKnownPosition.lat, this.lastKnownPosition.lng);
                    console.log('Using cached location due to error:', error.message);
                    return;
                }

                let message = 'Unable to get your location';
                let suggestion = '';

                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied.';
                        suggestion = '\n\nPlease enable location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable.';
                        suggestion = '\n\nThis can happen if:\n- Location services are disabled on your device\n- You\'re using a VPN\n- Your device can\'t determine location\n\nTry enabling location services in your system settings.';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out.';
                        suggestion = '\n\nYour device is taking too long to find your location. Try again, or check if location services are enabled.';
                        break;
                }
                alert(message + suggestion);
            },
            options
        );
    }

    updateLocationMarker(lat, lng) {
        // Remove old user location marker if exists
        if (this.userLocationMarker) {
            this.map.removeLayer(this.userLocationMarker);
        }

        // Create a custom icon for user location
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });

        // Add user location marker
        this.userLocationMarker = L.marker([lat, lng], {
            icon: userIcon,
            title: 'Your Location'
        }).addTo(this.map);

        // Center map on user location
        this.map.setView([lat, lng], 15);
    }

    handleMapClick(e) {
        const { lat, lng } = e.latlng;
        this.addWaypoint(lat, lng);
    }

    addWaypoint(lat, lng) {
        const order = this.markers.length;

        const marker = L.marker([lat, lng], {
            draggable: true,
            title: `Waypoint ${order + 1}`
        }).addTo(this.map);

        marker.waypointData = { lat, lng, order };

        marker.on('drag', (e) => this.handleMarkerDrag(e, marker));
        marker.on('dragend', (e) => this.handleMarkerDragEnd(e, marker));

        this.markers.push(marker);

        window.routeManager.updateWaypoints();
        this.updateRoute();
    }

    handleMarkerDrag(e, marker) {
        const { lat, lng } = e.target.getLatLng();
        marker.waypointData = { ...marker.waypointData, lat, lng };
    }

    handleMarkerDragEnd(e, marker) {
        window.routeManager.updateWaypoints();
        this.updateRoute();
    }

    async updateRoute() {
        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }

        if (this.markers.length < 2) {
            this.totalDistance = 0;
            this.updateDistanceDisplay();
            return;
        }

        const waypoints = this.markers.map(m => m.waypointData);

        if (this.autoRouting) {
            await this.drawAutoRoute(waypoints);
        } else {
            this.drawManualRoute(waypoints);
        }
    }

    async drawAutoRoute(waypoints) {
        try {
            document.getElementById('loadingIndicator').classList.remove('hidden');

            const routeData = await api.calculateRouting(waypoints, this.routingProfile);

            if (routeData.code === 'Ok' && routeData.routes && routeData.routes.length > 0) {
                const coordinates = routeData.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);

                // Extract distance from route data (in meters)
                this.totalDistance = routeData.routes[0].distance || 0;
                this.updateDistanceDisplay();

                this.routePolyline = L.polyline(coordinates, {
                    color: '#3b82f6',
                    weight: 4,
                    opacity: 0.7
                }).addTo(this.map);
            } else {
                this.drawManualRoute(waypoints);
            }
        } catch (error) {
            console.error('Auto-routing failed, falling back to manual:', error);
            this.drawManualRoute(waypoints);
        } finally {
            document.getElementById('loadingIndicator').classList.add('hidden');
        }
    }

    drawManualRoute(waypoints) {
        const latlngs = waypoints.map(wp => [wp.lat, wp.lng]);

        // Calculate distance for manual route (straight lines)
        this.totalDistance = this.calculateManualDistance(waypoints);
        this.updateDistanceDisplay();

        this.routePolyline = L.polyline(latlngs, {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(this.map);
    }

    calculateManualDistance(waypoints) {
        let totalDistance = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            totalDistance += this.haversineDistance(
                waypoints[i].lat, waypoints[i].lng,
                waypoints[i + 1].lat, waypoints[i + 1].lng
            );
        }
        return totalDistance;
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    updateDistanceDisplay() {
        const miles = (this.totalDistance * 0.000621371).toFixed(2);
        const km = (this.totalDistance / 1000).toFixed(2);

        document.getElementById('distanceMiles').textContent = this.totalDistance > 0 ? `${miles} mi` : '-';
        document.getElementById('distanceKm').textContent = this.totalDistance > 0 ? `${km} km` : '-';
    }

    removeWaypoint(index) {
        if (this.markers[index]) {
            this.map.removeLayer(this.markers[index]);
            this.markers.splice(index, 1);

            this.markers.forEach((marker, i) => {
                marker.waypointData.order = i;
            });

            this.updateRoute();
        }
    }

    clearRoute() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        if (this.routePolyline) {
            this.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }
    }

    loadRoute(waypoints) {
        this.clearRoute();

        waypoints.forEach(wp => {
            const marker = L.marker([wp.lat, wp.lng], {
                draggable: true,
                title: `Waypoint ${wp.order + 1}`
            }).addTo(this.map);

            marker.waypointData = wp;

            marker.on('drag', (e) => this.handleMarkerDrag(e, marker));
            marker.on('dragend', (e) => this.handleMarkerDragEnd(e, marker));

            this.markers.push(marker);
        });

        if (this.markers.length > 0) {
            const bounds = L.latLngBounds(this.markers.map(m => m.getLatLng()));
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }

        this.updateRoute();
    }

    setAutoRouting(enabled) {
        this.autoRouting = enabled;
        this.updateRoute();
    }

    setRoutingProfile(profile) {
        this.routingProfile = profile;
        if (this.autoRouting && this.markers.length >= 2) {
            this.updateRoute();
        }
    }

    getWaypoints() {
        return this.markers.map(m => m.waypointData);
    }
}

const mapManager = new MapManager();
