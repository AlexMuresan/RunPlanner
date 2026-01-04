from sqlalchemy.orm import Session
from . import models, schemas
from typing import List


def get_route(db: Session, route_id: int):
    return db.query(models.Route).filter(models.Route.id == route_id).first()


def get_routes(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Route).offset(skip).limit(limit).all()


def create_route(db: Session, route: schemas.RouteCreate):
    waypoints_data = [wp.model_dump() for wp in route.waypoints]
    db_route = models.Route(
        name=route.name,
        description=route.description,
        waypoints=waypoints_data,
        routing_mode=route.routing_mode
    )
    db.add(db_route)
    db.commit()
    db.refresh(db_route)
    return db_route


def update_route(db: Session, route_id: int, route: schemas.RouteUpdate):
    db_route = get_route(db, route_id)
    if db_route:
        waypoints_data = [wp.model_dump() for wp in route.waypoints]
        db_route.name = route.name
        db_route.description = route.description
        db_route.waypoints = waypoints_data
        db_route.routing_mode = route.routing_mode
        db.commit()
        db.refresh(db_route)
    return db_route


def delete_route(db: Session, route_id: int):
    db_route = get_route(db, route_id)
    if db_route:
        db.delete(db_route)
        db.commit()
        return True
    return False
