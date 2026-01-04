const API_BASE_URL = '/api';

const api = {
    async getAllRoutes() {
        const response = await fetch(`${API_BASE_URL}/routes`);
        if (!response.ok) throw new Error('Failed to fetch routes');
        return response.json();
    },

    async getRoute(id) {
        const response = await fetch(`${API_BASE_URL}/routes/${id}`);
        if (!response.ok) throw new Error('Failed to fetch route');
        return response.json();
    },

    async createRoute(routeData) {
        const response = await fetch(`${API_BASE_URL}/routes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(routeData),
        });
        if (!response.ok) throw new Error('Failed to create route');
        return response.json();
    },

    async updateRoute(id, routeData) {
        const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(routeData),
        });
        if (!response.ok) throw new Error('Failed to update route');
        return response.json();
    },

    async deleteRoute(id) {
        const response = await fetch(`${API_BASE_URL}/routes/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete route');
        return response.json();
    },

    async exportGPX(id, type = 'track') {
        const response = await fetch(`${API_BASE_URL}/routes/${id}/gpx?type=${type}`);
        if (!response.ok) throw new Error('Failed to export GPX');
        const blob = await response.blob();
        return blob;
    },

    async calculateRouting(waypoints, profile = 'foot') {
        const coords = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');
        const response = await fetch(`${API_BASE_URL}/routes/routing/calculate?waypoints=${coords}&profile=${profile}`);
        if (!response.ok) throw new Error('Failed to calculate routing');
        return response.json();
    },

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
};
