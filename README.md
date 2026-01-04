# GPS Route Planner

A web application for creating and exporting GPS routes using OpenStreetMap. Built with FastAPI, Leaflet.js, and Tailwind CSS, running in Docker containers.

## Features

- **Interactive Map Interface**: Click to add waypoints on an OpenStreetMap
- **Drag & Drop**: Drag waypoints to adjust your route
- **Auto-Routing**: Automatically calculate routes between waypoints using OSRM
- **Manual Mode**: Draw straight lines between waypoints
- **Route Management**: Save, load, and delete routes
- **GPX Export**: Export routes as GPX tracks or routes
- **Persistent Storage**: SQLite database for storing routes

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, JavaScript (Vanilla), Tailwind CSS
- **Map**: Leaflet.js with OpenStreetMap tiles
- **Routing**: OSRM (Open Source Routing Machine)
- **Database**: SQLite
- **Deployment**: Docker & Docker Compose

## Project Structure

```
GPSPlanner/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── database.py          # Database configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── crud.py              # CRUD operations
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── routes.py        # API endpoints
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html
│   ├── static/
│   │   ├── css/
│   │   │   └── styles.css
│   │   └── js/
│   │       ├── api.js           # API client
│   │       ├── map.js           # Map management
│   │       └── route-manager.js # Route state management
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── setup-osrm.sh               # OSRM data setup script
└── README.md
```

## Prerequisites

- Docker
- Docker Compose
- At least 2GB of free disk space (for OSRM data)

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd GPSPlanner
```

### 2. Setup OSRM Data

The application uses OSRM for auto-routing. You need to download and prepare the map data for your region.

```bash
./setup-osrm.sh
```

The script will present an interactive menu where you can:
- **Choose from 13+ popular regions** (US states, European countries, etc.)
- **Enter a custom URL** from [Geofabrik Downloads](https://download.geofabrik.de/) for any region worldwide

**Available regions include:**
- US: Northern California, Southern California, New York, Texas
- Europe: UK, Germany, France, Italy, Spain, Netherlands, Belgium, Switzerland, Austria
- Custom: Any region from Geofabrik

**File sizes range from ~100MB to ~3.5GB** depending on the region. Download and processing time varies from 10-60 minutes based on region size, internet speed, and computer performance.

**Tips:**
- Start with a smaller region (like a US state or small European country) for faster setup
- You can change regions later by running `./setup-osrm.sh` again

### 3. Start the Application

```bash
docker-compose up --build
```

This will start three services:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **OSRM**: http://localhost:5000

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Creating a Route

1. Enter a route name (required)
2. Add a description (optional)
3. Toggle "Auto-routing" if you want routes to follow roads
4. Click on the map to add waypoints
5. Click "Save Route" to save

### Editing Waypoints

- **Add**: Click on the map
- **Move**: Drag waypoints to new positions
- **Remove**: Click "Remove" next to a waypoint in the list

### Loading a Route

- Click "Load" on any saved route in the sidebar
- The route will appear on the map and become editable

### Exporting GPX

1. Make sure your route is saved
2. Click either:
   - **GPX Track**: Exports as a track (includes all route points)
   - **GPX Route**: Exports as a route (waypoints only)

### Deleting a Route

- Click "Delete" on any saved route
- Confirm the deletion

## API Documentation

Once the backend is running, visit:
```
http://localhost:8000/docs
```

### Endpoints

- `GET /api/routes` - List all routes
- `GET /api/routes/{id}` - Get a specific route
- `POST /api/routes` - Create a new route
- `PUT /api/routes/{id}` - Update a route
- `DELETE /api/routes/{id}` - Delete a route
- `GET /api/routes/{id}/gpx` - Export route as GPX
- `GET /api/routes/routing/calculate` - Calculate routing between waypoints

## Development

### Running Without Docker

#### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

Serve the frontend folder with any static file server:

```bash
cd frontend
python -m http.server 8080
```

### Database

The SQLite database is stored in `data/routes.db`. The database is automatically created when the backend starts.

To reset the database, simply delete the `data/routes.db` file.

## Configuration

### Changing the Default Map Location

Edit `frontend/static/js/map.js` and modify the `setView` coordinates:

```javascript
this.map = L.map('map').setView([YOUR_LAT, YOUR_LNG], ZOOM_LEVEL);
```

### Changing OSRM Region

To switch to a different geographic region for routing:

```bash
./setup-osrm.sh
```

The script will detect existing data and ask if you want to replace it. Choose 'y' to download and set up a new region.

You can also manually browse [Geofabrik Downloads](https://download.geofabrik.de/) to find specific cities, states, or countries, then select option 14 (Custom URL) in the setup script.

### Changing Ports

Edit `docker-compose.yml` and modify the port mappings:

```yaml
ports:
  - "YOUR_PORT:80"  # Frontend
  - "YOUR_PORT:8000"  # Backend
```

## Troubleshooting

### OSRM Connection Errors

If you see routing errors, ensure:
1. OSRM data is properly set up (`./setup-osrm.sh`)
2. The OSRM container is running (`docker ps | grep osrm`)
3. OSRM is accessible at `http://localhost:5000`

### Database Errors

If you encounter database errors:
```bash
rm -rf data/
docker-compose restart backend
```

### Frontend Not Loading

Check nginx logs:
```bash
docker logs gps-planner-frontend
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [Leaflet.js](https://leafletjs.com/) for the mapping library
- [OSRM](http://project-osrm.org/) for routing
- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
