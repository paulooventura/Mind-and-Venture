@echo off
cd /d "%~dp0"
echo.
echo  Mind ^& Venture — local server
echo  Open: http://127.0.0.1:8765/?debug=1
echo  (Do NOT open index.html as file:// — use this bat file.)
echo.
start "" "http://127.0.0.1:8765/?debug=1"
npx --yes serve -p 8765 -l 8765
