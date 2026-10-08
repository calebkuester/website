/*
 * The fingering chart: a standard panel that shows where notes are played on
 * an instrument. What it shows for a given instrument comes from a definition
 * (see chart-violin.js), so other instruments can be added without changing
 * this file.
 *
 *   InstrumentChart.define('violin', definition);
 *
 *   var chart = new InstrumentChart(element, { onPress: function (pitch) {}, onRelease: function () {} });
 *   chart.setInstrument('violin', 'Violin');      // or (null, 'Piano') when there is no chart for it yet
 *   chart.range();                                // {low, high} MIDI pitches the chart covers, or null
 *   chart.show(currentPitches, nextPitches);      // MIDI pitches sounding now / coming up next
 *
 * The panel is always laid out the same way:
 *   - a heading with the instrument's name and what the chart covers;
 *   - a stage with a faint drawing of the instrument and, over it, one button
 *     for each place a note is played, plus the labels that go with them;
 *   - a cue at the edge of the stage for a note the chart does not reach;
 *   - a line of text naming the note and its fingering.
 * The button of the note being played is lit; the button of the next note is
 * ringed. Pressing a button plays its note.
 *
 * A definition is
 *   {
 *     name, caption,                 // 'Violin', 'First position'
 *     width, height,                 // size of the stage, in the units used below
 *     underlay,                      // SVG markup: the instrument, drawn in those units
 *     buttons: [{pitch, x, y, size | width + height, label, sub, kind, title, alternate}],
 *                                    // x, y: centre. label/sub: one or two lines of text.
 *                                    // kind: extra class for styling. alternate: another place
 *                                    // for a pitch that already has a button (it plays, but is not lit)
 *     labels: [{x, y, text, align, kind, image, height}],
 *                                    // a label with an image shows the picture (height in stage
 *                                    // units) and keeps the text as its description
 *     describe: function (pitch) {}, // 'A string, 1st finger'
 *     coverage                       // 'first position': used in "above first position"
 *   }
 */
(function (global) {
	'use strict';

	var definitions = {};
	var SHARP = String.fromCharCode(0x266F);
	var NAMES = ['C', 'C' + SHARP, 'D', 'D' + SHARP, 'E', 'F', 'F' + SHARP, 'G', 'G' + SHARP, 'A', 'A' + SHARP, 'B'];
	var DOT = ' ' + String.fromCharCode(0xB7) + ' ';

	function noteName(pitch) {
		return NAMES[((pitch % 12) + 12) % 12] + (Math.floor(pitch / 12) - 1);
	}

	function make(tag, className, text) {
		var element = document.createElement(tag);
		if (className) { element.className = className; }
		if (text !== undefined) { element.textContent = text; }
		return element;
	}

	function InstrumentChart(element, handlers) {
		handlers = handlers || {};
		this.definition = null;
		this.buttons = {};          // pitch -> the button that lights for it
		this.shown = '';

		this.root = make('div', 'ic');
		var head = make('div', 'ic-head');
		this.nameElement = make('span', 'ic-name');
		this.captionElement = make('span', 'ic-caption');
		head.appendChild(this.nameElement);
		head.appendChild(this.captionElement);

		this.stage = make('div', 'ic-stage');
		this.underlay = make('div', 'ic-underlay');
		this.layer = make('div', 'ic-layer');
		this.cueLow = make('div', 'ic-cue ic-cue-low');
		this.cueHigh = make('div', 'ic-cue ic-cue-high');
		this.empty = make('div', 'ic-empty');
		[this.underlay, this.layer, this.cueLow, this.cueHigh, this.empty].forEach(function (part) { this.stage.appendChild(part); }, this);

		this.readout = make('div', 'ic-readout');
		this.root.appendChild(head);
		this.root.appendChild(this.stage);
		this.root.appendChild(this.readout);
		element.appendChild(this.root);

		// press a button to hear its note
		var pressed = null;
		function release() {
			if (!pressed) { return; }
			pressed.classList.remove('pressed');
			pressed = null;
			if (handlers.onRelease) { handlers.onRelease(); }
		}
		this.stage.addEventListener('pointerdown', function (event) {
			var target = event.target.closest('.ic-button');
			if (!target) { return; }
			event.preventDefault();
			release();
			pressed = target;
			pressed.classList.add('pressed');
			if (handlers.onPress) { handlers.onPress(+target.dataset.pitch); }
		});
		var stage = this.stage;
		['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) { stage.addEventListener(type, release); });
		global.addEventListener('blur', release);

		this.setInstrument(null, '');
	}

	/* Show the chart of an instrument, or a placeholder when it has none. */
	InstrumentChart.prototype.setInstrument = function (key, name) {
		var definition = (key && definitions[key]) || null;
		this.definition = definition;
		this.buttons = {};
		this.shown = '';
		this.layer.textContent = '';
		this.underlay.textContent = '';
		this.root.classList.toggle('ic-none', !definition);
		this.nameElement.textContent = definition ? definition.name : name;
		this.captionElement.textContent = definition ? definition.caption : '';

		if (!definition) {
			this.stage.style.aspectRatio = '';
			this.stage.style.removeProperty('--ic-ratio');
			this.empty.textContent = name ? 'There is no fingering chart for ' + name.toLowerCase() + ' yet.' : '';
			this.show([], []);
			return;
		}

		this.empty.textContent = '';
		this.stage.style.aspectRatio = definition.width + ' / ' + definition.height;
		this.stage.style.setProperty('--ic-ratio', definition.width / definition.height);
		this.underlay.innerHTML = definition.underlay;

		var self = this;
		var horizontal = function (x) { return (x / definition.width * 100) + '%'; };
		var vertical = function (y) { return (y / definition.height * 100) + '%'; };
		definition.labels.forEach(function (label) {
			var text;
			if (label.image) {
				// a picture in place of the words; the words stay as its description and tooltip
				text = make('img', 'ic-label ic-label-image' + (label.kind ? ' ic-label-' + label.kind : ''));
				text.src = label.image;
				text.alt = label.text;
				text.title = label.text;
				text.draggable = false;
				text.style.height = vertical(label.height);
			} else {
				text = make('div', 'ic-label' + (label.kind ? ' ic-label-' + label.kind : ''), label.text);
			}
			text.style.top = vertical(label.y);
			if (label.align === 'right') { text.style.right = (100 - label.x / definition.width * 100) + '%'; text.style.textAlign = 'right'; }
			else if (label.align === 'center') { text.style.left = horizontal(label.x); text.classList.add('ic-label-centre'); }
			else { text.style.left = horizontal(label.x); }
			self.layer.appendChild(text);
		});
		definition.buttons.forEach(function (spec) {
			var button = make('button', 'ic-button' + (spec.kind ? ' ic-button-' + spec.kind : '') + (spec.sub ? ' ic-button-two' : ''));
			button.type = 'button';
			// a round button has a size; an oval one a width and a height
			var wide = spec.width || spec.size, tall = spec.height || spec.size;
			button.style.left = horizontal(spec.x - wide / 2);
			button.style.top = vertical(spec.y - tall / 2);
			button.style.width = horizontal(wide);
			button.style.height = vertical(tall);
			button.dataset.pitch = spec.pitch;
			button.title = spec.title || ('Play ' + noteName(spec.pitch));
			button.setAttribute('aria-label', button.title);
			button.appendChild(make('span', 'ic-button-text', spec.label));
			if (spec.sub) { button.appendChild(make('span', 'ic-button-text', spec.sub)); }
			self.layer.appendChild(button);
			if (!spec.alternate && !self.buttons[spec.pitch]) { self.buttons[spec.pitch] = button; }
		});
		this.show([], []);
	};

	/* The pitches the chart has a button for: {low, high}, or null when there is no chart. */
	InstrumentChart.prototype.range = function () {
		var pitches = Object.keys(this.buttons).map(Number);
		if (!pitches.length) { return null; }
		return { low: Math.min.apply(null, pitches), high: Math.max.apply(null, pitches) };
	};

	/*
	 * Light the buttons of the notes sounding now and ring those coming next.
	 * A note the chart does not reach lights nothing: a cue at the edge of the
	 * stage says it is out of range, above or below.
	 */
	InstrumentChart.prototype.show = function (currentPitches, nextPitches) {
		var key = currentPitches.join(',') + '|' + nextPitches.join(',');
		if (key === this.shown) { return; }
		this.shown = key;
		var definition = this.definition, buttons = this.buttons, range = this.range();

		var lit = [], ringed = [];
		currentPitches.forEach(function (p) { if (buttons[p]) { lit.push(buttons[p]); } });
		nextPitches.forEach(function (p) { if (buttons[p] && lit.indexOf(buttons[p]) < 0) { ringed.push(buttons[p]); } });
		Array.prototype.forEach.call(this.layer.querySelectorAll('.ic-button'), function (button) {
			button.classList.toggle('on', lit.indexOf(button) >= 0);
			button.classList.toggle('next', ringed.indexOf(button) >= 0);
		});

		// out of range: which way, and whether it is sounding now or only coming next
		function outside(pitches, above) {
			return range ? pitches.filter(function (p) { return !buttons[p] && (above ? p > range.high : p < range.low); }) : [];
		}
		var coverage = definition ? definition.coverage : '';
		[[this.cueHigh, true, 'above'], [this.cueLow, false, 'below']].forEach(function (side) {
			var cue = side[0];
			var now = outside(currentPitches, side[1]), soon = outside(nextPitches, side[1]);
			var pitches = now.length ? now : soon;
			cue.classList.toggle('on', now.length > 0);
			cue.classList.toggle('next', !now.length && soon.length > 0);
			cue.textContent = pitches.length ? pitches.map(noteName).join(', ') + ' ' + (pitches.length > 1 ? 'are ' : 'is ') + side[2] + ' ' + coverage : '';
		});

		function describe(pitch) {
			if (buttons[pitch]) { return noteName(pitch) + DOT + definition.describe(pitch); }
			if (!range) { return noteName(pitch); }
			return noteName(pitch) + DOT + (pitch > range.high ? 'above ' : 'below ') + coverage + ', not on the chart';
		}
		var lines;
		if (currentPitches.length) { lines = currentPitches.slice(0, 4).map(describe); }
		else if (nextPitches.length) { lines = ['Next: ' + nextPitches.slice(0, 4).map(describe).join('; ')]; }
		else { lines = [definition ? 'Press a position to hear it.' : '']; }
		this.readout.textContent = '';
		var readout = this.readout;
		lines.forEach(function (line) { readout.appendChild(make('div', '', line)); });
	};

	InstrumentChart.define = function (key, definition) { definitions[key] = definition; };
	InstrumentChart.has = function (key) { return !!definitions[key]; };

	/*
	 * The octave shift (a multiple of 12 semitones) that brings the most notes of a part
	 * into the range low..high. The whole part moves together, so the chart keeps the
	 * shape of the tune: a step up in the music is always a step up on the chart.
	 */
	InstrumentChart.bestShift = function (pitches, low, high) {
		var best = 0, bestCount = -1;
		[0, -12, 12, -24, 24, -36, 36].forEach(function (shift) {
			var count = 0;
			pitches.forEach(function (p) { if (p + shift >= low && p + shift <= high) { count++; } });
			if (count > bestCount) { bestCount = count; best = shift; }
		});
		return best;
	};

	InstrumentChart.noteName = noteName;
	global.InstrumentChart = InstrumentChart;
})(window);
