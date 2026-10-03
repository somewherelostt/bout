# Bout launch film

48 seconds · 1920 × 1080 · 60 fps · original stereo score.

The film combines kinetic titles with **32 seconds of actual local screen recording**. It shows the existing task, anonymous patches, real hashes, and once-funded 2 USDC stage bounty. The closing evidence scene states that there were zero live reviews at recording and that the final report is pending.

The terminal scene animates a verified CLI help command. The opening patch cards are excerpts from the same real reviewer bundle shown in the recording. Neither is presented as a new execution or a reviewer verdict.

## Render on Windows

Requirements: Node.js 22+, Python 3.12+, FFmpeg on PATH, and the packages listed below. Remotion downloads Chrome Headless Shell on first use.

```powershell
cd video
npm ci
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
npm run check
./render.ps1
```

The result is `../docs/bout-launch.mp4`. `npm run studio` opens the editable timeline. The first render may take several minutes. Generated audio, preview files, and dependencies are ignored by Git.

## Edit

- `src/Launch.tsx`: original animation, camera moves, title treatments, and actual footage crops.
- `src/timeline.json`: frame rate, scene timing, typing cues, and sound cues shared with the score.
- `scripts/score.py`: original synthesized music and quiet interface Foley; no stock songs or samples.
- `public/workflow-recording.mp4`: clean source footage, trimmed to the required 64 seconds; no credentials or private paths.
- `render.ps1`: normalize recording timestamps, synthesize audio, render picture, mux, and measure the export.

Music is mixed around -18 LUFS with peak headroom, a restrained high-frequency range, and rounded click/typing transients. This controls relative loudness; playback volume still depends on the listener's device.

The final film retains the truthful pending-review status. Do not replace it with a completed-review claim until genuine submissions have been synchronized.
