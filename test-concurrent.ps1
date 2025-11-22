# Test Concurrent Order Processing
$baseUrl = "http://localhost:3000"

Write-Host "`n=== Testing Concurrent Order Processing ===" -ForegroundColor Cyan
Write-Host "Submitting 5 orders simultaneously...`n" -ForegroundColor Yellow

# Create 5 orders with different amounts
$jobs = @()
$orderData = @(
    @{ tokenIn = "SOL"; tokenOut = "USDC"; amount = 50 }
    @{ tokenIn = "SOL"; tokenOut = "USDC"; amount = 100 }
    @{ tokenIn = "USDC"; tokenOut = "SOL"; amount = 200 }
    @{ tokenIn = "SOL"; tokenOut = "USDC"; amount = 75 }
    @{ tokenIn = "SOL"; tokenOut = "USDC"; amount = 150 }
)

# Submit all orders in parallel
$startTime = Get-Date
$orderIds = @()

foreach ($data in $orderData) {
    $json = $data | ConvertTo-Json
    Write-Host "Submitting order: $($data.amount) $($data.tokenIn) -> $($data.tokenOut)" -ForegroundColor Gray
    
    $job = Start-Job -ScriptBlock {
        param($url, $body)
        Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    } -ArgumentList "$baseUrl/api/orders/execute", $json
    
    $jobs += $job
}

# Wait for all submissions to complete
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

foreach ($result in $results) {
    $orderIds += $result.orderId
    Write-Host "✓ Order created: $($result.orderId)" -ForegroundColor Green
}

$submissionTime = (Get-Date) - $startTime
Write-Host "`nAll orders submitted in: $($submissionTime.TotalSeconds) seconds" -ForegroundColor Cyan

# Wait for processing
Write-Host "`nWaiting 8 seconds for all orders to process..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Check status of all orders
Write-Host "`n=== Order Status Update ===" -ForegroundColor Cyan
$confirmedCount = 0
$failedCount = 0

foreach ($orderId in $orderIds) {
    $order = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId" -Method Get
    $status = $order.order.status
    $dex = $order.order.selectedDex
    
    if ($status -eq "confirmed") {
        $confirmedCount++
        Write-Host "✓ Order $($orderId.Substring(0,8))... - $status on $dex" -ForegroundColor Green
    }
    else {
        $failedCount++
        Write-Host "✗ Order $($orderId.Substring(0,8))... - $status" -ForegroundColor Red
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Total Orders: $($orderIds.Count)" -ForegroundColor White
Write-Host "Confirmed: $confirmedCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red
Write-Host "`n✓ Concurrent processing test complete!" -ForegroundColor Cyan
