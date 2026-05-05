# AXIOM — Setup Script (PowerShell)
# Run from C:\PROJECT\axiom\

Write-Host "=== AXIOM Setup ===" -ForegroundColor Yellow

# Backend
Write-Host "`n[1/4] Setting up Python backend..." -ForegroundColor Cyan
Set-Location backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
Copy-Item .env.example .env
Write-Host "   > Backend installed. Edit backend/.env with your API keys." -ForegroundColor Green

# Frontend
Write-Host "`n[2/4] Setting up Next.js frontend..." -ForegroundColor Cyan
Set-Location ..\frontend
npm install
Copy-Item .env.local.example .env.local
Write-Host "   > Frontend installed. Edit frontend/.env.local with your Supabase keys." -ForegroundColor Green

# Done
Set-Location ..
Write-Host "`n[3/4] Run Supabase migrations:" -ForegroundColor Cyan
Write-Host "   > Copy backend/db/migrations/001_initial.sql into your Supabase SQL editor and run it." -ForegroundColor White

Write-Host "`n[4/4] Start AXIOM:" -ForegroundColor Cyan
Write-Host "   Backend:  cd backend && .\venv\Scripts\Activate.ps1 && uvicorn api.main:app --reload --port 8000" -ForegroundColor White
Write-Host "   Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "   Docker:   docker-compose up --build" -ForegroundColor White

Write-Host "`n=== AXIOM Ready ===" -ForegroundColor Yellow
