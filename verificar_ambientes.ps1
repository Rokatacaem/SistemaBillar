$backendPort = 3000
$frontendPort = 5173

Write-Host "🔍 Verificando ambientes del sistema de billar..."
Write-Host "-----------------------------------------------"

# Verificar Backend
if (Test-NetConnection -ComputerName localhost -Port $backendPort).TcpTestSucceeded {
    Write-Host "✅ Backend activo en puerto $backendPort"
} else {
    Write-Host "❌ Backend no activo. Iniciando..."
    Start-Process "powershell" -ArgumentList "cd backend; npm run dev"
}

# Verificar Frontend
if (Test-NetConnection -ComputerName localhost -Port $frontendPort).TcpTestSucceeded {
    Write-Host "✅ Frontend activo en puerto $frontendPort"
} else {
    Write-Host "❌ Frontend no activo. Iniciando..."
    Start-Process "powershell" -ArgumentList "cd frontend; npm run dev"
}

Write-Host "✔ Verificación completa."