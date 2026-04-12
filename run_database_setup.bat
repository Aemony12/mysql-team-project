@echo off
echo =========================================
echo   Museum DB - Run New SQL Files
echo =========================================
echo.
echo This runs files 007, 008, 009 only.
echo (001-006 should already be set up)
echo.
 
echo Where do you want to connect?
echo   [1] Local
echo   [2] Hosted
echo.
set /p CHOICE=Enter 1 or 2: 
 
if "%CHOICE%"=="1" goto local
if "%CHOICE%"=="2" goto hosted
 
echo.
echo ERROR: Invalid choice. Please enter 1 or 2.
pause
exit /b 1
 
:local
set /p MYSQL_HOST=Enter MySQL host: 
if "%MYSQL_HOST%"=="" (
    echo ERROR: Host cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PORT=Enter MySQL port: 
if "%MYSQL_PORT%"=="" (
    echo ERROR: Port cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_USER=Enter MySQL username: 
if "%MYSQL_USER%"=="" (
    echo ERROR: Username cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PASS=Enter MySQL password: 
set /p MYSQL_DB=Enter database name: 
if "%MYSQL_DB%"=="" (
    echo ERROR: Database name cannot be empty.
    pause
    exit /b 1
)
set SSL_FLAG=
goto run
 
:hosted
set /p MYSQL_HOST=Enter MySQL host: 
if "%MYSQL_HOST%"=="" (
    echo ERROR: Host cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PORT=Enter MySQL port: 
if "%MYSQL_PORT%"=="" (
    echo ERROR: Port cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_USER=Enter MySQL username: 
if "%MYSQL_USER%"=="" (
    echo ERROR: Username cannot be empty.
    pause
    exit /b 1
)
set /p MYSQL_PASS=Enter MySQL password: 
set /p MYSQL_DB=Enter database name: 
if "%MYSQL_DB%"=="" (
    echo ERROR: Database name cannot be empty.
    pause
    exit /b 1
)
echo.
echo Require SSL?
echo   [1] Yes
echo   [2] No
echo.
set /p SSL_CHOICE=Enter 1 or 2: 
if "%SSL_CHOICE%"=="1" set SSL_FLAG=--ssl-mode=REQUIRED
if "%SSL_CHOICE%"=="2" set SSL_FLAG=
if not "%SSL_CHOICE%"=="1" if not "%SSL_CHOICE%"=="2" (
    echo ERROR: Invalid choice. Please enter 1 or 2.
    pause
    exit /b 1
)
goto run
 
:run
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
 
if not exist %MYSQL% (
    echo.
    echo ERROR: mysql.exe not found at %MYSQL%
    echo Please update the MYSQL path in this script to match your installation.
    pause
    exit /b 1
)
 
echo.
echo Connecting to: %MYSQL_HOST%:%MYSQL_PORT% as %MYSQL_USER% on database %MYSQL_DB%
echo.
 
if not exist sqlFiles\007_new_tables.sql (
    echo ERROR: sqlFiles\007_new_tables.sql not found.
    echo Make sure you are running this script from the mysql-team-project-main folder.
    pause
    exit /b 1
)
 
echo [1/3] 007_new_tables.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\007_new_tables.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [2/3] 008_triggers.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\008_triggers.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo [3/3] 009_reports.sql
%MYSQL% -h %MYSQL_HOST% -P %MYSQL_PORT% -u %MYSQL_USER% -p%MYSQL_PASS% %SSL_FLAG% %MYSQL_DB% < sqlFiles\009_reports.sql
if %ERRORLEVEL% NEQ 0 goto error
 
echo.
echo =========================================
echo   Done! New tables and triggers loaded.
echo =========================================
pause
exit /b 0
 
:error
echo.
echo =========================================
echo   ERROR: Something went wrong (see above)
echo =========================================
pause
exit /b 1
