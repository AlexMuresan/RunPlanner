class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.polylines = [];
        this.routePolyline = null;
        this.autoRouting = false;
        this.routingProfile = 'foot'; // default to foot for running/walking
        this.totalDistance = 0; // in meters
        this.init();
    }

    init() {
        this.map = L.map('map').setView([37.7749, -122.4194], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(this.map);

        this.map.on('click', (e) => this.handleMapClick(e));
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
