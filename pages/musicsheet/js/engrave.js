/*
 * Turns the raw notes of a MIDI track into notated music: which note values,
 * rests, ties, beams, triplets, accidentals, slurs and dynamics to draw.
 * It decides what to write; notation.js decides where and draws it.
 *
 *   var model = Engrave.engrave(score, track, transpose);
 *
 * `transpose` (semitones, optional) says the part is being played that much higher or
 * lower than the file has it; it is then written where it is played. Without it the part
 * is written at the pitch in the file, an octave nearer the staff if it lies far outside.
 *
 * model = {
 *   clef: 'treble' | 'bass',
 *   shift,                           // semitones from the pitch in the file to the written pitch
 *   asPlayed,                        // true: the written pitch is what sounds. false: a shift of -12 is marked 8va, 12 is marked 8vb
 *   measures: [{
 *     index, startTick, endTick, num, den, beat,
 *     showSig,                       // a time signature is written here
 *     key, showKey,                  // sharps (+) or flats (-) in force; written here when it changes
 *     tempo,                         // beats per minute to print here, or null
 *     events: [event], tuplets: [[event]]
 *   }],
 *   slurs: [{from: event, to: event}]
 * }
 *
 * event = {
 *   type: 'note' | 'rest',
 *   measure,                         // index of its measure
 *   tick,                            // where it sits in time (the played start for a note's first part)
 *   qTick, qLen,                     // its place and length on the notated grid, in ticks
 *   value: {base, dots, tuplet},     // base: 1 whole, 2 half, 4 quarter ... 32; tuplet: 3 for a triplet
 *   notes: [{pitch, letter, alter, diatonic, accidental, tieNext, tiePrev, source}],
 *                                    // accidental: null, or the alteration to print (1 sharp, -1 flat, 0 natural)
 *   first,                           // false for the later parts of a note split by ties
 *   nextPart,                        // the event this one is tied to, or null
 *   staccato, wholeMeasure (rests), dynamic ('p', 'mf' ...), beam: [event] | null
 * }
 *
 * The music is treated as a single line of rhythm: notes that start together
 * form a chord, and a chord ends when the next one starts.
 */
(function (global) {
	'use strict';

	var EPS = 1e-6;
	var LETTER_PITCH = [0, 2, 4, 5, 7, 9, 11];     // C D E F G A B
	var SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6];       // F C G D A E B
	var FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3];        // B E A D G C F
	// MIDI velocity at the centre of each dynamic level
	var DYNAMICS = [['pp', 33], ['p', 49], ['mp', 64], ['mf', 80], ['f', 96], ['ff', 112]];
	// note values in quarter notes, largest first
	var VALUES = [
		{ quarters: 6, base: 1, dots: 1 }, { quarters: 4, base: 1, dots: 0 },
		{ quarters: 3, base: 2, dots: 1 }, { quarters: 2, base: 2, dots: 0 },
		{ quarters: 1.5, base: 4, dots: 1 }, { quarters: 1, base: 4, dots: 0 },
		{ quarters: 0.75, base: 8, dots: 1 }, { quarters: 0.5, base: 8, dots: 0 },
		{ quarters: 0.375, base: 16, dots: 1 }, { quarters: 0.25, base: 16, dots: 0 },
		{ quarters: 0.125, base: 32, dots: 0 }
	];

	/* ---------- pitch spelling ---------- */

	// which letters a key signature alters: index by letter, value +1 sharp / -1 flat / 0
	function keyAlterations(sharps) {
		var alterations = [0, 0, 0, 0, 0, 0, 0];
		for (var i = 0; i < Math.min(7, Math.abs(sharps)); i++) {
			if (sharps > 0) { alterations[SHARP_ORDER[i]] = 1; } else { alterations[FLAT_ORDER[i]] = -1; }
		}
		return alterations;
	}

	/*
	 * Name a MIDI pitch in a key. A note of the key's scale gets its scale name
	 * (E sharp in F sharp major); otherwise a natural if there is one; otherwise
	 * a sharp in sharp keys and a flat in flat keys.
	 */
	function spell(pitch, sharps) {
		var alterations = keyAlterations(sharps);
		var pitchClass = ((pitch % 12) + 12) % 12;
		var choice = null, natural = null, fallback = null;
		for (var letter = 0; letter < 7; letter++) {
			for (var alter = -1; alter <= 1; alter++) {
				if ((LETTER_PITCH[letter] + alter + 12) % 12 !== pitchClass) { continue; }
				if (alterations[letter] === alter && !choice) { choice = { letter: letter, alter: alter }; }
				if (alter === 0) { natural = { letter: letter, alter: 0 }; }
				if (alter === (sharps >= 0 ? 1 : -1)) { fallback = { letter: letter, alter: alter }; }
			}
		}
		var result = choice || natural || fallback;
		var octave = Math.floor((pitch - result.alter) / 12) - 1;
		return { letter: result.letter, alter: result.alter, diatonic: octave * 7 + result.letter };
	}

	/*
	 * Many MIDI files state no key, or state C major by default whatever the
	 * music is in. In that case find the key signature that fits the notes of
	 * the whole song best (the one leaving the fewest notes needing accidentals).
	 * A key the file does state is always used as given.
	 */
	function inferKey(score) {
		if (score.inferredKey !== undefined) { return score.inferredKey; }
		var stated = (score.keySigs || []).some(function (k) { return k.sharps !== 0; });
		var weight = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], total = 0;
		(score.tracks || []).forEach(function (track) {
			if (track.percussion) { return; }
			track.notes.forEach(function (n) { weight[n.pitch % 12] += n.duration; total += n.duration; });
		});
		var best = 0;
		if (!stated && total > 0) {
			var outside = function (sharps) {
				var tonic = ((sharps * 7) % 12 + 12) % 12, sum = 0;
				[1, 3, 6, 8, 10].forEach(function (step) { sum += weight[(tonic + step) % 12]; });
				return sum;
			};
			var order = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];     // simpler signatures win ties
			order.forEach(function (sharps) { if (outside(sharps) < outside(best) - EPS) { best = sharps; } });
			// keep C unless another key is clearly better
			if (outside(0) - outside(best) < 0.05 * total) { best = 0; }
		}
		score.inferredKey = best;
		return best;
	}

	/* ---------- measures ---------- */

	function buildMeasures(score, endTick) {
		var ppq = score.ppq, sigs = score.timeSigs, sigIndex = 0;
		var measures = [], tick = 0;
		while ((tick < endTick || !measures.length) && measures.length < 3000) {
			var changed = measures.length === 0;
			while (sigIndex + 1 < sigs.length && sigs[sigIndex + 1].tick <= tick) { sigIndex++; changed = true; }
			var sig = sigs[sigIndex];
			var length = Math.round(ppq * 4 * sig.num / sig.den);
			// the beat: a dotted note in compound time (6/8, 9/8, 12/8), otherwise the bottom number
			var compound = sig.den >= 8 && sig.num % 3 === 0 && sig.num > 3;
			var beat = ppq * 4 / sig.den * (compound ? 3 : 1);
			measures.push({
				index: measures.length, startTick: tick, endTick: tick + length, num: sig.num, den: sig.den,
				beat: beat, compound: compound, showSig: changed, key: 0, showKey: false, tempo: null,
				beats: [], events: [], tuplets: []
			});
			tick += length;
		}

		// key signature in force in each measure
		var inferred = inferKey(score);
		var keys = inferred ? [{ tick: 0, sharps: inferred }] : (score.keySigs || []);
		var keyIndex = -1, previousKey = keys.length && keys[0].tick <= ppq / 16 ? keys[0].sharps : 0;
		measures.forEach(function (m, i) {
			while (keyIndex + 1 < keys.length && keys[keyIndex + 1].tick <= m.startTick + ppq / 16) { keyIndex++; }
			m.key = keyIndex >= 0 ? keys[keyIndex].sharps : 0;
			m.showKey = i > 0 && m.key !== previousKey;
			previousKey = m.key;
		});

		// tempo marks: at the start, and where the tempo has clearly changed
		var tempos = score.tempos || [], tempoIndex = 0, shown = 0;
		measures.forEach(function (m, i) {
			while (tempoIndex + 1 < tempos.length && tempos[tempoIndex + 1].tick <= m.startTick + ppq / 16) { tempoIndex++; }
			var bpm = tempos.length ? 60000000 / tempos[tempoIndex].usPerQuarter : 120;
			if (i === 0 || Math.abs(bpm - shown) / shown > 0.04) { m.tempo = Math.round(bpm); shown = bpm; }
		});
		return measures;
	}

	function measureAt(measures, tick) {
		var lo = 0, hi = measures.length - 1;
		while (lo < hi) {
			var mid = (lo + hi + 1) >> 1;
			if (measures[mid].startTick <= tick) { lo = mid; } else { hi = mid - 1; }
		}
		return measures[lo];
	}

	/* ---------- the rhythm grid ---------- */

	/*
	 * Each beat gets the coarsest grid its notes fit: sixteenths, else eighth
	 * triplets, else thirty-seconds, else sixteenth triplets. A triplet grid is
	 * only chosen when the notes sit on it cleanly.
	 */
	function chooseGrids(measures, notes) {
		measures.forEach(function (m) {
			var count = Math.max(1, Math.round((m.endTick - m.startTick) / m.beat));
			for (var b = 0; b < count; b++) {
				m.beats.push({ start: m.startTick + b * m.beat, length: m.beat, step: m.beat / (m.compound ? 6 : 4), triplet: false, onsets: [] });
			}
		});
		notes.forEach(function (n) {
			var m = measureAt(measures, n.tick);
			var beat = m.beats[Math.min(m.beats.length - 1, Math.max(0, Math.floor((n.tick - m.startTick) / m.beat)))];
			beat.onsets.push(n.tick - beat.start);
		});
		measures.forEach(function (m) {
			m.beats.forEach(function (beat) {
				if (!beat.onsets.length) { return; }
				var tolerance = beat.length / 20;
				function worst(step) {
					var error = 0;
					beat.onsets.forEach(function (t) { error = Math.max(error, Math.abs(t - Math.round(t / step) * step)); });
					return error;
				}
				var candidates = m.compound
					? [[beat.length / 6, false], [beat.length / 12, false]]
					: [[beat.length / 4, false], [beat.length / 3, true], [beat.length / 8, false], [beat.length / 6, true]];
				var chosen = m.compound ? candidates[1] : candidates[2];        // fall back to the finest straight grid
				for (var i = 0; i < candidates.length; i++) {
					if (worst(candidates[i][0]) <= tolerance) { chosen = candidates[i]; break; }
				}
				beat.step = chosen[0];
				beat.triplet = chosen[1];
			});
		});
	}

	function beatAt(measures, tick) {
		var m = measureAt(measures, tick);
		return m.beats[Math.min(m.beats.length - 1, Math.max(0, Math.floor((tick - m.startTick) / m.beat + EPS)))];
	}

	function quantize(measures, tick) {
		var beat = beatAt(measures, tick);
		return beat.start + Math.round((tick - beat.start) / beat.step) * beat.step;
	}

	/* ---------- chords: notes that start together ---------- */

	function buildChords(measures, notes, ppq) {
		var chords = [];
		notes.forEach(function (n) {
			var start = quantize(measures, n.tick);
			var last = chords[chords.length - 1];
			if (last && Math.abs(last.start - start) < EPS) {
				last.notes.push(n);
				last.played = Math.min(last.played, n.tick);
				last.playedEnd = Math.max(last.playedEnd, n.tick + n.duration);
			} else {
				chords.push({ start: start, end: 0, notes: [n], played: n.tick, playedEnd: n.tick + n.duration, staccato: false, legato: false });
			}
		});
		chords.sort(function (a, b) { return a.start - b.start; });

		// Where a note followed by silence is written to end. Players release a note a little
		// early, so a length just short of a plain note value is that value; otherwise the grid decides.
		function writtenEnd(chord, smallest) {
			var sounded = chord.playedEnd - chord.played;
			for (var v = VALUES.length - 1; v >= 0; v--) {
				var length = VALUES[v].quarters * ppq;
				if (length >= sounded - EPS && (length - sounded) / length <= 0.2) { return chord.start + length; }
			}
			return Math.max(chord.start + smallest, quantize(measures, chord.playedEnd));
		}

		chords.forEach(function (chord, i) {
			var next = chords[i + 1];
			var smallest = beatAt(measures, chord.start).step;
			var sounded = chord.playedEnd - chord.start;
			if (!next) {
				chord.end = writtenEnd(chord, smallest);
				return;
			}
			var interval = next.played - chord.played;
			if (interval <= 0) { interval = next.start - chord.start; }
			sounded = chord.playedEnd - chord.played;
			var ratio = sounded / interval;
			if (ratio > 0.5 + EPS && interval - sounded <= ppq / 2) {
				// played (nearly) up to the next note: written at full length
				chord.end = next.start;
				chord.legato = ratio >= 0.985;
			} else if (next.start - chord.start <= ppq + EPS && ratio >= 0.2 && ratio <= 0.5 + EPS) {
				// clearly shortened: full length with a staccato dot
				chord.end = next.start;
				chord.staccato = true;
			} else {
				chord.end = Math.min(next.start, writtenEnd(chord, smallest));
			}
		});
		return chords;
	}

	/* ---------- splitting a length into note values ---------- */

	/*
	 * Split [from, to) inside one measure into values that can be written,
	 * to be joined by ties. A value that starts off the beat does not run past
	 * the next beat, and long values start where they conventionally may.
	 */
	function decompose(measure, from, to, ppq) {
		var parts = [];
		var p = from, guard = 0;
		while (p < to - EPS && guard++ < 200) {
			var relative = p - measure.startTick;
			var beatIndex = Math.min(measure.beats.length - 1, Math.floor(relative / measure.beat + EPS));
			var beat = measure.beats[beatIndex];
			var beatEnd = beat.start + beat.length;
			var onBeat = Math.abs(p - beat.start) < EPS;

			// inside a triplet beat, unless the value fills the whole beat from its start
			if (beat.triplet && !(onBeat && to >= beatEnd - EPS)) {
				var unit = beat.length / 6;                     // a sixteenth triplet
				var offset = Math.round((p - beat.start) / unit);
				var units = Math.max(1, Math.round((Math.min(to, beatEnd) - p) / unit));
				var take = units >= 4 && offset % 2 === 0 ? 4 : (units >= 2 && offset % 2 === 0 ? 2 : 1);
				// the value three of these make up: a triplet eighth is written as an eighth, and so on
				var normal = measure.den * (take === 4 ? 1 : (take === 2 ? 2 : 4));
				parts.push({ tick: p, length: take * unit, value: { base: normal, dots: 0, tuplet: 3 } });
				p += take * unit;
				continue;
			}

			var limit = to - p;
			if (!onBeat) { limit = Math.min(limit, beatEnd - p); }
			// stop before a triplet beat that this value would only partly cover
			for (var j = beatIndex + (onBeat ? 0 : 1); j < measure.beats.length; j++) {
				var later = measure.beats[j];
				if (later.start >= to - EPS) { break; }
				if (later.triplet && to < later.start + later.length - EPS && later.start > p + EPS) {
					limit = Math.min(limit, later.start - p);
					break;
				}
			}

			var chosen = null;
			for (var v = 0; v < VALUES.length; v++) {
				var length = VALUES[v].quarters * ppq;
				if (length > limit + EPS) { continue; }
				// what its start must line up with: its own size, or just the beat for anything a beat or longer
				var grain = Math.min(measure.beat, (4 / VALUES[v].base) * ppq / (VALUES[v].dots ? 2 : 1));
				var remainder = relative % grain;
				if (remainder > EPS && grain - remainder > EPS) { continue; }
				chosen = VALUES[v];
				break;
			}
			if (!chosen) {
				// shorter than anything on the grid: write the shortest value
				parts.push({ tick: p, length: to - p, value: { base: 32, dots: 0, tuplet: 0 } });
				break;
			}
			parts.push({ tick: p, length: chosen.quarters * ppq, value: { base: chosen.base, dots: chosen.dots, tuplet: 0 } });
			p += chosen.quarters * ppq;
		}
		return parts;
	}

	/* ---------- putting it together ---------- */

	function dynamicFor(velocity) {
		var best = DYNAMICS[0];
		DYNAMICS.forEach(function (d) { if (Math.abs(d[1] - velocity) < Math.abs(best[1] - velocity)) { best = d; } });
		return best[0];
	}

	function engrave(score, track, transpose) {
		var ppq = score.ppq;
		var notes = track.notes.slice().sort(function (a, b) { return a.tick - b.tick || a.pitch - b.pitch; });
		var endTick = 0;
		notes.forEach(function (n) { endTick = Math.max(endTick, n.tick + n.duration); });

		var pitches = notes.map(function (n) { return n.pitch; }).sort(function (a, b) { return a - b; });
		var asPlayed = typeof transpose === 'number';
		var median = (pitches.length ? pitches[pitches.length >> 1] : 69) + (asPlayed ? transpose : 0);
		var model = {
			clef: median < 57 ? 'bass' : 'treble',
			// a part written as played keeps its transposition; otherwise very high or very low parts are written an octave nearer the staff
			shift: asPlayed ? transpose : (median >= 81 ? -12 : (median <= 40 ? 12 : 0)),
			asPlayed: asPlayed,
			measures: buildMeasures(score, endTick),
			slurs: []
		};
		var measures = model.measures;
		chooseGrids(measures, notes);
		var chords = buildChords(measures, notes, ppq);

		// a note that would end past the last bar line is cut there
		var songEnd = measures[measures.length - 1].endTick;
		chords.forEach(function (chord) { chord.end = Math.min(chord.end, songEnd); chord.parts = []; });

		// spans of sound and silence, in order
		var spans = [], cursor = 0;
		chords.forEach(function (chord) {
			if (chord.end <= chord.start + EPS) { return; }
			if (chord.start > cursor + EPS) { spans.push({ from: cursor, to: chord.start, chord: null }); }
			spans.push({ from: chord.start, to: chord.end, chord: chord });
			cursor = Math.max(cursor, chord.end);
		});
		if (cursor < songEnd - EPS) { spans.push({ from: cursor, to: songEnd, chord: null }); }

		// cut each span at the bar lines, then into note values
		spans.forEach(function (span) {
			var p = span.from;
			while (p < span.to - EPS) {
				var m = measureAt(measures, p + EPS);
				var until = Math.min(span.to, m.endTick);
				var whole = !span.chord && p <= m.startTick + EPS && until >= m.endTick - EPS;
				var parts = whole
					? [{ tick: p, length: m.endTick - m.startTick, value: { base: 1, dots: 0, tuplet: 0 } }]
					: decompose(m, p, until, ppq);
				parts.forEach(function (part) {
					var event = {
						type: span.chord ? 'note' : 'rest', measure: m.index,
						tick: part.tick, qTick: part.tick, qLen: part.length, value: part.value,
						notes: [], first: true, staccato: false, wholeMeasure: whole, dynamic: null, beam: null, nextPart: null
					};
					if (span.chord) {
						event.first = span.chord.parts.length === 0;
						// the first part sits where the note was actually played, so the playhead meets it on time
						if (event.first && span.chord.played >= m.startTick && span.chord.played < m.endTick) { event.tick = span.chord.played; }
						event.playedEnd = span.chord.playedEnd;       // when the sound stops, used for the last part of a note
						event.staccato = span.chord.staccato && event.first;
						event.notes = span.chord.notes.map(function (n) {
							var spelled = spell(n.pitch + model.shift, m.key);
							return {
								pitch: n.pitch, letter: spelled.letter, alter: spelled.alter, diatonic: spelled.diatonic,
								accidental: null, tieNext: false, tiePrev: !event.first, source: n
							};
						}).sort(function (a, b) { return a.diatonic - b.diatonic || a.pitch - b.pitch; });
						var previous = span.chord.parts[span.chord.parts.length - 1];
						if (previous) {
							previous.notes.forEach(function (note) { note.tieNext = true; });
							previous.nextPart = event;
						}
						span.chord.parts.push(event);
					}
					m.events.push(event);
				});
				p = until;
			}
		});

		measures.forEach(function (m) {
			var alterations = keyAlterations(m.key);

			// accidentals: print one when a note differs from what is in force on its line or space
			var inForce = {};
			m.events.forEach(function (event) {
				event.notes.forEach(function (note) {
					if (note.tiePrev) { return; }       // a tied note keeps the accidental of the note it continues
					var current = inForce[note.diatonic] === undefined ? alterations[note.letter] : inForce[note.diatonic];
					if (note.alter !== current) { note.accidental = note.alter; }
					inForce[note.diatonic] = note.alter;
				});
			});

			// beams: runs of eighths or shorter within one beat
			var run = [];
			function closeRun() {
				if (run.length > 1) { var beam = run.slice(); beam.forEach(function (event) { event.beam = beam; }); }
				run = [];
			}
			m.events.forEach(function (event) {
				var beatIndex = Math.floor((event.qTick - m.startTick) / m.beat + EPS);
				if (event.type !== 'note' || event.value.base < 8) { closeRun(); return; }
				if (run.length && run.beatIndex !== beatIndex) { closeRun(); }
				run.push(event);
				run.beatIndex = beatIndex;
			});
			closeRun();

			// triplet groups: the triplet values of one beat
			var group = [], groupBeat = -1;
			m.events.forEach(function (event) {
				var beatIndex = Math.floor((event.qTick - m.startTick) / m.beat + EPS);
				if (event.value.tuplet && beatIndex === groupBeat) { group.push(event); return; }
				if (group.length) { m.tuplets.push(group); }
				group = event.value.tuplet ? [event] : [];
				groupBeat = beatIndex;
			});
			if (group.length) { m.tuplets.push(group); }
		});

		// slurs over runs of legato notes, unless the whole part is played legato (then it is just how the file was made)
		var sounding = chords.filter(function (chord) { return chord.parts.length; });
		var joined = sounding.filter(function (chord) { return chord.legato; }).length;
		if (sounding.length > 1 && joined / (sounding.length - 1) <= 0.85) {
			var runStart = -1;
			for (var c = 0; c < sounding.length; c++) {
				var continues = sounding[c].legato && c + 1 < sounding.length &&
					Math.abs(sounding[c + 1].start - sounding[c].end) < EPS && !samePitches(sounding[c], sounding[c + 1]);
				if (continues && runStart < 0) { runStart = c; }
				if (!continues && runStart >= 0) {
					model.slurs.push({ from: sounding[runStart].parts[0], to: sounding[c].parts[0] });
					runStart = -1;
				}
			}
		}

		// dynamics from how hard the notes are struck; nothing is printed if it never changes
		var levels = sounding.map(function (chord) {
			var total = 0;
			chord.notes.forEach(function (n) { total += n.velocity; });
			return dynamicFor(total / chord.notes.length);
		});
		var distinct = levels.filter(function (level, i) { return levels.indexOf(level) === i; });
		if (distinct.length > 1) {
			var current = null;
			levels.forEach(function (level, i) {
				if (level === current) { return; }
				// only when it lasts: most of the next few notes are at this level too
				var ahead = levels.slice(i, i + 4);
				var same = ahead.filter(function (l) { return l === level; }).length;
				if (same >= Math.min(3, ahead.length)) {
					sounding[i].parts[0].dynamic = level;
					current = level;
				}
			});
		}
		return model;
	}

	function samePitches(a, b) {
		if (a.notes.length !== b.notes.length) { return false; }
		var first = a.notes.map(function (n) { return n.pitch; }).sort().join(',');
		var second = b.notes.map(function (n) { return n.pitch; }).sort().join(',');
		return first === second;
	}

	global.Engrave = { engrave: engrave, spell: spell, keyAlterations: keyAlterations };
	if (typeof module === 'object' && module.exports) { module.exports = global.Engrave; }
})(typeof window !== 'undefined' ? window : globalThis);
