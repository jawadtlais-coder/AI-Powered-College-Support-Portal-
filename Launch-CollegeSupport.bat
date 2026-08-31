@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo =====================================================
echo College Support Portal - One-Click Launcher
echo =====================================================
echo.

set "PS_CMD=powershell -NoProfile -ExecutionPolicy Bypass"

set "DOCKER_EXE=docker"
where docker >nul 2>&1
if errorlevel 1 (
  set "DOCKER_EXE="
  if exist "%ProgramFiles%\Docker\Docker\resources\bin\docker.exe" (
    set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\resources\bin\docker.exe"
  ) else if exist "%ProgramFiles(x86)%\Docker\Docker\resources\bin\docker.exe" (
    set "DOCKER_EXE=%ProgramFiles(x86)%\Docker\Docker\resources\bin\docker.exe"
  ) else if exist "%LocalAppData%\Docker\resources\bin\docker.exe" (
    set "DOCKER_EXE=%LocalAppData%\Docker\resources\bin\docker.exe"
  )
)

if not defined DOCKER_EXE (
  echo Docker CLI was not found.
  echo.
  echo Trying local Node.js launch instead...
  echo.
  goto :local_launch
)

echo [1/5] Checking Docker daemon...
"%DOCKER_EXE%" info >nul 2>&1
if errorlevel 1 (
  echo Docker is not ready yet. Trying to start Docker Desktop...
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  ) else (
    echo [ERROR] Could not find Docker Desktop executable.
    echo Start Docker manually, wait until it says Running, then run this file again.
    goto :end_fail
  )
)

echo [2/5] Waiting for Docker to be ready...
set /a docker_wait=0
:wait_docker
"%DOCKER_EXE%" info >nul 2>&1
if not errorlevel 1 goto docker_ready
set /a docker_wait+=1
if !docker_wait! geq 120 (
  echo [ERROR] Docker is still not ready after 4 minutes.
  echo Open Docker Desktop and wait for "Engine running", then run this launcher again.
  goto :end_fail
)
timeout /t 2 /nobreak >nul
goto wait_docker

:docker_ready
echo Docker is ready.
echo Using Docker CLI: "%DOCKER_EXE%"

if not exist ".env" (
  if exist ".env.example" (
    echo [3/5] Creating .env from .env.example...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo [3/5] Skipping .env creation - .env.example not found.
  )
) else (
  echo [3/5] .env already exists.
)

echo [4/5] Building and starting containers (first time can take a few minutes)...
"%DOCKER_EXE%" compose up -d --build
if errorlevel 1 (
  echo [ERROR] Docker compose build/start failed.
  echo Run this to inspect logs:
  echo    "%DOCKER_EXE%" compose logs --tail 200
  goto :end_fail
)

echo [5/5] Waiting for API health...
set /a api_wait=0
:wait_api
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost/api/health -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto api_ready
set /a api_wait+=1
if !api_wait! geq 90 (
  echo API is taking longer than expected.
  echo You can check logs with: "%DOCKER_EXE%" compose logs -f api
  goto open_browser
)
timeout /t 2 /nobreak >nul
goto wait_api

:api_ready
echo API is healthy.

:open_browser
start "" "http://localhost"

echo.
echo App URL: http://localhost
echo API URL: http://localhost/api/health
echo.
echo To stop everything later:
echo    "%DOCKER_EXE%" compose down
echo.
goto :end_ok

:local_launch
echo =====================================================
echo Local Node.js Launcher
echo =====================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 22 or newer, then run this file again:
  echo https://nodejs.org/
  goto :end_fail
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found.
  echo Reinstall Node.js with npm enabled, then run this file again.
  goto :end_fail
)

where npx.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npx.cmd was not found.
  echo Reinstall Node.js with npm enabled, then run this file again.
  goto :end_fail
)

if not exist "api\.env" (
  if exist "api\.env.example" (
    echo [1/8] Creating api\.env from api\.env.example...
    copy /Y "api\.env.example" "api\.env" >nul
  ) else (
    echo [ERROR] api\.env.example was not found.
    goto :end_fail
  )
) else (
  echo [1/8] api\.env already exists.
)

if not exist "web\.env.local" (
  echo [2/8] Creating web\.env.local...
  >"web\.env.local" echo NEXT_PUBLIC_API_URL=http://localhost:4000/api
) else (
  echo [2/8] web\.env.local already exists.
)

echo [3/8] Checking PostgreSQL on localhost:5432...
call :check_postgres
if errorlevel 1 (
  if exist "scripts\start-postgres-portable.ps1" (
    echo PostgreSQL is not reachable. Trying bundled portable PostgreSQL...
    %PS_CMD% -File "scripts\start-postgres-portable.ps1"
  )
)

call :check_postgres
if errorlevel 1 (
  echo [ERROR] PostgreSQL is not running on localhost:5432.
  echo.
  echo To use this local launcher, start PostgreSQL with a database named college_support,
  echo or install Docker Desktop and run this file again for the recommended setup.
  echo.
  echo Expected API connection string:
  echo    postgresql://postgres:postgres@localhost:5432/college_support?schema=public
  goto :end_fail
)
echo PostgreSQL is reachable.

set "API_RUNNING="
set "WEB_RUNNING="
call :check_url "http://localhost:4000/api/health"
if not errorlevel 1 set "API_RUNNING=1"
call :check_port 3000
if not errorlevel 1 set "WEB_RUNNING=1"

echo [4/8] Installing API dependencies if needed...
if not exist "api\node_modules" (
  pushd "api"
  call npm.cmd install
  if errorlevel 1 (
    popd
    echo [ERROR] API dependency install failed.
    goto :end_fail
  )
  popd
) else (
  echo API dependencies already installed.
)

echo [5/8] Preparing API database...
if defined API_RUNNING (
  echo API is already running. Skipping Prisma generation and database seed.
) else (
  pushd "api"
  call npm.cmd run prisma:generate
  if errorlevel 1 (
    popd
    echo [ERROR] Prisma client generation failed.
    goto :end_fail
  )
  call npx.cmd prisma db push
  if errorlevel 1 (
    popd
    echo [ERROR] Prisma database push failed.
    goto :end_fail
  )
  call npm.cmd run seed
  if errorlevel 1 (
    popd
    echo [ERROR] Database seed failed.
    goto :end_fail
  )
  popd
)

echo [6/8] Installing web dependencies if needed...
if not exist "web\node_modules" (
  pushd "web"
  call npm.cmd install
  if errorlevel 1 (
    popd
    echo [ERROR] Web dependency install failed.
    goto :end_fail
  )
  popd
) else (
  echo Web dependencies already installed.
)

echo [7/8] Starting API and web dev servers...
set "API_DIR=%CD%\api"
set "WEB_DIR=%CD%\web"

if defined API_RUNNING (
  echo API is already running.
) else (
  call :start_window "College Support API" "%API_DIR%" "call npm.cmd run start:dev"
)

if defined WEB_RUNNING (
  echo Web app is already running.
) else (
  call :start_window "College Support Web" "%WEB_DIR%" "call npm.cmd run dev"
)

echo [8/8] Waiting for local API health...
set /a local_api_wait=0
:wait_local_api
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto local_api_ready
set /a local_api_wait+=1
if !local_api_wait! geq 60 (
  echo API is taking longer than expected.
  echo Check the "College Support API" window for logs.
  goto open_local_browser
)
timeout /t 2 /nobreak >nul
goto wait_local_api

:local_api_ready
echo Local API is healthy.
echo Waiting for local web app...
set /a local_web_wait=0
:wait_local_web
call :check_port 3000
if not errorlevel 1 goto local_web_ready
set /a local_web_wait+=1
if !local_web_wait! geq 60 (
  echo Web app is taking longer than expected.
  echo Check the "College Support Web" window for logs.
  goto open_local_browser
)
timeout /t 2 /nobreak >nul
goto wait_local_web

:local_web_ready
echo Local web app is ready.

:open_local_browser
start "" "http://localhost:3000"

echo.
echo App URL: http://localhost:3000
echo API URL: http://localhost:4000/api/health
echo.
echo To stop everything later, close the "College Support API" and "College Support Web" windows.
echo.
goto :end_ok

:check_postgres
%PS_CMD% -Command "$client = New-Object Net.Sockets.TcpClient; try { $async = $client.BeginConnect('localhost', 5432, $null, $null); if (-not $async.AsyncWaitHandle.WaitOne(1000, $false)) { exit 1 }; $client.EndConnect($async); exit 0 } catch { exit 1 } finally { $client.Close() }" >nul 2>&1
exit /b %ERRORLEVEL%

:check_url
%PS_CMD% -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%~1' -TimeoutSec 5; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
exit /b %ERRORLEVEL%

:check_port
%PS_CMD% -Command "$client = New-Object Net.Sockets.TcpClient; try { $async = $client.BeginConnect('localhost', %~1, $null, $null); if (-not $async.AsyncWaitHandle.WaitOne(1000, $false)) { exit 1 }; $client.EndConnect($async); exit 0 } catch { exit 1 } finally { $client.Close() }" >nul 2>&1
exit /b %ERRORLEVEL%

:start_window
set "WINDOW_TITLE=%~1"
set "WINDOW_DIR=%~2"
set "WINDOW_CMD=%~3"
set "WINDOW_BOOTSTRAP=%TEMP%\college-support-%RANDOM%-%RANDOM%.cmd"
>"%WINDOW_BOOTSTRAP%" echo @echo off
>>"%WINDOW_BOOTSTRAP%" echo cd /d "%WINDOW_DIR%"
>>"%WINDOW_BOOTSTRAP%" echo %WINDOW_CMD%
%PS_CMD% -Command "Start-Process -FilePath $env:ComSpec -ArgumentList '/d','/k',('call ""' + $env:WINDOW_BOOTSTRAP + '""') -WorkingDirectory $env:WINDOW_DIR"
set "WINDOW_BOOTSTRAP="
set "WINDOW_DIR="
set "WINDOW_CMD="
set "WINDOW_TITLE="
exit /b 0

:end_fail
echo.
pause
exit /b 1

:end_ok
exit /b 0
