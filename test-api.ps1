# Quick API Test Script
$baseUrl = "http://localhost:3000"

Write-Host "`n=== Testing Order Execution Engine ===" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "Status: $($health.status)" -ForegroundColor Green

# Test 2: Submit an Order
Write-Host "`n2. Submitting Market Order..." -ForegroundColor Yellow
$orderData = @{
    tokenIn = "SOL"
    tokenOut = "USDC"
    amount = 100
} | ConvertTo-Json

$order = Invoke-RestMethod -Uri "$baseUrl/api/orders/execute" -Method Post -Body $orderData -ContentType "application/json"
Write-Host "Order ID: $($order.orderId)" -ForegroundColor Green
Write-Host "WebSocket URL: $($order.websocketUrl)" -ForegroundColor Green

# Wait a bit for processing
Write-Host "`n3. Waiting for order to process (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test 3: Get Order Details
Write-Host "`n4. Fetching Order Details..." -ForegroundColor Yellow
$orderDetails = Invoke-RestMethod -Uri "$baseUrl/api/orders/$($order.orderId)" -Method Get
Write-Host "Order Status: $($orderDetails.order.status)" -ForegroundColor Green
Write-Host "Selected DEX: $($orderDetails.order.selectedDex)" -ForegroundColor Green
if ($orderDetails.order.txHash) {
    Write-Host "Transaction Hash: $($orderDetails.order.txHash)" -ForegroundColor Green
    Write-Host "Executed Price: $($orderDetails.order.executedPrice)" -ForegroundColor Green
}

# Test 4: List All Orders
Write-Host "`n5. Listing All Orders..." -ForegroundColor Yellow
$allOrders = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Get
Write-Host "Total Orders: $($allOrders.orders.Count)" -ForegroundColor Green

Write-Host "`n=== Test Complete! ===" -ForegroundColor Cyan
Write-Host "`nOrder Summary:" -ForegroundColor White
$orderDetails.order | Format-List id, tokenIn, tokenOut, amount, status, selectedDex, executedPrice, txHash
