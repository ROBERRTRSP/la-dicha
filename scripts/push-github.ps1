# Sube el proyecto a https://github.com/ROBERRTRSP/la-dicha
# Requiere: gh auth login (una sola vez)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$git = "$env:LOCALAPPDATA\MinGit\mingw64\bin\git.exe"
$gh = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\GitHub.cli_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\gh.exe"

if (-not (Test-Path $git)) {
    Write-Error "Git portable no encontrado. Ejecuta primero la instalación de MinGit o instala Git for Windows."
}
if (-not (Test-Path $gh)) {
    Write-Error "GitHub CLI no encontrado. Instala con: winget install GitHub.cli"
}

& $gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Inicia sesión en GitHub..."
    & $gh auth login --hostname github.com --git-protocol https --web
}

& $git branch -M MAIN
if (-not (& $git remote get-url origin 2>$null)) {
    & $git remote add origin https://github.com/ROBERRTRSP/la-dicha.git
}

& $git push -u origin MAIN
Write-Host "Listo: https://github.com/ROBERRTRSP/la-dicha"
