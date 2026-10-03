param([string]$Python = '.venv/Scripts/python.exe')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force out,public/audio | Out-Null
    & ffmpeg -hide_banner -loglevel error -i public/workflow-recording.mp4 -an -vf fps=30 -c:v libx264 -preset fast -crf 16 -g 30 -bf 0 -pix_fmt yuv420p -movflags +faststart -y public/recording-cfr.mp4
    if ($LASTEXITCODE -ne 0) { throw 'Recording normalization failed.' }
    & $Python scripts/score.py
    if ($LASTEXITCODE -ne 0) { throw 'Soundtrack generation failed.' }
    & .\node_modules\.bin\remotion.cmd render src/index.tsx BoutLaunch out/picture.mp4 --muted --crf=17 --x264-preset=medium
    if ($LASTEXITCODE -ne 0) { throw 'Picture render failed.' }
    & ffmpeg -hide_banner -loglevel error -i out/picture.mp4 -i public/audio/score.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 48 -y ../docs/bout-launch.mp4
    if ($LASTEXITCODE -ne 0) { throw 'Audio mux failed.' }
    & ffmpeg -hide_banner -i ../docs/bout-launch.mp4 -af loudnorm=I=-18:TP=-1.5:LRA=8:print_format=json -f null NUL
    if ($LASTEXITCODE -ne 0) { throw 'Export verification failed.' }
} finally {
    Pop-Location
}
