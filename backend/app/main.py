from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import routes
import os

os.makedirs("./data", exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GPS Route Planner API",
    description="API for creating and managing GPS routes",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)


@app.get("/")
def read_root():
    return {"message": "GPS Route Planner API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
