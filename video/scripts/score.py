"""Original, deterministic Bout score and soft interface Foley. No samples."""
from pathlib import Path
import json
import numpy as np
from scipy import signal
import soundfile as sf
import pyloudnorm as pyln

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'src/timeline.json').read_text())
SR = 48000
DURATION = T['duration']
N = SR * DURATION
BEAT = 60 / T['bpm']
RNG = np.random.default_rng(4921)


def grid(seconds):
    return np.arange(round(seconds * SR)) / SR


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def low(x, cutoff, order=2):
    return signal.sosfilt(signal.butter(order, cutoff, fs=SR, output='sos'), x, axis=0)


def band(x, a, b):
    return signal.sosfilt(signal.butter(2, [a, b], btype='bandpass', fs=SR, output='sos'), x, axis=0)


def envelope(t, attack=.009, decay=.25):
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay)


def lay(bus, wave, when, gain=1, pan=0):
    i = round(when * SR)
    if i >= N:
        return
    wave = np.asarray(wave).copy()
    edge = min(480, len(wave))
    wave[-edge:] *= np.linspace(1, 0, edge).reshape((-1,) + (1,) * (wave.ndim - 1))
    if wave.ndim == 1:
        theta = (pan + 1) * np.pi / 4
        wave = np.column_stack([wave * np.cos(theta), wave * np.sin(theta)])
    if i < 0:
        wave = wave[-i:]
        i = 0
    length = min(len(wave), N - i)
    bus[i:i + length] += wave[:length] * gain


def pluck(note, duration=.8):
    t = grid(duration)
    phase = 2 * np.pi * hz(note) * t
    tone = np.sin(phase + .7 * np.sin(phase * 2) * np.exp(-t / .07))
    tone += .15 * np.sin(phase * 2) * np.exp(-t / .08)
    return low(tone * envelope(t, .0035, .21), 3500)


def key(i, click=False):
    t = grid(.085 if not click else .16)
    pitch = 550 + (i * 137 % 550)
    grain = band(RNG.standard_normal(len(t)), 350, 2300) * np.exp(-t / .005)
    wood = np.sin(2 * np.pi * pitch * t) * envelope(t, .0018, .009)
    body = np.sin(2 * np.pi * 180 * t) * envelope(t, .0025, .022)
    return low(grain * .24 + wood * .38 + body * .35, 2800)


music = np.zeros((N, 2))
foley = np.zeros_like(music)
drums = np.zeros_like(music)
ambient = np.zeros_like(music)
# Dmaj9 -> Bm9 -> F#m7 -> Aadd9, with gentle voiced extensions.
chords = [[50, 57, 61, 64, 69], [47, 54, 57, 61, 66], [42, 49, 52, 57, 61], [45, 52, 57, 59, 64]]

for bar in range(24):
    start = bar * 2
    notes = chords[(bar // 2) % 4]
    t = grid(2.9)
    pad = np.zeros((len(t), 2))
    for j, note in enumerate(notes):
        for side, detune in enumerate([-.0025, .0025]):
            phase = 2 * np.pi * hz(note + 12) * (1 + detune) * t
            wave = np.sin(phase) + .19 * np.sin(phase * 2) + .065 * np.sin(phase * 3)
            pad[:, side] += wave * np.sin(np.pi * np.clip(t / 2.9, 0, 1)) ** 1.3 / len(notes)
    lay(ambient, low(pad, 2400), start, .23 if start >= 4 else .12)

    if 4 <= start < 46:
        for beat in [0, 1.5, 2, 3.5]:
            bt = grid(.43)
            phase = 2 * np.pi * hz(notes[0] - 12) * bt
            bass = (np.sin(phase) + .18 * np.sin(phase * 2)) * envelope(bt, .012, .14)
            lay(music, bass, start + beat * BEAT, .31 if start >= 12 else .21)

    if start >= 4:
        pattern = [2, 4, 3, 1, 2, 3, 4, 2]
        density = 2 if start < 12 or 38 <= start < 44 else 1
        for k in range(0, 8, density):
            note = notes[pattern[k]] + (12 if k in [1, 5] else 0)
            gain = .065 if 8 <= start < 12 or 38 <= start < 44 else .1
            at = start + k * .25
            wave = pluck(note)
            lay(music, wave, at, gain, -.35 if k % 2 else .35)
            lay(ambient, wave, at + .375, gain * .22, .5 if k % 2 else -.5)
            lay(ambient, wave, at + .75, gain * .09, -.5 if k % 2 else .5)

    if 12 <= start < 38 or 44 <= start < 46:
        for beat in range(4):
            kt = grid(.42)
            freq = 49 + 82 * np.exp(-kt / .025)
            kick = np.sin(2 * np.pi * np.cumsum(freq) / SR) * envelope(kt, .002, .12)
            lay(drums, kick, start + beat * .5, .32)
            if beat % 2:
                st = grid(.13)
                snare = band(RNG.standard_normal(len(st)), 650, 3600) * envelope(st, .0025, .026)
                snare += .15 * np.sin(2 * np.pi * 185 * st) * envelope(st, .0018, .031)
                lay(drums, snare, start + beat * .5, .09, .05)
            ht = grid(.075)
            hat = band(RNG.standard_normal(len(ht)), 3100, 6500) * envelope(ht, .0015, .011)
            lay(drums, hat, start + beat * .5 + .25, .037, -.24 if beat % 2 else .24)

# Soft sync events: no sharp transient, harsh white-noise hit, or loud click.
for i, at in enumerate(T['clicks']):
    lay(foley, key(i, True), at, .24 if at in [4, 12, 32, 44] else .15, (i % 3 - 1) * .15)
for i in range(len(T['typing']['text'])):
    at = T['typing']['from'] + (i + 1) / len(T['typing']['text']) * (T['typing']['until'] - T['typing']['from'])
    lay(foley, key(i + 91), at, .13, (i % 5 - 2) * .07)
for i, at in enumerate(T['swishes']):
    t = grid(.42)
    swish = band(RNG.standard_normal(len(t)), 180, 1600)
    swish *= np.sin(np.pi * t / .42) ** 2
    lay(foley, swish, at, .045, -.1 if i % 2 else .1)
for at, note in [(4, 69), (4.16, 73), (4.33, 76), (32, 69), (32.22, 73), (44, 69), (44.25, 73), (44.5, 76)]:
    lay(music, pluck(note, 1.4), at, .13, .1)

# Fine dynamics: ease in, make room for the typing, and close with a soft tail.
t = grid(DURATION)
duck = np.ones(N)
for at in np.arange(12, 38, .5):
    i = round(at * SR)
    n = min(round(.22 * SR), N - i)
    duck[i:i+n] = np.minimum(duck[i:i+n], 1 - .19 * np.exp(-np.arange(n) / SR / .065))
body = (music + ambient) * duck[:, None] + drums
typing_duck = np.interp(t, [0, 8.4, 8.6, 10.8, 11.2, 48], [1, 1, .6, .6, 1, 1])
body *= typing_duck[:, None]
mix = body + foley
mix = low(mix, 7400)
mix = signal.sosfilt(signal.butter(2, 35, btype='highpass', fs=SR, output='sos'), mix, axis=0)
mix *= (np.minimum(1, t / .035) * np.clip((DURATION - .04 - t) / 1.45, 0, 1) ** 1.4)[:, None]
meter = pyln.Meter(SR)
mix *= 10 ** ((-18 - meter.integrated_loudness(mix)) / 20)
# Preserve headroom before AAC rather than smashing transients into a limiter.
peak4 = np.max(np.abs(signal.resample_poly(mix, 4, 1, axis=0)))
if peak4 > 10 ** (-2 / 20):
    mix *= 10 ** (-2 / 20) / peak4
mix[-960:] = 0
(ROOT / 'public/audio').mkdir(parents=True, exist_ok=True)
(ROOT / 'out').mkdir(exist_ok=True)
sf.write(ROOT / 'public/audio/score.wav', mix, SR, subtype='PCM_24')
sf.write(ROOT / 'out/music-stem.wav', body, SR, subtype='PCM_24')
sf.write(ROOT / 'out/foley-stem.wav', foley, SR, subtype='PCM_24')
stats = {'seconds': DURATION, 'sampleRate': SR, 'integratedLUFS': round(meter.integrated_loudness(mix), 2), 'samplePeakDBFS': round(float(20*np.log10(np.max(np.abs(mix)))), 2), 'originalScore': True, 'samplesUsed': False}
(ROOT / 'out/audio-metrics.json').write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2))
