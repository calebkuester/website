// Checks the engraver (../js/engrave.js) against rhythms whose correct notation is known,
// then prints how it writes the sample files.
//
//   node test-engrave.js
//
// Each event is shown as value:pitches. The value is w h q e s t (whole to thirty-second),
// with '.' for a dot and '3' for a triplet. r is a rest, [ ] a beam, ~ a tie, ! staccato,
// {mf} a dynamic, and # b n in front of a pitch is a printed sharp, flat or natural.
const fs = require('fs');
const ROOT = require('path').join(__dirname, '..') + '/';
const Engrave = require(ROOT + 'js/engrave.js');
const MidiParser = require(ROOT + 'js/midi-parser.js');

const PPQ = 480;
const NAMES = { 1: 'w', 2: 'h', 4: 'q', 8: 'e', 16: 's', 32: 't' };
const LETTERS = 'CDEFGAB';
function show(event) {
	let s = NAMES[event.value.base] + '.'.repeat(event.value.dots) + (event.value.tuplet ? '3' : '');
	if (event.type === 'rest') return 'r' + s + (event.wholeMeasure ? '(bar)' : '');
	const pitches = event.notes.map((n) => (n.accidental === null ? '' : ['b', 'n', '#'][n.accidental + 1]) + LETTERS[n.letter] + (Math.floor(n.diatonic / 7))).join('+');
	return s + ':' + pitches + (event.notes[0].tieNext ? '~' : '') + (event.staccato ? '!' : '') + (event.dynamic ? '{' + event.dynamic + '}' : '');
}
function line(model, count) {
	return model.measures.slice(0, count || 99).map((m) => {
		let i = 0;
		return m.events.map((e) => {
			const beamed = e.beam ? (e.beam[0] === e ? '[' : '') : '';
			const close = e.beam && e.beam[e.beam.length - 1] === e ? ']' : '';
			return beamed + show(e) + close;
		}).join(' ');
	}).join(' | ');
}
function score(notes, extra) {
	return Object.assign({ ppq: PPQ, timeSigs: [{ tick: 0, num: 4, den: 4 }], tempos: [{ tick: 0, usPerQuarter: 500000 }], keySigs: [], tracks: [] }, extra || {});
}
// [startInQuarters, lengthInQuarters, pitch, velocity]
function track(list) {
	return { notes: list.map(([start, length, pitch, velocity]) => ({ tick: Math.round(start * PPQ), duration: Math.round(length * PPQ), pitch: pitch === undefined ? 72 : pitch, velocity: velocity || 100 })) };
}
let failed = 0;
function check(name, got, want) {
	const ok = got === want;
	if (!ok) failed++;
	console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : '\n       got:  ' + got + '\n       want: ' + want));
}

// 1. four quarter notes
check('quarters', line(Engrave.engrave(score(), track([[0, 1], [1, 1], [2, 1], [3, 1]]))), 'q:C5 q:C5 q:C5 q:C5');
// 2. a note held across the bar line is tied
check('tie over bar line', line(Engrave.engrave(score(), track([[0, 3], [3, 2], [5, 3]]))), 'h.:C5 q:C5~ | q:C5 h.:C5');
// 3. dotted quarter + eighth, half
check('dotted', line(Engrave.engrave(score(), track([[0, 1.5], [1.5, 0.5], [2, 2]]))), 'q.:C5 e:C5 h:C5');
// 4. eighths are beamed per beat
check('beams', line(Engrave.engrave(score(), track([[0, .5], [.5, .5], [1, .5], [1.5, .5], [2, 2]]))), '[e:C5 e:C5] [e:C5 e:C5] h:C5');
// 5. rests fill silence; an empty bar is a bar rest
check('rests', line(Engrave.engrave(score(), track([[1, 1], [3, 1], [8, 4]]))), 'rq q:C5 rq q:C5 | rw(bar) | w:C5');
// 6. eighth-note triplets
check('triplets', line(Engrave.engrave(score(), track([[0, 1 / 3], [1 / 3, 1 / 3], [2 / 3, 1 / 3], [1, 3]]))), '[e3:C5 e3:C5 e3:C5] h.:C5');
// 7. notes played detached (90%) are still written at full value
check('detached', line(Engrave.engrave(score(), track([[0, .9], [1, .9], [2, .9], [3, .9]]))), 'q:C5 q:C5 q:C5 q:C5');
// 8. notes played at half length get a staccato dot
check('staccato', line(Engrave.engrave(score(), track([[0, .5], [1, .5], [2, 2]]))), 'q:C5! q:C5! h:C5');
// 9. an off-beat note that crosses the beat is split and tied
check('syncopation', line(Engrave.engrave(score(), track([[0, .5], [.5, 1], [1.5, .5], [2, 2]]))), '[e:C5 e:C5~] [e:C5 e:C5] h:C5');
// 10. chords
check('chord', line(Engrave.engrave(score(), track([[0, 4, 60], [0, 4, 64], [0, 4, 67]]))), 'w:C4+E4+G4');
// 11. accidentals: printed once per bar, restated in the next, and naturals cancel
check('accidentals', line(Engrave.engrave(score(), track([[0, 1, 73], [1, 1, 73], [2, 1, 72], [3, 1, 73], [4, 4, 73]]))), 'q:#C5 q:C5 q:nC5 q:#C5 | w:#C5');
// 12. key signature: D major (2 sharps) needs no accidental on F sharp or C sharp, and a natural on C
check('key signature', line(Engrave.engrave(score(null, { keySigs: [{ tick: 0, sharps: 2 }] }), track([[0, 1, 66], [1, 1, 73], [2, 1, 72], [3, 1, 74]]))), 'q:F4 q:C5 q:nC5 q:D5');
// 13. flat key spells with flats: B flat major, E flat is in the key, A flat is not
check('flat key', line(Engrave.engrave(score(null, { keySigs: [{ tick: 0, sharps: -2 }] }), track([[0, 1, 70], [1, 1, 75], [2, 1, 68], [3, 1, 69]]))), 'q:B4 q:E5 q:bA4 q:nA4');
// 14. 3/4 time: a dotted half fills the bar
check('three four', line(Engrave.engrave(score(null, { timeSigs: [{ tick: 0, num: 3, den: 4 }] }), track([[0, 3], [3, 1], [4, 2]]))), 'h.:C5 | q:C5 h:C5');
// 15. 6/8: beats are dotted quarters, eighths beam in threes
check('six eight', line(Engrave.engrave(score(null, { timeSigs: [{ tick: 0, num: 6, den: 8 }] }), track([[0, .5], [.5, .5], [1, .5], [1.5, 1.5]]))), '[e:C5 e:C5 e:C5] q.:C5');
// 16. sixteenths
check('sixteenths', line(Engrave.engrave(score(), track([[0, .25], [.25, .25], [.5, .25], [.75, .25], [1, 3]]))), '[s:C5 s:C5 s:C5 s:C5] h.:C5');
// 17. dynamics only where the level changes and lasts
check('dynamics', line(Engrave.engrave(score(), track([[0, 1, 72, 50], [1, 1, 72, 50], [2, 1, 72, 50], [3, 1, 72, 50], [4, 1, 72, 100], [5, 1, 72, 100], [6, 1, 72, 100], [7, 1, 72, 100]]))), 'q:C5{p} q:C5 q:C5 q:C5 | q:C5{f} q:C5 q:C5 q:C5');
// 18. a half note starting on beat 2 is written as one note
check('tie in bar', line(Engrave.engrave(score(), track([[0, 1], [1, 2], [3, 1]]))), 'q:C5 h:C5 q:C5');
// 19. slurs: only the legato run, when the part is not all legato
{
	const model = Engrave.engrave(score(), track([[0, 1, 60], [1, 1, 62], [2, 1, 64], [3, .9, 65], [4, .9, 67], [5, .9, 69], [6, .9, 71], [7, .9, 72], [8, .9, 72], [9, .9, 72]]));
	check('slur', model.slurs.map((s) => s.from.notes[0].pitch + '-' + s.to.notes[0].pitch).join(','), '60-65');
}
// 20. tempo marks
{
	const model = Engrave.engrave(score(null, { tempos: [{ tick: 0, usPerQuarter: 500000 }, { tick: PPQ * 8, usPerQuarter: 1000000 }] }), track([[0, 4], [4, 4], [8, 4]]));
	check('tempo', model.measures.map((m) => m.tempo).join(','), '120,,60');
}

console.log(failed ? '\n' + failed + ' FAILED' : '\nall passed');
process.exitCode = failed ? 1 : 0;

// what the real sample looks like
for (const [file, name] of [['FrogsTheme.mid', 'Pan Flute'], ['FrogsTheme.mid', 'Strings'], ['FrogsTheme.mid', 'Bass'], ['GlissandoDemo.mid', null]]) {
	const b = fs.readFileSync(ROOT + 'midi/' + file);
	const s = MidiParser.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
	const t = s.tracks.find((x) => x.name === name) || s.tracks[0];
	const model = Engrave.engrave(s, t);
	const all = model.measures.flatMap((m) => m.events);
	console.log('\n' + file + ' / ' + t.name + ': ' + model.measures.length + ' measures, clef ' + model.clef + (model.shift ? ' 8va' : '') +
		', notes ' + all.filter((e) => e.type === 'note').length + ', rests ' + all.filter((e) => e.type === 'rest').length +
		', ties ' + all.filter((e) => e.type === 'note' && e.notes[0].tieNext).length + ', triplet groups ' + model.measures.reduce((n, m) => n + m.tuplets.length, 0) +
		', slurs ' + model.slurs.length + ', staccato ' + all.filter((e) => e.staccato).length + ', dynamics ' + all.filter((e) => e.dynamic).length);
	console.log('  ' + line(model, 4));
}
