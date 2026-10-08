// Builds the looping violin samples in ../sounds/violin from the University of Iowa
// Musical Instrument Samples (https://theremin.music.uiowa.edu/MIS.html), which may be
// used for any project without restriction.
//
//   node build-violin.js <folder>
//
// <folder> holds the medium-loud bowed violin recordings from the "Violin" page, with the
// leading "Violin.arco." removed from their names:
//   mf.sulG.G3B3.aiff  mf.sulG.B3B4.aiff  mf.sulD.D4A4.aiff  mf.sulD.Bb4C6.aiff
//   mf.sulA.A4B4.aiff  mf.sulA.C5C6.aiff  mf.sulE.E5B5.aiff  mf.sulE.C6Gb7.aiff
//
// Each file is a chromatic scale on one string, played without vibrato. The notes are
// found by the silences between them and named by measuring their pitch (the file names
// are only roughly right, and some notes were played twice). Every semitone of first
// position, G3 to B5, is taken from the string it is fingered on; above that, whatever
// was recorded on the E string. Each note is then cut to about two seconds, starting where
// the bow has caught the string (the player swells into each note), given a
// seamless loop so it can be held for any length, brought down to 32 kHz, levelled to
// match the others, and measured for tuning (the playing is up to half a semitone out,
// which the player corrects from the figure stored here).
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'sounds', 'violin');
const SOURCE = process.argv[2];
if (!SOURCE) { console.error('usage: node build-violin.js <folder with the source recordings>'); process.exit(1); }

const OUT_RATE = 32000;
const LOOP_FROM = [0.55, 0.7, 0.85, 1.0];    // loop start candidates, seconds into the note
const LOOP_MIN = 0.7, LOOP_MAX = 1.15;       // loop length, seconds
const CROSSFADE = 0.09;
const SPEAKS_AT = 0.6;                       // fraction of full level at which a note counts as started
const LEAD_IN = 0.03;                        // seconds kept before that point
const TARGET_RMS = 0.11;
// which string plays which notes in first position, and the notes kept above it
const STRINGS = [['G', 55, 61], ['D', 62, 68], ['A', 69, 75], ['E', 76, 83]];
const HIGHEST = 93;

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const midiOf = (name) => { const m = /^([A-G]b?)(\d)$/.exec(name); return NAMES.indexOf(m[1]) + 12 * (+m[2] + 1); };
const nameOf = (midi) => NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
const hzOf = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/* ---------- reading and writing ---------- */

function readAiff(file) {
	const b = fs.readFileSync(file);
	if (b.slice(0, 4).toString() !== 'FORM') throw new Error('not AIFF: ' + file);
	let p = 12, channels = 1, bits = 16, rate = 44100, data = null;
	while (p < b.length - 8) {
		const id = b.slice(p, p + 4).toString(), size = b.readUInt32BE(p + 4);
		if (id === 'COMM') {
			channels = b.readUInt16BE(p + 8);
			bits = b.readUInt16BE(p + 14);
			// the sample rate is an 80-bit extended float
			rate = b.readUInt32BE(p + 18) * Math.pow(2, (b.readUInt16BE(p + 16) & 0x7fff) - 16383 - 31);
		}
		if (id === 'SSND') { data = b.slice(p + 16 + b.readUInt32BE(p + 8), p + 8 + size); }
		p += 8 + size + (size & 1);
	}
	if (!data || bits !== 16) throw new Error('unsupported AIFF: ' + file);
	const frames = Math.floor(data.length / (2 * channels));
	const mono = new Float32Array(frames);
	for (let i = 0; i < frames; i++) {
		let s = 0;
		for (let c = 0; c < channels; c++) s += data.readInt16BE((i * channels + c) * 2);
		mono[i] = s / channels / 32768;
	}
	return { rate: Math.round(rate), samples: mono };
}

function writeWav(file, samples, rate) {
	const out = Buffer.alloc(44 + samples.length * 2);
	out.write('RIFF', 0); out.writeUInt32LE(36 + samples.length * 2, 4); out.write('WAVE', 8);
	out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
	out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
	out.write('data', 36); out.writeUInt32LE(samples.length * 2, 40);
	for (let i = 0; i < samples.length; i++) {
		out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
	}
	fs.writeFileSync(file, out);
}

/* ---------- analysis ---------- */

function rms(x, from, to) {
	let s = 0;
	for (let i = from; i < to; i++) s += x[i] * x[i];
	return Math.sqrt(s / Math.max(1, to - from));
}

// The notes of a scale recording: stretches of sound separated by silence, as [{from, to}] in samples.
function splitNotes(x, rate) {
	const win = Math.round(rate * 0.02);
	const env = [];
	for (let i = 0; i + win <= x.length; i += win) env.push(rms(x, i, i + win));
	const sorted = env.slice().sort((a, b) => a - b);
	const threshold = Math.max(sorted[Math.floor(sorted.length * 0.05)] * 4, sorted[Math.floor(sorted.length * 0.9)] * 0.06);
	const notes = [];
	let start = -1, quiet = 0;
	for (let i = 0; i < env.length; i++) {
		if (env[i] > threshold) { if (start < 0) start = i; quiet = 0; }
		else if (start >= 0 && ++quiet >= 8) {            // 160 ms of silence ends a note
			if (i - quiet - start >= 20) notes.push({ from: start * win, to: (i - quiet + 1) * win });
			start = -1; quiet = 0;
		}
	}
	if (start >= 0 && env.length - start >= 20) notes.push({ from: start * win, to: env.length * win });
	return notes;
}

// Normalised autocorrelation of x at each lag in [minLag, maxLag], over `length` samples from `from`.
function correlate(x, from, length, minLag, maxLag) {
	const scores = [];
	for (let lag = minLag; lag <= maxLag; lag++) {
		let num = 0, a = 0, b = 0;
		for (let i = from; i < from + length; i++) { num += x[i] * x[i + lag]; a += x[i] * x[i]; b += x[i + lag] * x[i + lag]; }
		scores.push(num / Math.sqrt(a * b + 1e-12));
	}
	return scores;
}
function peakAt(scores, k, minLag) {
	const y0 = scores[k - 1] ?? scores[k], y1 = scores[k], y2 = scores[k + 1] ?? scores[k];
	return minLag + k + (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
}

// Pitch of a note somewhere between two MIDI notes: the shortest period that repeats (nearly) as well as any.
function findPitch(x, rate, from, lowMidi, highMidi) {
	const minLag = Math.floor(rate / hzOf(highMidi)), maxLag = Math.ceil(rate / hzOf(lowMidi));
	const scores = correlate(x, from, 4096, minLag, maxLag);
	const best = Math.max(...scores);
	for (let k = 1; k < scores.length - 1; k++) {
		if (scores[k] >= best * 0.93 && scores[k] >= scores[k - 1] && scores[k] >= scores[k + 1]) return rate / peakAt(scores, k, minLag);
	}
	return 0;
}

// Pitch close to an expected frequency (within about a semitone and a half).
function pitchNear(x, rate, from, expected) {
	const minLag = Math.floor(rate / (expected * 1.09)), maxLag = Math.ceil(rate / (expected / 1.09));
	const scores = correlate(x, from, 2048, minLag, maxLag);
	let k = 0;
	for (let i = 1; i < scores.length; i++) if (scores[i] > scores[k]) k = i;
	return rate / peakAt(scores, k, minLag);
}

// Change the sample rate with a windowed-sinc filter (removes what the new rate cannot hold).
function resample(x, from, to) {
	const ratio = from / to, cutoff = Math.min(1, to / from) * 0.94, half = 24;
	const out = new Float32Array(Math.floor(x.length / ratio));
	for (let n = 0; n < out.length; n++) {
		const centre = n * ratio, first = Math.ceil(centre - half), last = Math.floor(centre + half);
		let sum = 0, weight = 0;
		for (let i = first; i <= last; i++) {
			if (i < 0 || i >= x.length) continue;
			const d = (i - centre) * cutoff;
			const sinc = Math.abs(d) < 1e-9 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
			const w = sinc * (0.5 + 0.5 * Math.cos(Math.PI * (i - centre) / half));     // Hann window
			sum += x[i] * w; weight += w;
		}
		out[n] = weight ? sum / weight : 0;
	}
	return out;
}

/* ---------- find every note in the recordings ---------- */

const takes = {};       // midi -> [{string, x, rate, from, to, cents}]
for (const file of fs.readdirSync(SOURCE).filter((f) => /\.aiff?$/i.test(f)).sort()) {
	const m = /sul(.)\.([A-G]b?\d)([A-G]b?\d)?\./.exec(file);
	if (!m) continue;
	const low = midiOf(m[2]), high = m[3] ? midiOf(m[3]) : low;
	const { rate, samples } = readAiff(path.join(SOURCE, file));
	for (const note of splitNotes(samples, rate)) {
		const hz = findPitch(samples, rate, note.from + rate, low - 3, high + 3);
		if (!hz) continue;
		const midi = Math.round(69 + 12 * Math.log2(hz / 440));
		const cents = 1200 * Math.log2(hz / hzOf(midi));
		(takes[midi] = takes[midi] || []).push({ string: m[1], x: samples, rate, from: note.from, to: note.to, cents });
	}
}

// the take to use for a pitch: on the wanted string if there is one, and the best in tune
function choose(midi, string) {
	const all = takes[midi] || [];
	const own = all.filter((t) => t.string === string);
	return (own.length ? own : all).slice().sort((a, b) => Math.abs(a.cents) - Math.abs(b.cents))[0];
}
const wanted = [];
for (const [string, low, high] of STRINGS) for (let midi = low; midi <= high; midi++) wanted.push([midi, string]);
for (let midi = 84; midi <= HIGHEST; midi++) if (takes[midi]) wanted.push([midi, 'E']);

/* ---------- cut, loop, level and save each note ---------- */

fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) if (/\.wav$/.test(old)) fs.unlinkSync(path.join(OUT, old));
const zones = [];
for (const [midi, string] of wanted) {
	const take = choose(midi, string);
	if (!take) { console.log(nameOf(midi).padEnd(4), 'NOT RECORDED'); continue; }

	// the note from just before it starts, at the output rate
	let peak = 0;
	for (let i = take.from; i < take.to; i++) peak = Math.max(peak, Math.abs(take.x[i]));
	let onset = take.from;
	while (onset < take.to && Math.abs(take.x[onset]) < peak * 0.02) onset++;
	onset = Math.max(0, onset - Math.round(take.rate * 0.004));
	let x = resample(take.x.subarray(onset, Math.min(take.to, onset + take.rate * 3.6)), take.rate, OUT_RATE);
	const rate = OUT_RATE;

	// These notes were bowed with a slow swell. Start each one where the bow has caught the string
	// (the sound first reaches most of its full level), so that quick notes speak at once.
	const full = rms(x, Math.round(0.9 * rate), Math.round(1.7 * rate));
	const step = Math.round(0.01 * rate);
	let caught = 0;
	while (caught + step < x.length && rms(x, caught, caught + step) < full * SPEAKS_AT) caught += step;
	const cut = Math.max(0, caught - Math.round(LEAD_IN * rate));
	x = x.subarray(cut);
	const fade = Math.round(0.006 * rate);
	for (let i = 0; i < fade; i++) x[i] *= i / fade;
	const X = Math.round(CROSSFADE * rate);

	// Pick the loop: for each start, the end whose lead-in (the part that gets crossfaded) best
	// matches the lead-in of the start, in shape and in loudness.
	let best = -Infinity, A = 0, B = 0, match = 0;
	for (const startSec of LOOP_FROM) {
		const a0 = Math.round(startSec * rate);
		let aa = 0;
		for (let i = -X; i < 0; i += 2) aa += x[a0 + i] * x[a0 + i];
		const from = a0 + Math.round(LOOP_MIN * rate), to = Math.min(a0 + Math.round(LOOP_MAX * rate), x.length - 1);
		for (let b = from; b < to; b++) {
			let ab = 0, bb = 0;
			for (let i = -X; i < 0; i += 2) { ab += x[a0 + i] * x[b + i]; bb += x[b + i] * x[b + i]; }
			const corr = ab / Math.sqrt(aa * bb + 1e-12);
			const score = corr - 0.5 * Math.abs(Math.log(Math.sqrt(bb / aa)));
			if (score > best) { best = score; A = a0; B = b; match = corr; }
		}
	}

	// crossfade the end of the loop into the audio just before the loop start
	const y = Float32Array.from(x.subarray(0, B));
	for (let i = 0; i < X; i++) {
		const t = i / X;
		y[B - X + i] = x[B - X + i] * (1 - t) + x[A - X + i] * t;
	}

	// even out loudness between notes
	let top = 0;
	for (const v of y) top = Math.max(top, Math.abs(v));
	const gain = Math.min(TARGET_RMS / rms(y, A, B), 0.95 / top);
	for (let i = 0; i < y.length; i++) y[i] *= gain;

	// tuning and steadiness of pitch over the looped part
	const cents = [];
	for (let from = A; from + 4096 < B; from += 1024) cents.push(1200 * Math.log2(pitchNear(y, rate, from, hzOf(midi) * Math.pow(2, take.cents / 1200)) / hzOf(midi)));
	const tune = cents.reduce((a, b) => a + b, 0) / cents.length;
	const waver = Math.sqrt(cents.reduce((a, b) => a + (b - tune) * (b - tune), 0) / cents.length) * Math.SQRT2;

	const file = midi + '.wav';
	writeWav(path.join(OUT, file), y, rate);
	zones.push({ midi, file, string: take.string, sampleRate: rate, loopStart: A, loopEnd: B, tuneCents: Math.round(tune * 10) / 10 });
	console.log(nameOf(midi).padEnd(4), 'midi', midi, 'string', take.string, '| loop', (A / rate).toFixed(2) + '-' + (B / rate).toFixed(2) + 's', 'match', match.toFixed(3),
		'| tuning', (tune >= 0 ? '+' : '') + tune.toFixed(0) + 'c', 'pitch waver +-' + waver.toFixed(1) + 'c', '| gain x' + gain.toFixed(1), '| trimmed', Math.round(cut / rate * 1000) + 'ms', (y.length * 2 / 1024 | 0) + 'KB');
}

fs.writeFileSync(path.join(OUT, 'violin.json'), JSON.stringify({
	name: 'Violin, bowed, without vibrato',
	source: 'University of Iowa Musical Instrument Samples, https://theremin.music.uiowa.edu/MIS.html',
	license: 'Free to use for any project, without restriction',
	zones
}, null, '\t') + '\n');
console.log(zones.length + ' notes written');
