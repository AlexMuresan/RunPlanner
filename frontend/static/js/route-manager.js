class RouteManager {
    constructor() {
        this.currentRoute = null;
        this.savedRoutes = [];
        this.initEventListeners();
        this.loadSavedRoutes();
    }

    initEventListeners() {
        document.getElementById('saveRoute').addEventListener('click', () => this.saveRoute());
        document.getElementById('clearRoute').addEventListener('click', () => this.clearRoute());
        document.getElementById('loopRoute').addEventListener('click', () => this.loopRoute());
        document.getElementById('exportTrack').addEventListener('click', () => this.exportGPX('track'));
        document.getElementById('exportRoute').addEventListener('click', () => this.exportGPX('route'));
        document.getElementById('autoRouting').addEventListener('change', (e) => {
            mapManager.setAutoRouting(e.target.checked);
        });
        document.getElementById('routingProfile').addEventListener('change', (e) => {
            mapManager.setRoutingProfile(e.target.value);
        });
    }

    async loadSavedRoutes() {
        try {
            this.savedRoutes = await api.getAllRoutes();
            this.renderSavedRoutes();
        } catch (error) {
            console.error('Failed to load saved routes:', error);
            this.showError('Failed to load saved routes');
        }
    }

    renderSavedRoutes() {
        const container = document.getElementById('savedRoutesList');

        if (this.savedRoutes.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">No saved routes</p>';
            return;
        }

        container.innerHTML = this.savedRoutes.map(route => `
            <div class="route-item ${this.currentRoute && this.currentRoute.id === route.id ? 'active' : ''}" data-route-id="${route.id}">
                <h3>${route.name}</h3>
                <p>${route.waypoints.length} waypoints</p>
                <div class="actions">
                    <button class="bg-blue-500 text-white rounded-md hover:bg-blue-600" onclick="routeManager.loadRoute(${route.id})">
                        Load
                    </button>
                    <button class="bg-red-500 text-white rounded-md hover:bg-red-600" onclick="routeManager.deleteRoute(${route.id})">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadRoute(id) {
        try {
            const route = await api.getRoute(id);
            this.currentRoute = route;

            document.getElementById('routeName').value = route.name;
            document.getElementById('routeDescription').value = route.description || '';
            document.getElementById('autoRouting').checked = route.routing_mode === 'auto';

            mapManager.setAutoRouting(route.routing_mode === 'auto');
            mapManager.loadRoute(route.waypoints);

            this.updateWaypoints();
            this.updateExportButtons();
            this.renderSavedRoutes();
        } catch (error) {
            console.error('Failed to load route:', error);
            this.showError('Failed to load route');
        }
    }

    async saveRoute() {
        const name = document.getElementById('routeName').value.trim();
        const description = document.getElementById('routeDescription').value.trim();
        const autoRouting = document.getElementById('autoRouting').checked;

        if (!name) {
            this.showError('Please enter a route name');
            return;
        }

        const waypoints = mapManager.getWaypoints();

        if (waypoints.length === 0) {
            this.showError('Please add at least one waypoint');
            return;
        }

        const routeData = {
            name,
            description,
            waypoints,
            routing_mode: autoRouting ? 'auto' : 'manual'
        };

        try {
            if (this.currentRoute && this.currentRoute.id) {
                const updated = await api.updateRoute(this.currentRoute.id, routeData);
                this.currentRoute = updated;
                this.showSuccess('Route updated successfully');
            } else {
                const created = await api.createRoute(routeData);
                this.currentRoute = created;
                this.showSuccess('Route saved successfully');
            }

            await this.loadSavedRoutes();
            this.updateExportButtons();
        } catch (error) {
            console.error('Failed to save route:', error);
            this.showError('Failed to save route');
        }
    }

    async deleteRoute(id) {
        if (!confirm('Are you sure you want to delete this route?')) {
            return;
        }

        try {
            await api.deleteRoute(id);

            if (this.currentRoute && this.currentRoute.id === id) {
                this.clearRoute();
            }

            await this.loadSavedRoutes();
            this.showSuccess('Route deleted successfully');
        } catch (error) {
            console.error('Failed to delete route:', error);
            this.showError('Failed to delete route');
        }
    }

    loopRoute() {
        const waypoints = mapManager.getWaypoints();

        if (waypoints.length < 2) {
            this.showError('Need at least 2 waypoints to create a loop');
            return;
        }

        // Check if already a loop (last point is same as first)
        const first = waypoints[0];
        const last = waypoints[waypoints.length - 1];

        if (Math.abs(first.lat - last.lat) < 0.00001 && Math.abs(first.lng - last.lng) < 0.00001) {
            this.showError('Route is already a loop');
            return;
        }

        // Add a waypoint at the first point's location to close the loop
        mapManager.addWaypoint(first.lat, first.lng);
        this.showSuccess('Loop closed! Route now returns to start');
    }

    clearRoute() {
        mapManager.clearRoute();
        this.currentRoute = null;

        document.getElementById('routeName').value = '';
        document.getElementById('routeDescription').value = '';
        document.getElementById('autoRouting').checked = false;

        this.updateWaypoints();
        this.updateExportButtons();
        this.renderSavedRoutes();
    }

    async exportGPX(type) {
        if (!this.currentRoute || !this.currentRoute.id) {
            this.showError('Please save the route before exporting');
            return;
        }

        try {
            const blob = await api.exportGPX(this.currentRoute.id, type);
            const filename = `${this.currentRoute.name.replace(/\s+/g, '_')}.gpx`;
            api.downloadBlob(blob, filename);
            this.showSuccess(`GPX ${type} exported successfully`);
        } catch (error) {
            console.error('Failed to export GPX:', error);
            this.showError('Failed to export GPX');
        }
    }

    updateWaypoints() {
        const container = document.getElementById('waypointsList');
        const waypoints = mapManager.getWaypoints();

        if (waypoints.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Click on the map to add waypoints</p>';
            return;
        }

        container.innerHTML = waypoints.map((wp, index) => `
            <div class="waypoint-item">
                <span class="text-sm">
                    ${index + 1}. ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}
                </span>
                <button
                    class="text-red-500 hover:text-red-700 text-sm"
                    onclick="routeManager.removeWaypoint(${index})"
                >
                    Remove
                </button>
            </div>
        `).join('');
    }

    removeWaypoint(index) {
        mapManager.removeWaypoint(index);
        this.updateWaypoints();
    }

    updateExportButtons() {
        const hasRoute = this.currentRoute && this.currentRoute.id;
        document.getElementById('exportTrack').disabled = !hasRoute;
        document.getElementById('exportRoute').disabled = !hasRoute;
    }

    showSuccess(message) {
        alert(message);
    }

    showError(message) {
        alert(message);
    }
}

window.routeManager = new RouteManager();
