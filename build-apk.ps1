Write-Host "🚀 Starting EAS APK build..."
npx eas build -p android --profile preview --non-interactive

Write-Host "⏳ Waiting 2 minutes for build to start..."
Start-Sleep -Seconds 120

Write-Host "🔍 Checking for finished build..."
$buildInfo = npx eas build:list --limit 1 --status finished --json | ConvertFrom-Json
$apkUrl = $buildInfo[0].artifacts.buildUrl

if ($apkUrl) {
    Write-Host "✅ APK build completed!"
    Write-Host "📎 APK download link: $apkUrl"

    $outputPath = "app-latest.apk"
    Write-Host "📥 Downloading APK to $outputPath..."
    Invoke-WebRequest -Uri $apkUrl -OutFile $outputPath
    Write-Host "✅ APK downloaded successfully!"
} else {
    Write-Host "❌ APK build not found. Try again later."
}
