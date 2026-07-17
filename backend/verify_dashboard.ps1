$ErrorActionPreference = "Stop"
try {
    Write-Host "Logging in..."
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login" -Method Post -Body @{username="admin"; password="admin123"}
    $token = $response.access_token
    
    if (-not $token) {
        Write-Error "Failed to get access token"
        exit 1
    }
    Write-Host "Login successful. Token received."

    Write-Host "Accessing Manager Dashboard..."
    $dashboard = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/dashboards/manager" -Method Get -Headers @{Authorization="Bearer $token"}
    
    Write-Host "Dashboard Data Received:"
    Write-Host ($dashboard | ConvertTo-Json -Depth 2)
    Write-Host "VERIFICATION SUCCESS: Dashboard accessed without 403 error."
} catch {
    Write-Host "VERIFICATION FAILED"
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
    exit 1
}
