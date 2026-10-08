<?php
	// Only shown as part of the site: index.php in this folder sets SITE_PAGE before including this file.
	if (!defined('SITE_PAGE')) {
		header('Location: /pages/musicsheet/', true, 302);
		exit;
	}
?>
<!--
	Violin music sheet: the fingering chart on the left and the music sheet on the right.
	This is a page fragment. It is shown by index.php in this folder, which includes it
	inside a site page; it is not a page of its own. All addresses are from the site root.
-->
<link rel="stylesheet" href="/pages/musicsheet/style.css">

<div class="trainer">
	<aside class="fingers">
		<div class="fingers-head">
			<a class="home-link" href="/">&larr; Caleb Kuester</a>
			<h1>Violin music sheet</h1>
		</div>
		<div id="instrumentChart" class="chart-panel"></div>
	</aside>

	<section class="sheet-side">
		<header class="toolbar">
			<div class="group">
				<label class="button primary" for="fileInput">Open MIDI file&hellip;</label>
				<input id="fileInput" type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden>
				<button id="sampleButton" type="button" class="button">Load sample</button>
				<button id="glissandoButton" type="button" class="button" title="A short violin melody with slides between notes">Glissando demo</button>
			</div>

			<div class="group">
				<label for="trackSelect">Track</label>
				<select id="trackSelect" disabled></select>
				<label for="instrumentSelect">played as</label>
				<select id="instrumentSelect"></select>
				<label for="octaveSelect">Octave</label>
				<select id="octaveSelect" disabled title="Move the selected part down or up by whole octaves. The sound, the notes on the sheet and the fingering all move together.">
					<option value="-2">2 lower</option>
					<option value="-1">1 lower</option>
					<option value="0" selected>as shown</option>
					<option value="1">1 higher</option>
					<option value="2">2 higher</option>
				</select>
			</div>

			<div class="group">
				<button id="playButton" type="button" class="button success" disabled>Play</button>
				<button id="stopButton" type="button" class="button" disabled>Stop</button>
				<label class="check" title="Also play the other tracks, each with its own instrument. The sheet and the finger chart still show only the selected track."><input id="allTracksCheck" type="checkbox" disabled> Play all tracks</label>
				<label class="check"><input id="loopCheck" type="checkbox"> Loop</label>
			</div>

			<div class="group">
				<label for="speedRange">Speed</label>
				<input id="speedRange" type="range" min="25" max="200" step="5" value="100">
				<output id="speedOutput">100%</output>
			</div>

			<div class="group time">
				<span id="timeDisplay">0:00 / 0:00</span>
			</div>
		</header>

		<div class="status-row">
			<div id="status" class="status" role="status" aria-live="polite"></div>
			<div id="bendKey" class="bend-key" hidden>
				<span class="bend-key-title">Pitch bends:</span>
				<span data-kind="scoop" hidden><svg viewBox="0 0 30 20" aria-hidden="true"><path d="M3 17 Q14 17 17 8" /><ellipse cx="23" cy="7" rx="5.5" ry="4" transform="rotate(-20 23 7)" class="fill" /></svg> slides into the note</span>
				<span data-kind="bend" hidden><svg viewBox="0 0 30 20" aria-hidden="true"><path d="M7 3 Q15 14 23 3" /><ellipse cx="15" cy="15" rx="5.5" ry="4" transform="rotate(-20 15 15)" class="fill" /></svg> dips or rises, then returns</span>
				<span data-kind="fall" hidden><svg viewBox="0 0 30 20" aria-hidden="true"><ellipse cx="7" cy="7" rx="5.5" ry="4" transform="rotate(-20 7 7)" class="fill" /><path d="M14 7 Q25 8 27 18" /></svg> drifts off at the end</span>
				<span data-kind="vibrato" hidden><svg viewBox="0 0 30 20" aria-hidden="true"><path d="M2 10 q3.5 -6 7 0 t7 0 t7 0 t7 0" /></svg> vibrato</span>
				<span data-kind="gliss" hidden><svg viewBox="0 0 30 20" aria-hidden="true"><ellipse cx="6" cy="15" rx="4.5" ry="3.3" transform="rotate(-20 6 15)" class="fill" /><path d="M11 13 L20 7" /><ellipse cx="25" cy="5" rx="4.5" ry="3.3" transform="rotate(-20 25 5)" class="fill" /></svg> slides to another note</span>
			</div>
		</div>

		<div id="sheetScroll" class="sheet-scroll">
			<div id="emptyState" class="empty">
				<p><strong>Drop a MIDI file here</strong> or use &ldquo;Open MIDI file&hellip;&rdquo;.</p>
				<p>The notes appear as sheet music. As it plays, a bar follows along and the finger chart lights up where each note is played.</p>
			</div>
			<div id="sheetInner" class="sheet-inner" hidden>
				<canvas id="sheetCanvas"></canvas>
				<div id="playhead" class="playhead"></div>
			</div>
		</div>
	</section>
</div>

<div id="dropOverlay" class="drop-overlay" hidden>Drop MIDI file to open</div>

<script src="/assets/WebAudioFontPlayer.js"></script>
<script src="/pages/musicsheet/js/midi-parser.js"></script>
<script src="/pages/musicsheet/js/engrave.js"></script>
<script src="/pages/musicsheet/js/notation.js"></script>
<script src="/pages/musicsheet/js/player.js"></script>
<script src="/pages/musicsheet/js/instrument-chart.js"></script>
<script src="/pages/musicsheet/js/chart-violin.js"></script>
<script src="/pages/musicsheet/js/app.js"></script>
