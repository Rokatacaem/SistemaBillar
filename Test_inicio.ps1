# check_dev_env.ps1
$OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "`n--- Verificación del Ambiente de Desarrollo ---" -ForegroundColor Green

# --- Función genérica para verificar herramientas ---
function Check-Tool {
    param (
        [string]$ToolName,
        [string]$Command,
        [string]$ExpectedOutputPattern,
        [string]$HelpLink
    )
    Write-Host "`nVerificando: $ToolName..." -ForegroundColor Cyan
    try {
        $result = Invoke-Expression $Command 2>&1
        if ($result -match $ExpectedOutputPattern) {
            Write-Host "  ✅ $ToolName está instalado y funciona correctamente." -ForegroundColor Green
            Write-Host "     Versión/Salida: $($result.Split("`n")[0].Trim())" -ForegroundColor DarkGray
            return $true
        } else {
            Write-Host "  ❌ $ToolName no se encontró o la versión no coincide." -ForegroundColor Yellow
            Write-Host "     Salida: $($result.Split("`n")[0].Trim())" -ForegroundColor DarkYellow
            Write-Host "     Solución: $HelpLink" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "  ❌ Error al ejecutar el comando para $ToolName." -ForegroundColor Red
        Write-Host "     Mensaje: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "     Solución: $HelpLink" -ForegroundColor Yellow
        return $false
    }
}

# --- Verificaciones base ---
Check-Tool "Git" "git --version" "git version \d+\.\d+\.\d+" "https://git-scm.com/download/win"
Check-Tool "Node.js" "node -v" "v\d+\.\d+\.\d+" "https://nodejs.org/"
Check-Tool "npm" "npm -v" "\d+\.\d+\.\d+" "https://nodejs.org/"
Check-Tool "Visual Studio Code" "code --version" "\d+\.\d+\.\d+" "https://code.visualstudio.com/"

# --- Verificación de Python y pip ---
Write-Host "`nVerificando: Python y pip..." -ForegroundColor Cyan
$python_ok = $false
$pip_ok = $false

try {
    $py_output = Invoke-Expression "python --version" 2>&1
    if ($py_output -match "Python 3\.\d+\.\d+") {
        Write-Host "  ✅ Python está instalado." -ForegroundColor Green
        Write-Host "     Versión: $($py_output.Trim())" -ForegroundColor DarkGray
        $python_ok = $true
    }
} catch {}

if (-not $python_ok) {
    try {
        $py3_output = Invoke-Expression "python3 --version" 2>&1
        if ($py3_output -match "Python 3\.\d+\.\d+") {
            Write-Host "  ✅ Python (python3) está instalado." -ForegroundColor Green
            Write-Host "     Versión: $($py3_output.Trim())" -ForegroundColor DarkGray
            $python_ok = $true
        }
    } catch {}
}

if (-not $python_ok) {
    Write-Host "  ❌ Python no se encontró." -ForegroundColor Yellow
    Write-Host "     Solución: https://www.python.org/downloads/windows/" -ForegroundColor Yellow
}

# pip
if ($python_ok) {
    try {
        $pip_output = Invoke-Expression "pip --version" 2>&1
        if ($pip_output -match "pip \d+\.\d+\.\d+") {
            Write-Host "  ✅ pip está instalado." -ForegroundColor Green
            Write-Host "     Versión: $($pip_output.Trim())" -ForegroundColor DarkGray
            $pip_ok = $true
        }
    } catch {}

    if (-not $pip_ok) {
        Write-Host "  ⚠️ pip no se encontró. Intentando instalar..." -ForegroundColor Yellow
        try {
            python -m ensurepip --upgrade
            $pip_check = Invoke-Expression "pip --version" 2>&1
            if ($pip_check -match "pip \d+\.\d+\.\d+") {
                Write-Host "  ✅ pip instalado correctamente." -ForegroundColor Green
                Write-Host "     Versión: $($pip_check.Trim())" -ForegroundColor DarkGray
                $pip_ok = $true
            }
        } catch {
            Write-Host "  ❌ No se pudo instalar pip automáticamente." -ForegroundColor Red
            Write-Host "     Descarga manual: https://bootstrap.pypa.io/get-pip.py" -ForegroundColor Yellow
        }
    }
}

# --- Verificación de Docker ---
Write-Host "`nVerificando: Docker Desktop..." -ForegroundColor Cyan
try {
    $docker_version = Invoke-Expression "docker --version" 2>&1
    if ($docker_version -match "Docker version \d+\.\d+\.\d+") {
        Write-Host "  ✅ Docker CLI está instalado." -ForegroundColor Green
        Write-Host "     Versión: $($docker_version.Trim())" -ForegroundColor DarkGray
        Write-Host "  Ejecutando 'docker run hello-world'..." -ForegroundColor DarkGray
        $hello_output = Invoke-Expression "docker run hello-world" 2>&1
        if ($hello_output -match "Hello from Docker!") {
            Write-Host "  ✅ Docker Desktop está funcionando correctamente." -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Docker CLI está instalado, pero el servicio no respondió como se esperaba." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ Docker no se encontró." -ForegroundColor Yellow
        Write-Host "     Solución: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error al ejecutar Docker." -ForegroundColor Red
    Write-Host "     Mensaje: $($_.Exception.Message)" -ForegroundColor Red
}

# --- Verificación de psql ---
Write-Host "`nVerificando: Cliente PostgreSQL (psql)..." -ForegroundColor Cyan
try {
    $psql_version = Invoke-Expression "psql --version" 2>&1
    if ($psql_version -match "psql \(PostgreSQL\) \d+\.\d+") {
        Write-Host "  ✅ psql está instalado." -ForegroundColor Green
        Write-Host "     Versión: $($psql_version.Trim())" -ForegroundColor DarkGray
        Write-Host "     Recuerda iniciar el servidor PostgreSQL si usas Docker Compose." -ForegroundColor DarkGray
    } else {
        Write-Host "  ❌ psql no se encontró o la versión no coincide." -ForegroundColor Yellow
        Write-Host "     Solución: https://www.postgresql.org/download/" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error al ejecutar psql." -ForegroundColor Red
    Write-Host "     Mensaje: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- Fin de la Verificación ---" -ForegroundColor Green
Write-Host "`nVerificando conexión a PostgreSQL y base de datos..." -ForegroundColor Cyan

try {
    $env:PGPASSWORD = "sistema123TaCaEmMi0929"
    $result = psql -h localhost -U postgres -d sistemabillar -c "\q" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Conexión exitosa a la base de datos 'sistemabillar'." -ForegroundColor Green
    } else {
        Write-Host "  ❌ No se pudo conectar a la base de datos." -ForegroundColor Red
        Write-Host "     Detalles: $result" -ForegroundColor Yellow
        Write-Host "     Verifica que el servidor PostgreSQL esté activo (Docker o local)." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Error al intentar conectar a PostgreSQL." -ForegroundColor Red
    Write-Host "     Mensaje: $($_.Exception.Message)" -ForegroundColor Red
}