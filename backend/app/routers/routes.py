from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import httpx
from datetime import datetime
from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("", response_model=List[schemas.RouteResponse])
def list_routes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    routes = crud.get_routes(db, skip=skip, limit=limit)
    return routes


@router.get("/{route_id}", response_model=schemas.RouteResponse)
def get_route(route_id: int, db: Session = Depends(get_db)):
    route = crud.get_route(db, route_id=route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.post("", response_model=schemas.RouteResponse, status_code=201)
def create_route(route: schemas.RouteCreate, db: Session = Depends(get_db)):
    return crud.create_route(db=db, route=route)


@router.put("/{route_id}", response_model=schemas.RouteResponse)
def update_route(route_id: int, route: schemas.RouteUpdate, db: Session = Depends(get_db)):
    updated_route = crud.update_route(db=db, route_id=route_id, route=route)
    if updated_route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    return updated_route


@router.delete("/{route_id}")
def delete_route(route_id: int, db: Session = Depends(get_db)):
    success = crud.delete_route(db=db, route_id=route_id)
    if not success:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted successfully"}


@router.get("/{route_id}/gpx")
def export_gpx(route_id: int, type: str = "track", db: Session = Depends(get_db)):
    route = crud.get_route(db, route_id=route_id)
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")

    gpx_content = generate_gpx(route, type)

    return Response(
        content=gpx_content,
        media_type="application/gpx+xml",
        headers={
            "Content-Disposition": f"attachment; filename={route.name.replace(' ', '_')}.gpx"
        }
    )


def generate_gpx(route, gpx_type: str = "track") -> str:
    timestamp = datetime.utcnow().isoformat() + "Z"

    gpx_header = '''<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPS Route Planner"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>{name}</name>
    <desc>{desc}</desc>
    <time>{time}</time>
  </metadata>
'''.format(
        name=route.name,
        desc=route.description or "",
        time=timestamp
    )

    waypoints = sorted(route.waypoints, key=lambda x: x['order'])

    if gpx_type == "route":
        gpx_body = '  <rte>\n    <name>{}</name>\n'.format(route.name)
        for wp in waypoints:
            gpx_body += '    <rtept lat="{}" lon="{}">\n    </rtept>\n'.format(wp['lat'], wp['lng'])
        gpx_body += '  </rte>\n'
    else:
        gpx_body = '  <trk>\n    <name>{}</name>\n    <trkseg>\n'.format(route.name)
        for wp in waypoints:
            gpx_body += '      <trkpt lat="{}" lon="{}">\n      </trkpt>\n'.format(wp['lat'], wp['lng'])
        gpx_body += '    </trkseg>\n  </trk>\n'

    gpx_footer = '</gpx>'

    return gpx_header + gpx_body + gpx_footer


@router.get("/routing/calculate")
async def calculate_routing(waypoints: str, profile: str = "foot"):
    try:
        # Validate profile (security)
        allowed_profiles = ["foot", "driving", "cycling"]
        if profile not in allowed_profiles:
            profile = "foot"

        # Use internal Docker network port (5000), not the external mapped port (5005)
        osrm_url = f"http://osrm:5000/route/v1/{profile}/{waypoints}"

        # Improved parameters for better routing accuracy
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "false",  # Only return best route
            "steps": "false",         # We don't need turn-by-turn steps
            "annotations": "false",   # We don't need detailed annotations
            "continue_straight": "false"  # Allow routes to turn around
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(osrm_url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"OSRM routing error: {str(e)}")
