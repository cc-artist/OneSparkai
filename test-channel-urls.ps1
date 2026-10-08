# Test various YouTube channel URL formats
$testUrls = @(
    # Standard formats
    "https://www.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg",
    "https://youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg",
    "https://www.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg?feature=emb_title",
    "https://www.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg#about",
    "https://www.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg?view_as=subscriber&feature=emb_title",
    
    # @username formats
    "https://www.youtube.com/@LinusTechTips",
    "https://youtube.com/@LinusTechTips",
    "https://www.youtube.com/@LinusTechTips/videos",
    "https://www.youtube.com/@LinusTechTips/featured",
    
    # Custom URL formats
    "https://www.youtube.com/c/LinusTechTips",
    "https://youtube.com/c/LinusTechTips",
    "https://www.youtube.com/c/LinusTechTips/videos",
    
    # User URL formats
    "https://www.youtube.com/user/LinusTechTips",
    "https://youtube.com/user/LinusTechTips",
    
    # youtu.be formats
    "https://youtu.be/c/LinusTechTips",
    
    # Short formats
    "https://www.youtube.com/UCaXkIU1QidjPwiAYu6GcHjg",
    "UCaXkIU1QidjPwiAYu6GcHjg",
    
    # Edge cases
    "http://youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg",  # http instead of https
    "www.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg",      # no protocol
    "youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg",          # no www, no protocol
    "https://m.youtube.com/channel/UCaXkIU1QidjPwiAYu6GcHjg"  # mobile URL
)

$apiUrl = "http://localhost:3000/api/v1/channel-analysis/analyze"

foreach ($url in $testUrls) {
    Write-Host "`nTesting: $url"
    Write-Host "-" * 80
    
    try {
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{ channelUrl = $url; analysisType = "basic" })
        Write-Host "✅ SUCCESS: Channel ID extracted: $($response.channelId)"
    } catch {
        Write-Host "❌ FAILURE: $($_.Exception.Message)"
        if ($_.ErrorDetails.Message) {
            $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "   Error: $($errorData.error)"
            Write-Host "   Details: $($errorData.details)"
        }
    }
}

Write-Host "`n`nTest completed!"