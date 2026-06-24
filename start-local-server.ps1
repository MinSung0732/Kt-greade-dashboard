$root = $PSScriptRoot
$listener = $null
$port = $null

foreach ($candidatePort in 5500..5510) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidatePort)
    $candidate.Start()
    $listener = $candidate
    $port = $candidatePort
    break
  } catch {
    if ($candidate) {
      $candidate.Stop()
    }
  }
}

if (!$listener) {
  throw "No available local port found between 5500 and 5510."
}

Write-Host "KT dashboard running at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

function Get-ContentType($path) {
  $extension = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($extension) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream)
      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        $client.Close()
        continue
      }

      while ($true) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($line)) {
          break
        }
      }

      $parts = $requestLine.Split(" ")
      $requestPath = [Uri]::UnescapeDataString($parts[1].Split("?")[0].TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($requestPath)) {
        $requestPath = "index.html"
      }

      $fullPath = Join-Path $root $requestPath
      $resolvedRoot = [System.IO.Path]::GetFullPath($root)
      $resolvedPath = [System.IO.Path]::GetFullPath($fullPath)

      if (!$resolvedPath.StartsWith($resolvedRoot) -or !(Test-Path -LiteralPath $resolvedPath -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($body, 0, $body.Length)
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
      $contentType = Get-ContentType $resolvedPath
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
      $stream.Flush()
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
