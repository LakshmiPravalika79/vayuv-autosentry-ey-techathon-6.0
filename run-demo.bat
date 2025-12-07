@echo off
REM AutoSentry AI - Windows Demo Runner
REM =====================================

echo.
echo  ___         _        ___            _              ___  ___ 
echo / _ \       ^| ^|      / __\          ^| ^|            / _ \/   \
echo / /_\ \ _   ^| ^|_ ___^| ^|_   ___ _ __^| ^|_ _ __ _   / /_\/ /\ /
echo ^|  _  ^| ^| ^| ^| __/ _ \ __^| / _ \ '__^| __^| '__^| ^| ^| ^| /(__ / /\_/
echo ^| ^| ^| ^| ^|_^| ^| ^|^|  __/ ^|_ ^|  __/ ^|  ^| ^|_^| ^|  ^| ^|_^| ^| \/ ^|__/ /
echo \_^| ^|_/\__,_^|\__\___^|\__^|\___ ^|_^|   \__^|_^|   \__, ^| \____/
echo                                               __/ ^|
echo                                              ^|___/
echo.
echo ===== EY Techathon 6.0 - Problem Statement #3 =====
echo.

:menu
echo Select an option:
echo [1] Start all services (Docker Compose)
echo [2] Stop all services
echo [3] View service logs
echo [4] Check service health
echo [5] Open application in browser
echo [6] Run database migrations
echo [7] Seed demo data
echo [8] Clean up (remove volumes)
echo [9] Exit
echo.

set /p choice="Enter choice [1-9]: "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto logs
if "%choice%"=="4" goto health
if "%choice%"=="5" goto browser
if "%choice%"=="6" goto migrate
if "%choice%"=="7" goto seed
if "%choice%"=="8" goto cleanup
if "%choice%"=="9" goto end
goto menu

:start
echo.
echo Starting AutoSentry AI services...
docker-compose up -d
echo.
echo Waiting for services to be ready...
timeout /t 10 /nobreak
echo.
echo Services started! Access the application at http://localhost
echo.
goto menu

:stop
echo.
echo Stopping AutoSentry AI services...
docker-compose down
echo.
echo Services stopped.
echo.
goto menu

:logs
echo.
echo Select service to view logs:
echo [1] All services
echo [2] Backend
echo [3] Frontend
echo [4] ML Service
echo [5] UEBA Service
echo [6] Agents
echo [7] PostgreSQL
echo [8] Redis
echo.
set /p logchoice="Enter choice [1-8]: "

if "%logchoice%"=="1" docker-compose logs -f
if "%logchoice%"=="2" docker-compose logs -f backend
if "%logchoice%"=="3" docker-compose logs -f frontend
if "%logchoice%"=="4" docker-compose logs -f ml-service
if "%logchoice%"=="5" docker-compose logs -f ueba-service
if "%logchoice%"=="6" docker-compose logs -f agents
if "%logchoice%"=="7" docker-compose logs -f postgres
if "%logchoice%"=="8" docker-compose logs -f redis
goto menu

:health
echo.
echo Checking service health...
echo.
docker-compose ps
echo.
echo Checking individual endpoints...
echo.
curl -s http://localhost:3000/health && echo Backend: OK || echo Backend: FAILED
curl -s http://localhost:8000/health && echo ML Service: OK || echo ML Service: FAILED
curl -s http://localhost:8001/health && echo UEBA Service: OK || echo UEBA Service: FAILED
curl -s http://localhost/health && echo Frontend: OK || echo Frontend: FAILED
echo.
goto menu

:browser
echo.
echo Opening application in default browser...
start http://localhost
echo.
goto menu

:migrate
echo.
echo Running database migrations...
docker-compose exec backend npx prisma db push
echo.
echo Migrations complete.
echo.
goto menu

:seed
echo.
echo Seeding demo data...
docker-compose exec backend npx prisma db seed
echo.
echo Demo data seeded.
echo.
goto menu

:cleanup
echo.
echo WARNING: This will remove all data volumes!
set /p confirm="Are you sure? (y/n): "
if "%confirm%"=="y" (
    docker-compose down -v
    echo Cleanup complete.
) else (
    echo Cleanup cancelled.
)
echo.
goto menu

:end
echo.
echo Thank you for using AutoSentry AI!
echo.
exit /b 0
