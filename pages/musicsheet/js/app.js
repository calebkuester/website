(function () {
	'use strict';

	var FOLDER = '/pages/musicsheet/';
	var BACKING_GAIN = 0.5;        // other tracks play quieter than the selected one

	// Choices for how the selected track is played: the sound, and the fingering chart that goes
	// with it (a key for InstrumentChart; only the violin has one so far). The last choice uses
	// whatever instrument the track names, so its sound and chart are worked out per track.
	var INSTRUMENTS = [
		{ label: 'Violin', name: 'Violin', sound: SheetPlayer.RECORDED_VIOLIN, chart: 'violin' },
		{ label: 'Piano', name: 'Piano', sound: SheetPlayer.gm(0), chart: 'piano' },
		{ label: 'Guitar', name: 'Guitar', sound: SheetPlayer.gm(24), chart: 'guitar' },
		{ label: 'Flute', name: 'Flute', sound: SheetPlayer.gm(73), chart: 'flute' },
		{ label: 'French horn', name: 'French horn', sound: SheetPlayer.gm(60), chart: 'french-horn' },
		{ label: 'Harp', name: 'Harp', sound: SheetPlayer.gm(46), chart: 'harp' },
		{ label: 'Track\u2019s own instrument', name: '', sound: null, chart: null }
	];
	// General MIDI programs that have a fingering chart
	var PROGRAM_CHARTS = { 40: 'violin' };
	var MODULATION_CENTS = 40;     // vibrato depth with the modulation wheel fully up

	function $(id) { return document.getElementById(id); }
	var els = {
		file: $('fileInput'), sample: $('sampleButton'), glissando: $('glissandoButton'), track: $('trackSelect'),
		instrument: $('instrumentSelect'), octave: $('octaveSelect'), play: $('playButton'), stop: $('stopButton'),
		loop: $('loopCheck'), allTracks: $('allTracksCheck'), speed: $('speedRange'), speedOut: $('speedOutput'),
		time: $('timeDisplay'), status: $('status'), scroll: $('sheetScroll'),
		empty: $('emptyState'), inner: $('sheetInner'), canvas: $('sheetCanvas'),
		playhead: $('playhead'), drop: $('dropOverlay'), chart: $('instrumentChart'), bendKey: $('bendKey')
	};

	var player = new SheetPlayer();
	var sheet = new Notation(els.scroll, els.canvas);
	var score = null;
	var tempoMap = null;
	var currentTrack = null;
	var trackNotes = [];           // the selected track, in seconds, sorted by start: drives the finger chart
	var longestNote = 0;
	// The selected part is moved by whole octaves to where the chosen instrument's chart covers it.
	// It is played, written and fingered there, so the lit position always sounds the note it shows.
	// With no chart there is nothing to fit, and the part stays where the file has it.
	// (Without a chart the sheet is left to write a very high or low part an octave nearer the staff.)
	var partShift = 0;
	var octaveChoice = 0;          // octaves the user has asked for on top of that: -2 .. 2
	var violinUnavailable = false;     // the recorded violin could not be loaded: use the soundfont one
	var lastSystem = -1;
	var fileLabel = '';
	var soundRequest = 0;
	var previewVoice = null;

	var board = new InstrumentChart(els.chart, {
		onPress: function (pitch) {
			var sound = selectedSound();
			player.loadSound(sound).then(function () {
				if (previewVoice) { previewVoice.stop(); }
				previewVoice = player.preview(sound, pitch);
			}, function () { /* reported when the instrument was chosen */ });
		},
		onRelease: function () {
			if (previewVoice) { previewVoice.stop(0.12); previewVoice = null; }
		}
	});

	/* ---------- status ---------- */

	function setStatus(text, isError) {
		els.status.textContent = text || '';
		els.status.classList.toggle('error', !!isError);
	}

	function formatTime(seconds) {
		seconds = Math.max(0, Math.round(seconds));
		return Math.floor(seconds / 60) + ':' + ('0' + (seconds % 60)).slice(-2);
	}

	/* ---------- loading files ---------- */

	function readFile(file) {
		return new Promise(function (resolve, reject) {
			var reader = new FileReader();
			reader.onload = function () { resolve(reader.result); };
			reader.onerror = function () { reject(new Error('Could not read the file.')); };
			reader.readAsArrayBuffer(file);
		});
	}

	function openBuffer(buffer, name) {
		var parsed;
		try {
			parsed = MidiParser.parse(buffer);
		} catch (e) {
			setStatus(e.message, true);
			return;
		}
		score = parsed;
		fileLabel = name;
		tempoMap = new MidiParser.TempoMap(score.ppq, score.tempos);
		fillTrackSelect();
		els.empty.hidden = true;
		els.inner.hidden = false;
		els.track.disabled = false;
		els.stop.disabled = false;
		els.allTracks.disabled = score.tracks.length < 2;
		selectTrack(bestTrackPosition());
	}

	function openFile(file) {
		if (!file) { return; }
		setStatus('Reading ' + file.name + '\u2026');
		readFile(file).then(function (buffer) { openBuffer(buffer, file.name); },
			function (e) { setStatus(e.message, true); });
	}

	function loadSample(fileName, label) {
		setStatus('Loading sample\u2026');
		fetch(FOLDER + 'midi/' + fileName)
			.then(function (r) { if (!r.ok) { throw new Error('status ' + r.status); } return r.arrayBuffer(); })
			.then(function (buffer) { openBuffer(buffer, label); })
			.catch(function () { setStatus('Could not load the sample.', true); });
	}

	/* ---------- tracks ---------- */

	function selectableTracks() {
		var tracks = score.tracks.filter(function (t) { return !t.percussion; });
		return tracks.length ? tracks : score.tracks;
	}

	// The track with the most distinct note onsets is usually the melody.
	function bestTrackPosition() {
		var tracks = selectableTracks(), best = 0, bestCount = -1;
		tracks.forEach(function (t, i) {
			var seen = {}, count = 0;
			t.notes.forEach(function (n) { if (!seen[n.tick]) { seen[n.tick] = 1; count++; } });
			if (count > bestCount) { bestCount = count; best = i; }
		});
		return best;
	}

	function fillTrackSelect() {
		els.track.innerHTML = '';
		selectableTracks().forEach(function (t, i) {
			var option = document.createElement('option');
			option.value = i;
			var slides = t.notes.filter(function (n) { return Notation.slideSemitones(n); }).length;
			var bends = t.notes.filter(function (n) { return Notation.bendOrnament(n, score.ppq); }).length;
			option.textContent = t.name + ' (' + t.notes.length + ' notes' + (slides ? ', ' + slides + ' slides' : '') + (bends ? ', ' + bends + ' bends' : '') + ')';
			els.track.appendChild(option);
		});
	}

	function selectTrack(position) {
		currentTrack = selectableTracks()[position];
		els.track.value = position;
		INSTRUMENTS[INSTRUMENTS.length - 1].label = 'Track\u2019s own: ' + player.instrumentName(currentTrack.program);
		els.instrument.options[INSTRUMENTS.length - 1].textContent = INSTRUMENTS[INSTRUMENTS.length - 1].label;

		player.stop();
		updatePlayButton();
		showChart();
		octaveChoice = 0;
		els.octave.value = '0';
		els.octave.disabled = false;
		partShift = wantedShift();
		sheet.setTrack(score, currentTrack, sheetTranspose());
		updateBendKey();
		lastSystem = -1;
		els.scroll.scrollTop = 0;
		rebuildSong(true);
		updatePlayhead();
	}

	// show the key to the pitch-bend marks, with only the kinds this track uses
	function updateBendKey() {
		var used = {};
		currentTrack.notes.forEach(function (n) {
			if (Notation.slideSemitones(n)) { used.gliss = true; return; }
			var ornament = Notation.bendOrnament(n, score.ppq);
			if (ornament) { used[ornament.type] = true; }
		});
		var any = false;
		Array.prototype.forEach.call(els.bendKey.querySelectorAll('[data-kind]'), function (item) {
			item.hidden = !used[item.dataset.kind];
			any = any || !item.hidden;
		});
		els.bendKey.hidden = !any;
	}

	/* ---------- building what gets played ---------- */

	function selectedChoice() {
		return INSTRUMENTS[els.instrument.selectedIndex] || INSTRUMENTS[0];
	}

	function selectedSound() {
		var choice = selectedChoice();
		if (choice.sound === SheetPlayer.RECORDED_VIOLIN && violinUnavailable) { return SheetPlayer.gm(40); }
		return choice.sound || SheetPlayer.gm(currentTrack ? currentTrack.program : 40);
	}

	// put the chosen instrument's fingering chart (or the note that it has none yet) in the side panel
	function showChart() {
		var choice = selectedChoice();
		var key = choice.chart, name = choice.name;
		if (!choice.sound) {
			// the track's own instrument
			var program = currentTrack ? currentTrack.program : 40;
			key = PROGRAM_CHARTS[program] || null;
			name = currentTrack ? player.instrumentName(program) : '';
		}
		board.setInstrument(key, name);
	}

	// how far the selected part is moved in all: the fit to the chart, plus the user's octave choice
	function wantedShift() {
		return shiftForChart() + octaveChoice * 12;
	}

	// What the sheet is told. A part that has been moved is written where it is played; one left
	// alone with no chart to match may be written an octave nearer the staff (8va / 8vb).
	function sheetTranspose() {
		return board.range() || octaveChoice ? partShift : undefined;
	}

	// move the part after the chart or the octave choice has changed, keeping the place in the song
	function applyShift() {
		var shift = wantedShift();
		if (shift !== partShift || sheet.model.asPlayed !== (sheetTranspose() !== undefined)) {
			partShift = shift;
			sheet.setTrack(score, currentTrack, sheetTranspose());
			lastSystem = -1;
		}
		rebuildSong(false);
	}

	// the octave shift that fits the selected track onto the chart being shown
	function shiftForChart() {
		var range = board.range();
		if (!range || !currentTrack) { return 0; }
		return InstrumentChart.bestShift(currentTrack.notes.map(function (n) { return n.pitch; }), range.low, range.high);
	}

	// Pitch-bend curve of a note as audio slides, thinned so a busy bend wheel
	// does not create hundreds of automation points per note.
	var SLIDE_SPACING = 0.02;       // seconds
	var SLIDE_MIN_CHANGE = 0.03;    // semitones

	function slidesFor(n, startSeconds, transpose) {
		var points = n.bend.points, slides = [];
		var lastWhen = -Infinity, lastSemis = n.bend.start;
		points.forEach(function (p, i) {
			var when = tempoMap.ticksToSeconds(n.tick + p.tick) - startSeconds;
			var isLast = i === points.length - 1;
			if (isLast || (when - lastWhen >= SLIDE_SPACING && Math.abs(p.semis - lastSemis) >= SLIDE_MIN_CHANGE)) {
				slides.push({ pitch: n.pitch + transpose + p.semis, when: when });
				lastWhen = when;
				lastSemis = p.semis;
			}
		});
		return slides;
	}

	// `transpose` moves the notes by that many semitones
	function playable(track, soundFor, gain, transpose) {
		return track.notes.map(function (n) {
			var start = tempoMap.ticksToSeconds(n.tick);
			var note = {
				time: start,
				duration: tempoMap.ticksToSeconds(n.tick + n.duration) - start,
				pitch: n.pitch + transpose,
				velocity: n.velocity,
				sound: soundFor(n),
				gain: gain,
				startBend: 0,
				slides: null,
				vibrato: n.modulation ? n.modulation / 127 * MODULATION_CENTS : 0
			};
			if (n.bend) {
				note.glides = !!Notation.slideSemitones(n);
				note.startBend = n.bend.start;
				note.slides = slidesFor(n, start, transpose);
			}
			return note;
		});
	}

	function trackSound(track) {
		if (track.percussion) { return function (n) { return SheetPlayer.drum(n.pitch); }; }
		var sound = SheetPlayer.gm(track.program);
		return function () { return sound; };
	}

	/*
	 * Work out the notes to play from the current choices, load the sounds they
	 * need, then hand them to the player. `rewind` restarts from the beginning;
	 * otherwise playback carries on from where it is.
	 */
	function rebuildSong(rewind) {
		if (!currentTrack) { return; }
		var lead = selectedSound();
		trackNotes = playable(currentTrack, function () { return lead; }, 1, partShift);
		trackNotes.sort(function (a, b) { return a.time - b.time; });
		longestNote = trackNotes.reduce(function (max, n) { return Math.max(max, n.duration); }, 0);

		var notes = trackNotes.slice();
		if (els.allTracks.checked) {
			score.tracks.forEach(function (track) {
				if (track !== currentTrack) { notes = notes.concat(playable(track, trackSound(track), BACKING_GAIN, 0)); }
			});
		}

		var sounds = [], seen = {};
		notes.forEach(function (n) { if (!seen[n.sound.key]) { seen[n.sound.key] = true; sounds.push(n.sound); } });
		var missing = sounds.filter(function (s) { return !player.isLoaded(s); });

		var request = ++soundRequest;
		function ready(failed) {
			if (request !== soundRequest) { return; }
			// the recorded violin needs its sample files; without them use the soundfont one
			if (lead === SheetPlayer.RECORDED_VIOLIN && !player.isLoaded(lead)) {
				violinUnavailable = true;
				rebuildSong(rewind);
				return;
			}
			if (rewind) { player.setNotes(notes); } else { player.replaceNotes(notes); }
			els.play.disabled = false;
			updatePlayButton();
			updatePlayhead();
			if (failed && !player.isLoaded(lead)) { setStatus('Could not load the instrument sound.', true); }
			else { setStatus(fileLabel + shiftNote() + (failed ? ' \u00B7 ' + failed + ' sound' + (failed > 1 ? 's' : '') + ' unavailable' : '')); }
		}
		if (!missing.length) { ready(0); return; }

		// keep playing what is already loaded while new sounds arrive
		els.play.disabled = !player.playing;
		var done = 0, failed = 0;
		setStatus('Loading sounds (0/' + missing.length + ')\u2026');
		missing.forEach(function (sound) {
			player.loadSound(sound).then(null, function () { failed++; }).then(function () {
				done++;
				if (request !== soundRequest) { return; }
				if (done < missing.length) { setStatus('Loading sounds (' + done + '/' + missing.length + ')\u2026'); }
				else { ready(failed); }
			});
		});
	}

	// tells the reader when the part is not at the pitch the file has it
	function shiftNote() {
		if (!partShift) { return ''; }
		var octaves = Math.abs(partShift) / 12;
		return ' \u00B7 ' + currentTrack.name + ' moved ' + (partShift < 0 ? 'down ' : 'up ') + (octaves === 1 ? 'an octave' : octaves + ' octaves') +
			(octaveChoice || !board.definition ? '' : ' to fit the ' + board.definition.name.toLowerCase());
	}

	/* ---------- transport ---------- */

	function updatePlayButton() {
		els.play.textContent = player.playing ? 'Pause' : 'Play';
		els.play.classList.toggle('success', !player.playing);
	}

	function togglePlay() {
		if (els.play.disabled) { return; }
		if (player.playing) { player.pause(); } else { player.play(); }
		updatePlayButton();
	}

	function stop() {
		player.stop();
		updatePlayButton();
		lastSystem = -1;
		els.scroll.scrollTo({ top: 0 });
		updatePlayhead();
	}

	/* ---------- playhead and finger chart ---------- */

	function firstAfter(time) {
		var lo = 0, hi = trackNotes.length;
		while (lo < hi) {
			var mid = (lo + hi) >> 1;
			if (trackNotes[mid].time <= time) { lo = mid + 1; } else { hi = mid; }
		}
		return lo;
	}

	// The pitch to show for a note. The finger stays on the written note through scoops, bends
	// and vibrato; only a glissando, which ends on another note, moves it along the string.
	function soundingPitch(note, time) {
		if (!note.glides || !note.slides || !note.slides.length) { return note.pitch; }
		var elapsed = time - note.time, previousWhen = 0, previousPitch = note.pitch + (note.startBend || 0);
		for (var i = 0; i < note.slides.length; i++) {
			var slide = note.slides[i];
			if (elapsed < slide.when) {
				var part = (elapsed - previousWhen) / Math.max(1e-6, slide.when - previousWhen);
				return Math.round(previousPitch + (slide.pitch - previousPitch) * Math.max(0, part));
			}
			previousWhen = slide.when;
			previousPitch = slide.pitch;
		}
		return Math.round(previousPitch);
	}

	function updateChart(seconds) {
		if (!trackNotes.length) { board.show([], []); return; }
		var next = firstAfter(seconds);
		var current = [];
		for (var i = next - 1; i >= 0 && trackNotes[i].time >= seconds - longestNote; i--) {
			var n = trackNotes[i];
			if (seconds < n.time + n.duration) {
				var pitch = soundingPitch(n, seconds);
				if (current.indexOf(pitch) < 0) { current.push(pitch); }
			}
		}
		// the upcoming note or chord
		var upcoming = [];
		if (next < trackNotes.length) {
			var nextTime = trackNotes[next].time;
			for (var j = next; j < trackNotes.length && trackNotes[j].time - nextTime < 0.03; j++) {
				var p = trackNotes[j].pitch;
				if (upcoming.indexOf(p) < 0) { upcoming.push(p); }
			}
		}
		current.sort(function (a, b) { return a - b; });
		board.show(current, upcoming);
	}

	function updatePlayhead() {
		if (!currentTrack) { return; }
		var seconds = player.currentTime();
		var p = sheet.pointForTick(tempoMap.secondsToTicks(seconds));
		els.playhead.style.height = p.height + 'px';
		els.playhead.style.transform = 'translate(' + p.x + 'px,' + p.top + 'px)';
		els.time.textContent = formatTime(seconds) + ' / ' + formatTime(player.duration);
		updateChart(seconds);

		if (p.system !== lastSystem) {
			lastSystem = p.system;
			if (player.playing || seconds === 0) {
				var target = p.top - els.scroll.clientHeight * 0.25;
				els.scroll.scrollTo({ top: Math.max(0, target), behavior: player.playing ? 'smooth' : 'auto' });
			}
		}
	}

	function frame() {
		if (player.playing) { updatePlayhead(); }
		requestAnimationFrame(frame);
	}

	/* ---------- events ---------- */

	els.file.addEventListener('change', function () {
		openFile(els.file.files[0]);
		els.file.value = '';
	});
	els.sample.addEventListener('click', function () { loadSample('FrogsTheme.mid', 'FrogsTheme.mid (sample)'); });
	els.glissando.addEventListener('click', function () { loadSample('GlissandoDemo.mid', 'GlissandoDemo.mid (glissando demo)'); });
	els.track.addEventListener('change', function () { selectTrack(+els.track.value); });
	els.play.addEventListener('click', togglePlay);
	els.stop.addEventListener('click', stop);
	els.loop.addEventListener('change', function () { player.loop = els.loop.checked; });
	els.allTracks.addEventListener('change', function () { rebuildSong(false); });
	els.instrument.addEventListener('change', function () {
		showChart();
		if (!currentTrack) { loadLead(); return; }
		applyShift();
	});
	els.octave.addEventListener('change', function () {
		octaveChoice = +els.octave.value;
		if (currentTrack) { applyShift(); }
	});
	els.speed.addEventListener('input', function () {
		els.speedOut.textContent = els.speed.value + '%';
		player.setSpeed(els.speed.value / 100);
	});
	player.onEnd = function () { updatePlayButton(); updatePlayhead(); };

	els.canvas.addEventListener('click', function (event) {
		if (!currentTrack) { return; }
		var rect = els.canvas.getBoundingClientRect();
		var tick = sheet.tickForPoint(event.clientX - rect.left, event.clientY - rect.top);
		player.seek(tempoMap.ticksToSeconds(tick));
		lastSystem = -1;
		updatePlayhead();
	});

	document.addEventListener('keydown', function (event) {
		var tag = (event.target.tagName || '').toLowerCase();
		if (event.code === 'Space' && tag !== 'select' && tag !== 'input' && tag !== 'button' && tag !== 'a') {
			event.preventDefault();
			togglePlay();
		}
	});

	var resizeTimer = null;
	window.addEventListener('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function () {
			sheet.relayout();
			lastSystem = -1;
			updatePlayhead();
		}, 120);
	});

	// drag and drop a file anywhere on the page
	var dragDepth = 0;
	window.addEventListener('dragenter', function (e) { e.preventDefault(); dragDepth++; els.drop.hidden = false; });
	window.addEventListener('dragover', function (e) { e.preventDefault(); });
	window.addEventListener('dragleave', function () { if (--dragDepth <= 0) { dragDepth = 0; els.drop.hidden = true; } });
	window.addEventListener('drop', function (e) {
		e.preventDefault();
		dragDepth = 0;
		els.drop.hidden = true;
		if (e.dataTransfer.files.length) { openFile(e.dataTransfer.files[0]); }
	});

	/* ---------- start ---------- */

	// load the chosen instrument before any file is open, so the finger chart can be played straight away
	function loadLead() {
		var sound = selectedSound();
		if (player.isLoaded(sound)) { return; }
		setStatus('Loading the instrument sound\u2026');
		player.loadSound(sound).then(function () {
			// leave an error (such as a file that could not be read) on show
			if (!currentTrack && !els.status.classList.contains('error')) { setStatus(board.definition ? 'Ready. Open a MIDI file, or press a position on the chart to hear it.' : 'Ready. Open a MIDI file to begin.'); }
		}, function () {
			if (!currentTrack) { setStatus('Could not load the instrument sound.', true); }
		});
	}

	INSTRUMENTS.forEach(function (choice) {
		var option = document.createElement('option');
		option.textContent = choice.label;
		els.instrument.appendChild(option);
	});
	showChart();
	loadLead();
	requestAnimationFrame(frame);
	if (location.hash === '#sample') { loadSample('FrogsTheme.mid', 'FrogsTheme.mid (sample)'); }
	if (location.hash === '#glissando') { loadSample('GlissandoDemo.mid', 'GlissandoDemo.mid (glissando demo)'); }
})();
