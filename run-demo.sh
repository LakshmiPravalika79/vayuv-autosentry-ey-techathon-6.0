#!/bin/bash
# AutoSentry AI - Demo Runner Script
# =====================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ASCII Art
print_banner() {
    echo -e "${BLUE}"
    echo "  ___         _        ___            _              ___  ___ "
    echo " / _ \       | |      / __\          | |            / _ \/   \\"
    echo "/ /_\ \ _   _| |_ ___| |_   ___ _ __ | |_ _ __ _   / /_\/ /\ /"
    echo "|  _  | | | | __/ _ \ __| / _ \ '__| | __| '__| | | | /(__ / /\_/"
    echo "| | | | |_| | ||  __/ |_ |  __/ |    | |_| |  | |_| | \/ |__/ /"
    echo "\_| |_/\__,_|\__\___|\__| \___|_|     \__|_|   \__, | \____/"
    echo "                                               __/ |"
    echo "                                              |___/"
    echo -e "${NC}"
    echo "===== EY Techathon 6.0 - Problem Statement #3 ====="
    echo ""
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
}

# Start all services
start_services() {
    echo -e "${YELLOW}Starting AutoSentry AI services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}Services starting...${NC}"
    
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 10
    
    # Check health
    check_health
    
    echo ""
    echo -e "${GREEN}AutoSentry AI is ready!${NC}"
    echo -e "Access the application at: ${BLUE}http://localhost${NC}"
    echo ""
}

# Stop all services
stop_services() {
    echo -e "${YELLOW}Stopping AutoSentry AI services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped.${NC}"
}

# View logs
view_logs() {
    echo "Select service to view logs:"
    echo "[1] All services"
    echo "[2] Backend"
    echo "[3] Frontend"
    echo "[4] ML Service"
    echo "[5] UEBA Service"
    echo "[6] Agents"
    echo "[7] PostgreSQL"
    echo "[8] Redis"
    echo ""
    read -p "Enter choice [1-8]: " log_choice
    
    case $log_choice in
        1) docker-compose logs -f ;;
        2) docker-compose logs -f backend ;;
        3) docker-compose logs -f frontend ;;
        4) docker-compose logs -f ml-service ;;
        5) docker-compose logs -f ueba-service ;;
        6) docker-compose logs -f agents ;;
        7) docker-compose logs -f postgres ;;
        8) docker-compose logs -f redis ;;
        *) echo "Invalid choice" ;;
    esac
}

# Check health of services
check_health() {
    echo ""
    echo -e "${YELLOW}Checking service health...${NC}"
    echo ""
    docker-compose ps
    echo ""
    
    # Check individual endpoints
    echo "Checking endpoints..."
    
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "Backend:     ${GREEN}✓ OK${NC}"
    else
        echo -e "Backend:     ${RED}✗ FAILED${NC}"
    fi
    
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "ML Service:  ${GREEN}✓ OK${NC}"
    else
        echo -e "ML Service:  ${RED}✗ FAILED${NC}"
    fi
    
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "UEBA Service:${GREEN}✓ OK${NC}"
    else
        echo -e "UEBA Service:${RED}✗ FAILED${NC}"
    fi
    
    if curl -s http://localhost/health > /dev/null 2>&1; then
        echo -e "Frontend:    ${GREEN}✓ OK${NC}"
    else
        echo -e "Frontend:    ${RED}✗ FAILED${NC}"
    fi
    
    echo ""
}

# Open in browser
open_browser() {
    echo -e "${YELLOW}Opening application in browser...${NC}"
    
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost
    elif command -v open > /dev/null; then
        open http://localhost
    else
        echo "Please open http://localhost in your browser"
    fi
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    docker-compose exec backend npx prisma db push
    echo -e "${GREEN}Migrations complete.${NC}"
}

# Seed demo data
seed_data() {
    echo -e "${YELLOW}Seeding demo data...${NC}"
    docker-compose exec backend npx prisma db seed
    echo -e "${GREEN}Demo data seeded.${NC}"
}

# Cleanup
cleanup() {
    echo -e "${RED}WARNING: This will remove all data volumes!${NC}"
    read -p "Are you sure? (y/n): " confirm
    
    if [ "$confirm" = "y" ]; then
        docker-compose down -v
        echo -e "${GREEN}Cleanup complete.${NC}"
    else
        echo "Cleanup cancelled."
    fi
}

# Build images
build_images() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    docker-compose build
    echo -e "${GREEN}Build complete.${NC}"
}

# Show menu
show_menu() {
    echo "Select an option:"
    echo "[1] Start all services"
    echo "[2] Stop all services"
    echo "[3] View service logs"
    echo "[4] Check service health"
    echo "[5] Open application in browser"
    echo "[6] Run database migrations"
    echo "[7] Seed demo data"
    echo "[8] Build Docker images"
    echo "[9] Clean up (remove volumes)"
    echo "[0] Exit"
    echo ""
}

# Main loop
main() {
    print_banner
    check_docker
    
    while true; do
        show_menu
        read -p "Enter choice [0-9]: " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) view_logs ;;
            4) check_health ;;
            5) open_browser ;;
            6) run_migrations ;;
            7) seed_data ;;
            8) build_images ;;
            9) cleanup ;;
            0) 
                echo ""
                echo -e "${GREEN}Thank you for using AutoSentry AI!${NC}"
                echo ""
                exit 0
                ;;
            *) echo -e "${RED}Invalid choice${NC}" ;;
        esac
        
        echo ""
    done
}

# Run main function
main
