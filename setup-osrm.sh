#!/bin/bash

echo "============================================="
echo "  GPS Route Planner - OSRM Setup"
echo "============================================="
echo ""

# Cleanup function for failed operations
cleanup_on_error() {
    echo ""
    echo "ERROR: Setup failed during processing!"
    echo "Cleaning up partial OSRM files (keeping .osm.pbf for debugging)..."
    rm -f map.osrm* region.info
    echo ""
    echo "The map.osm.pbf file has been kept for debugging."
    echo "If you want to try a different region, manually delete it first:"
    echo "  rm osrm-data/map.osm.pbf"
    echo ""
    echo "Please run the script again to retry."
    exit 1
}

# Save region metadata
save_region_info() {
    local region_name=$1
    local url=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    cat > region.info <<EOF
Region: $region_name
URL: $url
Downloaded: $timestamp
EOF
}

# Show current region info
show_region_info() {
    if [ -f "region.info" ]; then
        echo "Current OSRM region installed:"
        echo "---------------------------------------------"
        cat region.info
        echo "---------------------------------------------"
        echo ""
    fi
}

# Function to download and process OSM data
setup_osrm_data() {
    local url=$1
    local region_name=$2

    # Set up error trap
    trap cleanup_on_error ERR

    if [ -f "map.osm.pbf" ]; then
        echo ""
        echo "Found existing map.osm.pbf file."
        read -p "Reuse it? (Y/n): " reuse
        if [[ ! $reuse =~ ^[Nn]$ ]]; then
            echo "Reusing existing map.osm.pbf..."
        else
            echo "Downloading OSM data for $region_name..."
            echo "URL: $url"
            echo ""
            if ! wget -O map.osm.pbf "$url"; then
                echo "ERROR: Download failed!"
                cleanup_on_error
            fi
        fi
    else
        echo ""
        echo "Downloading OSM data for $region_name..."
        echo "URL: $url"
        echo ""
        if ! wget -O map.osm.pbf "$url"; then
            echo "ERROR: Download failed!"
            cleanup_on_error
        fi
    fi

    echo ""
    echo "Extracting routing data with FOOT profile (for running/walking on paths and trails)..."
    echo "Running: osrm-extract -p /opt/foot.lua /data/map.osm.pbf"
    if ! docker run --platform linux/amd64 -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/foot.lua /data/map.osm.pbf; then
        echo ""
        echo "ERROR: Extraction with foot profile failed!"
        echo "This can happen with very large regions. Try:"
        echo "  1. A smaller region (city or state instead of country)"
        echo "  2. Increase Docker memory limits"
        echo ""
        echo "Falling back to car profile for now..."
        if ! docker run --platform linux/amd64 -t -v "${PWD}:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf; then
            echo "ERROR: Car profile extraction also failed!"
            cleanup_on_error
        fi
        echo "WARNING: Using car profile - won't follow pedestrian paths optimally"
    fi

    echo ""
    echo "Partitioning data..."
    if ! docker run --platform linux/amd64 -t -v "${PWD}:/data" osrm/osrm-backend osrm-partition /data/map.osrm; then
        echo "ERROR: Partitioning failed!"
        cleanup_on_error
    fi

    echo ""
    echo "Customizing data..."
    if ! docker run --platform linux/amd64 -t -v "${PWD}:/data" osrm/osrm-backend osrm-customize /data/map.osrm; then
        echo "ERROR: Customization failed!"
        cleanup_on_error
    fi

    # Save region metadata
    save_region_info "$region_name" "$url"

    # Remove trap
    trap - ERR

    echo ""
    echo "✓ OSRM data setup complete for: $region_name"
}

mkdir -p osrm-data
cd osrm-data

# Show current region if exists
show_region_info

if [ -f "map.osrm" ]; then
    echo "OSRM data already exists!"
    echo ""
    read -p "Do you want to replace it with a different region? (y/N): " replace
    if [[ ! $replace =~ ^[Yy]$ ]]; then
        echo "Keeping existing data. Exiting."
        cd ..
        exit 0
    fi
    echo ""
    echo "Cleaning up old data..."
    rm -f map.* region.info
fi

echo "Select your region for routing data:"
echo ""
echo "Popular regions:"
echo "  1) California, USA (Northern - ~200MB)"
echo "  2) California, USA (Southern - ~150MB)"
echo "  3) New York, USA (~100MB)"
echo "  4) Texas, USA (~200MB)"
echo "  5) United Kingdom (~1GB)"
echo "  6) Germany (~3GB)"
echo "  7) France (~3.5GB)"
echo "  8) Italy (~2GB)"
echo "  9) Spain (~1.5GB)"
echo " 10) Netherlands (~400MB)"
echo " 11) Belgium (~300MB)"
echo " 12) Switzerland (~200MB)"
echo " 13) Austria (~300MB)"
echo " 14) Custom URL (enter your own Geofabrik URL)"
echo ""
read -p "Enter your choice (1-14): " choice

case $choice in
    1)
        setup_osrm_data "https://download.geofabrik.de/north-america/us/california/norcal-latest.osm.pbf" "Northern California"
        ;;
    2)
        setup_osrm_data "https://download.geofabrik.de/north-america/us/california/socal-latest.osm.pbf" "Southern California"
        ;;
    3)
        setup_osrm_data "https://download.geofabrik.de/north-america/us/new-york-latest.osm.pbf" "New York"
        ;;
    4)
        setup_osrm_data "https://download.geofabrik.de/north-america/us/texas-latest.osm.pbf" "Texas"
        ;;
    5)
        setup_osrm_data "https://download.geofabrik.de/europe/great-britain-latest.osm.pbf" "United Kingdom"
        ;;
    6)
        setup_osrm_data "https://download.geofabrik.de/europe/germany-latest.osm.pbf" "Germany"
        ;;
    7)
        setup_osrm_data "https://download.geofabrik.de/europe/france-latest.osm.pbf" "France"
        ;;
    8)
        setup_osrm_data "https://download.geofabrik.de/europe/italy-latest.osm.pbf" "Italy"
        ;;
    9)
        setup_osrm_data "https://download.geofabrik.de/europe/spain-latest.osm.pbf" "Spain"
        ;;
    10)
        setup_osrm_data "https://download.geofabrik.de/europe/netherlands-latest.osm.pbf" "Netherlands"
        ;;
    11)
        setup_osrm_data "https://download.geofabrik.de/europe/belgium-latest.osm.pbf" "Belgium"
        ;;
    12)
        setup_osrm_data "https://download.geofabrik.de/europe/switzerland-latest.osm.pbf" "Switzerland"
        ;;
    13)
        setup_osrm_data "https://download.geofabrik.de/europe/austria-latest.osm.pbf" "Austria"
        ;;
    14)
        echo ""
        echo "Find your region at: https://download.geofabrik.de/"
        echo "Navigate to your region and copy the URL of the .osm.pbf file"
        echo ""
        read -p "Enter the full URL to the .osm.pbf file: " custom_url
        read -p "Enter a name for this region: " custom_name
        setup_osrm_data "$custom_url" "$custom_name"
        ;;
    *)
        echo "Invalid choice. Exiting."
        cd ..
        exit 1
        ;;
esac

cd ..

echo ""
echo "============================================="
echo "Setup complete! You can now run:"
echo "  docker-compose up --build"
echo "============================================="
