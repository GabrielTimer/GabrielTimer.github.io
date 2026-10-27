#!/usr/bin/env python3
"""
MusiMix Prep — transforme un fichier audio en "pack" prêt pour MusiMix.

  audio (mp3/wav/flac)  ──►  stems séparés  (Demucs)
  + paroles (optionnel) ──►  paroles synchronisées mot à mot (Whisper / stable-ts)
  + grille (optionnel)  ──►  accords placés dans les paroles et datés
                        ──►  sinon : accords détectés dans l'audio (chroma + Viterbi)
                        ──►  tempo, tonalité
  Sortie : un ZIP  "Artiste - Titre.zip" contenant
       Titre (Vocals).mp3, Titre (Drums).mp3, ...   (pistes pour la table de mixage)
       Titre.cho        (ChordPro : paroles + accords)
       Titre.lrc        (paroles synchronisées ligne par ligne)
       song.json        (timing mot à mot + accords datés -> accord courant / karaoké)

Installation (une fois) :
    pip install demucs stable-ts numpy scipy
    + ffmpeg dans le PATH  (macOS : brew install ffmpeg ; Windows : winget install ffmpeg)

Exemples :
    # 100 % automatique (transcription + accords détectés)
    python musimix_prep.py "Mari Froes - Eu.mp3" --lang pt

    # Meilleur résultat : tu fournis les paroles (texte brut) -> alignement forcé
    python musimix_prep.py eu.mp3 --lyrics eu.txt --lang pt --title Eu --artist "Mari Froes"

    # Encore mieux : tu colles une grille "accords au-dessus des paroles" (Cifra Club,
    # Ultimate Guitar...) ou un ChordPro -> les accords sont datés grâce aux paroles
    python musimix_prep.py eu.mp3 --chords eu_grille.txt --lang pt --capo 2

    # Tu as déjà les stems (Moises, UVR, lalal.ai...) -> pas de séparation
    python musimix_prep.py --stems-dir ./stems_eu --chords eu.cho --lang pt

    # Juste les accords d'un morceau (rapide, sans séparation ni Whisper)
    python musimix_prep.py eu.mp3 --no-stems --no-lyrics
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

SR = 22050
NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"}

STEM_LABELS = {
    "vocals": "Vocals", "drums": "Drums", "bass": "Bass", "guitar": "Guitar",
    "piano": "Piano", "other": "Other", "no_vocals": "Instrumental",
}


def log(msg: str) -> None:
    print(f"• {msg}", flush=True)


# ─────────────────────────────────────────────────────────────── audio I/O ──
def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.exit("ffmpeg introuvable : installe-le et ajoute-le au PATH.")
    return exe


def load_mono(path: Path, sr: int = SR) -> np.ndarray:
    """Décode n'importe quel fichier audio en mono float32 via ffmpeg."""
    cmd = [ffmpeg_bin(), "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr),
           "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def mix_files(paths: list[Path], sr: int = SR) -> np.ndarray:
    sigs = [load_mono(p, sr) for p in paths]
    n = max(len(s) for s in sigs)
    out = np.zeros(n, dtype=np.float32)
    for s in sigs:
        out[: len(s)] += s
    return out


def encode_mp3(src: Path, dst: Path, bitrate: str = "192k") -> None:
    subprocess.run([ffmpeg_bin(), "-v", "error", "-y", "-i", str(src), "-codec:a",
                    "libmp3lame", "-b:a", bitrate, str(dst)], check=True)


def duration_of(path: Path) -> float:
    return len(load_mono(path, 8000)) / 8000.0


# ───────────────────────────────────────────────────────── stem separation ──
def separate(audio: Path, model: str, workdir: Path) -> dict[str, Path]:
    """Lance Demucs. Retourne {stem: chemin_wav}."""
    cmd = [sys.executable, "-m", "demucs", "-n", model, "-o", str(workdir)]
    if model == "two":
        cmd = [sys.executable, "-m", "demucs", "-n", "htdemucs", "--two-stems", "vocals",
               "-o", str(workdir)]
    cmd.append(str(audio))
    log(f"Séparation des pistes avec Demucs ({model})… (quelques minutes sur CPU)")
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        sys.exit("Demucs introuvable : pip install demucs")
    stems = {p.stem: p for p in workdir.rglob("*.wav")}
    if "vocals" not in stems:
        sys.exit("Demucs n'a pas produit de piste vocals.wav")
    return stems


def stems_from_dir(folder: Path) -> dict[str, Path]:
    """Reconnaît des stems existants (Moises, UVR, lalal, Demucs...)."""
    keys = {
        "vocals": ["vocal", "voice", "voix", "chant"],
        "drums": ["drum", "batterie"],
        "bass": ["bass", "basse"],
        "guitar": ["guitar", "guitare"],
        "piano": ["piano", "keys"],
        "no_vocals": ["instrumental", "no_vocals", "accompaniment", "karaoke"],
        "other": ["other", "autre"],
    }
    found: dict[str, Path] = {}
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() not in {".wav", ".mp3", ".flac", ".m4a", ".ogg"}:
            continue
        n = p.stem.lower()
        for stem, words in keys.items():
            if stem not in found and any(w in n for w in words):
                found[stem] = p
                break
    return found


# ─────────────────────────────────────────────────── spectral front-end ──
def stft_mag(y: np.ndarray, n_fft: int, hop: int) -> np.ndarray:
    """|STFT| (frames x bins), calculé par blocs pour limiter la mémoire."""
    if len(y) < n_fft:
        y = np.pad(y, (0, n_fft - len(y)))
    y = np.pad(y, (n_fft // 2, n_fft // 2))
    win = np.hanning(n_fft).astype(np.float32)
    n_frames = 1 + (len(y) - n_fft) // hop
    out = np.empty((n_frames, n_fft // 2 + 1), dtype=np.float32)
    block = 512
    for b in range(0, n_frames, block):
        idx = np.arange(b, min(b + block, n_frames))[:, None] * hop + np.arange(n_fft)[None, :]
        out[b: b + len(idx)] = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    return out


def chroma_matrix(n_fft: int, sr: int, fmin: float, fmax: float) -> np.ndarray:
    """Matrice bins FFT -> 12 classes de hauteur (pondération selon l'écart au demi-ton)."""
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    m = np.zeros((len(freqs), 12), dtype=np.float32)
    ok = (freqs >= fmin) & (freqs <= fmax)
    midi = 69 + 12 * np.log2(np.maximum(freqs[ok], 1e-6) / 440.0)
    nearest = np.round(midi)
    weight = np.cos(np.clip(midi - nearest, -0.5, 0.5) * np.pi) ** 2
    m[np.where(ok)[0], (nearest.astype(int) % 12)] = weight
    return m


def whiten(logmag: np.ndarray, width: int = 40) -> np.ndarray:
    """Retire l'enveloppe spectrale (batterie, souffle) : ne garde que les pics harmoniques."""
    from scipy.ndimage import uniform_filter1d
    return np.maximum(0.0, logmag - uniform_filter1d(logmag, width, axis=1))


@dataclass
class Features:
    times: np.ndarray        # temps (s) de chaque trame chroma
    chroma: np.ndarray       # trames x 12 (aigu/médium)
    bass: np.ndarray         # trames x 12 (graves)
    rms: np.ndarray          # énergie par trame
    beats: np.ndarray        # temps des temps (s)
    bpm: float


def onset_envelope(y: np.ndarray, sr: int = SR, hop: int = 512) -> np.ndarray:
    mag = stft_mag(y, 2048, hop)
    logm = np.log1p(100 * mag)
    flux = np.maximum(0, np.diff(logm, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    k = int(0.5 * sr / hop)
    local = np.convolve(flux, np.ones(k) / k, mode="same")
    env = np.maximum(0, flux - local)
    return env / (env.std() + 1e-9)


def estimate_tempo(env: np.ndarray, sr: int = SR, hop: int = 512) -> float:
    fps = sr / hop
    env = env - env.mean()
    n = len(env)
    ac = np.fft.irfft(np.abs(np.fft.rfft(env, 2 * n)) ** 2)[:n]
    bpms = np.arange(60, 181, 0.5)
    lags = fps * 60 / bpms
    vals = np.interp(lags, np.arange(n), ac)
    prior = np.exp(-0.5 * (np.log2(bpms / 110.0) / 0.9) ** 2)   # préférence ~110 BPM
    return float(bpms[np.argmax(vals * prior)])


def track_beats(env: np.ndarray, bpm: float, sr: int = SR, hop: int = 512,
                tightness: float = 100.0) -> np.ndarray:
    """Suivi de pulsation par programmation dynamique (Ellis 2007)."""
    fps = sr / hop
    period = fps * 60 / bpm
    n = len(env)
    score = env.copy()
    back = np.full(n, -1)
    lo, hi = int(round(period / 2)), int(round(2 * period))
    offsets = np.arange(-hi, -lo + 1)
    penalty = -tightness * np.log(-offsets / period) ** 2
    for t in range(hi, n):
        cand = score[t + offsets] + penalty
        j = int(np.argmax(cand))
        score[t] = env[t] + cand[j]
        back[t] = t + offsets[j]
    # départ : meilleur score dans la dernière période
    t = int(n - hi + np.argmax(score[n - hi:]))
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    beats = np.array(beats[::-1]) / fps
    return beats


def extract_features(y_harm: np.ndarray, y_bass: np.ndarray | None,
                     y_rhythm: np.ndarray) -> Features:
    n_fft, hop = 8192, 2048
    mag = whiten(np.log1p(30 * stft_mag(y_harm, n_fft, hop)))
    chroma = mag @ chroma_matrix(n_fft, SR, 130.0, 2100.0)
    bsrc = mag if y_bass is None else whiten(np.log1p(30 * stft_mag(y_bass, n_fft, hop)))
    bass = bsrc @ chroma_matrix(n_fft, SR, 38.0, 260.0)
    n = min(len(chroma), len(bass))
    chroma, bass = chroma[:n], bass[:n]
    rms = np.sqrt(np.add.reduceat(y_harm ** 2, np.arange(0, len(y_harm), hop))[:n] / hop)
    times = np.arange(n) * hop / SR
    env = onset_envelope(y_rhythm)
    bpm = estimate_tempo(env)
    beats = track_beats(env, bpm)
    return Features(times, chroma, bass, rms, beats, bpm)


# ──────────────────────────────────────────────────────── chord recognition ──
QUALITIES = {            # intervalles, suffixe, pénalité légère pour les accords enrichis
    "maj": ([0, 4, 7], "", 1.00),
    "min": ([0, 3, 7], "m", 1.00),
    "7": ([0, 4, 7, 10], "7", 0.975),
    "maj7": ([0, 4, 7, 11], "maj7", 0.975),
    "m7": ([0, 3, 7, 10], "m7", 0.975),
    "dim": ([0, 3, 6], "dim", 0.95),
    "sus4": ([0, 5, 7], "sus4", 0.95),
}
VOCABS = {
    "simple": ["maj", "min"],
    "jazz": ["maj", "min", "7", "maj7", "m7", "dim"],
    "full": ["maj", "min", "7", "maj7", "m7", "dim", "sus4"],
}

MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def estimate_key(chroma: np.ndarray) -> tuple[int, bool]:
    """Krumhansl-Schmuckler. Retourne (tonique, majeur?)."""
    prof = chroma.mean(axis=0)
    best, best_score = (0, True), -2.0
    for r in range(12):
        for major, p in ((True, MAJOR_PROFILE), (False, MINOR_PROFILE)):
            s = np.corrcoef(prof, np.roll(p, r))[0, 1]
            if s > best_score:
                best, best_score = (r, major), s
    return best


def key_name(root: int, major: bool, flats: bool) -> str:
    names = NOTES_FLAT if flats else NOTES_SHARP
    return names[root] + ("" if major else "m")


def use_flats(root: int, major: bool) -> bool:
    return key_name(root, major, True) in FLAT_KEYS


def diatonic_set(root: int, major: bool) -> set[tuple[int, str]]:
    if major:
        steps = [(0, "maj"), (2, "min"), (4, "min"), (5, "maj"), (7, "maj"), (9, "min"),
                 (0, "maj7"), (2, "m7"), (4, "m7"), (5, "maj7"), (7, "7"), (9, "m7"), (11, "dim")]
    else:
        steps = [(0, "min"), (3, "maj"), (5, "min"), (7, "min"), (7, "maj"), (8, "maj"),
                 (10, "maj"), (0, "m7"), (3, "maj7"), (5, "m7"), (7, "7"), (8, "maj7"), (2, "dim")]
    return {((root + i) % 12, q) for i, q in steps}


def recognize_chords(f: Features, vocab: str = "full", capo: int = 0,
                     change_penalty: float = 0.9, key_bonus: float = 0.03) -> tuple[list[dict], str]:
    """Accords synchronisés sur les temps : chroma moyen par temps -> gabarits -> Viterbi."""
    k_root, k_major = estimate_key(f.chroma)
    flats = use_flats((k_root - capo) % 12, k_major)
    diatonic = diatonic_set(k_root, k_major)

    # segments = intervalles entre temps
    edges = np.concatenate([[0.0], f.beats, [f.times[-1] + 0.1]])
    edges = np.unique(np.clip(edges, 0, f.times[-1] + 0.1))
    seg_idx = np.searchsorted(edges, f.times, side="right") - 1
    n_seg = len(edges) - 1
    C = np.zeros((n_seg, 12)); B = np.zeros((n_seg, 12)); E = np.zeros(n_seg)
    for s in range(n_seg):
        m = seg_idx == s
        if m.any():
            C[s] = np.median(f.chroma[m], axis=0)
            B[s] = np.median(f.bass[m], axis=0)
            E[s] = f.rms[m].mean()
    C = C - C.min(axis=1, keepdims=True)
    Cn = C / (np.linalg.norm(C, axis=1, keepdims=True) + 1e-9)
    Bn = B / (B.max(axis=1, keepdims=True) + 1e-9)

    labels: list[tuple[int, str]] = []
    templates = []
    for q in VOCABS[vocab]:
        ivs, _, w = QUALITIES[q]
        for r in range(12):
            t = np.zeros(12)
            for j, iv in enumerate(ivs):
                t[(r + iv) % 12] = 1.0 if j < 3 else 0.8
            templates.append(w * t / np.linalg.norm(t))
            labels.append((r, q))
    T = np.array(templates)                                   # K x 12
    roots = np.array([r for r, _ in labels])
    bonus = np.array([key_bonus if lab in diatonic else 0.0 for lab in labels])
    score = Cn @ T.T + 0.12 * Bn[:, roots] + bonus[None, :]  # n_seg x K

    # silence / pas d'accord
    silent = E < 0.08 * np.percentile(E[E > 0], 90) if (E > 0).any() else np.ones(n_seg, bool)
    K = len(labels)
    emit = np.concatenate([score * 12, np.where(silent, 8.0, 2.0)[:, None]], axis=1)

    def viterbi(pen: np.ndarray) -> np.ndarray:
        """rester = 0, changer = -pen[s] (pénalité propre à chaque temps)."""
        dp = emit[0].copy()
        back = np.zeros((n_seg, K + 1), dtype=np.int32)
        for s in range(1, n_seg):
            best_prev = int(np.argmax(dp))
            move = dp[best_prev] - pen[s]
            choose_move = move > dp
            back[s] = np.where(choose_move, best_prev, np.arange(K + 1))
            dp = np.where(choose_move, move, dp) + emit[s]
        path = np.zeros(n_seg, dtype=np.int32)
        path[-1] = int(np.argmax(dp))
        for s in range(n_seg - 1, 0, -1):
            path[s - 1] = back[s, path[s]]
        return path

    base = change_penalty * 1.2
    path = viterbi(np.full(n_seg, base))
    # 2e passe : on devine où tombent les 1ers temps (là où les accords changent le plus)
    changes = np.where(np.diff(path) != 0)[0] + 1
    if len(changes) > 8:
        phase = int(np.argmax(np.bincount(changes % 4, minlength=4)))
        pen = np.full(n_seg, base * 1.8)
        pen[np.arange(n_seg) % 4 == phase] = base * 0.5
        pen[np.arange(n_seg) % 2 == phase % 2] = np.minimum(pen[np.arange(n_seg) % 2 == phase % 2], base * 1.1)
        path = viterbi(pen)

    names = NOTES_FLAT if flats else NOTES_SHARP
    chords: list[dict] = []
    for s, k in enumerate(path):
        if k == K:
            name = "N"
        else:
            r, q = labels[k]
            name = names[(r - capo) % 12] + QUALITIES[q][1]
        start, end = float(edges[s]), float(edges[s + 1])
        if chords and chords[-1]["name"] == name:
            chords[-1]["e"] = round(end, 3)
        else:
            chords.append({"name": name, "s": round(start, 3), "e": round(end, 3)})
    # fusion des accords d'un seul temps très courts
    min_len = 0.6 * 60 / f.bpm
    cleaned: list[dict] = []
    for c in chords:
        if cleaned and (c["e"] - c["s"]) < min_len:
            cleaned[-1]["e"] = c["e"]
        elif cleaned and cleaned[-1]["name"] == c["name"]:
            cleaned[-1]["e"] = c["e"]
        else:
            cleaned.append(dict(c))
    cleaned = [c for c in cleaned if c["name"] != "N"]
    return cleaned, key_name((k_root - capo) % 12, k_major, flats)


# ───────────────────────────────────────────── chord sheets (texte) parsing ──
CHORD_RE = re.compile(
    r"^[A-G](?:#|b)?"
    r"(?:maj|min|m|M|dim|aug|sus|add|°|º|ø|\+|-|\d|\(|\)|#|b|/(?=\d))*"
    r"(?:/[A-G](?:#|b)?)?$"
)
SECTION_WORDS = r"(intro|introdu[cç][aã]o|verse|couplet|verso|estrofe|pr[eé][- ]?(?:chorus|refr[aã]o|refrain)|chorus|refrain|refr[aã]o|bridge|pont|ponte|solo|outro|final|fin|interlude|instrumental|riff|coda|tag|parte\s*\d+|primeira parte|segunda parte)"
SECTION_RE = re.compile(rf"^\s*[\[(]?\s*{SECTION_WORDS}[^\])\n]*[\])]?\s*:?\s*", re.I)


def normalize_chord(c: str) -> str:
    """Notation brésilienne / variantes -> notation MusiMix."""
    c = c.strip()
    c = c.replace("º", "°").replace("°", "dim").replace("ø", "m7b5")
    c = re.sub(r"7M|7\+|M7|Δ7?", "maj7", c)
    c = re.sub(r"\((b5)\)", r"\1", c)
    c = re.sub(r"(?<![\d)])\((\d+)\)", r"add\1", c)  # G(9) -> Gadd9
    c = re.sub(r"\(([#b]\d+)\)", r"\1", c)           # E7(#9) -> E7#9
    c = c.replace("min", "m").replace("-", "m") if re.match(r"^[A-G][#b]?(-|min)", c) else c
    return c


def is_chord(tok: str) -> bool:
    tok = tok.strip("|")
    return bool(tok) and bool(CHORD_RE.match(tok))


def is_chord_line(line: str) -> bool:
    toks = [t for t in re.split(r"\s+", line.strip()) if t and t not in {"|", "||", "-", "/", "%"}]
    toks = [t for t in toks if not re.fullmatch(r"\(?x\d+\)?|\d+x", t, re.I)]
    return bool(toks) and all(is_chord(t) for t in toks)


@dataclass
class SheetLine:
    kind: str                      # "lyric" | "chords" | "section" | "blank"
    text: str = ""                 # paroles (sans accords)
    chords: list[tuple[int, str]] = field(default_factory=list)   # (position caractère, accord)


def parse_sheet(text: str) -> tuple[list[SheetLine], dict]:
    """Accepte du ChordPro ou des 'accords au-dessus des paroles'."""
    meta: dict = {}
    lines: list[SheetLine] = []
    raw = text.replace("\t", "    ").splitlines()
    chordpro = any(is_chord(m) for m in re.findall(r"\[([^\]\s]+)\]", text)) or bool(re.search(r"^\s*\{\s*\w+\s*[:}]", text, re.M))
    if chordpro:
        for ln in raw:
            m = re.match(r"^\{\s*(\w+)\s*(?::\s*(.*?))?\s*\}\s*$", ln)
            if m:
                k, v = m.group(1).lower(), (m.group(2) or "").strip()
                if k in ("title", "t"): meta["title"] = v
                elif k in ("artist", "a", "subtitle", "st"): meta["artist"] = v
                elif k == "key": meta["key"] = v
                elif k == "capo": meta["capo"] = v
                elif k in ("comment", "c", "ci"): lines.append(SheetLine("section", v))
                elif k in ("start_of_chorus", "soc"): lines.append(SheetLine("section", v or "Refrain"))
                elif k in ("start_of_verse", "sov") and v: lines.append(SheetLine("section", v))
                elif k in ("start_of_bridge", "sob"): lines.append(SheetLine("section", v or "Pont"))
                continue
            if not ln.strip():
                lines.append(SheetLine("blank")); continue
            text_only, chords, pos = "", [], 0
            for part in re.split(r"(\[[^\]]*\])", ln):
                if part.startswith("[") and part.endswith("]"):
                    chords.append((len(text_only), normalize_chord(part[1:-1])))
                else:
                    text_only += part
            if text_only.strip():
                lines.append(SheetLine("lyric", text_only.rstrip(), chords))
            else:
                lines.append(SheetLine("chords", "", chords))
        return lines, meta

    i = 0
    while i < len(raw):
        ln = raw[i].rstrip()
        if not ln.strip():
            lines.append(SheetLine("blank")); i += 1; continue
        if re.match(r"^[eBGDAE]\|[-\d|hpbr/\\~x ]+", ln.strip()):   # tablature
            i += 1; continue
        sec = SECTION_RE.match(ln)
        if sec and (sec.end() == len(ln) or is_chord_line(ln[sec.end():])):
            label = ln[: sec.end()].strip(" []():")
            lines.append(SheetLine("section", label[:1].upper() + label[1:]))
            rest = ln[sec.end():]
            if rest.strip():
                ln = " " * sec.end() + rest
            else:
                i += 1; continue
        if is_chord_line(ln):
            chords = [(m.start(), normalize_chord(m.group().strip("|")))
                      for m in re.finditer(r"\S+", ln) if is_chord(m.group())]
            nxt = raw[i + 1].rstrip() if i + 1 < len(raw) else ""
            if nxt.strip() and not is_chord_line(nxt) and not SECTION_RE.match(nxt):
                snapped = []
                for p, c in chords:
                    while p < len(nxt) and nxt[p] == " ":
                        p += 1
                    snapped.append((p, c))
                lines.append(SheetLine("lyric", nxt, snapped)); i += 2; continue
            lines.append(SheetLine("chords", "", chords)); i += 1; continue
        lines.append(SheetLine("lyric", ln)); i += 1
    return lines, meta


# ───────────────────────────────────────────────────────── lyrics timing ──
@dataclass
class Word:
    w: str
    s: float | None = None
    e: float | None = None


def norm_token(t: str) -> str:
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]", "", t)


def whisper_words(vocals: Path, lang: str | None, model_name: str,
                  text: str | None) -> list[tuple[str, float, float]]:
    try:
        import stable_whisper  # type: ignore
    except ImportError:
        log("stable-ts non installé (pip install stable-ts) : pas de synchro automatique des paroles")
        return []
    import torch  # stable-ts dépend de torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    log(f"Chargement de Whisper '{model_name}' ({device})…")
    model = stable_whisper.load_model(model_name, device=device)
    if text:
        log("Alignement forcé des paroles sur la voix isolée…")
        result = model.align(str(vocals), text, language=lang or "fr")
    else:
        log("Transcription des paroles (pas de texte fourni)…")
        result = model.transcribe(str(vocals), language=lang)
    out = []
    for seg in result.segments:
        for w in seg.words:
            if w.word.strip():
                out.append((w.word.strip(), float(w.start), float(w.end)))
    return out


def assign_times(sheet: list[SheetLine], aligned: list[tuple[str, float, float]]) -> list[list[Word]]:
    """Recolle les mots alignés sur les lignes du texte de l'utilisateur."""
    per_line: list[list[Word]] = []
    flat: list[Word] = []
    for ln in sheet:
        words = [Word(w) for w in ln.text.split()] if ln.kind == "lyric" else []
        per_line.append(words); flat.extend(words)
    a_tok = [norm_token(w) for w, _, _ in aligned]
    u_tok = [norm_token(w.w) for w in flat]
    sm = difflib.SequenceMatcher(None, u_tok, a_tok, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            _, s, e = aligned[blk.b + k]
            flat[blk.a + k].s, flat[blk.a + k].e = s, e
    # interpolation des mots non retrouvés
    known = [i for i, w in enumerate(flat) if w.s is not None]
    if known:
        for i, w in enumerate(flat):
            if w.s is None:
                prev = max([k for k in known if k < i], default=None)
                nxt = min([k for k in known if k > i], default=None)
                if prev is not None and nxt is not None:
                    frac = (i - prev) / (nxt - prev)
                    w.s = flat[prev].e + frac * (flat[nxt].s - flat[prev].e)
                elif prev is not None:
                    w.s = flat[prev].e + 0.3 * (i - prev)
                else:
                    w.s = max(0.0, flat[nxt].s - 0.3 * (nxt - i))
                w.e = w.s + 0.25
    return per_line


def lines_from_transcript(aligned: list[tuple[str, float, float]]) -> tuple[list[SheetLine], list[list[Word]]]:
    """Sans texte fourni : découpe la transcription en lignes (pauses) et strophes."""
    sheet: list[SheetLine] = []
    words: list[list[Word]] = []
    cur: list[Word] = []

    def flush():
        if cur:
            sheet.append(SheetLine("lyric", " ".join(w.w for w in cur)))
            words.append(list(cur)); cur.clear()

    for i, (w, s, e) in enumerate(aligned):
        if cur:
            gap = s - cur[-1].e
            if gap > 2.5:
                flush(); sheet.append(SheetLine("blank")); words.append([])
            elif gap > 0.7 or len(cur) >= 10 or (cur[-1].w[-1:] in ".!?" and len(cur) >= 3):
                flush()
        cur.append(Word(w, s, e))
    flush()
    return sheet, words


def lrclib_lookup(artist: str, title: str, duration: float | None) -> dict | None:
    q = {"artist_name": artist, "track_name": title}
    if duration:
        q["duration"] = str(round(duration))
    url = "https://lrclib.net/api/get?" + urllib.parse.urlencode(q)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "MusiMix-prep/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r)
    except Exception as exc:  # noqa: BLE001
        log(f"LRCLIB : rien trouvé ({exc})")
        return None


def parse_lrc(text: str) -> list[tuple[float, str]]:
    out = []
    for ln in text.splitlines():
        for m in re.finditer(r"\[(\d+):(\d+(?:\.\d+)?)\]", ln):
            out.append((int(m.group(1)) * 60 + float(m.group(2)),
                        re.sub(r"\[[^\]]*\]|<[^>]*>", "", ln).strip()))
    return sorted(out)


# ───────────────────────────────────────────── merge chords + words → .cho ──
def place_detected_chords(sheet: list[SheetLine], words: list[list[Word]],
                          chords: list[dict], beat: float) -> list[SheetLine]:
    """Place des accords datés (détectés) dans des paroles datées."""
    timed = [(i, w) for i, w in enumerate(words) if w and w[0].s is not None]
    if not timed:
        return sheet
    out: list[SheetLine] = []
    ci = 0

    def chord_at(t):
        cur = None
        for c in chords:
            if c["s"] <= t + 1e-3:
                cur = c
            else:
                break
        return cur

    def gap_line(t0, t1, label=None):
        nonlocal ci
        grp = []
        while ci < len(chords) and chords[ci]["s"] < t1 - 0.25:
            if chords[ci]["s"] >= t0 - 0.05:
                grp.append(chords[ci]["name"])
            ci += 1
        nxt = chord_at(t1 + 0.25)
        if len(grp) == 1 and nxt and grp[0] == nxt["name"]:
            return                            # c'est juste l'accord du début de la ligne suivante
        if not grp:
            return
        if t1 - t0 < max(3 * beat, 2.5) and out and out[-1].kind == "lyric":
            ln = out[-1]                      # quelques accords de transition : fin de ligne
            for name in grp:
                ln.text += " "
                ln.chords.append((len(ln.text), name))
            return
        if label:
            out.append(SheetLine("section", label))
        for k in range(0, len(grp), 4):
            out.append(SheetLine("chords", "", [(0, n) for n in grp[k:k + 4]]))

    def last_shown():
        for ln in reversed(out):
            if ln.chords:
                return sorted(ln.chords)[-1][1]
            if ln.kind == "section":
                return None
        return None

    first_i = timed[0][0]
    last_end = 0.0
    for idx, ln in enumerate(sheet):
        w = words[idx]
        if ln.kind != "lyric" or not w:
            out.append(SheetLine(ln.kind, ln.text, list(ln.chords)))
            continue
        start, end = w[0].s, w[-1].e
        gap_line(last_end, start - 0.25, "Intro" if idx == first_i else None)
        new = SheetLine("lyric", ln.text, [])
        offsets, pos = [], 0
        for word in w:
            pos = ln.text.find(word.w, pos)
            offsets.append(max(pos, 0)); pos += len(word.w)
        cur = chord_at(start)
        if cur and cur["name"] != last_shown():
            new.chords.append((0, cur["name"]))
        while ci < len(chords) and chords[ci]["s"] < start - 0.25:
            ci += 1
        while ci < len(chords) and chords[ci]["s"] < end:
            c = chords[ci]
            k = int(np.argmin([abs(x.s - c["s"]) for x in w]))
            p = offsets[k]
            if not new.chords or new.chords[-1][1] != c["name"]:
                new.chords = [x for x in new.chords if x[0] != p] + [(p, c["name"])]
            ci += 1
        out.append(new)
        last_end = end
    gap_line(last_end, 1e9, "Outro")
    return out


def time_sheet_chords(sheet: list[SheetLine], words: list[list[Word]],
                      duration: float) -> list[dict]:
    """Accords d'une grille fournie + paroles datées -> accords datés."""
    events: list[tuple[float | None, str]] = []
    for ln, w in zip(sheet, words):
        if ln.kind == "lyric" and w and w[0].s is not None:
            offs, pos = [], 0
            for word in w:
                pos = ln.text.find(word.w, pos); offs.append(max(pos, 0)); pos += len(word.w)
            for p, name in ln.chords:
                k = max([j for j, o in enumerate(offs) if o <= p] or [0])
                after_word = p >= offs[k] + len(w[k].w)
                if after_word:          # accord en fin de ligne (après le dernier mot)
                    t = w[k].e + 0.15
                else:
                    span = max(len(w[k].w), 1)
                    frac = (p - offs[k]) / span
                    t = w[k].s + frac * (w[k].e - w[k].s)
                events.append((t, name))
        else:
            for _, name in ln.chords:
                events.append((None, name))
    # accords non datés (intro, ponts...) : répartis régulièrement dans le trou
    n = len(events)
    i = 0
    while i < n:
        if events[i][0] is not None:
            i += 1; continue
        j = i
        while j < n and events[j][0] is None:
            j += 1
        t0 = events[i - 1][0] + 1.0 if i > 0 else 0.0
        t1 = events[j][0] if j < n else duration
        step = max((t1 - t0) / (j - i), 0.5)
        for k in range(i, j):
            events[k] = (t0 + (k - i) * step, events[k][1])
        i = j
    events.sort(key=lambda x: x[0])
    out = []
    for k, (t, name) in enumerate(events):
        e = events[k + 1][0] if k + 1 < len(events) else duration
        out.append({"name": name, "s": round(t, 3), "e": round(e, 3)})
    return out


def fmt_ts(t: float) -> str:
    return f"{int(t // 60):02d}:{t % 60:05.2f}"


def render_cho_line(text: str, chords: list[tuple[int, str]]) -> str:
    """Insère les [accords] ; ceux qui dépassent la fin de la ligne sont ajoutés après."""
    text = text.rstrip()
    inside = sorted([c for c in chords if c[0] < len(text)], key=lambda x: x[0])
    after = [c for c in sorted(chords, key=lambda x: x[0]) if c[0] >= len(text)]
    res, last = "", 0
    for p, c in inside:
        res += text[last:p] + f"[{c}]"
        last = p
    res += text[last:]
    for _, c in after:
        res += f" [{c}]"
    return res


def write_chordpro(sheet: list[SheetLine], meta: dict) -> str:
    out = [f"{{title: {meta.get('title', '')}}}", f"{{artist: {meta.get('artist', '')}}}"]
    for k in ("key", "capo", "tempo"):
        if meta.get(k):
            out.append(f"{{{k}: {meta[k]}}}")
    out.append("")
    for ln in sheet:
        if ln.kind == "blank":
            if out and out[-1] != "":
                out.append("")
        elif ln.kind == "section":
            if out and out[-1] != "":
                out.append("")
            out.append(f"{{comment: {ln.text}}}")
        elif ln.kind == "chords":
            out.append(" ".join(f"[{c}]" for _, c in ln.chords))
        else:
            out.append(render_cho_line(ln.text, ln.chords))
    return "\n".join(out).rstrip() + "\n"


def write_lrc(sheet: list[SheetLine], words: list[list[Word]], meta: dict) -> str:
    out = [f"[ti:{meta.get('title', '')}]", f"[ar:{meta.get('artist', '')}]"]
    for ln, w in zip(sheet, words):
        if ln.kind == "lyric" and w and w[0].s is not None:
            out.append(f"[{fmt_ts(w[0].s)}]{ln.text.strip()}")
    return "\n".join(out) + "\n"


# ─────────────────────────────────────────────────────────────── main flow ──
def safe(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|]+', "_", name).strip() or "chanson"


def process(args: argparse.Namespace, audio: Path | None) -> Path:
    tmp = Path(tempfile.mkdtemp(prefix="musimix_"))
    try:
        # 1. titre / artiste
        meta: dict = {}
        sheet_text = None
        if args.chords:
            sheet_text = Path(args.chords).read_text(encoding="utf-8", errors="replace")
        elif args.lyrics:
            sheet_text = Path(args.lyrics).read_text(encoding="utf-8", errors="replace")
        sheet: list[SheetLine] = []
        if sheet_text:
            sheet, meta = parse_sheet(sheet_text)
        stem_name = audio.stem if audio else Path(args.stems_dir).name
        guess_artist, guess_title = (stem_name.split(" - ", 1) + [""])[:2] if " - " in stem_name else ("", stem_name)
        meta["title"] = args.title or meta.get("title") or guess_title
        meta["artist"] = args.artist or meta.get("artist") or guess_artist
        if args.capo:
            meta["capo"] = str(args.capo)

        # 2. pistes
        if args.stems_dir:
            stems = stems_from_dir(Path(args.stems_dir))
            log(f"Pistes trouvées : {', '.join(stems) or 'aucune'}")
        elif args.no_stems:
            stems = {}
        else:
            stems = separate(audio, args.model, tmp / "sep")
        source = audio or next(iter(stems.values()))
        duration = duration_of(source)

        # 3. analyse harmonique (sans voix ni batterie si possible)
        harm_keys = [k for k in ("guitar", "piano", "other", "bass") if k in stems]
        if harm_keys:
            y_harm = mix_files([stems[k] for k in harm_keys])
        elif "no_vocals" in stems:
            y_harm = load_mono(stems["no_vocals"])
        else:
            y_harm = load_mono(source)
        y_bass = load_mono(stems["bass"]) if "bass" in stems else None
        y_rhythm = load_mono(stems["drums"]) if "drums" in stems else (
            load_mono(source) if audio else y_harm)
        log("Analyse : tempo, pulsation, tonalité, accords…")
        feats = extract_features(y_harm, y_bass, y_rhythm)
        capo = args.capo or (int(meta["capo"]) if str(meta.get("capo", "")).isdigit() else 0)
        detected, key = recognize_chords(feats, args.vocab, capo)
        meta.setdefault("key", key)
        meta["tempo"] = str(round(feats.bpm))
        log(f"Tempo ≈ {feats.bpm:.0f} BPM · tonalité ≈ {key} · {len(detected)} changements d'accords")

        # 4. paroles datées
        words: list[list[Word]] = []
        plain = "\n".join(l.text for l in sheet if l.kind == "lyric") if sheet else None
        lrc_lines: list[tuple[float, str]] = []
        if args.lrclib and meta["artist"] and meta["title"]:
            hit = lrclib_lookup(meta["artist"], meta["title"], duration)
            if hit:
                if not sheet and hit.get("plainLyrics"):
                    sheet, _ = parse_sheet(hit["plainLyrics"])
                    plain = hit["plainLyrics"]
                lrc_lines = parse_lrc(hit.get("syncedLyrics") or "")
                log(f"LRCLIB : paroles trouvées ({len(lrc_lines)} lignes synchronisées)")
        aligned: list = []
        if not args.no_lyrics and "vocals" in stems:
            aligned = whisper_words(stems["vocals"], args.lang, args.whisper_model, plain)
        if sheet and aligned:
            words = assign_times(sheet, aligned)
        elif sheet and lrc_lines:
            words = [[] for _ in sheet]; li = 0
            for k, ln in enumerate(sheet):           # synchro ligne par ligne (LRCLIB)
                if ln.kind != "lyric": continue
                while li < len(lrc_lines) and norm_token(lrc_lines[li][1]) != norm_token(ln.text):
                    li += 1
                if li < len(lrc_lines):
                    t = lrc_lines[li][0]; nxt = lrc_lines[li + 1][0] if li + 1 < len(lrc_lines) else t + 4
                    toks = ln.text.split(); step = (nxt - t) * 0.8 / max(len(toks), 1)
                    words[k] = [Word(w, t + j * step, t + (j + 1) * step) for j, w in enumerate(toks)]
                    li += 1
        elif aligned:
            sheet, words = lines_from_transcript(aligned)
        else:
            words = [[] for _ in sheet]

        # 5. accords dans les paroles
        has_sheet_chords = any(l.chords for l in sheet)
        if has_sheet_chords and any(w for w in words):
            timed_chords = time_sheet_chords(sheet, words, duration)
            log("Accords : grille fournie, datée grâce aux paroles")
        elif has_sheet_chords:
            timed_chords = detected
            log("Accords : grille fournie (non datée : pas de synchro des paroles)")
        else:
            beat = 60 / feats.bpm
            sheet = place_detected_chords(sheet, words, detected, beat) if any(words) else sheet
            if not any(words):
                sheet = sheet + [SheetLine("section", "Accords détectés")] + [
                    SheetLine("chords", "", [(0, c["name"]) for c in detected[k:k + 4]])
                    for k in range(0, len(detected), 4)]
            # réaligner les mots avec les lignes (des lignes d'accords ont pu être insérées)
            words = realign_words(sheet, words)
            timed_chords = detected
            log("Accords : détectés automatiquement dans l'audio (à vérifier !)")

        # 6. écriture du pack
        title = safe(meta["title"])
        pack = tmp / "pack"; pack.mkdir()
        for stem, path in stems.items():
            label = STEM_LABELS.get(stem, stem.title())
            dst = pack / f"{title} ({label}).mp3"
            if path.suffix.lower() == ".mp3":
                shutil.copy(path, dst)
            else:
                encode_mp3(path, dst)
        if not stems and audio:
            shutil.copy(audio, pack / f"{title} (Mix){audio.suffix.lower()}")
        (pack / f"{title}.cho").write_text(write_chordpro(sheet, meta), encoding="utf-8")
        if any(words):
            (pack / f"{title}.lrc").write_text(write_lrc(sheet, words, meta), encoding="utf-8")
        song = {
            "format": "musimix-1",
            "title": meta["title"], "artist": meta["artist"], "key": meta.get("key"),
            "capo": meta.get("capo"), "bpm": round(feats.bpm, 1), "duration": round(duration, 2),
            "beats": [round(float(b), 3) for b in feats.beats],
            "chords": timed_chords,
            "lines": [
                {"text": ln.text.strip(), "s": round(w[0].s, 3), "e": round(w[-1].e, 3),
                 "words": [{"w": x.w, "s": round(x.s, 3), "e": round(x.e, 3)} for x in w]}
                for ln, w in zip(sheet, words) if ln.kind == "lyric" and w and w[0].s is not None
            ],
        }
        (pack / "song.json").write_text(json.dumps(song, ensure_ascii=False, indent=1), encoding="utf-8")

        out_dir = Path(args.out); out_dir.mkdir(parents=True, exist_ok=True)
        base = f"{safe(meta['artist'])} - {title}" if meta["artist"] else title
        zip_path = out_dir / f"{base}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:
            for p in sorted(pack.iterdir()):
                z.write(p, p.name)
        if args.keep_files:
            dst = out_dir / base
            shutil.copytree(pack, dst, dirs_exist_ok=True)
        log(f"✅ Pack prêt : {zip_path}")
        return zip_path
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def realign_words(sheet: list[SheetLine], words: list[list[Word]]) -> list[list[Word]]:
    """Après insertion de lignes d'accords : retrouve les mots datés de chaque ligne de paroles."""
    pool = [w for w in words if w]
    out, k = [], 0
    for ln in sheet:
        if ln.kind == "lyric" and k < len(pool):
            out.append(pool[k]); k += 1
        else:
            out.append([])
    return out


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description="Prépare un pack MusiMix (stems + paroles synchro + accords).")
    ap.add_argument("audio", nargs="*", help="fichier(s) audio ou dossier(s)")
    ap.add_argument("--lyrics", help="paroles en texte brut (une ligne = une ligne chantée)")
    ap.add_argument("--chords", help="grille : ChordPro ou accords au-dessus des paroles")
    ap.add_argument("--title"); ap.add_argument("--artist")
    ap.add_argument("--lang", help="langue des paroles (fr, pt, en, es…)")
    ap.add_argument("--capo", type=int, default=0, help="capodastre : accords écrits en formes")
    ap.add_argument("--model", default="htdemucs_6s",
                    choices=["htdemucs_6s", "htdemucs", "htdemucs_ft", "two"],
                    help="6 pistes (voix, batterie, basse, guitare, piano, autre) | 4 pistes | 2 (voix + instru)")
    ap.add_argument("--whisper-model", default="medium", help="tiny/base/small/medium/large-v3")
    ap.add_argument("--vocab", default="full", choices=list(VOCABS), help="vocabulaire d'accords détectés")
    ap.add_argument("--stems-dir", help="utiliser des stems existants au lieu de Demucs")
    ap.add_argument("--no-stems", action="store_true", help="ne pas séparer (accords seulement)")
    ap.add_argument("--no-lyrics", action="store_true", help="ne pas lancer Whisper")
    ap.add_argument("--lrclib", action="store_true", help="chercher les paroles sur lrclib.net")
    ap.add_argument("--out", default="musimix_packs", help="dossier de sortie")
    ap.add_argument("--keep-files", action="store_true", help="garder aussi les fichiers hors ZIP")
    args = ap.parse_args(argv)

    inputs: list[Path] = []
    for a in args.audio:
        p = Path(a)
        if p.is_dir():
            inputs += sorted(x for x in p.iterdir() if x.suffix.lower() in {".mp3", ".wav", ".flac", ".m4a", ".ogg"})
        elif p.exists():
            inputs.append(p)
        else:
            sys.exit(f"Introuvable : {a}")
    if not inputs and not args.stems_dir:
        ap.error("donne un fichier audio ou --stems-dir")
    if len(inputs) > 1 and (args.lyrics or args.chords or args.title):
        ap.error("--lyrics/--chords/--title ne s'utilisent qu'avec un seul morceau")
    for audio in inputs or [None]:
        process(args, audio)


if __name__ == "__main__":
    main()
