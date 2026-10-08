// Generates GlissandoDemo.mid: a violin-style melody showing what pitch bend can do:
// slides to another note, vibrato, a scoop, a bend and a fall.
const fs = require('fs');
const PPQ = 480, BEAT = PPQ;

const ev = [];                       // {tick, order, bytes}
let order = 0;
const add = (tick, bytes) => ev.push({ tick, order: order++, bytes });
const bend = (tick, semis, range) => {
	const raw = Math.max(0, Math.min(16383, Math.round(8192 + semis / range * 8192)));
	add(tick, [0xe0, raw & 0x7f, raw >> 7]);
};
const noteOn = (tick, p) => add(tick, [0x90, p, 100]);
const noteOff = (tick, p) => add(tick, [0x80, p, 0]);
const setRange = (tick, semis) => {
	add(tick, [0xb0, 101, 0]); add(tick, [0xb0, 100, 0]);
	add(tick, [0xb0, 6, semis]); add(tick, [0xb0, 38, 0]);
	add(tick, [0xb0, 101, 127]); add(tick, [0xb0, 100, 127]);
};

add(0, [0xc0, 40]);                  // violin
setRange(0, 2);

// bar 1: A4 held a beat, then slides up two semitones (to B4) over the second beat; then B4
noteOn(0, 69);
for (let i = 0; i <= 16; i++) bend(BEAT + (i * BEAT) / 16, 2 * i / 16 * 0.9999, 2);
noteOff(2 * BEAT, 69);
bend(2 * BEAT, 0, 2);
noteOn(2 * BEAT, 71); noteOff(4 * BEAT, 71);

// bar 2: range becomes 12 semitones; E5 slides down five semitones (to B4) over the whole note
setRange(4 * BEAT, 12);
noteOn(4 * BEAT, 76);
for (let i = 0; i <= 24; i++) bend(4 * BEAT + (i * 4 * BEAT) / 24, -5 * i / 24, 12);
noteOff(8 * BEAT, 76);
bend(8 * BEAT, 0, 12);

// bar 3: G4 with vibrato (wobble of +-0.3 semitone, no overall change), then C5 slides up four semitones
setRange(8 * BEAT, 2);
noteOn(8 * BEAT, 67);
for (let i = 0; i < 48; i++) bend(8 * BEAT + (i * 2 * BEAT) / 48, 0.3 * Math.sin(i / 48 * 2 * Math.PI * 6), 2);
bend(10 * BEAT, 0, 2);
noteOff(10 * BEAT, 67);
setRange(10 * BEAT, 12);
noteOn(10 * BEAT, 72);
for (let i = 0; i <= 12; i++) bend(10 * BEAT + BEAT / 2 + (i * 1.5 * BEAT) / 12, 4 * i / 12, 12);
noteOff(12 * BEAT, 72);
bend(12 * BEAT, 0, 12);

// bar 4: D5 scooped (starts a semitone low and slides up onto the note), then A4 with a bend (dips and returns)
bend(12 * BEAT, -1, 12);
noteOn(12 * BEAT, 74);
for (let i = 1; i <= 10; i++) bend(12 * BEAT + (i * 0.6 * BEAT) / 10, -1 + i / 10, 12);
noteOff(14 * BEAT, 74);
noteOn(14 * BEAT, 69);
for (let i = 1; i <= 16; i++) bend(14 * BEAT + (i * BEAT) / 16, -0.8 * Math.sin(Math.PI * i / 16), 12);
noteOff(16 * BEAT, 69);

// bar 5: E5 that falls away over its last beat without arriving on another note
noteOn(16 * BEAT, 76);
for (let i = 1; i <= 12; i++) bend(19 * BEAT + (i * 0.95 * BEAT) / 12, -0.6 * i / 12, 12);
noteOff(20 * BEAT, 76);
bend(20 * BEAT, 0, 12);

ev.sort((a, b) => a.tick - b.tick || a.order - b.order);

const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
const track = [];
const meta = (type, data) => track.push(0, 0xff, type, data.length, ...data);
meta(0x03, [...Buffer.from('Violin (slides)')]);
meta(0x51, [0x09, 0x27, 0xc0]);       // 600000 us per quarter = 100 bpm
meta(0x58, [4, 2, 24, 8]);
let last = 0;
for (const e of ev) { track.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; }
track.push(...vlq(0), 0xff, 0x2f, 0);

const head = Buffer.from([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, PPQ >> 8, PPQ & 255]);
const trk = Buffer.concat([Buffer.from('MTrk'), Buffer.from([(track.length >>> 24) & 255, (track.length >>> 16) & 255, (track.length >>> 8) & 255, track.length & 255]), Buffer.from(track)]);
fs.writeFileSync(require('path').join(__dirname, '..', 'midi', 'GlissandoDemo.mid'), Buffer.concat([head, trk]));
console.log('written', head.length + trk.length, 'bytes');
