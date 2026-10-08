/*
 * Minimal Standard MIDI File parser (format 0 and 1, PPQ timing).
 *
 * MidiParser.parse(arrayBuffer) returns:
 * {
 *   format, ppq, endTick,
 *   tempos:   [{tick, usPerQuarter}]        sorted, always starts at tick 0
 *   timeSigs: [{tick, num, den}]            sorted, always starts at tick 0
 *   keySigs:  [{tick, sharps, minor}]
 *   markers:  [{tick, text}]                section names and cues written into the file
 *   tracks:   [{index, name, channel, program, percussion, lyrics:[{tick, text}], notes:[{tick, duration, pitch, velocity}]}]
 *             only tracks that contain at least one note
 *
 * A note that is affected by pitch bend also carries
 *   note.bend = { start, end, points: [{tick, semis}] }
 * where start/end are the bend (in semitones) when the note begins/ends and
 * points are the changes while it sounds, with tick relative to the note start.
 * A note that slides from one pitch to another has end - start != 0.
 *
 * A note played with the modulation wheel up (the usual way a file asks for vibrato)
 * carries note.modulation, the highest wheel value while it sounded (1 to 127).
 */
(function (global) {
	'use strict';

	function Reader(bytes) {
		this.bytes = bytes;
		this.pos = 0;
	}
	Reader.prototype.eof = function () { return this.pos >= this.bytes.length; };
	Reader.prototype.u8 = function () {
		if (this.pos >= this.bytes.length) { throw new Error('Unexpected end of MIDI data'); }
		return this.bytes[this.pos++];
	};
	Reader.prototype.u16 = function () { return (this.u8() << 8) | this.u8(); };
	Reader.prototype.u32 = function () { return ((this.u8() * 16777216) + (this.u8() << 16) + (this.u8() << 8) + this.u8()); };
	Reader.prototype.vlq = function () {
		var value = 0;
		for (var i = 0; i < 4; i++) {
			var b = this.u8();
			value = (value * 128) + (b & 0x7f);
			if (!(b & 0x80)) { return value; }
		}
		throw new Error('Invalid variable length value');
	};
	Reader.prototype.text = function (length) {
		var s = '';
		for (var i = 0; i < length; i++) { s += String.fromCharCode(this.u8()); }
		try { return decodeURIComponent(escape(s)); } catch (e) { return s; }
	};
	Reader.prototype.tag = function () {
		return String.fromCharCode(this.u8(), this.u8(), this.u8(), this.u8());
	};

	function parseTrack(reader, end, index, out) {
		var tick = 0;
		var runningStatus = 0;
		var track = { index: index, name: '', channel: -1, program: 0, percussion: false, lyrics: [], notes: [] };
		var open = {};   // "channel:pitch" -> [{tick, velocity}] waiting for their note-off
		var channels = {};

		// Pitch bend state of one channel. `events` is the history of the bend
		// in semitones, so each note can look up how it was bent while it sounded.
		function channelState(channel) {
			return channels[channel] || (channels[channel] = {
				range: 2,            // semitones for a full bend; files can change it with RPN 0
				value: 0,            // -1 .. +1
				rpnMsb: 127, rpnLsb: 127, rangeCents: 0,
				events: [],
				wheel: []           // history of the modulation wheel: {tick, value}
			});
		}
		function recordBend(state, atTick) {
			var semis = state.value * state.range;
			var previous = state.events.length ? state.events[state.events.length - 1].semis : 0;
			if (semis !== previous) { state.events.push({ tick: atTick, semis: semis }); }
		}
		function onController(channel, controller, data, atTick) {
			var state = channelState(channel);
			if (controller === 1) {                                         // modulation wheel
				var lastWheel = state.wheel.length ? state.wheel[state.wheel.length - 1].value : 0;
				if (data !== lastWheel) { state.wheel.push({ tick: atTick, value: data }); }
				return;
			}
			if (controller === 101) { state.rpnMsb = data; }
			else if (controller === 100) { state.rpnLsb = data; }
			else if (controller === 6 || controller === 38) {
				if (state.rpnMsb === 0 && state.rpnLsb === 0) {           // RPN 0: pitch bend range
					if (controller === 6) { state.range = data + state.rangeCents / 100; }
					else { state.rangeCents = data; state.range = Math.floor(state.range) + data / 100; }
					recordBend(state, atTick);
				}
			} else if (controller === 121) {                              // reset all controllers
				if (state.value !== 0) { state.value = 0; recordBend(state, atTick); }
				if (state.wheel.length && state.wheel[state.wheel.length - 1].value) { state.wheel.push({ tick: atTick, value: 0 }); }
			}
		}

		// bend (in semitones) in effect at a tick, from a channel's history
		function bendAt(events, atTick) {
			var lo = 0, hi = events.length;
			while (lo < hi) {
				var mid = (lo + hi) >> 1;
				if (events[mid].tick <= atTick) { lo = mid + 1; } else { hi = mid; }
			}
			return { semis: lo ? events[lo - 1].semis : 0, next: lo };
		}

		function closeNote(channel, pitch, atTick) {
			var list = open[channel + ':' + pitch];
			if (!list || !list.length) { return; }
			var start = list.shift();
			var note = {
				tick: start.tick,
				duration: Math.max(1, atTick - start.tick),
				pitch: pitch,
				velocity: start.velocity
			};

			var events = channelState(channel).events;
			var begin = bendAt(events, start.tick);
			var points = [];
			for (var i = begin.next; i < events.length && events[i].tick < atTick; i++) {
				points.push({ tick: events[i].tick - start.tick, semis: events[i].semis });
			}
			if (begin.semis !== 0 || points.length) {
				note.bend = {
					start: begin.semis,
					end: points.length ? points[points.length - 1].semis : begin.semis,
					points: points
				};
			}

			// the highest the modulation wheel was while the note sounded
			var wheel = channelState(channel).wheel, modulation = 0;
			for (var w = 0; w < wheel.length && wheel[w].tick < atTick; w++) {
				if (wheel[w].tick <= start.tick) { modulation = wheel[w].value; }
				else { modulation = Math.max(modulation, wheel[w].value); }
			}
			if (modulation) { note.modulation = modulation; }
			track.notes.push(note);
		}

		while (reader.pos < end) {
			tick += reader.vlq();
			var status = reader.u8();
			if (status < 0x80) {            // running status: this byte is already data
				if (!runningStatus) { throw new Error('Invalid running status'); }
				reader.pos--;
				status = runningStatus;
			}

			if (status === 0xff) {          // meta event
				var type = reader.u8();
				var len = reader.vlq();
				var next = reader.pos + len;
				if (type === 0x03 && !track.name) {
					track.name = reader.text(len).replace(/\0/g, '').trim();
				} else if (type === 0x05 || type === 0x06 || type === 0x07) {
					var words = reader.text(len).replace(/[^ -~\u00A0-\uFFFF]+/g, ' ').trim();
					if (words) { (type === 0x05 ? track.lyrics : out.markers).push({ tick: tick, text: words }); }
				} else if (type === 0x51 && len === 3) {
					out.tempos.push({ tick: tick, usPerQuarter: (reader.u8() << 16) | (reader.u8() << 8) | reader.u8() });
				} else if (type === 0x58 && len >= 2) {
					out.timeSigs.push({ tick: tick, num: reader.u8(), den: Math.pow(2, reader.u8()) });
				} else if (type === 0x59 && len === 2) {
					var sf = reader.u8();
					out.keySigs.push({ tick: tick, sharps: sf > 127 ? sf - 256 : sf, minor: reader.u8() === 1 });
				}
				reader.pos = next;
				if (type === 0x2f) { break; }
			} else if (status === 0xf0 || status === 0xf7) {   // sysex
				reader.pos += reader.vlq();
			} else {
				runningStatus = status;
				var kind = status & 0xf0;
				var channel = status & 0x0f;
				if (kind === 0xc0 || kind === 0xd0) {
					var data = reader.u8();
					if (kind === 0xc0 && track.channel < 0) { track.program = data; }
				} else {
					var d1 = reader.u8();
					var d2 = reader.u8();
					if (kind === 0xe0) {                                      // pitch bend: 14-bit, centre 8192
						var state = channelState(channel);
						state.value = (((d2 << 7) | d1) - 8192) / 8192;
						recordBend(state, tick);
					} else if (kind === 0xb0) {
						onController(channel, d1, d2, tick);
					} else if (kind === 0x90 && d2 > 0) {
						if (track.channel < 0) { track.channel = channel; }
						(open[channel + ':' + d1] = open[channel + ':' + d1] || []).push({ tick: tick, velocity: d2 });
					} else if (kind === 0x80 || kind === 0x90) {
						closeNote(channel, d1, tick);
					}
				}
			}
		}

		// notes that never received a note-off end with the track
		Object.keys(open).forEach(function (key) {
			var parts = key.split(':');
			while (open[key].length) { closeNote(+parts[0], +parts[1], tick); }
		});

		reader.pos = end;
		track.notes.sort(function (a, b) { return a.tick - b.tick || a.pitch - b.pitch; });
		track.percussion = track.channel === 9;
		return track;
	}

	function parse(arrayBuffer) {
		var reader = new Reader(new Uint8Array(arrayBuffer));
		if (reader.bytes.length < 14 || reader.tag() !== 'MThd') {
			throw new Error('This is not a MIDI file.');
		}
		var headerLength = reader.u32();
		var format = reader.u16();
		var trackCount = reader.u16();
		var division = reader.u16();
		reader.pos = 8 + headerLength;
		if (division & 0x8000) {
			throw new Error('SMPTE time-code MIDI files are not supported.');
		}

		var out = { format: format, ppq: division, endTick: 0, tempos: [], timeSigs: [], keySigs: [], markers: [], tracks: [] };
		var index = 0;
		while (!reader.eof() && index < trackCount) {
			var tag = reader.tag();
			var length = reader.u32();
			var end = Math.min(reader.pos + length, reader.bytes.length);
			if (tag === 'MTrk') {
				var track = parseTrack(reader, end, index, out);
				index++;
				if (track.notes.length) { out.tracks.push(track); }
			} else {
				reader.pos = end;
			}
		}
		if (!out.tracks.length) { throw new Error('No notes were found in this MIDI file.'); }

		function byTick(a, b) { return a.tick - b.tick; }
		out.tempos.sort(byTick);
		out.timeSigs.sort(byTick);
		out.keySigs.sort(byTick);
		out.markers.sort(byTick);
		// one entry per change: files often repeat the key in every track
		out.keySigs = out.keySigs.filter(function (k, i) { return i === 0 || k.sharps !== out.keySigs[i - 1].sharps; });
		if (!out.tempos.length || out.tempos[0].tick > 0) { out.tempos.unshift({ tick: 0, usPerQuarter: 500000 }); }
		if (!out.timeSigs.length || out.timeSigs[0].tick > 0) { out.timeSigs.unshift({ tick: 0, num: 4, den: 4 }); }
		out.tracks.forEach(function (t) {
			t.notes.forEach(function (n) { out.endTick = Math.max(out.endTick, n.tick + n.duration); });
			if (!t.name) { t.name = 'Track ' + (t.index + 1); }
		});
		return out;
	}

	/* Tempo map: converts between ticks and seconds. */
	function TempoMap(ppq, tempos) {
		this.ppq = ppq;
		this.segments = [];
		var seconds = 0;
		for (var i = 0; i < tempos.length; i++) {
			if (i > 0) {
				seconds += (tempos[i].tick - tempos[i - 1].tick) * tempos[i - 1].usPerQuarter / ppq / 1e6;
			}
			this.segments.push({ tick: tempos[i].tick, seconds: seconds, usPerQuarter: tempos[i].usPerQuarter });
		}
	}
	TempoMap.prototype.ticksToSeconds = function (tick) {
		var s = this.segments, i = s.length - 1;
		while (i > 0 && s[i].tick > tick) { i--; }
		return s[i].seconds + (tick - s[i].tick) * s[i].usPerQuarter / this.ppq / 1e6;
	};
	TempoMap.prototype.secondsToTicks = function (seconds) {
		var s = this.segments, i = s.length - 1;
		while (i > 0 && s[i].seconds > seconds) { i--; }
		return s[i].tick + (seconds - s[i].seconds) * 1e6 * this.ppq / s[i].usPerQuarter;
	};

	global.MidiParser = { parse: parse, TempoMap: TempoMap };
	if (typeof module === 'object' && module.exports) { module.exports = global.MidiParser; }
})(typeof window !== 'undefined' ? window : globalThis);
