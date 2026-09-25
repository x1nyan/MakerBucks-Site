$imageRoot = Join-Path $PSScriptRoot 'images\Project 2026'
$manifest = [ordered]@{}

Get-ChildItem -LiteralPath $imageRoot -Directory | ForEach-Object {
  $folder = $_.FullName.Substring($PSScriptRoot.Length + 1).Replace('\', '/')
  $manifest[$folder] = @(
    Get-ChildItem -LiteralPath $_.FullName -File |
      Where-Object { $_.Extension -match '^\.(png|jpe?g|gif|webp|avif|jfif|bmp|svg)$' } |
      Sort-Object Name |
      Select-Object -ExpandProperty Name
  )
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'photo-manifest.json') -Encoding UTF8
Write-Output "Updated photo-manifest.json for $($manifest.Count) folders."