# =============================================================================
# Eduvia — One-Command Database Restore Script (Windows PowerShell)
# =============================================================================
# Usage: powershell -File scripts/restore-db.ps1 -DumpPath "path\to\backup.dump"
# =============================================================================

param (
    [Parameter(Mandatory=$true)]
    [string]$DumpPath
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $DumpPath)) {
    Write-Error "Backup file not found: $DumpPath"
    exit 1
}

Write-Warning "Restoring will OVERWRITE existing data in container 'eduvia-db'!"
$Confirm = Read-Host "Type 'RESTORE' to proceed"

if ($Confirm -ne "RESTORE") {
    Write-Host "Aborted by user. No changes made."
    exit 0
}

Write-Host "Restoring database from $DumpPath into 'eduvia-db'..."
Get-Content -Path $DumpPath -Raw -Encoding Byte | & docker exec -i eduvia-db pg_restore -U postgres -d postgres --clean --if-exists

Write-Host "Database restore completed successfully!"
