/*
 * The violin's fingering chart, for InstrumentChart: first position.
 *
 * The four columns are the strings (G, D, A, E from the left, as the player
 * sees the fingerboard). The top row is the open strings; each row below is
 * one semitone further up the string, at its true distance from the nut, so
 * the rows are the finger positions:
 *
 *   row 0  open string        row 4  2nd finger
 *   row 1  low 1st finger     row 5  3rd finger
 *   row 2  1st finger         row 6  high 3rd finger
 *   row 3  low 2nd finger     row 7  4th finger
 *
 * Beside each row is a picture of the hand with that finger marked (images/hand-N.png),
 * the same size as the buttons.
 *
 * The button on string s, row r plays MIDI pitch 55 + 7 * s + r. The 4th
 * finger on the G, D and A strings plays the same note as the next open
 * string; the open string is the one that lights up for it.
 *
 * The buttons are far bigger than the spaces between a violin's strings, so
 * they are laid out as a plain grid over the drawing of the neck rather than
 * each on its own string. The drawing is at the same true scale as the rows,
 * so each row lies across the neck where that finger really goes; it shows
 * through the buttons.
 *
 * To add another instrument, write a file like this one that calls
 * InstrumentChart.define with its own stage size, drawing, buttons and labels.
 */
(function () {
	'use strict';

	var SHARP = String.fromCharCode(0x266F), FLAT = String.fromCharCode(0x266D);
	var WIDTH = 480;
	var BUTTON_WIDTH = 60, BUTTON_HEIGHT = 75;    // upright ovals; the hand pictures fit the same box
	var CENTRE = 286;                             // x of the middle of the neck
	var COLUMN_STEP = 66;                         // between the centres of neighbouring columns
	var NUT_Y = 270;                              // where the strings leave the pegbox
	var HAND_X = 52;                              // centre of the column of hand pictures

	// Every row sits at its true place on the string. A string stopped n semitones above the open
	// note sounds from a point STRING_LENGTH * (1 - 2^(-n/12)) from the nut, so the rows draw
	// closer together going up the neck, exactly as the fingers do.
	var STRING_LENGTH = 328;                      // mm from nut to bridge on a full-size violin
	function fromNut(semitones) { return STRING_LENGTH * (1 - Math.pow(2, -semitones / 12)); }
	// The scale of the whole chart, in units per millimetre: just large enough that the two closest
	// rows (high 3rd and 4th finger, 13 mm apart) do not touch.
	var ROW_GAP = 3;
	var SCALE = (BUTTON_HEIGHT + ROW_GAP) / (fromNut(7) - fromNut(6));
	// the open strings are not stopped anywhere: their row sits just above the nut
	var OPEN_Y = NUT_Y - BUTTON_HEIGHT / 2 - 7;
	function rowY(row) { return row === 0 ? OPEN_Y : NUT_Y + fromNut(row) * SCALE; }
	var HEIGHT = Math.round(rowY(7) + BUTTON_HEIGHT / 2 + 58);      // room below for the out-of-range cue
	var LOWEST = 55;                              // G3, the open G string
	var STRINGS = ['G', 'D', 'A', 'E'];
	// Each row is shown by a picture of the left hand with the finger to use marked. The rows in
	// between the main positions use the same finger, placed a semitone lower or higher; their
	// picture is faded.
	var ROWS = [
		{ text: 'Open', name: 'open', main: true },
		{ text: 'Low 1st finger', name: 'low 1st finger', finger: 1 },
		{ text: '1st (index) finger', name: '1st finger', finger: 1, main: true },
		{ text: 'Low 2nd finger', name: 'low 2nd finger', finger: 2 },
		{ text: '2nd (middle) finger', name: '2nd finger', finger: 2, main: true },
		{ text: '3rd (ring) finger', name: '3rd finger', finger: 3, main: true },
		{ text: 'High 3rd finger', name: 'high 3rd finger', finger: 3 },
		{ text: '4th (little) finger', name: '4th finger', finger: 4, main: true }
	];
	var HAND_IMAGES = '/pages/musicsheet/images/hand-';       // hand-1.png .. hand-4.png, 124 x 140
	var HAND_HEIGHT = BUTTON_WIDTH * 140 / 124;               // as wide as a button
	// how each pitch class is written on a button: one name, or sharp over flat
	var LABELS = [['C'], ['C' + SHARP, 'D' + FLAT], ['D'], ['D' + SHARP, 'E' + FLAT], ['E'], ['F'], ['F' + SHARP, 'G' + FLAT],
		['G'], ['G' + SHARP, 'A' + FLAT], ['A'], ['A' + SHARP, 'B' + FLAT], ['B']];

	function columnX(string) { return CENTRE + (string - 1.5) * COLUMN_STEP; }

	var buttons = [], labels = [];
	for (var string = 0; string < 4; string++) {
		for (var row = 0; row < 8; row++) {
			var pitch = LOWEST + 7 * string + row;
			var names = LABELS[pitch % 12];
			buttons.push({
				pitch: pitch, x: columnX(string), y: rowY(row), width: BUTTON_WIDTH, height: BUTTON_HEIGHT,
				label: names[0], sub: names[1],
				kind: row === 0 ? 'open' : '',
				title: 'Play ' + InstrumentChart.noteName(pitch) + ' (' + STRINGS[string] + ' string, ' + ROWS[row].name + ')',
				// the 4th finger doubles the next open string
				alternate: row === 7 && string < 3
			});
		}
	}
	ROWS.forEach(function (row, index) {
		if (row.finger) {
			labels.push({ x: HAND_X, y: rowY(index), text: row.text, align: 'center', kind: row.main ? 'row' : 'row-minor', image: HAND_IMAGES + row.finger + '.png', height: HAND_HEIGHT });
		} else {
			labels.push({ x: HAND_X, y: rowY(index), text: row.text, align: 'center', kind: 'row' });
		}
	});

	function describe(pitch) {
		var string = Math.min(3, Math.floor((pitch - LOWEST) / 7));
		var row = pitch - LOWEST - 7 * string;
		return STRINGS[string] + ' string, ' + ROWS[row].name;
	}

	/*
	 * The drawing under the buttons: the neck of a violin seen from the front, at
	 * one true scale throughout (SCALE units to the millimetre, lengthwise and
	 * across), the same scale the rows of buttons are placed at.
	 *
	 * At that size the stage holds only part of the instrument, as a detail from
	 * a larger picture: the lower pegbox with the G and E pegs (and the edge of
	 * the D peg above), the nut, and the fingerboard with its four strings. The
	 * scroll lies above the top edge and the body below the bottom one, and the
	 * E peg runs off the right-hand side.
	 *
	 * Dimensions are those of a full-size violin: fingerboard 24 mm wide at the
	 * nut and 42 mm at its far end, 270 mm long; strings 5.5 mm apart at the nut
	 * and 11.5 mm at the bridge, 328 mm away; pegbox 26 mm wide at the nut with
	 * walls 4.5 mm thick; pegs 16 mm apart along it, G nearest the nut on the
	 * left, then E on the right, D on the left, A on the right.
	 *
	 * It is drawn in full colour (varnished flamed maple, ebony, wound strings);
	 * the style sheet fades it, and the buttons are slightly see-through, so it
	 * shows without getting in the way of reading them.
	 */
	function underlay() {
		var c = CENTRE, parts = [];
		function add(markup) { parts.push(markup); }
		function mm(length) { return length * SCALE; }
		function round(n) { return Math.round(n * 10) / 10; }
		function points(list) { return list.map(function (p) { return round(p[0]) + ',' + round(p[1]); }).join(' '); }
		// y of a point d mm from the nut: down the fingerboard for positive d, up the pegbox for negative
		function along(d) { return NUT_Y + mm(d); }
		// half-widths, at d mm from the nut
		function board(d) { return mm(12 + 9 * d / 270); }             // fingerboard
		function box(d) { return mm(13 - 3 * (-d) / 70); }              // pegbox, d negative
		var bottom = (HEIGHT - NUT_Y) / SCALE;                          // mm of fingerboard on the stage
		var topEdge = -NUT_Y / SCALE - 4;                               // mm above the nut where the stage ends (a little beyond)
		var WALL = mm(4.5);

		add('<svg viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '" preserveAspectRatio="none" aria-hidden="true">');
		add('<defs>' +
			// varnished maple, lit from the upper left: amber in the middle, deepening at the edges
			'<linearGradient id="vn-maple" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#7a3d12"/><stop offset="0.18" stop-color="#b9742c"/>' +
			'<stop offset="0.42" stop-color="#dba65a"/><stop offset="0.7" stop-color="#b9742c"/><stop offset="1" stop-color="#6d340e"/></linearGradient>' +
			// the flame of the maple: soft bands across the grain
			'<pattern id="vn-flame" width="34" height="19" patternUnits="userSpaceOnUse" patternTransform="rotate(-14)">' +
			'<rect width="34" height="19" fill="none"/><rect y="0" width="34" height="7" fill="#5a2a08" opacity="0.2"/><rect y="11" width="34" height="3" fill="#fff2d0" opacity="0.14"/></pattern>' +
			// ebony: near black, with a soft sheen
			'<linearGradient id="vn-ebony" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#0d0a08"/><stop offset="0.3" stop-color="#3a312b"/>' +
			'<stop offset="0.5" stop-color="#1f1915"/><stop offset="1" stop-color="#090706"/></linearGradient>' +
			'<linearGradient id="vn-peg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#4a3f37"/><stop offset="0.35" stop-color="#1c1612"/><stop offset="1" stop-color="#070504"/></linearGradient>' +
			'<radialGradient id="vn-head" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#5a4d43"/><stop offset="0.45" stop-color="#1e1814"/><stop offset="1" stop-color="#060403"/></radialGradient>' +
			'<linearGradient id="vn-channel" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#120904"/><stop offset="0.5" stop-color="#3a2110"/><stop offset="1" stop-color="#1a0d05"/></linearGradient>' +
			'<linearGradient id="vn-string" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#8c8c8c"/><stop offset="0.45" stop-color="#ffffff"/><stop offset="1" stop-color="#7d7d7d"/></linearGradient>' +
			// old paper behind the instrument
			'<radialGradient id="vn-paper" cx="0.6" cy="0.4" r="0.85"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#e9d6ae"/></radialGradient>' +
			'<filter id="vn-shadow" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>' +
			'</defs>');

		add('<rect width="' + WIDTH + '" height="' + HEIGHT + '" fill="url(#vn-paper)"/>');

		// outlines of the pegbox and the fingerboard
		var boxOutline = [[c - box(topEdge), along(topEdge)], [c + box(topEdge), along(topEdge)], [c + box(0), along(0)], [c - box(0), along(0)]];
		var boardOutline = [[c - board(0), along(0)], [c + board(0), along(0)], [c + board(bottom), HEIGHT], [c - board(bottom), HEIGHT]];

		// the shadow the neck throws on the paper, down and to the right
		add('<g filter="url(#vn-shadow)" opacity="0.45" transform="translate(13 10)"><polygon points="' + points(boxOutline) + '" fill="#3b2410"/><polygon points="' + points(boardOutline) + '" fill="#3b2410"/></g>');

		// pegs, behind the pegbox walls. Each tapers from its head, runs right through the box
		// and shows a little on the far side.
		var pegs = [{ at: -22, side: -1 }, { at: -54, side: -1 }, { at: -70, side: 1 }, { at: -38, side: 1 }];      // G, D, A, E
		pegs.forEach(function (peg) {
			var y = along(peg.at), s = peg.side;
			var headX = c + s * (box(peg.at) + mm(18) + mm(9));          // centre of the head
			var near = c + s * (box(peg.at) + mm(18)), far = c - s * (box(peg.at) + mm(3.5));
			var thick = mm(4.1), thin = mm(3.1);
			add('<polygon points="' + points([[near, y - thick], [far, y - thin], [far, y + thin], [near, y + thick]]) + '" fill="url(#vn-peg)"/>');
			// collar, then the head: a flat paddle seen from the front, with its pip at the end
			add('<rect x="' + round(Math.min(near, near - s * mm(3))) + '" y="' + round(y - mm(5)) + '" width="' + round(mm(3)) + '" height="' + round(mm(10)) + '" rx="' + round(mm(1.2)) + '" fill="url(#vn-peg)"/>');
			add('<ellipse cx="' + round(headX) + '" cy="' + round(y) + '" rx="' + round(mm(9)) + '" ry="' + round(mm(11)) + '" fill="url(#vn-head)" stroke="#050403" stroke-width="1.5"/>');
			add('<ellipse cx="' + round(headX - s * mm(1)) + '" cy="' + round(y) + '" rx="' + round(mm(5.2)) + '" ry="' + round(mm(7.4)) + '" fill="none" stroke="#6b5d52" stroke-width="1.2" opacity="0.5"/>');
			add('<circle cx="' + round(headX + s * mm(8.6)) + '" cy="' + round(y) + '" r="' + round(mm(1.5)) + '" fill="#efe6d2" stroke="#3a2c1c" stroke-width="1"/>');
		});

		// pegbox: the two walls in flamed maple, the channel between them in shadow
		add('<polygon points="' + points(boxOutline) + '" fill="url(#vn-maple)"/>');
		add('<polygon points="' + points(boxOutline) + '" fill="url(#vn-flame)"/>');
		var channel = [[c - box(topEdge) + WALL, along(topEdge)], [c + box(topEdge) - WALL, along(topEdge)], [c + box(-7) - WALL, along(-7)], [c - box(-7) + WALL, along(-7)]];
		add('<polygon points="' + points(channel) + '" fill="url(#vn-channel)" stroke="#4d2a10" stroke-width="2"/>');
		// the pegs again where they cross the open channel, in front of its floor
		pegs.forEach(function (peg) {
			var y = along(peg.at), inner = box(peg.at) - WALL;
			add('<rect x="' + round(c - inner) + '" y="' + round(y - mm(3.6)) + '" width="' + round(2 * inner) + '" height="' + round(mm(7.2)) + '" fill="url(#vn-peg)"/>');
		});
		// the edges of the walls, and the chamfer where the box meets the neck
		add('<polygon points="' + points(boxOutline) + '" fill="none" stroke="#4a260b" stroke-width="3" stroke-linejoin="round"/>');
		add('<line x1="' + round(c - box(-3) + 4) + '" y1="' + round(along(-3)) + '" x2="' + round(c + box(-3) - 4) + '" y2="' + round(along(-3)) + '" stroke="#f6dca4" stroke-width="2" opacity="0.5"/>');

		// fingerboard: ebony, with the light catching its curve left of centre and along its edges
		add('<polygon points="' + points(boardOutline) + '" fill="url(#vn-ebony)" stroke="#050403" stroke-width="2"/>');
		add('<line x1="' + round(c - board(0) + 3) + '" y1="' + along(0) + '" x2="' + round(c - board(bottom) + 3) + '" y2="' + HEIGHT + '" stroke="#8b7b6c" stroke-width="1.5" opacity="0.55"/>');

		// strings: wound G, D and A, plain steel E. The G and E turn onto their pegs; the D and A
		// run on up the channel to theirs.
		var widths = [mm(0.8), mm(0.68), mm(0.56), Math.max(1.6, mm(0.3))];
		pegs.forEach(function (peg, i) {
			var atNut = c + (i - 1.5) * mm(5.5);
			var atBottom = c + (i - 1.5) * mm(5.5 + 6 * bottom / 328);
			// where it meets its peg: towards the wall its peg's head is on, so the strings do not cross
			var onPeg = c + (i - 1.5) * mm(2.6);
			var path = 'M' + round(onPeg) + ' ' + round(along(peg.at)) + ' L' + round(atNut) + ' ' + along(0) + ' L' + round(atBottom) + ' ' + HEIGHT;
			add('<path d="' + path + '" fill="none" stroke="#3d3d3d" stroke-width="' + round(widths[i] + 1.4) + '" stroke-linejoin="round" opacity="0.55"/>');
			add('<path d="' + path + '" fill="none" stroke="' + (i === 3 ? '#f4f4f4' : '#cfcfcf') + '" stroke-width="' + round(widths[i]) + '" stroke-linejoin="round"/>');
			// the turns of the string round its peg
			for (var turn = 0; turn < 5; turn++) {
				var wx = onPeg + (turn - 2) * (widths[i] + 1.3) * (i < 2 ? 1 : -1) + (i < 2 ? -1 : 1) * widths[i] * 2;
				add('<line x1="' + round(wx) + '" y1="' + round(along(peg.at) - mm(3.5)) + '" x2="' + round(wx) + '" y2="' + round(along(peg.at) + mm(3.5)) + '" stroke="#dcdcdc" stroke-width="' + round(Math.max(1.4, widths[i] * 0.8)) + '"/>');
			}
		});

		// nut: a small block of ebony, a little proud of the fingerboard, with a groove for each string
		var nutHalf = board(0) + 2, nutHeight = mm(5);
		add('<rect x="' + round(c - nutHalf) + '" y="' + round(along(0) - nutHeight) + '" width="' + round(2 * nutHalf) + '" height="' + round(nutHeight) + '" rx="4" fill="#17110d" stroke="#050403" stroke-width="1.5"/>');
		add('<line x1="' + round(c - nutHalf + 5) + '" y1="' + round(along(0) - nutHeight + 4) + '" x2="' + round(c + nutHalf - 5) + '" y2="' + round(along(0) - nutHeight + 4) + '" stroke="#8b7b6c" stroke-width="2" opacity="0.6"/>');
		for (var groove = 0; groove < 4; groove++) {
			var gx = c + (groove - 1.5) * mm(5.5);
			add('<line x1="' + round(gx) + '" y1="' + round(along(0) - nutHeight) + '" x2="' + round(gx) + '" y2="' + along(0) + '" stroke="' + (groove === 3 ? '#f4f4f4' : '#cfcfcf') + '" stroke-width="' + round(widths[groove]) + '"/>');
		}

		add('</svg>');
		return parts.join('');
	}

	InstrumentChart.define('violin', {
		name: 'Violin',
		caption: 'First position',
		coverage: 'first position',
		width: WIDTH, height: HEIGHT,
		underlay: underlay(),
		buttons: buttons,
		labels: labels,
		describe: describe
	});
})();
