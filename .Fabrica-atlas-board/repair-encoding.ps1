$ErrorActionPreference = 'Stop'
$board = Join-Path $PSScriptRoot '..\.Fabrica-atlas-board'
$cp1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8Strict = New-Object System.Text.UTF8Encoding($false, $true)
$stats = @()
# Mojibake runs: sequences of non-ASCII chars typical of cp1252-misread UTF-8
$pattern = '(?:[\u0080-\u00BF\u00C0-\u00FF\u2013-\u2122\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u2018-\u203A\u20AC\u02C6\u02DC])+'

Get-ChildItem -Recurse -Filter *.md $board | Where-Object { $_.Name -ne 'Fabrica-atlas-tasks.md' } | ForEach-Object {
    $f = $_.FullName
    $t = [IO.File]::ReadAllText($f)
    $preLen = $t.Length
    $mojiBefore = ([regex]::Matches($t, '\u00E2\u20AC|\u00E2\u2020|\u00C2\u00A7|\u00C3\u00D7')).Count
    if ($mojiBefore -gt 0) {
        $new = [regex]::Replace($t, $pattern, {
            param($m)
            try {
                $bytes = $cp1252.GetBytes($m.Value)
                $decoded = $utf8Strict.GetString($bytes)
                # Guard: reject results with replacement chars or '?' (lossy cp1252 encode)
                if ($decoded.Contains([char]0xFFFD) -or $decoded.Contains('?') -and (-not $m.Value.Contains('?'))) { return $m.Value }
                return $decoded
            } catch { return $m.Value }
        })
        $mojiAfter = ([regex]::Matches($new, '\u00E2\u20AC|\u00E2\u2020|\u00C2\u00A7|\u00C3\u00D7')).Count
        [IO.File]::WriteAllText($f, $new, (New-Object System.Text.UTF8Encoding($false)))
        $stats += ('{0} | len {1}->{2} | mojibake {3}->{4}' -f (Split-Path $f -Leaf), $preLen, $new.Length, $mojiBefore, $mojiAfter)
    }
}
$stats | Set-Content -LiteralPath (Join-Path $env:TEMP 'atlas_repair_log.txt') -Encoding UTF8
Get-Content -LiteralPath (Join-Path $env:TEMP 'atlas_repair_log.txt')
