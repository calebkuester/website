/*
 * Draws one MIDI track as a music sheet on a canvas and maps between ticks
 * and positions on that sheet.
 *
 *   var sheet = new Notation(scrollElement, canvas);
 *   sheet.setTrack(score, track, transpose);   // engrave, lay out and draw; transpose: semitones the part is played
 *                                               // above the file's pitch (it is written where it is played)
 *   sheet.pointForTick(tick)          // -> {x, top, height, system}
 *   sheet.tickForPoint(x, y)          // -> tick (for click-to-seek)
 *
 * engrave.js decides what to write (note values, rests, ties, beams, triplets,
 * accidentals, slurs, dynamics). This file decides where it goes and draws it:
 * clef, key and time signatures, notes and rests, stems, flags and beams, dots,
 * ties and slurs, triplet marks, staccato, dynamics, tempo marks, lyrics and
 * marker text, and what pitch bend does to a note: glissando lines for notes
 * that slide to another note, and scoops, bends, falls and vibrato for the rest.
 */
(function (global) {
	'use strict';

	var S = 10;                 // staff space (distance between two staff lines), px
	var TOP_PAD = 7.5 * S;      // room above each staff for leger lines, tempo and text
	var BOTTOM_PAD = 8.5 * S;   // room below for leger lines, dynamics and lyrics
	var SYSTEM_HEIGHT = TOP_PAD + 4 * S + BOTTOM_PAD;
	var LEFT_MARGIN = 16;
	var RIGHT_MARGIN = 16;
	var CLEF_WIDTH = 54;
	var MIN_MEASURE_WIDTH = 230;
	var MAX_MEASURE_WIDTH = 760;
	var BAR_PAD = 11;           // from a bar line to the downbeat that follows it
	var START_PAD = 18;         // from the clef and signatures to the first downbeat of a system
	var SIG_PAD = 24;           // room for a time signature
	var KEY_STEP = 10;          // room for each sharp or flat of a key signature
	var LAST_NOTE_ROOM = 22;    // from the last note of a measure to the next downbeat, at least
	var NOTE_GAP = 18;          // minimum px between neighbouring notes
	var ACCIDENTAL_ROOM = 9;    // extra px in front of a note that has an accidental
	var HEAD_RX = S * 0.66, HEAD_RY = S * 0.48;   // note head radii
	var CUE_SCALE = 0.7;                        // size of a glissando arrival note
	var STEM = 3.5 * S;
	var BEAM_THICKNESS = S * 0.5, BEAM_GAP = S * 0.25;
	var INK = '#1b1b1b';
	var SHARP = String.fromCharCode(0x266F), FLAT = String.fromCharCode(0x266D), NATURAL = String.fromCharCode(0x266E);
	var SYMBOL_FONT = '"Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", "Noto Sans Symbols2", serif';
	var TEXT_FONT = 'Georgia, "Times New Roman", serif';

	// diatonic number (octave * 7 + letter) of the bottom staff line
	var CLEF_BASE = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };   // E4, G2
	// staff positions of the sharps and flats of a key signature, treble clef (bass is two lower)
	var KEY_SHARPS = [8, 5, 9, 6, 3, 7, 4];
	var KEY_FLATS = [4, 7, 3, 6, 2, 5, 1];

	function accidentalGlyph(alter) { return alter > 0 ? SHARP : (alter < 0 ? FLAT : NATURAL); }
	function keyWidth(sharps) { return sharps ? Math.min(7, Math.abs(sharps)) * KEY_STEP + 6 : 0; }

	function Notation(scroller, canvas) {
		this.scroller = scroller;
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
		this.score = null;
		this.track = null;
		this.model = null;
		this.measures = [];
		this.perSystem = 1;
		this.systems = [];           // per line of music: {first, count, x0, w}
		this.geometry = null;        // event -> where it was drawn
		this.clef = 'treble';
		this.shift = 0;              // octave shift applied when drawing (-12 = 8va, 12 = 8vb)
		this.neededWidth = 0;
		// a second canvas laid over the first, where the notes being played are redrawn in gold
		this.glowCanvas = document.createElement('canvas');
		this.glowCanvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
		canvas.parentNode.insertBefore(this.glowCanvas, canvas.nextSibling);
		this.glowCtx = this.glowCanvas.getContext('2d');
		this.glowing = false;
		this.clefImage = new Image();
		var self = this;
		this.clefImage.onload = function () { self.draw(); };
		this.clefImage.src = '/pages/musicsheet/images/gClef.svg';
	}

	Notation.prototype.setTrack = function (score, track, transpose) {
		this.score = score;
		this.track = track;
		this.model = Engrave.engrave(score, track, transpose);
		this.measures = this.model.measures;
		this.clef = this.model.clef;
		this.shift = this.model.shift;
		this.measureNeeds();
		this.relayout();
	};

	/* ---------- layout ---------- */

	// room a measure takes in front of its downbeat when it is not the first of its line
	Notation.prototype.midLead = function (index) {
		var m = this.measures[index];
		var lead = m.showSig ? SIG_PAD : 0;
		if (m.showKey) { lead += keyWidth(m.key || this.measures[index - 1].key) + 4; }
		return lead;
	};

	// room in front of the first downbeat of a line: key signature, and a time signature if one is due
	Notation.prototype.startLead = function (index) {
		var m = this.measures[index];
		return keyWidth(m.key) + (m.showSig ? SIG_PAD : 0);
	};

	/*
	 * Time maps to distance evenly along a line, so every measure is the same
	 * width. Find the width at which neighbouring notes do not collide and the
	 * last note of each measure stays clear of the bar line that follows it.
	 */
	Notation.prototype.measureNeeds = function () {
		// `needed` is what keeps notes apart; `roomy` also leaves space for accidentals and dots.
		// The extras may widen the music a little, but one tight spot does not stretch the whole piece.
		var self = this, measures = this.measures, needed = 0, roomy = 0;
		var smallestGap = this.score.ppq / 12;
		function hasAccidental(event) {
			return event.type === 'note' && event.notes.some(function (n) { return n.accidental !== null; });
		}
		measures.forEach(function (m, index) {
			var events = m.events.filter(function (e) { return !e.wholeMeasure; });
			if (!events.length) { return; }
			var length = m.endTick - m.startTick;
			for (var i = 1; i < events.length; i++) {
				var gap = events[i].tick - events[i - 1].tick;
				if (gap < smallestGap) { continue; }
				var extra = (hasAccidental(events[i]) ? ACCIDENTAL_ROOM : 0) + (events[i - 1].value.dots ? 5 : 0);
				needed = Math.max(needed, NOTE_GAP * length / gap);
				roomy = Math.max(roomy, (NOTE_GAP + extra) * length / gap);
			}
			var next = measures[index + 1];
			var after = LAST_NOTE_ROOM + (next ? self.midLead(index + 1) : 0);
			var remaining = Math.max(length / 64, m.endTick - events[events.length - 1].tick);
			needed = Math.max(needed, after * length / remaining);
			if (next && next.events.length && hasAccidental(next.events[0])) { after += ACCIDENTAL_ROOM; }
			roomy = Math.max(roomy, after * length / remaining);
		});
		this.neededWidth = Math.min(MAX_MEASURE_WIDTH, roomy, needed * 1.2);
	};

	/*
	 * Recompute geometry for the current container width and redraw.
	 *
	 * Each line of music (system) is one continuous time scale: its first downbeat
	 * is at x0 and every measure after it is w pixels further on, so a position in
	 * time is x0 + (measures elapsed) * w. Bar lines are drawn BAR_PAD before the
	 * downbeats. Nothing is skipped at a bar line, which is what lets the playhead
	 * cross the line at a steady speed and still meet every note on time.
	 */
	Notation.prototype.relayout = function () {
		if (!this.track) { return; }
		var width = Math.max(320, this.scroller.clientWidth);
		var base = LEFT_MARGIN + CLEF_WIDTH;
		var available = (width - RIGHT_MARGIN - 6) + BAR_PAD - (base + START_PAD);
		// the widest key signature takes room from every line
		var widestKey = 0;
		this.measures.forEach(function (m) { widestKey = Math.max(widestKey, keyWidth(m.key)); });
		var fit = Math.floor((available - widestKey) / Math.max(MIN_MEASURE_WIDTH, this.neededWidth));
		this.perSystem = Math.max(1, Math.min(8, fit));
		this.systemCount = Math.ceil(this.measures.length / this.perSystem);

		this.systems = [];
		for (var system = 0; system < this.systemCount; system++) {
			var first = system * this.perSystem;
			// what stands in front of the first downbeat shortens the line a little; it still ends at the same place
			var lead = this.startLead(first);
			this.systems.push({
				first: first,
				count: Math.min(this.measures.length, first + this.perSystem) - first,
				x0: base + lead + START_PAD,
				w: (available - lead) / this.perSystem
			});
		}

		var height = this.systemCount * SYSTEM_HEIGHT;
		var dpr = global.devicePixelRatio || 1;
		this.canvas.width = Math.round(width * dpr);
		this.canvas.height = Math.round(height * dpr);
		this.canvas.style.width = width + 'px';
		this.canvas.style.height = height + 'px';
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.glowCanvas.width = this.canvas.width;
		this.glowCanvas.height = this.canvas.height;
		this.glowCanvas.style.width = width + 'px';
		this.glowCanvas.style.height = height + 'px';
		this.glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.glowing = false;
		this.width = width;
		this.height = height;
		this.draw();
	};

	Notation.prototype.systemOf = function (index) {
		return this.systems[Math.floor(index / this.perSystem)];
	};

	/* x of the first beat of a measure */
	Notation.prototype.downbeatX = function (index) {
		var system = this.systemOf(index);
		return system.x0 + (index - system.first) * system.w;
	};

	/* x where a measure begins: the bar line before it, or the end of the clef on a new line */
	Notation.prototype.measureX = function (index) {
		var system = this.systemOf(index);
		if (index === system.first) { return LEFT_MARGIN + CLEF_WIDTH; }
		return this.downbeatX(index) - BAR_PAD - this.midLead(index);
	};

	/* x where the staff of a system ends: its closing bar line */
	Notation.prototype.systemRight = function (index) {
		var system = this.systems[index];
		return system.x0 + system.count * system.w - BAR_PAD;
	};

	Notation.prototype.measureIndexForTick = function (tick) {
		var ms = this.measures, lo = 0, hi = ms.length - 1;
		while (lo < hi) {
			var mid = (lo + hi + 1) >> 1;
			if (ms[mid].startTick <= tick) { lo = mid; } else { hi = mid - 1; }
		}
		return lo;
	};

	/* Position of a tick on the sheet. */
	Notation.prototype.pointForTick = function (tick) {
		var index = this.measureIndexForTick(tick);
		var m = this.measures[index];
		var fraction = Math.max(0, Math.min(1, (tick - m.startTick) / (m.endTick - m.startTick)));
		var system = Math.floor(index / this.perSystem);
		return {
			x: this.downbeatX(index) + fraction * this.systems[system].w,
			top: system * SYSTEM_HEIGHT,
			height: SYSTEM_HEIGHT,
			system: system
		};
	};

	/* Inverse of pointForTick, used for click-to-seek. */
	Notation.prototype.tickForPoint = function (x, y) {
		var row = Math.max(0, Math.min(this.systemCount - 1, Math.floor(y / SYSTEM_HEIGHT)));
		var system = this.systems[row];
		var col = Math.max(0, Math.min(system.count - 1, Math.floor((x - system.x0) / system.w)));
		var m = this.measures[system.first + col];
		var fraction = Math.max(0, Math.min(1, (x - system.x0) / system.w - col));
		return m.startTick + fraction * (m.endTick - m.startTick);
	};

	/* y of a staff position (0 = bottom line, +1 per line or space) on the system whose top edge is systemTop */
	Notation.prototype.yForPosition = function (position, systemTop) {
		return systemTop + TOP_PAD + 4 * S - position * S / 2;
	};

	/* How a pitch is written at a point in the piece: {pos, alter, accidental} (accidental null when the key covers it) */
	Notation.prototype.staffPosition = function (pitch, tick) {
		var key = this.measures[this.measureIndexForTick(tick || 0)].key;
		var spelled = Engrave.spell(pitch + this.shift, key);
		var inKey = Engrave.keyAlterations(key)[spelled.letter];
		return { pos: spelled.diatonic - CLEF_BASE[this.clef], alter: spelled.alter, accidental: spelled.alter === inKey ? null : spelled.alter };
	};

	Notation.prototype.yForPitch = function (pitch, systemTop, tick) {
		return this.yForPosition(this.staffPosition(pitch, tick).pos, systemTop);
	};

	/* ---------- drawing ---------- */

	Notation.prototype.draw = function () {
		if (!this.track) { return; }
		var ctx = this.ctx, self = this;
		ctx.clearRect(0, 0, this.width, this.height);
		ctx.fillStyle = INK;
		ctx.strokeStyle = INK;
		ctx.lineCap = 'butt';

		this.geometry = new Map();
		this.noteEvents = [];
		for (var s = 0; s < this.systemCount; s++) { this.drawSystemFrame(s); }
		this.measures.forEach(function (m) { self.placeMeasure(m); });
		this.measures.forEach(function (m) { self.drawMeasure(m); });
		this.drawTies();
		this.drawSlurs();
		this.drawGlissandi();
		this.drawOrnaments();
		this.drawText();
	};

	/* Staff, clef, signatures, bar lines, measure numbers and tempo marks of one line of music. */
	Notation.prototype.drawSystemFrame = function (index) {
		var ctx = this.ctx;
		var system = this.systems[index];
		var first = system.first, last = first + system.count;
		var top = index * SYSTEM_HEIGHT + TOP_PAD;            // y of the top staff line
		var left = LEFT_MARGIN;
		var right = this.systemRight(index);

		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var line = 0; line < 5; line++) {
			var y = Math.round(top + line * S) + 0.5;
			ctx.moveTo(left, y);
			ctx.lineTo(right, y);
		}
		ctx.moveTo(left + 0.5, top);
		ctx.lineTo(left + 0.5, top + 4 * S);
		ctx.stroke();

		this.drawClef(left + 6, top);
		if (this.shift && !this.model.asPlayed) {
			// the part sounds an octave above (8va) or below (8vb) what is written
			ctx.font = 'italic 12px ' + TEXT_FONT;
			ctx.fillStyle = '#555';
			ctx.textAlign = 'left';
			if (this.shift < 0) { ctx.fillText('8va', left + 14, top - 2.6 * S); }
			else { ctx.fillText('8vb', left + 14, top + 4 * S + 3.4 * S); }
			ctx.fillStyle = INK;
		}

		for (var i = first; i < last; i++) {
			var m = this.measures[i];
			var x = this.measureX(i);
			var isFirst = i === first;

			if (isFirst) {
				ctx.font = '11px system-ui, sans-serif';
				ctx.fillStyle = '#8a8a8a';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'alphabetic';
				ctx.fillText(String(i + 1), x + 2, top - 2.2 * S);
				ctx.fillStyle = INK;
			}

			// signatures: the key at the start of every line and where it changes, the time where it changes
			var cursor = x + (isFirst ? 2 : 5);
			if (isFirst) {
				cursor += this.drawKeySignature(cursor, top, m.key, false);
			} else if (m.showKey) {
				// a change to no sharps or flats is shown by cancelling the old ones
				var cancel = m.key === 0;
				cursor += this.drawKeySignature(cursor, top, cancel ? this.measures[i - 1].key : m.key, cancel) + 4;
			}
			if (m.showSig) { this.drawTimeSignature(cursor + 1, top, m.num, m.den); }

			if (m.tempo) { this.drawTempo(this.downbeatX(i) - 4, top - 4.3 * S, m.tempo); }

			// the bar line this measure ends on
			var isEnd = i === this.measures.length - 1;
			var bx = Math.round(i === last - 1 ? right : this.measureX(i + 1)) + 0.5;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(bx, top);
			ctx.lineTo(bx, top + 4 * S);
			ctx.stroke();
			if (isEnd) {
				ctx.lineWidth = 3.5;
				ctx.beginPath();
				ctx.moveTo(bx + 4, top);
				ctx.lineTo(bx + 4, top + 4 * S);
				ctx.stroke();
				ctx.lineWidth = 1;
			}
		}
	};

	Notation.prototype.drawClef = function (x, top) {
		var ctx = this.ctx;
		if (this.clef === 'treble') {
			if (!this.clefImage.complete || !this.clefImage.naturalWidth) { return; }
			var h = 7.4 * S;
			var w = h * this.clefImage.naturalWidth / this.clefImage.naturalHeight;
			ctx.drawImage(this.clefImage, x, top - 1.55 * S, w, h);
			return;
		}
		// bass clef: drawn by hand (head + curl + two dots)
		var f = top + S;      // F line
		ctx.save();
		ctx.lineWidth = 2.4;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.arc(x + 8, f, S * 0.48, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + 8, f - S * 0.45);
		ctx.bezierCurveTo(x + 22, f - S * 0.6, x + 28, f + S * 1.2, x + 8, top + 4.1 * S);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(x + 31, f - S * 0.5, S * 0.22, 0, Math.PI * 2);
		ctx.arc(x + 31, f + S * 0.5, S * 0.22, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	};

	/* Sharps or flats of a key (or naturals cancelling them). Returns the width used. */
	Notation.prototype.drawKeySignature = function (x, top, sharps, asNaturals) {
		if (!sharps) { return 0; }
		var ctx = this.ctx;
		var positions = sharps > 0 ? KEY_SHARPS : KEY_FLATS;
		var lower = this.clef === 'bass' ? 2 : 0;
		var glyph = asNaturals ? NATURAL : (sharps > 0 ? SHARP : FLAT);
		ctx.save();
		ctx.font = (2.5 * S) + 'px ' + SYMBOL_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		for (var i = 0; i < Math.min(7, Math.abs(sharps)); i++) {
			var y = top + 4 * S - (positions[i] - lower) * S / 2;
			ctx.fillText(glyph, x + 5 + i * KEY_STEP, y - (glyph === FLAT ? 3 : 1));
		}
		ctx.restore();
		return keyWidth(sharps);
	};

	Notation.prototype.drawTimeSignature = function (x, top, num, den) {
		var ctx = this.ctx;
		ctx.save();
		ctx.font = 'bold ' + (2.1 * S) + 'px ' + TEXT_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(String(num), x + 8, top + S);
		ctx.fillText(String(den), x + 8, top + 3 * S);
		ctx.restore();
	};

	/* A small quarter note and "= 120". */
	Notation.prototype.drawTempo = function (x, y, bpm) {
		var ctx = this.ctx;
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(x + 4, y, 3.8, 2.8, -0.35, 0, Math.PI * 2);
		ctx.fill();
		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.moveTo(x + 7.4, y - 0.5);
		ctx.lineTo(x + 7.4, y - 12);
		ctx.stroke();
		ctx.font = '12px ' + TEXT_FONT;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText('= ' + bpm, x + 13, y + 3);
		ctx.restore();
	};

	/* ---------- placing notes: positions, stems and beams, before anything is drawn ---------- */

	Notation.prototype.placeMeasure = function (measure) {
		var self = this;
		var index = measure.index;
		var systemIndex = Math.floor(index / this.perSystem);
		var systemTop = systemIndex * SYSTEM_HEIGHT;
		var top = systemTop + TOP_PAD, bottom = top + 4 * S;
		var system = this.systems[systemIndex];
		var closing = index === system.first + system.count - 1 ? this.systemRight(systemIndex) : this.measureX(index + 1);

		measure.events.forEach(function (event) {
			var g = { event: event, system: systemIndex, systemTop: systemTop, top: top, bottom: bottom, x: self.pointForTick(event.tick).x };
			self.geometry.set(event, g);
			if (event.type === 'rest') {
				// a bar rest sits in the middle of its measure
				if (event.wholeMeasure) { g.x = (self.downbeatX(index) - BAR_PAD + closing) / 2; }
				return;
			}
			self.noteEvents.push(event);
			g.heads = event.notes.map(function (note) {
				var pos = note.diatonic - CLEF_BASE[self.clef];
				return { note: note, pos: pos, x: g.x, y: bottom - pos * S / 2 };
			});
			g.low = g.heads[0].pos;
			g.high = g.heads[g.heads.length - 1].pos;
			g.stemUp = (g.low + g.high) / 2 < 4;        // the middle line is position 4
		});

		// notes under one beam share a stem direction
		measure.events.forEach(function (event) {
			if (!event.beam || event.beam[0] !== event) { return; }
			var sum = 0, count = 0;
			event.beam.forEach(function (e) { self.geometry.get(e).heads.forEach(function (h) { sum += h.pos; count++; }); });
			var up = sum / count < 4;
			event.beam.forEach(function (e) { self.geometry.get(e).stemUp = up; });
		});

		measure.events.forEach(function (event) {
			if (event.type !== 'note') { return; }
			var g = self.geometry.get(event);
			var up = g.stemUp;

			// heads a second apart are flipped to the other side of the stem
			// (with the stem up, the upper of the pair moves right; with it down, the lower moves left)
			var flipped = [], i;
			if (up) {
				for (i = 0; i < g.heads.length; i++) {
					var below = g.heads[i - 1];
					flipped[i] = !!below && g.heads[i].pos - below.pos === 1 && !flipped[i - 1];
					if (flipped[i]) { g.heads[i].x = g.x + HEAD_RX * 1.9; }
				}
			} else {
				for (i = g.heads.length - 1; i >= 0; i--) {
					var above = g.heads[i + 1];
					flipped[i] = !!above && above.pos - g.heads[i].pos === 1 && !flipped[i + 1];
					if (flipped[i]) { g.heads[i].x = g.x - HEAD_RX * 1.9; }
				}
			}
			g.leftX = Math.min.apply(null, g.heads.map(function (h) { return h.x; }));
			g.rightX = Math.max.apply(null, g.heads.map(function (h) { return h.x; }));
			g.yLow = bottom - g.low * S / 2;       // y of the lowest head (larger y)
			g.yHigh = bottom - g.high * S / 2;

			if (event.value.base >= 2) {
				g.stemX = up ? g.x + HEAD_RX - 0.6 : g.x - HEAD_RX + 0.6;
				var length = STEM + (event.value.base >= 32 ? S * 0.6 : 0);
				g.stemStart = up ? g.yLow : g.yHigh;
				g.stemEnd = up ? g.yHigh - length : g.yLow + length;
				// stems of notes far outside the staff reach the middle line
				var middle = bottom - 2 * S;
				if (up && g.stemEnd > middle) { g.stemEnd = middle; }
				if (!up && g.stemEnd < middle) { g.stemEnd = middle; }
			}
		});

		// beams: a straight line through the stem ends, tilted with the notes but never steep
		measure.events.forEach(function (event) {
			if (!event.beam || event.beam[0] !== event) { return; }
			var group = event.beam.map(function (e) { return self.geometry.get(e); });
			var firstG = group[0], lastG = group[group.length - 1];
			var up = firstG.stemUp;
			var run = Math.max(1, lastG.stemX - firstG.stemX);
			var slope = Math.max(-0.16, Math.min(0.16, (lastG.stemEnd - firstG.stemEnd) / run));
			var lineAt = function (x) { return firstG.stemEnd + slope * (x - firstG.stemX); };
			// keep every stem at least a decent length
			var shortest = 2.7 * S, move = 0;
			group.forEach(function (g) {
				var limit = up ? g.yHigh - shortest : g.yLow + shortest;
				var miss = limit - lineAt(g.stemX);
				if (up ? miss < move : miss > move) { move = miss; }
			});
			group.forEach(function (g) {
				g.stemEnd = lineAt(g.stemX) + move;
				g.beamed = true;
			});
			firstG.beamGroup = group;
		});
	};

	/* ---------- drawing notes and rests ---------- */

	Notation.prototype.drawMeasure = function (measure) {
		var self = this, ctx = this.ctx;
		measure.events.forEach(function (event) {
			var g = self.geometry.get(event);
			if (event.type === 'rest') { self.drawRest(g); } else { self.drawChord(g); }
			if (event.dynamic) { self.drawDynamic(g); }
		});
		measure.events.forEach(function (event) {
			var g = self.geometry.get(event);
			if (g.beamGroup) { self.drawBeams(g.beamGroup); }
		});
		measure.tuplets.forEach(function (group) { self.drawTuplet(group); });
		ctx.fillStyle = INK;
		ctx.strokeStyle = INK;
	};

	Notation.prototype.drawHead = function (x, y, base, scale) {
		var ctx = this.ctx;
		var rx = HEAD_RX * (scale || 1), ry = HEAD_RY * (scale || 1);
		ctx.beginPath();
		if (base === 1) {
			// whole note: an upright oval with a slanted hole
			ctx.ellipse(x, y, rx * 1.18, ry * 1.02, 0, 0, Math.PI * 2);
			ctx.ellipse(x, y, rx * 0.56, ry * 0.74, 0.7, 0, Math.PI * 2);
			ctx.fill('evenodd');
		} else if (base === 2) {
			// half note: a slanted oval with a thin slanted hole, so staff lines show through
			ctx.ellipse(x, y, rx, ry, -0.35, 0, Math.PI * 2);
			ctx.ellipse(x, y, rx * 0.8, ry * 0.46, -0.62, 0, Math.PI * 2);
			ctx.fill('evenodd');
		} else {
			ctx.ellipse(x, y, rx, ry, -0.35, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	/*
	 * Redraw the heads of some notes in gold, grown by up to 10%. `lit` is a list of
	 * {event, amount} with amount from 0 (as written) to 1 (fully gold and grown).
	 * An empty list clears them. Only this overlay is touched, never the sheet itself.
	 */
	var GOLD = [232, 168, 8];
	var GLOW_GROWTH = 0.1;

	Notation.prototype.glow = function (lit) {
		if (!lit.length && !this.glowing) { return; }
		var ctx = this.glowCtx, self = this;
		ctx.clearRect(0, 0, this.width, this.height);
		this.glowing = lit.length > 0;
		if (!this.geometry) { return; }
		lit.forEach(function (item) {
			var g = self.geometry.get(item.event);
			if (!g || !g.heads) { return; }
			var a = item.amount, base = item.event.value.base;
			var ink = [27, 27, 27];
			var color = 'rgb(' + ink.map(function (c, i) { return Math.round(c + (GOLD[i] - c) * a); }).join(',') + ')';
			ctx.fillStyle = color;
			ctx.shadowColor = 'rgba(' + GOLD.join(',') + ',' + (0.9 * a) + ')';
			ctx.shadowBlur = 9 * a;
			var scale = 1 + GLOW_GROWTH * a;
			g.heads.forEach(function (head) { self.drawGlowHead(ctx, head.x, head.y, base, scale); });
		});
		ctx.shadowBlur = 0;
	};

	// Like drawHead, but the hole of an open note keeps its size so the grown ring covers the black one beneath.
	Notation.prototype.drawGlowHead = function (ctx, x, y, base, scale) {
		var rx = HEAD_RX, ry = HEAD_RY;
		ctx.beginPath();
		if (base === 1) {
			ctx.ellipse(x, y, rx * 1.18 * scale, ry * 1.02 * scale, 0, 0, Math.PI * 2);
			ctx.ellipse(x, y, rx * 0.56, ry * 0.74, 0.7, 0, Math.PI * 2);
			ctx.fill('evenodd');
		} else if (base === 2) {
			ctx.ellipse(x, y, rx * scale, ry * scale, -0.35, 0, Math.PI * 2);
			ctx.ellipse(x, y, rx * 0.8, ry * 0.46, -0.62, 0, Math.PI * 2);
			ctx.fill('evenodd');
		} else {
			ctx.ellipse(x, y, rx * scale, ry * scale, -0.35, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	Notation.prototype.drawLegerLines =function (x, low, high, bottom, halfWidth) {
		var ctx = this.ctx;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (var p = -2; p >= low; p -= 2) {
			var below = Math.round(bottom - p * S / 2) + 0.5;
			ctx.moveTo(x - halfWidth, below);
			ctx.lineTo(x + halfWidth, below);
		}
		for (var q = 10; q <= high; q += 2) {
			var above = Math.round(bottom - q * S / 2) + 0.5;
			ctx.moveTo(x - halfWidth, above);
			ctx.lineTo(x + halfWidth, above);
		}
		ctx.stroke();
	};

	Notation.prototype.drawChord = function (g) {
		var ctx = this.ctx, event = g.event, base = event.value.base;
		var wide = g.leftX < g.x || g.rightX > g.x;
		this.drawLegerLines((g.leftX + g.rightX) / 2, g.low, g.high, g.bottom, S * (wide ? 1.7 : 1.05) * (base === 1 ? 1.15 : 1));

		for (var i = 0; i < g.heads.length; i++) { this.drawHead(g.heads[i].x, g.heads[i].y, base); }

		// accidentals, in columns so that close ones do not overlap
		ctx.font = (2.5 * S) + 'px ' + SYMBOL_FONT;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		var column = 0, lastPos = null;
		for (var a = g.heads.length - 1; a >= 0; a--) {
			var head = g.heads[a];
			if (head.note.accidental === null) { continue; }
			column = lastPos !== null && lastPos - head.pos < 6 ? (column + 1) % 3 : 0;
			lastPos = head.pos;
			var glyph = accidentalGlyph(head.note.accidental);
			ctx.fillText(glyph, g.leftX - HEAD_RX * 1.45 - column * ACCIDENTAL_ROOM, head.y - (glyph === FLAT ? 3 : 1));
		}

		// augmentation dots, moved into the space above when the head is on a line
		if (event.value.dots) {
			var dotted = {};
			g.heads.forEach(function (head) {
				var y = head.y - (head.pos % 2 === 0 ? S / 2 : 0);
				if (dotted[y]) { return; }
				dotted[y] = true;
				ctx.beginPath();
				ctx.arc(g.rightX + HEAD_RX + 4.5, y, 1.7, 0, Math.PI * 2);
				ctx.fill();
			});
		}

		if (g.stemX !== undefined) {
			ctx.lineWidth = 1.3;
			ctx.beginPath();
			ctx.moveTo(Math.round(g.stemX) + 0.5, g.stemStart);
			ctx.lineTo(Math.round(g.stemX) + 0.5, g.stemEnd);
			ctx.stroke();
			if (!g.beamed && base >= 8) { this.drawFlags(g, base >= 32 ? 3 : (base >= 16 ? 2 : 1)); }
		}

		// staccato dot on the side away from the stem
		if (event.staccato) {
			var up = g.stemUp;
			var position = up ? g.low - 2 : g.high + 2;
			if (position % 2 === 0 && position >= 0 && position <= 8) { position += up ? -1 : 1; }      // not on a staff line
			ctx.beginPath();
			ctx.arc(up ? g.heads[0].x : g.heads[g.heads.length - 1].x, g.bottom - position * S / 2, 1.8, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	Notation.prototype.drawFlags = function (g, count) {
		var ctx = this.ctx;
		var direction = g.stemUp ? 1 : -1;
		var x = Math.round(g.stemX) + 0.5;
		ctx.lineWidth = 1.7;
		ctx.lineCap = 'round';
		for (var f = 0; f < count; f++) {
			var y = g.stemEnd + direction * f * S * 0.75;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.bezierCurveTo(x + S * 0.2, y + direction * S * 0.9, x + S * 1.45, y + direction * S * 1.1, x + S * 0.95, y + direction * S * 2.3);
			ctx.stroke();
		}
		ctx.lineCap = 'butt';
	};

	Notation.prototype.drawBeams = function (group) {
		var ctx = this.ctx;
		var up = group[0].stemUp;
		var toward = up ? 1 : -1;              // further beams stack towards the note heads
		function level(g) { return g.event.value.base >= 32 ? 3 : (g.event.value.base >= 16 ? 2 : 1); }
		function yAt(g, depth) { return g.stemEnd + toward * depth * (BEAM_THICKNESS + BEAM_GAP); }
		function bar(x0, y0, x1, y1) {
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			ctx.lineTo(x1, y1);
			ctx.lineTo(x1, y1 + toward * BEAM_THICKNESS);
			ctx.lineTo(x0, y0 + toward * BEAM_THICKNESS);
			ctx.closePath();
			ctx.fill();
		}
		var firstG = group[0], lastG = group[group.length - 1];
		var slope = (lastG.stemEnd - firstG.stemEnd) / Math.max(1, lastG.stemX - firstG.stemX);
		for (var depth = 0; depth < 3; depth++) {
			for (var i = 0; i < group.length; i++) {
				if (level(group[i]) <= depth) { continue; }
				var x = Math.round(group[i].stemX) + 0.5;
				var next = group[i + 1], previous = group[i - 1];
				if (next && level(next) > depth) {
					bar(x - 0.6, yAt(group[i], depth), Math.round(next.stemX) + 1.1, yAt(next, depth));
				} else if (!(previous && level(previous) > depth)) {
					// a lone short note in the group: a stub towards its neighbour
					var stub = S * 1.1 * (previous ? -1 : 1);
					bar(x, yAt(group[i], depth), x + stub, yAt(group[i], depth) + slope * stub);
				}
			}
		}
	};

	Notation.prototype.drawRest = function (g) {
		var ctx = this.ctx, base = g.event.value.base, x = g.x, top = g.top;
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		if (base === 1) {
			ctx.fillRect(x - S * 0.75, top + S, S * 1.5, S * 0.55);                 // hangs from the fourth line
		} else if (base === 2) {
			ctx.fillRect(x - S * 0.75, top + 2 * S - S * 0.55, S * 1.5, S * 0.55);  // sits on the middle line
		} else if (base === 4) {
			ctx.lineWidth = 2.6;
			ctx.beginPath();
			ctx.moveTo(x - S * 0.25, top + S * 0.75);
			ctx.lineTo(x + S * 0.35, top + S * 1.55);
			ctx.lineTo(x - S * 0.3, top + S * 2.15);
			ctx.lineTo(x + S * 0.3, top + S * 2.9);
			ctx.stroke();
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.moveTo(x + S * 0.3, top + S * 2.9);
			ctx.quadraticCurveTo(x - S * 0.75, top + S * 2.55, x - S * 0.05, top + S * 3.5);
			ctx.stroke();
		} else {
			// eighth and shorter: a slanted stem with one hook per flag
			var hooks = base >= 32 ? 3 : (base >= 16 ? 2 : 1);
			var topY = top + S * (hooks === 3 ? 0.6 : 1.6);
			var bottomY = top + S * (hooks === 1 ? 3.5 : 4.5);
			var lean = S * 0.28;        // sideways shift per staff space
			var stemX = function (y) { return x + S * 0.45 - (y - topY) / S * lean; };
			ctx.lineWidth = 1.5;
			ctx.beginPath();
			ctx.moveTo(stemX(topY), topY);
			ctx.lineTo(stemX(bottomY), bottomY);
			ctx.stroke();
			for (var h = 0; h < hooks; h++) {
				var y = topY + h * S;
				ctx.beginPath();
				ctx.arc(stemX(y) - S * 0.85, y + S * 0.12, S * 0.27, 0, Math.PI * 2);
				ctx.fill();
				ctx.lineWidth = 1.3;
				ctx.beginPath();
				ctx.moveTo(stemX(y) - S * 0.8, y + S * 0.3);
				ctx.quadraticCurveTo(stemX(y) - S * 0.35, y + S * 0.5, stemX(y), y);
				ctx.stroke();
			}
		}
		if (g.event.value.dots) {
			ctx.beginPath();
			ctx.arc(x + S * 1.0, top + 1.5 * S, 1.7, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	};

	/* The "3" of a triplet: by the beam when the group has one, otherwise under a bracket above the notes. */
	Notation.prototype.drawTuplet = function (group) {
		var self = this, ctx = this.ctx;
		var places = group.map(function (event) { return self.geometry.get(event); });
		var firstG = places[0], lastG = places[places.length - 1];
		var notes = places.filter(function (g) { return g.event.type === 'note'; });
		var oneBeam = notes.length === places.length && notes.length > 1 && notes.every(function (g) { return g.beamed && g.event.beam === notes[0].event.beam; });

		ctx.save();
		ctx.font = 'italic bold 12px ' + TEXT_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		if (oneBeam) {
			var up = firstG.stemUp;
			var middleX = (firstG.stemX + lastG.stemX) / 2;
			var middleY = (firstG.stemEnd + lastG.stemEnd) / 2;
			ctx.fillText('3', middleX, middleY + (up ? -S * 0.95 : S * 1.05));
		} else {
			// highest point of anything in the group
			var y = firstG.top - S * 0.6;
			notes.forEach(function (g) { y = Math.min(y, g.yHigh - S, g.stemUp && g.stemEnd !== undefined ? g.stemEnd - S * 0.4 : Infinity); });
			y -= S * 0.7;
			var x0 = firstG.x - HEAD_RX, x1 = lastG.x + HEAD_RX + 2, middle = (x0 + x1) / 2;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(x0, y + 5); ctx.lineTo(x0, y); ctx.lineTo(middle - 8, y);
			ctx.moveTo(middle + 8, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y + 5);
			ctx.stroke();
			ctx.fillText('3', middle, y);
			places.forEach(function (g) { g.bracketY = y; });
		}
		ctx.restore();
	};

	Notation.prototype.drawDynamic = function (g) {
		var ctx = this.ctx;
		var lowest = g.bottom;
		if (g.event.type === 'note') { lowest = Math.max(g.bottom, g.yLow + S * 0.6, !g.stemUp && g.stemEnd !== undefined ? g.stemEnd : 0); }
		ctx.save();
		ctx.font = 'italic bold 16px ' + TEXT_FONT;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText(g.event.dynamic, g.x, Math.min(lowest + S * 2.4, g.systemTop + SYSTEM_HEIGHT - S * 1.7));
		ctx.restore();
	};

	/* ---------- ties and slurs ---------- */

	// a curve from (x0, y) to (x1, y1), bulging by `height` (positive: downwards), thicker in the middle
	Notation.prototype.drawArc = function (x0, y0, x1, y1, height) {
		var ctx = this.ctx;
		var thickness = 2.2 * (height > 0 ? 1 : -1);
		var ax = x0 + (x1 - x0) * 0.25, bx = x0 + (x1 - x0) * 0.75;
		var ay = y0 + (y1 - y0) * 0.25 + height, by = y0 + (y1 - y0) * 0.75 + height;
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		ctx.bezierCurveTo(ax, ay, bx, by, x1, y1);
		ctx.bezierCurveTo(bx, by + thickness, ax, ay + thickness, x0, y0);
		ctx.fill();
	};

	/* A tie joins the two written parts of one note. It curves away from the stem. */
	Notation.prototype.drawTies = function () {
		var self = this;
		this.noteEvents.forEach(function (event) {
			if (!event.nextPart) { return; }
			var a = self.geometry.get(event), b = self.geometry.get(event.nextPart);
			a.heads.forEach(function (head, i) {
				if (!head.note.tieNext) { return; }
				var target = b.heads.filter(function (h) { return h.note.source === head.note.source; })[0];
				if (!target) { return; }
				// one note: opposite its stem; a chord: the lower half curves down, the upper half up
				var down = a.heads.length === 1 ? a.stemUp : i < a.heads.length / 2;
				var side = down ? 1 : -1;
				var y0 = head.y + side * S * 0.55, y1 = target.y + side * S * 0.55;
				var x0 = head.x + HEAD_RX + (event.value.dots ? 8 : 2);
				var x1 = target.x - HEAD_RX - 2;
				if (a.system === b.system) {
					if (x1 - x0 < 7) { x0 = head.x + HEAD_RX * 0.4; x1 = target.x - HEAD_RX * 0.4; y0 += side * S * 0.25; y1 += side * S * 0.25; }
					self.drawArc(x0, y0, x1, y1, side * Math.max(3.5, Math.min(8, (x1 - x0) * 0.09)));
				} else {
					// the note carries on to the next line: half a tie at the end of one and the start of the other
					var endX = self.systemRight(a.system) - 2;
					var startX = self.systems[b.system].x0 - START_PAD + 2;
					self.drawArc(x0, y0, Math.max(endX, x0 + 8), y0, side * 5);
					self.drawArc(Math.min(startX, x1 - 8), y1, x1, y1, side * 5);
				}
			});
		});
	};

	/* A slur covers a run of notes played legato. It goes on the note-head side when stems point up, otherwise above. */
	Notation.prototype.drawSlurs = function () {
		var self = this;
		this.model.slurs.forEach(function (slur) {
			var a = self.geometry.get(slur.from), b = self.geometry.get(slur.to);
			if (!a || !b) { return; }
			var first = self.noteEvents.indexOf(slur.from), last = self.noteEvents.indexOf(slur.to);
			var covered = self.noteEvents.slice(first, last + 1).map(function (e) { return self.geometry.get(e); });
			var below = covered.every(function (g) { return g.stemUp; });
			var side = below ? 1 : -1;
			// the edge of a note on the slur's side: its head, or the end of its stem
			function edge(g) {
				if (below) { return (g.stemUp ? g.yLow : Math.max(g.yLow, g.stemEnd === undefined ? -Infinity : g.stemEnd)) + S * 0.9; }
				return (g.stemUp && g.stemEnd !== undefined ? Math.min(g.yHigh, g.stemEnd) : g.yHigh) - S * 0.9;
			}
			function arc(from, to, x0, y0, x1, y1) {
				// lift the curve clear of everything it passes over
				var inner = covered.filter(function (g) { return g.system === from.system && g.x > x0 + 2 && g.x < x1 - 2; });
				var height = side * Math.max(7, Math.min(22, (x1 - x0) * 0.06));
				inner.forEach(function (g) {
					var chord = (y0 + y1) / 2, need = edge(g) - chord;
					if (below ? need > height * 0.75 : need < height * 0.75) { height = need / 0.75 + side * 2; }
				});
				self.drawArc(x0, y0, x1, y1, height);
			}
			if (a.system === b.system) {
				arc(a, b, a.x, edge(a), b.x, edge(b));
			} else {
				arc(a, a, a.x, edge(a), self.systemRight(a.system) - 2, edge(a) + side * 2);
				arc(b, b, self.systems[b.system].x0 - START_PAD + 2, edge(b) + side * 2, b.x, edge(b));
			}
		});
	};

	/* ---------- words: lyrics under the staff, marker text above it ---------- */

	Notation.prototype.drawText = function () {
		var self = this, ctx = this.ctx;
		ctx.save();
		ctx.fillStyle = INK;
		ctx.textBaseline = 'alphabetic';
		ctx.textAlign = 'center';
		ctx.font = '12px ' + TEXT_FONT;
		(this.track.lyrics || []).forEach(function (lyric) {
			var p = self.pointForTick(lyric.tick);
			ctx.fillText(lyric.text, p.x, p.top + SYSTEM_HEIGHT - S * 0.5);
		});
		ctx.textAlign = 'left';
		ctx.font = 'italic 12px ' + TEXT_FONT;
		var endTick = this.measures[this.measures.length - 1].endTick;
		(this.score.markers || []).forEach(function (marker) {
			if (marker.tick >= endTick) { return; }
			var p = self.pointForTick(marker.tick);
			ctx.fillText(marker.text, p.x - 4, p.top + TOP_PAD - 5.9 * S);
		});
		ctx.restore();
	};

	/* ---------- glissandi ---------- */

	/*
	 * A straight line from the note head to the head of the note it slides to,
	 * marked "gliss.". When the slide ends on the next written note the line joins
	 * the two; otherwise the arrival pitch is shown as a small stemless note in
	 * brackets. A line that runs past the end of a system continues on the next.
	 */
	Notation.prototype.drawGlissandi = function () {
		var notes = this.track.notes;
		var tolerance = this.score.ppq / 8;
		for (var i = 0; i < notes.length; i++) {
			var note = notes[i];
			var net = Notation.slideSemitones(note);
			if (!net) { continue; }
			var targetPitch = note.pitch + Math.round(net);
			var endTick = note.tick + note.duration;

			// does the next note start where, and on what, this one arrives?
			var arrival = null;
			for (var j = i + 1; j < notes.length && notes[j].tick <= endTick + tolerance; j++) {
				if (notes[j].tick >= endTick - tolerance && notes[j].pitch === targetPitch) { arrival = notes[j]; break; }
			}

			var from = this.pointForTick(note.tick);
			var toTick = arrival ? arrival.tick : endTick - 1;      // a cue note stays inside the note's last measure
			var to = this.pointForTick(toTick);
			var target = this.staffPosition(targetPitch, toTick);
			var start = { x: from.x, y: this.yForPitch(note.pitch, from.top, note.tick) };
			var end = { x: to.x, y: this.yForPosition(target.pos, to.top) };
			if (!arrival) {
				// a cue note sits where the slide ends, but always inside its measure's closing bar line
				var cueMeasure = this.measureIndexForTick(toTick);
				var cueSystem = this.systemOf(cueMeasure);
				var isLastInLine = cueMeasure === cueSystem.first + cueSystem.count - 1;
				var closingBar = isLastInLine ? this.systemRight(to.system) : this.measureX(cueMeasure + 1);
				end.x = Math.min(to.x, closingBar - HEAD_RX * CUE_SCALE - 8);
				if (to.system === from.system) { end.x = Math.max(end.x, from.x + 4 * S); }
				this.drawCueNote(end.x, end.y, target, to.top);
			}

			var startGap = HEAD_RX + 4;
			var endGap = (arrival ? HEAD_RX : HEAD_RX * CUE_SCALE + 3) + 4 + (target.accidental !== null ? S * 1.1 : 0);
			if (from.system === to.system) {
				this.drawGlissLine(start.x + startGap, start.y, end.x - endGap, end.y, start, end, true);
			} else {
				// split across systems: both pieces lie on one slope, as if the line had not been broken
				var rise = (end.y - to.top) - (start.y - from.top);
				var rightX = this.systemRight(from.system) - 3;
				var leftX = Math.min(this.systems[to.system].x0 - START_PAD - 2, end.x - endGap - S * 2.2);
				var firstRun = rightX - start.x, secondRun = end.x - leftX;
				var breakOut = { x: rightX, y: start.y + rise * firstRun / (firstRun + secondRun) };
				var breakIn = { x: leftX, y: end.y - rise * secondRun / (firstRun + secondRun) };
				this.drawGlissLine(start.x + startGap, start.y, rightX, breakOut.y, start, breakOut, true);
				this.drawGlissLine(leftX, breakIn.y, end.x - endGap, end.y, breakIn, end, false);
			}
		}
	};

	/* One glissando segment. a and b are the ends of the slope it lies on. */
	Notation.prototype.drawGlissLine = function (x0, y0, x1, y1, a, b, withText) {
		if (x1 - x0 < 6) { x1 = x0 + 6; }
		var slope = (b.y - a.y) / Math.max(1, b.x - a.x);
		var startY = a.y + slope * (x0 - a.x);
		var endY = a.y + slope * (x1 - a.x);
		var ctx = this.ctx;
		ctx.save();
		ctx.strokeStyle = ctx.fillStyle = INK;
		ctx.lineWidth = 1.3;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(x0, startY);
		ctx.lineTo(x1, endY);
		ctx.stroke();
		if (withText && x1 - x0 >= 46) {
			ctx.font = 'italic 11px ' + TEXT_FONT;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'alphabetic';
			ctx.translate((x0 + x1) / 2, (startY + endY) / 2);
			ctx.rotate(Math.atan2(endY - startY, x1 - x0));
			ctx.fillText('gliss.', 0, -4);
		}
		ctx.restore();
	};

	/* The pitch a slide arrives on, when no written note follows: a small stemless head in brackets. */
	Notation.prototype.drawCueNote = function (x, y, position, systemTop) {
		var ctx = this.ctx;
		var rx = HEAD_RX * CUE_SCALE;
		ctx.save();
		ctx.strokeStyle = ctx.fillStyle = INK;
		this.drawLegerLines(x, position.pos, position.pos, systemTop + TOP_PAD + 4 * S, S * 0.8);
		this.drawHead(x, y, 4, CUE_SCALE);

		ctx.lineWidth = 1.1;
		ctx.beginPath();
		ctx.arc(x + rx * 0.2, y, rx + 3.2, Math.PI * 0.72, Math.PI * 1.28);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(x - rx * 0.2, y, rx + 3.2, -Math.PI * 0.28, Math.PI * 0.28);
		ctx.stroke();

		if (position.accidental !== null) {
			var glyph = accidentalGlyph(position.accidental);
			ctx.font = (2.0 * S) + 'px ' + SYMBOL_FONT;
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.fillText(glyph, x - rx - 4.5, y - (glyph === FLAT ? 3 : 1));
		}
		ctx.restore();
	};

	/*
	 * How far (in semitones) a note slides during its length, or 0 if it does not
	 * slide. Small wobbles (vibrato, a wheel that is not quite centred) are ignored.
	 */
	var SLIDE_THRESHOLD = 0.75;      // a real slide reaches (nearly) the next semitone
	Notation.slideSemitones = function (note) {
		if (!note.bend) { return 0; }
		// It is a slide to another note when the pitch moves and ends up away from the written
		// note. Ending on the written note is a scoop; never moving is just a tuning offset.
		var travelled = Math.abs(note.bend.end - note.bend.start) >= SLIDE_THRESHOLD;
		return travelled && Math.abs(note.bend.end) >= SLIDE_THRESHOLD ? note.bend.end : 0;
	};

	/*
	 * Pitch-bend ornaments: what a note's pitch does while it sounds, when it does
	 * not end up on another note (that is a glissando). Returns null, or
	 *   {type: 'scoop',   from: -1 | 1}   starts below (-1) or above (1) the note and slides onto it
	 *   {type: 'bend',    to: -1 | 1}     leaves the note, down (-1) or up (1), and comes back
	 *   {type: 'fall',    to: -1 | 1}     drifts off the note at the end, down or up, without arriving anywhere
	 *   {type: 'vibrato'}                 wavers around the note (by pitch bend, or the modulation wheel is up)
	 * `ppq` is the file's ticks per quarter note.
	 */
	var ORNAMENT_DEPTH = 0.3;        // semitones off the note before it counts
	var VIBRATO_DEPTH = 0.15;        // swing that counts as one wave of vibrato
	var MODULATION_VIBRATO = 16;     // modulation wheel value (of 127) from which a note counts as played with vibrato
	Notation.bendOrnament = function (note, ppq) {
		var bend = note.bend;
		if (Notation.slideSemitones(note)) { return null; }
		if (note.modulation >= MODULATION_VIBRATO) { return { type: 'vibrato' }; }
		if (!bend || !bend.points.length) { return null; }
		var values = [bend.start].concat(bend.points.map(function (p) { return p.semis; }));

		// vibrato: the pitch turns round several times
		var turns = 0, direction = 0, anchor = values[0];
		values.forEach(function (v) {
			if (direction >= 0 && v < anchor - VIBRATO_DEPTH) { if (direction > 0) { turns++; } direction = -1; anchor = v; }
			else if (direction <= 0 && v > anchor + VIBRATO_DEPTH) { if (direction < 0) { turns++; } direction = 1; anchor = v; }
			else if ((direction > 0 && v > anchor) || (direction < 0 && v < anchor)) { anchor = v; }
		});
		if (turns >= 4) { return { type: 'vibrato' }; }

		var extreme = 0;
		values.forEach(function (v) { if (Math.abs(v) > Math.abs(extreme)) { extreme = v; } });
		if (Math.abs(extreme) < ORNAMENT_DEPTH) { return null; }

		var startsOff = Math.abs(bend.start) >= ORNAMENT_DEPTH, endsOff = Math.abs(bend.end) >= ORNAMENT_DEPTH;
		if (startsOff && !endsOff) { return { type: 'scoop', from: bend.start < 0 ? -1 : 1 }; }
		if (!startsOff && !endsOff) { return { type: 'bend', to: extreme < 0 ? -1 : 1 }; }
		if (!startsOff && endsOff) {
			// a wheel moved just as the note is released belongs to the next note, not this one
			var leaves = note.duration;
			for (var i = 0; i < bend.points.length; i++) {
				if (Math.abs(bend.points[i].semis) >= ORNAMENT_DEPTH / 2) { leaves = bend.points[i].tick; break; }
			}
			if (note.duration - leaves < ppq / 16) { return null; }
			return { type: 'fall', to: bend.end < 0 ? -1 : 1 };
		}
		return null;       // off the note throughout: a tuning offset, not an ornament
	};

	/* Draw the ornaments next to the notes they belong to. */
	Notation.prototype.drawOrnaments = function () {
		var self = this, ctx = this.ctx, ppq = this.score.ppq;
		ctx.save();
		ctx.strokeStyle = ctx.fillStyle = INK;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		this.noteEvents.forEach(function (event) {
			if (!event.first) { return; }
			var g = self.geometry.get(event);
			// the clear space above the chord: over the top head, or over the stem when it points up
			var above = Math.min(g.yHigh - S * 1.1, g.stemUp && g.stemEnd !== undefined ? g.stemEnd - S * 0.6 : Infinity, g.top - S * 0.6);
			if (event.staccato && !g.stemUp) { above -= S * 0.8; }
			if (g.bracketY !== undefined) { above = Math.min(above, g.bracketY - S * 0.7); }
			var drawnAbove = false;
			g.heads.forEach(function (head) {
				var ornament = Notation.bendOrnament(head.note.source, ppq);
				if (!ornament) { return; }
				var x = head.x, y = head.y;
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				if (ornament.type === 'scoop') {
					// a curve sliding into the head from the side it comes from, left of any accidental
					var left = g.leftX - HEAD_RX - 3 - (head.note.accidental !== null ? ACCIDENTAL_ROOM + 3 : 0);
					var side = -ornament.from;          // from below: the curve starts lower (larger y)
					ctx.moveTo(left - S * 1.5, y + side * S * 1.25);
					ctx.quadraticCurveTo(left - S * 0.3, y + side * S * 1.2, left, y + side * S * 0.15);
					ctx.stroke();
				} else if (ornament.type === 'fall') {
					// a curve dropping (or lifting) away from the head
					var right = g.rightX + HEAD_RX + 3 + (event.value.dots ? 6 : 0);
					var away = -ornament.to;
					ctx.moveTo(right, y + away * S * 0.1);
					ctx.quadraticCurveTo(right + S * 1.2, y + away * S * 0.2, right + S * 1.5, y + away * S * 1.4);
					ctx.stroke();
				} else if (!drawnAbove && ornament.type === 'bend') {
					// a small cup over the note: open upwards when the pitch dips, downwards when it rises
					drawnAbove = true;
					var dip = -ornament.to;             // 1 when the pitch goes down
					var cy = above - S * 0.5;
					ctx.lineWidth = 1.7;
					ctx.moveTo(g.x - S * 0.85, cy - dip * S * 0.4);
					ctx.quadraticCurveTo(g.x, cy + dip * S * 0.95, g.x + S * 0.85, cy - dip * S * 0.4);
					ctx.stroke();
				} else if (!drawnAbove && ornament.type === 'vibrato') {
					// a wavy line over the note, for as long as it lasts on this line of music
					drawnAbove = true;
					var source = head.note.source;
					var end = self.pointForTick(source.tick + source.duration);
					var until = end.system === g.system ? end.x - S : self.systemRight(g.system) - 4;
					until = Math.max(until, g.x + S * 2.4);
					var wy = above - S * 0.4, wave = S * 0.8;
					ctx.lineWidth = 1.3;
					ctx.moveTo(g.x - S * 0.5, wy);
					for (var wx = g.x - S * 0.5; wx < until; wx += wave) {
						ctx.quadraticCurveTo(wx + wave / 4, wy - S * 0.42, wx + wave / 2, wy);
						ctx.quadraticCurveTo(wx + wave * 3 / 4, wy + S * 0.42, wx + wave, wy);
					}
					ctx.stroke();
				}
			});
		});
		ctx.restore();
	};

	global.Notation = Notation;
})(window);
