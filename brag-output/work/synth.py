"""Soundtrack for the VibeHeal brag video. 120 BPM, D major, 21 s, stereo 44.1 kHz.
Music and SFX are written as one piece on the same beat grid, counted from frame 0."""
import numpy as np, wave, sys

SR = 44100
DUR = 21.0
N = int(SR * DUR)
BEAT = 0.5
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def hz(note):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= N: return
    sig = sig[: N - i]
    gl = gain * np.sqrt(0.5 * (1 - pan)) * np.sqrt(2)
    gr = gain * np.sqrt(0.5 * (1 + pan)) * np.sqrt(2)
    L[i:i + len(sig)] += sig * gl
    R[i:i + len(sig)] += sig * gr

def tt(d): return np.arange(int(d * SR)) / SR

def fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo: m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))

# ---------- instruments ----------
def kick(gain=1.0, soft=False):
    t = tt(0.45)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * (9 if not soft else 12))
    click = fft_filter(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 300) * (0.12 if not soft else 0.04)
    return np.tanh((s + click) * 1.4) * gain

def clap():
    t = tt(0.3)
    n = fft_filter(rng.standard_normal(len(t)), 900, 5000)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * 60), 0) * 0.5
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 16), 0)
    return n * env / np.max(np.abs(n)) * 0.9

def hat(dec=55):
    t = tt(0.12)
    n = fft_filter(rng.standard_normal(len(t)), 7000, 15000)
    return n * np.exp(-t * dec) / np.max(np.abs(n))

def pluck(freq, dur=0.6, bright=0.5):
    # Karplus-Strong style: additive partials, higher partials decay faster
    t = tt(dur); s = np.zeros_like(t)
    for k in range(1, 9):
        if freq * k > 12000: break
        s += (bright ** (k - 1)) / k * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * (5 + 7 * k))
    s *= np.minimum(1, t / 0.003)
    return s / 1.6

def bell(freq, dur=1.2):
    t = tt(dur)
    s = (np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.5)
         + 0.35 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 6)
         + 0.12 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 9))
    return s * np.minimum(1, t / 0.004) * 0.6

def bass_note(freq, dur):
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t) + 0.08 * np.sin(2 * np.pi * 3 * freq * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.0) * np.minimum(1, (dur - t) / 0.02)
    return np.tanh(s * env * 1.3) * 0.8

def pad(freqs, dur, att=0.35, rel=0.5):
    t = tt(dur); l = np.zeros_like(t); r = np.zeros_like(t)
    for f in freqs:
        for det, side in ((-0.18, 'l'), (0.18, 'r'), (0.0, 'b')):
            ff = f * 2 ** (det / 12 / 6)
            w = np.sin(2 * np.pi * ff * t) + 0.18 * np.sin(2 * np.pi * 2 * ff * t)
            if side in 'lb': l += w
            if side in 'rb': r += w
    env = np.minimum(1, t / att) * np.minimum(1, np.maximum(0, (dur - t) / rel))
    k = 1 / (3 * len(freqs))
    return l * env * k, r * env * k

def blip(freq, dur=0.09):
    t = tt(dur)
    s = np.sign(np.sin(2 * np.pi * freq * t)) * 0.35 + np.sin(2 * np.pi * freq * t) * 0.65
    return fft_filter(s * np.exp(-t * 40) * np.minimum(1, t / 0.002), None, 2500) * 0.8

def whoosh(dur=0.5, peak=0.2):
    t = tt(dur)
    n = fft_filter(rng.standard_normal(len(t)), 300, 3500)
    n /= np.max(np.abs(n))
    env = np.where(t < peak, (t / peak) ** 2, np.exp(-(t - peak) * 14))
    return n * env

def thump(freq=110):
    t = tt(0.25)
    f = freq * (1 + 0.6 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)

# ---------- arrangement ----------
CH = {'D': ['D', 'F#', 'A'], 'Bm': ['B', 'D', 'F#'], 'G': ['G', 'B', 'D'], 'A': ['A', 'C#', 'E']}
ROOT = {'D': 'D2', 'Bm': 'B1', 'G': 'G1', 'A': 'A1'}
# (start, length, chord)
PROG = [(6, 2, 'D'), (8, 2, 'Bm'), (10, 2, 'G'), (12, 2, 'A'), (14, 2, 'D'), (16, 2, 'Bm'), (18, 1, 'G'), (19, 1, 'A'), (20, 1, 'D')]

kicks = []
# Intro: heartbeat kick on half notes, then 4-on-the-floor build in S2
for b in np.arange(0, 3, 1.0): kicks.append((b, 0.55, True))
for b in np.arange(3, 5.5, 0.5): kicks.append((b, 0.7, True))
for b in np.arange(6, 20.01, 0.5): kicks.append((b, 0.95, False))
for (k_t, g, soft) in kicks: add(kick(g, soft), k_t, 0.78)

# sidechain envelope from kicks
tline = np.arange(N) / SR
duck = np.ones(N)
for (k_t, g, soft) in kicks:
    m = tline >= k_t
    duck[m] *= 1 - 0.55 * g * np.exp(-(tline[m] - k_t) / 0.11)

M_L = np.zeros(N); M_R = np.zeros(N)   # sidechained bus
def addm(sig, t0, gain=1.0, pan=0.0, sig_r=None):
    i = int(round(t0 * SR))
    if i >= N: return
    a = sig[: N - i]; b = (sig_r if sig_r is not None else sig)[: N - i]
    M_L[i:i + len(a)] += a * gain * (1 - max(0, pan))
    M_R[i:i + len(b)] += b * gain * (1 + min(0, pan))

# Intro drone (B minor colour) 0-6, swelling into the drop
for (s, d, notes, g) in [(0, 3.0, ['B1', 'F#2', 'B2'], 0.55), (3, 3.0, ['G1', 'D2', 'B2'], 0.6)]:
    l, r = pad([hz(n) for n in notes], d + 0.1, att=0.2, rel=0.15)
    addm(l, s, g, sig_r=r)
# low 8th pulse in the intro
for i, b in enumerate(np.arange(0, 6, 0.25)):
    root = 'B1' if b < 3 else 'G1'
    addm(bass_note(hz(root), 0.22), b, 0.32 if b < 3 else 0.42)

# error blips on the hook's terminal lines (pitched to B minor: F#4 / D4 / B3)
line_t = [i * 0.25 if i < 4 else 1.0 + (i - 4) * 0.125 for i in range(18)]
err = [2, 5, 6, 8, 9, 11, 14, 15, 17]
for i, lt in enumerate(line_t):
    if lt >= 3: break
    f = hz(['F#4', 'D4', 'B3'][i % 3]) if i in err else hz('B4')
    add(blip(f, 0.08 if i in err else 0.04), lt, 0.10 if i in err else 0.035, pan=(-0.3 if i % 2 else 0.3))

# hats: quiet 8ths in the intro, offbeats + 16th ghosts from the drop
for b in np.arange(0, 6, 0.25):
    add(hat(80), b, 0.035 if (b * 4) % 2 else 0.02, pan=0.25)
for b in np.arange(6, 20, 0.25):
    off = abs((b % 0.5) - 0.25) < 1e-6
    g = 0.13 if off else (0.045 if b >= 14 else 0.03)
    add(hat(60 if off else 90), b, g, pan=0.3)

# claps on 2 and 4 from the drop
for bar in np.arange(6, 20, 2.0):
    for off in (0.5, 1.5):
        add(clap(), bar + off, 0.30, pan=-0.05)

# bass, pad and arp over the progression
ARP = [0, 2, 4, 2, 3, 2, 4, 2]   # indices into [r, 3, 5, r+8, 3+8]
for (s, d, c) in PROG:
    names = CH[c]
    final = (c == 'D' and s == 20)
    # bass: 8ths, octave bounce
    for j, b in enumerate(np.arange(s, s + d, 0.25)):
        if final and b > s: break
        rn = ROOT[c]
        f = hz(rn) * (2 if j % 4 == 3 else 1)
        addm(bass_note(f, 0.95 if final else 0.23), b, 0.5)
    # pad
    l, r = pad([hz(n + '4') if n not in ('A', 'B') else hz(n + '3') for n in names], d + (0.0 if not final else 0.0), att=0.25, rel=0.3 if not final else 0.9)
    addm(l, s, 0.42, sig_r=r)
    # arp
    tones = [hz(names[0] + '4'), hz(names[1] + '4'), hz(names[2] + '4'), hz(names[0] + '5'), hz(names[1] + '5')]
    for j, b in enumerate(np.arange(s, s + d, 0.25)):
        if final and b > s: break
        f = tones[[0, 2, 3, 2, 4, 2, 3, 1][j % 8]]
        addm(pluck(f, 1.6 if final else 0.45, 0.55), b, 0.16, pan=(-0.35 if j % 2 else 0.35))

# riser into the drop (rising partials + noise swell), with a short breath before 6.0
t = tt(1.4)
rise_f = 300 * 2 ** (t / 1.4 * 2.2)
riser = np.sin(2 * np.pi * np.cumsum(rise_f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(rise_f * 1.5) / SR) * 0.2
n = fft_filter(rng.standard_normal(len(t)), 1500, 9000); n /= np.max(np.abs(n))
riser = (riser * 0.5 + n * 0.5) * (t / 1.4) ** 2.5 * np.minimum(1, (1.4 - t) / 0.03)
add(riser, 4.475, 0.16)
# drop impact: soft noise wash + low D
t = tt(1.6)
wash = fft_filter(rng.standard_normal(len(t)), 2500, 12000); wash /= np.max(np.abs(wash))
add(wash * np.exp(-t * 3.2), 6.0, 0.10, pan=0.1)
add(np.sin(2 * np.pi * hz('D1') * t) * np.exp(-t * 2.5), 6.0, 0.35)

# whooshes on every wipe (peak lands on the cut)
for c in (3, 6, 9, 14, 18):
    add(whoosh(0.55, 0.2), c - 0.2, 0.11 if c != 6 else 0.07, pan=(0.2 if c % 2 else -0.2))

# tab pops: ascending D major scale (tabs multiplying)
scale = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6']
for i, nme in enumerate(scale):
    add(pluck(hz(nme), 0.35, 0.35), 3.0 + i * 0.25, 0.09, pan=-0.6 + i * 0.13)

# logo squares assemble: D5 F#5 A5 D6, bell on the amber dot
for i, nme in enumerate(['D5', 'F#5', 'A5', 'D6']):
    add(pluck(hz(nme), 0.5, 0.45), 6.0 + i * 0.125, 0.12, pan=-0.2 + 0.13 * i)
add(bell(hz('A6'), 1.0), 6.5, 0.07)
# tagline bell motif "Just vibeheal it."
for (tm, nme) in [(7.5, 'F#5'), (7.75, 'A5'), (8.0, 'D6')]:
    add(bell(hz(nme), 1.0), tm, 0.10)
# how-it-works steps: soft ticks
for i, tm in enumerate([9.5, 10.0, 10.5, 11.0]):
    add(pluck(hz(['A5', 'B5', 'C#6', 'D6'][i]), 0.3, 0.3), tm, 0.08, pan=-0.4 + 0.27 * i)
# status stamps: thump + pluck (IN DEVELOPMENT on A, PLANNED on D)
for i, tm in enumerate([14.75, 15.0, 15.25, 15.5, 15.75]):
    add(thump(110 if i < 2 else 98), tm, 0.22)
    add(pluck(hz('A4' if i < 2 else 'D5'), 0.35, 0.3), tm, 0.10, pan=0.25)
# outro: motif again, button click
for (tm, nme) in [(18.25, 'F#5'), (18.5, 'A5'), (18.75, 'D6')]:
    add(bell(hz(nme), 1.0), tm, 0.09)
t = tt(0.05); clk = fft_filter(rng.standard_normal(len(t)), 2500, 8000) * np.exp(-t * 180)
add(clk / np.max(np.abs(clk)), 19.5, 0.10)
add(pluck(hz('D6'), 0.6, 0.4), 19.5, 0.07)
add(bell(hz('D6'), 1.5), 20.0, 0.08); add(bell(hz('A5'), 1.5), 20.0, 0.06)

# ---------- mix ----------
L += M_L * duck; R += M_R * duck
# fade the last 0.6 s so the video ends cleanly
fade = np.ones(N); fs = int(20.4 * SR); fade[fs:] = np.linspace(1, 0, N - fs) ** 1.5
L *= fade; R *= fade
# gentle bus glue + soft clip
mix = np.stack([L, R])
mix = np.tanh(mix * 0.7) / np.tanh(0.7)
mix /= np.max(np.abs(mix)) / 0.89
out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix.T * 32767).astype(np.int16).tobytes())
print('wrote', out)
