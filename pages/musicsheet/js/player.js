/*
 * Audio for the music sheet: loads instrument sounds and plays a list of notes
 * with a look-ahead scheduler, so pause, seek and speed changes stay accurate.
 *
 *   var player = new SheetPlayer();
 *   player.loadSound(sound)            // promise; sound comes from SheetPlayer.gm(), .drum() or .RECORDED_VIOLIN
 *   player.setNotes(notes)             // replaces the song and rewinds
 *   player.replaceNotes(notes)         // replaces the song but keeps the position
 *   player.play(); player.pause(); player.stop(); player.seek(sec); player.setSpeed(1.5);
 *   player.currentTime()               // song position in seconds
 *   player.preview(sound, pitch)       // play one note now; returns {stop()}
 *   player.onEnd = function () {}
 *
 * A note is {time, duration, pitch, velocity, sound, gain, startBend, slides, vibrato}:
 *   time/duration in seconds at 1x speed; gain scales its volume;
 *   startBend: semitones the note starts bent by; slides: [{pitch, when}] glide
 *   targets with absolute (fractional) MIDI pitch and `when` seconds after the start;
 *   vibrato: depth in cents to add to this note (0 or absent for none).
 *
 * Sounds are either WebAudioFont presets (assets/sound) or sets of recorded
 * samples described by a JSON manifest (sounds/violin). Every voice gets its own
 * envelope, so bowed and blown instruments fade in and out instead of switching on.
 */
(function (global) {
	'use strict';

	var LOOKAHEAD = 0.25;      // seconds of audio scheduled ahead of the clock
	var TIMER_MS = 30;
	var END_TAIL = 0.8;        // seconds after the last note before playback ends
	var SOUNDFONT_PATH = '/assets/sound/';
	var VIBRATO_HZ = 5.6;
	var REVERB_SECONDS = 1.7;
	var REVERB_LEVEL = 0.2;

	/* ---------- sound definitions ---------- */

	// How a General MIDI program should be articulated: attack and release in seconds.
	// (Vibrato is not part of the articulation: it is added per note, only where the music asks for it.)
	function expressionFor(program) {
		if (program >= 40 && program <= 43) { return { attack: 0.02, release: 0.13 }; }                        // solo strings
		if (program === 44 || (program >= 48 && program <= 51)) { return { attack: 0.07, release: 0.2 }; }   // string sections
		if (program >= 52 && program <= 54) { return { attack: 0.06, release: 0.2 }; }                        // voices
		if (program >= 56 && program <= 63) { return { attack: 0.025, release: 0.08 }; }                      // brass
		if (program >= 64 && program <= 79) { return { attack: 0.03, release: 0.09 }; }                       // reeds and flutes
		return { attack: 0.004, release: 0.1 };                                                               // struck and plucked
	}

	function pad(number, digits) {
		var s = String(number);
		while (s.length < digits) { s = '0' + s; }
		return s;
	}

	var soundCache = {};
	function gm(program) {
		program = Math.max(0, Math.min(127, program | 0));
		var key = 'gm' + program;
		if (!soundCache[key]) {
			var name = pad(program, 3) + '0_FluidR3_GM_sf2_file';
			soundCache[key] = { key: key, kind: 'font', file: name + '.js', variable: '_tone_' + name, program: program, expression: expressionFor(program), level: 1 };
		}
		return soundCache[key];
	}
	function drum(pitch) {
		var key = 'drum' + pitch;
		if (!soundCache[key]) {
			var name = pitch + '_0_FluidR3_GM_sf2_file';
			soundCache[key] = { key: key, kind: 'font', file: '128' + name + '.js', variable: '_drum_' + name, drum: true, expression: { attack: 0.002, release: 0.05 }, level: 1 };
		}
		return soundCache[key];
	}
	// A real violin, recorded note by note with a natural bow attack and no vibrato.
	var RECORDED_VIOLIN = {
		key: 'violin-recorded', kind: 'samples', manifest: '/pages/musicsheet/sounds/violin/violin.json',
		expression: { attack: 0.012, release: 0.15, skipAttack: 0.05 }, level: 2.8
	};

	/* ---------- player ---------- */

	function SheetPlayer(audioContext) {
		var AudioContextClass = global.AudioContext || global.webkitAudioContext;
		var ctx = this.ctx = audioContext || new AudioContextClass();
		this.font = new WebAudioFontPlayer();      // used for decoding its presets and for instrument names

		// voices -> input -> compressor -> master -> speakers, with a reverb send in parallel
		this.input = ctx.createGain();
		this.master = ctx.createGain();
		this.master.gain.value = 0.9;
		var compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -14;
		compressor.knee.value = 12;
		compressor.ratio.value = 4;
		compressor.attack.value = 0.005;
		compressor.release.value = 0.2;
		var reverb = ctx.createConvolver();
		reverb.buffer = makeImpulse(ctx, REVERB_SECONDS);
		var send = ctx.createGain();
		send.gain.value = REVERB_LEVEL;
		this.input.connect(compressor);
		this.input.connect(send);
		send.connect(reverb);
		reverb.connect(compressor);
		compressor.connect(this.master);
		this.master.connect(ctx.destination);

		// one slow oscillator shared by every note that is played with vibrato (made when first needed)
		this.lfo = null;

		this.presets = {};         // sound key -> loaded preset
		this.loading = {};         // sound key -> promise
		this.voices = [];
		this.notes = [];
		this.duration = 0;
		this.speed = 1;
		this.loop = false;
		this.playing = false;
		this.position = 0;         // song seconds at the anchor
		this.anchor = 0;           // audio-clock time matching `position`
		this.nextIndex = 0;
		this.timer = null;
		this.onEnd = null;
	}

	// Room reverb: decaying noise, darker towards the tail. Seeded so it is the same every time.
	function makeImpulse(ctx, seconds) {
		var length = Math.floor(ctx.sampleRate * seconds);
		var impulse = ctx.createBuffer(2, length, ctx.sampleRate);
		var seed = 12345;
		function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; }
		for (var channel = 0; channel < 2; channel++) {
			var data = impulse.getChannelData(channel), smooth = 0;
			var predelay = Math.floor(ctx.sampleRate * 0.012);
			for (var i = predelay; i < length; i++) {
				var t = i / length;
				var keep = 0.35 + 0.6 * t;                      // more smoothing (less treble) later on
				smooth = smooth * keep + random() * (1 - keep);
				data[i] = smooth * Math.pow(1 - t, 2.2) * 3;
			}
		}
		return impulse;
	}

	/* ---------- loading sounds ---------- */

	SheetPlayer.prototype.loadSound = function (sound) {
		var self = this;
		if (!this.loading[sound.key]) {
			var load = sound.kind === 'samples' ? this.loadSamples(sound) : this.loadFont(sound);
			this.loading[sound.key] = load.then(function (preset) {
				self.presets[sound.key] = preset;
				return preset;
			}, function (error) {
				delete self.loading[sound.key];     // allow a retry
				throw error;
			});
		}
		return this.loading[sound.key];
	};

	SheetPlayer.prototype.isLoaded = function (sound) { return !!this.presets[sound.key]; };

	SheetPlayer.prototype.loadFont = function (sound) {
		var self = this;
		return new Promise(function (resolve, reject) {
			function decode() {
				var preset = global[sound.variable];
				if (!preset) { reject(new Error('Sound file is empty: ' + sound.file)); return; }
				self.font.adjustPreset(self.ctx, preset);
				var waited = 0;
				(function check() {
					if (preset.zones.every(function (zone) { return zone.buffer; })) { resolve(preset); }
					else if (waited > 20000) { reject(new Error('Could not decode ' + sound.file)); }
					else { waited += 60; setTimeout(check, 60); }
				})();
			}
			if (global[sound.variable]) { decode(); return; }
			var script = document.createElement('script');
			script.src = SOUNDFONT_PATH + sound.file;
			script.onload = decode;
			script.onerror = function () { reject(new Error('Could not load ' + sound.file)); };
			document.head.appendChild(script);
		});
	};

	SheetPlayer.prototype.loadSamples = function (sound) {
		var ctx = this.ctx;
		var base = sound.manifest.replace(/[^/]*$/, '');
		function decode(buffer) {
			return new Promise(function (resolve, reject) { ctx.decodeAudioData(buffer, resolve, reject); });
		}
		function get(url, type) {
			return fetch(url).then(function (response) {
				if (!response.ok) { throw new Error('Could not load ' + url); }
				return response[type]();
			});
		}
		return get(sound.manifest, 'json').then(function (manifest) {
			var zones = manifest.zones.slice().sort(function (a, b) { return a.midi - b.midi; });
			return Promise.all(zones.map(function (zone, i) {
				return get(base + zone.file, 'arrayBuffer').then(decode).then(function (buffer) {
					// each recording covers the pitches up to halfway to its neighbours
					var low = i === 0 ? 0 : Math.floor((zones[i - 1].midi + zone.midi) / 2) + 1;
					var high = i === zones.length - 1 ? 127 : Math.floor((zone.midi + zones[i + 1].midi) / 2);
					return {
						keyRangeLow: low, keyRangeHigh: high,
						originalPitch: zone.midi * 100 + (zone.tuneCents || 0), coarseTune: 0, fineTune: 0,
						sampleRate: zone.sampleRate, loopStart: zone.loopStart, loopEnd: zone.loopEnd,
						delay: 0, ahdsr: false, buffer: buffer
					};
				});
			}));
		}).then(function (zones) { return { zones: zones }; });
	};

	SheetPlayer.prototype.instrumentName = function (program) {
		var title = this.font.loader.instrumentTitles()[program] || ('Program ' + program);
		return title.split(':')[0];
	};

	/* ---------- voices ---------- */

	function findZone(preset, pitch) {
		var zone = null;
		for (var i = preset.zones.length - 1; i >= 0; i--) {
			zone = preset.zones[i];
			if (zone.keyRangeLow <= pitch && zone.keyRangeHigh + 1 >= pitch) { break; }
		}
		return zone;
	}

	/*
	 * Start one note. `when` is on the audio clock, `duration` in seconds of real time.
	 * `timeScale` stretches the pitch slides to match the playback speed.
	 */
	SheetPlayer.prototype.startVoice = function (sound, note, when, duration, timeScale) {
		var preset = this.presets[sound.key];
		if (!preset) { return null; }
		var ctx = this.ctx;
		var zone = findZone(preset, Math.round(note.pitch));
		if (!zone || !zone.buffer) { return null; }
		var expression = sound.expression;
		timeScale = timeScale || 1;
		when = Math.max(when, ctx.currentTime);

		var source = ctx.createBufferSource();
		source.buffer = zone.buffer;
		var base = zone.originalPitch - 100 * zone.coarseTune - zone.fineTune;
		function rate(pitch) { return Math.pow(2, (100 * pitch - base) / 1200); }
		var startRate = rate(note.pitch + (note.startBend || 0));
		source.playbackRate.setValueAtTime(startRate, when);
		if (note.slides) {
			for (var i = 0; i < note.slides.length; i++) {
				source.playbackRate.linearRampToValueAtTime(rate(note.slides[i].pitch), when + note.slides[i].when * timeScale);
			}
		}

		var delay = zone.delay || 0;
		var looped = zone.loopStart >= 1 && zone.loopStart < zone.loopEnd;
		if (looped) {
			source.loop = true;
			source.loopStart = zone.loopStart / zone.sampleRate + delay;
			source.loopEnd = zone.loopEnd / zone.sampleRate + delay;
		}

		// very short notes skip the soft start of a recorded bow stroke so they speak in time
		var offset = delay;
		if (expression.skipAttack && duration < 0.16) { offset += expression.skipAttack; }

		var available = (zone.buffer.duration - offset) / startRate;
		if (sound.drum) { duration = available; }
		else if (!looped) { duration = Math.min(duration, available); }
		duration = Math.max(0.03, duration);

		// envelope
		var peak = Math.pow((note.velocity || 100) / 127, 1.4) * (note.gain === undefined ? 1 : note.gain) * (sound.level || 1) * 0.5;
		var attack = Math.min(expression.attack, duration * 0.5);
		var release = expression.release;
		var end = when + duration;
		var gain = ctx.createGain();
		gain.gain.setValueAtTime(0, when);
		gain.gain.linearRampToValueAtTime(peak, when + attack);
		var held = peak;
		if (zone.ahdsr && !sound.drum) {
			// struck or plucked sound: let it die away while the key is held
			var points = [[0.5, 1], [2, 0.5], [5, 0.02]];
			var previousTime = attack, previousLevel = 1;
			for (var p = 0; p < points.length; p++) {
				var pointTime = Math.max(points[p][0], attack), level = points[p][1];
				if (pointTime >= duration) {
					var part = (duration - previousTime) / Math.max(1e-6, pointTime - previousTime);
					held = peak * (previousLevel + (level - previousLevel) * Math.max(0, part));
					break;
				}
				gain.gain.linearRampToValueAtTime(peak * level, when + pointTime);
				previousTime = pointTime; previousLevel = level; held = peak * level;
			}
			gain.gain.linearRampToValueAtTime(held, end);
		} else {
			gain.gain.setValueAtTime(peak, end);
		}
		gain.gain.setTargetAtTime(0, end, release / 3);
		var stopAt = end + release * 1.8;

		// vibrato, when the note asks for it: the pitch starts to waver shortly after the note begins
		var vibrato = null;
		if (note.vibrato && source.detune && duration > 0.12) {
			if (!this.lfo) {
				this.lfo = ctx.createOscillator();
				this.lfo.frequency.value = VIBRATO_HZ;
				this.lfo.start();
			}
			vibrato = ctx.createGain();
			vibrato.gain.setValueAtTime(0, when + 0.06);
			vibrato.gain.linearRampToValueAtTime(note.vibrato, when + Math.min(0.3, duration * 0.6));
			this.lfo.connect(vibrato);
			vibrato.connect(source.detune);
		}

		source.connect(gain);
		gain.connect(this.input);
		source.start(when, offset);
		source.stop(stopAt);

		var voices = this.voices;
		var voice = {
			source: source, gain: gain, stopped: false,
			// fade out quickly from wherever the envelope is
			stop: function (fade) {
				if (voice.stopped) { return; }
				voice.stopped = true;
				var now = ctx.currentTime;
				fade = fade || 0.03;
				try {
					if (gain.gain.cancelAndHoldAtTime) { gain.gain.cancelAndHoldAtTime(now); }
					else { gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(gain.gain.value, now); }
					gain.gain.setTargetAtTime(0, now, fade / 3);
					source.stop(now + fade * 2);
				} catch (e) { /* already stopped */ }
			}
		};
		source.onended = function () {
			gain.disconnect();
			if (vibrato) { vibrato.disconnect(); }
			var index = voices.indexOf(voice);
			if (index >= 0) { voices.splice(index, 1); }
		};
		voices.push(voice);
		return voice;
	};

	SheetPlayer.prototype.silence = function () {
		this.voices.slice().forEach(function (voice) { voice.stop(); });
	};

	/* Play one note right away (used by the finger chart). Returns the voice; call stop() on it. */
	SheetPlayer.prototype.preview = function (sound, pitch) {
		this.ctx.resume();
		return this.startVoice(sound, { pitch: pitch, velocity: 100, gain: 1, vibrato: 0 }, this.ctx.currentTime, 20, 1);
	};

	/* ---------- transport ---------- */

	function prepare(notes) {
		return notes.slice().sort(function (a, b) { return a.time - b.time; });
	}

	SheetPlayer.prototype.setNotes = function (notes) {
		this.stop();
		this.notes = prepare(notes);
		this.duration = 0;
		for (var i = 0; i < this.notes.length; i++) {
			this.duration = Math.max(this.duration, this.notes[i].time + this.notes[i].duration);
		}
	};

	SheetPlayer.prototype.replaceNotes = function (notes) {
		var position = this.currentTime();
		this.notes = prepare(notes);
		this.duration = 0;
		for (var i = 0; i < this.notes.length; i++) {
			this.duration = Math.max(this.duration, this.notes[i].time + this.notes[i].duration);
		}
		this.seek(position);
	};

	SheetPlayer.prototype.currentTime = function () {
		if (!this.playing) { return this.position; }
		var t = this.position + (this.ctx.currentTime - this.anchor) * this.speed;
		return Math.max(0, Math.min(t, this.duration));
	};

	SheetPlayer.prototype.indexAt = function (time) {
		var lo = 0, hi = this.notes.length;
		while (lo < hi) {
			var mid = (lo + hi) >> 1;
			if (this.notes[mid].time < time) { lo = mid + 1; } else { hi = mid; }
		}
		return lo;
	};

	SheetPlayer.prototype.play = function () {
		if (this.playing || !this.notes.length) { return; }
		if (this.position >= this.duration) { this.position = 0; }
		this.ctx.resume();
		this.playing = true;
		this.anchor = this.ctx.currentTime + 0.05;
		this.nextIndex = this.indexAt(this.position);
		var self = this;
		this.timer = setInterval(function () { self.tick(); }, TIMER_MS);
		this.tick();
	};

	SheetPlayer.prototype.pause = function () {
		if (!this.playing) { return; }
		this.position = this.currentTime();
		this.playing = false;
		clearInterval(this.timer);
		this.silence();
	};

	SheetPlayer.prototype.stop = function () {
		this.pause();
		this.position = 0;
	};

	SheetPlayer.prototype.seek = function (seconds) {
		seconds = Math.max(0, Math.min(this.duration, seconds));
		if (!this.playing) { this.position = seconds; return; }
		this.silence();
		this.position = seconds;
		this.anchor = this.ctx.currentTime + 0.05;
		this.nextIndex = this.indexAt(seconds);
	};

	SheetPlayer.prototype.setSpeed = function (speed) {
		var now = this.currentTime();
		this.speed = speed;
		if (this.playing) { this.seek(now); }
	};

	SheetPlayer.prototype.tick = function () {
		if (!this.playing) { return; }
		var raw = this.position + (this.ctx.currentTime - this.anchor) * this.speed;
		var horizon = raw + LOOKAHEAD * this.speed;
		var notes = this.notes;

		while (this.nextIndex < notes.length && notes[this.nextIndex].time < horizon) {
			var n = notes[this.nextIndex++];
			var when = this.anchor + (n.time - this.position) / this.speed;
			this.startVoice(n.sound, n, when, n.duration / this.speed, 1 / this.speed);
		}

		if (raw >= this.duration + END_TAIL) {      // let the last note ring out
			if (this.loop) {
				this.position = 0;
				this.anchor = this.ctx.currentTime + 0.1;
				this.nextIndex = 0;
				return;
			}
			this.stop();
			if (this.onEnd) { this.onEnd(); }
		}
	};

	SheetPlayer.gm = gm;
	SheetPlayer.drum = drum;
	SheetPlayer.RECORDED_VIOLIN = RECORDED_VIOLIN;
	global.SheetPlayer = SheetPlayer;
})(window);
