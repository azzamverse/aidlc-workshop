@echo off
rem Start the live workshop dashboard and open it in a browser window (Windows).
rem Usage: tools\dashboard.cmd [workspace] [--port 8787]   or double-click it.
setlocal
set "SERVER=%~dp0dashboard\server.py"
set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (where python >nul 2>nul && set "PY=python")
if not defined PY (
  echo Python 3 is needed: install it from https://www.python.org/downloads/ and run this again.
  pause
  exit /b 1
)
echo Leave this window open while the dashboard is in use. Press Ctrl+C here to stop it.
%PY% -I "%SERVER%" %* --open
if errorlevel 1 pause
