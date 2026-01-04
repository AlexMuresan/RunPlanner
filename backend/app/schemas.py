from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Waypoint(BaseModel):
    lat: float
    lng: float
    order: int


class RouteBase(BaseModel):
    name: str
    description: Optional[str] = None
    waypoints: List[Waypoint]
    routing_mode: str = "manual"


class RouteCreate(RouteBase):
    pass


class RouteUpdate(RouteBase):
    pass


class RouteResponse(RouteBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
