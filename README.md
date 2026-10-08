# calebkuester.com

Personal website. Mostly static HTML/JS/CSS, with a few PHP files that stitch pages together (for example `index.php`).

## Running the site locally

The site is served locally by PHP's built-in web server. It is **not** a Windows service and does **not** start with your computer. You start and stop it with PowerShell commands.

Run these from the project folder (`C:\projects\site\website`):

```powershell
.\start-server.ps1     # start the server (runs hidden in the background)
.\stop-server.ps1      # stop it
```

Then open <http://localhost:8080/>.

| Page | Address |
| --- | --- |
| Site home page | <http://localhost:8080/> |
| Violin music sheet (finger chart + sheet music) | <http://localhost:8080/pages/musicsheet/> |

### Details

- **Local only.** The server listens on `127.0.0.1`, so it can be reached from this computer only, not from other devices on your network.
- **Different port.** `.\start-server.ps1 -Port 9000` uses another port, for example if 8080 is taken. Stopping works the same either way.
- **Starting twice is safe.** If the server is already running, the script says so and does nothing.
- **It ends on its own** when you log out or restart. Run `.\start-server.ps1` again after that.
- **Logs and process id** are kept in `.server.log`, `.server.out.log` and `.server.pid` in the project folder. They are git-ignored. Check `.server.log` if the server does not start.
- **If a start fails with "port in use"**, another program has that port. Pick another with `-Port`.

### Installing PHP (already done on this computer)

The server needs PHP. It was installed per user, with no service and no startup entry:

```powershell
winget install --id PHP.PHP.8.4 --source winget --scope user
```

`start-server.ps1` finds PHP on its own, even in a PowerShell window opened before the install. To remove PHP later: `winget uninstall PHP.PHP.8.4`.

### Older Apache scripts

`startSite.ps1` and `stopSite.ps1` (in the project root) are older scripts for an Apache + Chocolatey setup (`C:\Apache24`). That setup is not installed on this computer and they are not needed for local development.

## Violin music sheet (`pages/musicsheet/`)

A page for learning a tune on the violin. The left side is a fingering chart; the right side is the music. Open a `.mid` file (button, or drag and drop onto the page) and it is shown as sheet music. As it plays, a bar moves across the staff at a steady speed and the chart lights up where each note is played. (Notes are spaced by time, so the bar reaches each one exactly when it sounds.)

### Where it lives in the site

- The site's front page (`/`, `index.php`) is the home page. The violin page is at `/pages/musicsheet/`.
- The home page links to it: Projects, Violin, "Click here" (the text is `text-data/projects/Violin.txt`). The violin page links back to the home page.
- `pages/musicsheet/index.php` is the page; it includes `feature.php`, which holds the feature itself. `feature.php` only renders when a site page includes it (the page sets `SITE_PAGE` first). Asking for `/pages/musicsheet/feature.php` directly sends you to the page instead.
- Its addresses start from the site root (`/pages/musicsheet/...`, `/assets/...`), so it has to be served by the site; opening a file from disk does not work.

To show it on a different page, define `SITE_PAGE` and include `feature.php` the way `pages/musicsheet/index.php` does.

### What it does

- **Tracks.** Pick the track to show. The sheet and the finger chart always follow the selected track.
- **Play all tracks.** Tick this to also hear the other tracks, each with its own instrument (drums included), a little quieter than the selected one. Sounds are loaded the first time they are needed.
- **Played as.** The selected track plays as a violin by default. The other choices are piano, guitar, flute, French horn, harp and the track's own instrument. The choice also decides which fingering chart is shown; only the violin has one so far.
- **Octave.** Moves the selected part down or up by one or two octaves. The sound, the notes on the sheet and the lit positions on the chart all move together, and the line above the sheet says how far the part now is from the pitch in the file. "As shown" is where the page put the part to fit the chart; the setting goes back to it when another track is chosen. Notes pushed outside the chart get the out-of-range cue.
- **Play / Pause / Stop**, **Loop**, and a **speed** slider (25% to 200%). Space toggles play and pause. Click anywhere on the sheet to jump there.
- **Fingering chart.** A panel with the same layout for every instrument: a heading, a stage with a faint drawing of the instrument and a button for each place a note is played, and a line of text naming the note. For the violin the columns are the four strings and the rows are the finger positions, one semitone per row, each at its true distance from the nut: the rows draw closer together going up the neck, exactly as the fingers do (18 mm from the nut to the low 1st finger, but only 13 mm between the high 3rd and the 4th). The drawing underneath is the neck of a violin seen from the front, at one true scale throughout, the same scale the rows are placed at, so each row lies across the neck where that finger really goes. The scale is just large enough that the two closest rows do not touch. At that size the chart holds only part of the instrument, like a detail from a larger picture: the lower pegbox in flamed maple with the G and E pegs, the ebony nut, and the fingerboard with its four strings. The scroll lies above the top edge, the body below the bottom, and the E peg runs off the side. The buttons are much bigger than the gaps between real strings, so they form a plain grid over the drawing instead of each sitting on its own string, and they are slightly see-through so the neck shows. The buttons are upright ovals; beside each row is a picture of the hand, as wide as a button, with the finger to use marked in red; the positions between the main ones (the same finger placed a semitone lower or higher) have a faded picture.
  - The button of the note being played glows orange; the button of the next note has a blue ring. Pressing a button plays its note, so pressing the orange one plays the note the song is playing.
  - **The selected part is moved to where the instrument plays it.** The violin chart covers first position (G3 to B5). A part that lies outside that range is moved by whole octaves, all together, to where the most notes fit. It is then played, written on the sheet and fingered at that pitch, and the line above the sheet says so ("Pan Flute moved down an octave to fit the violin"). The other tracks keep their own pitch when "Play all tracks" is on.
  - **A note the chart does not reach lights no button.** A cue at the edge of the stage names it instead: at the bottom for a note above the chart ("C♯6 is above first position"), at the top for one below. It is orange while the note sounds and outlined in blue while it is the next note.
  - The finger stays on the written note through scoops, bends and vibrato. During a glissando it moves along the string with the pitch.
  - **An instrument with no chart yet** shows a note saying so in the same panel, and the part is left at the pitch in the file.
- **Pitch bends.** MIDI pitch bend is read per channel (including files that change the bend range from the default of 2 semitones), so a note does not have to stay on one pitch. Playback follows the bend exactly, On the sheet each bent note gets the mark for what its pitch does:
  - **Glissando:** it ends on a different note. A line marked "gliss." runs to the note it arrives on; if no written note follows, the arrival pitch is a small note in brackets.
  - **Scoop:** it starts off the note and slides onto it. A short curve leads into the note head, from below or above.
  - **Bend:** it dips (or rises) and comes back. A small cup sits over the note, open upwards for a dip.
  - **Fall:** it drifts off at the end without arriving anywhere. A short curve leaves the note head.
  - **Vibrato:** it wavers, or the file has the modulation wheel up for it. A wavy line runs over the note.

  A key above the sheet shows the marks the current track uses, and the track list counts them. Movement of less than about a third of a semitone is played but not marked.
- "Load sample" opens `midi/FrogsTheme.mid` (several tracks; its flute part has scoops and bends on the long notes). "Glissando demo" opens `midi/GlissandoDemo.mid`, a short violin melody with one of each pitch-bend mark.

### What the sheet shows

A MIDI file holds notes as "this pitch, from here to here", not as written music. The page works out the notation from that:

- **Note values:** whole notes down to thirty-seconds, dotted notes, and triplets (marked with a 3). Short notes are beamed together by beat.
- **Ties:** a note that carries over a bar line, or over a beat it does not start on, is written as two notes joined by a tie. A tie continues onto the next line when the note does.
- **Rests** wherever the part is silent, including whole-bar rests.
- **Chords:** notes that start together share a stem.
- **Key signature** at the start of every line, and where the key changes. Sharps, flats and naturals are printed only where a note departs from the key, and hold until the bar line, as in printed music.
- **Time signature** at the start and wherever it changes.
- **Tempo marks** at the start and where the tempo clearly changes.
- **Clef:** treble or bass, chosen from the range of the part as it is played.
- **Slurs** over runs of notes played legato (each held right up to the next).
- **Staccato dots** on notes played at about half their length.
- **Dynamics** (pp to ff) from how hard the notes are struck, where the level changes and stays changed.
- **Lyrics** under the staff and **marker text** (section names) above it, when the file has them.
- **Pitch-bend marks** (glissando, scoop, bend, fall, vibrato), as described above.

Several of these are read from the playing rather than stated in the file, so they are judgements:

- **Rhythm.** Notes are fitted to a grid of sixteenths, eighth triplets, thirty-seconds or sixteenth triplets, beat by beat. Notes released a little early are still written at full length. Other tuplets (fives, sevens) and freely played passages come out as the nearest of these.
- **Key.** A key stated in the file is used as given. Many files state none, or say C major whatever the music is in; then the key that fits the notes of the whole song best is used. The sample is an example: it states no key and is shown with five sharps.
- **Slurs, staccato and dynamics** come from note lengths and velocities. If every note of a part is played legato, no slurs are drawn, because that is just how the file was made.

Not shown:

- **Independent voices.** The part is written as one line of rhythm: a chord ends when the next note starts. Two melodies moving at different speeds in one track are merged.
- **Things MIDI does not record:** grace notes, trills and other ornaments as symbols, repeats, bowings, fingerings, crescendo hairpins.
- **Portamento** controller messages (CC 5 / CC 65). Only pitch bend is used for slides.

### Sound

- **Violin** is a real violin played **without vibrato**: recordings of single bowed notes in `sounds/violin/` (free to use, see the README there), one for every semitone of first position, each taken from the string it is fingered on. Each loops seamlessly so a note can be held for any length. If the recordings cannot be loaded the soundfont violin is used instead.
- **Vibrato is only played where the file asks for it:** as pitch-bend wobble, which is played as written, or with the modulation wheel, which adds vibrato to those notes in proportion to how far the wheel is up. Both are marked on the sheet with a wavy line.
- **Everything else** comes from the soundfonts in `assets/sound/` (FluidR3, all 128 General MIDI instruments and the common drum sounds). Some of those samples have vibrato recorded into them.
- Each note gets its own envelope: bowed and blown instruments fade in and out instead of switching on and off, struck and plucked ones die away. A light room reverb and a gentle compressor sit on the output.

### Files

| File | Role |
| --- | --- |
| `index.php` | The violin page: a site page that includes `feature.php` |
| `feature.php` | The markup of the feature (finger chart, controls, sheet) |
| `style.css` | Layout and styling |
| `js/midi-parser.js` | Reads `.mid` files (notes, tempo, time and key signatures, pitch bend, lyrics, markers) and converts between ticks and seconds using the tempo map |
| `js/engrave.js` | Decides what to write: note values, rests, ties, beams, triplets, accidentals, key, slurs, staccato, dynamics |
| `js/notation.js` | Decides where it goes and draws it; maps song position to x/y on the sheet |
| `js/player.js` | Loads sounds and plays notes with the Web Audio clock (pause, seek, speed, slides, envelopes, reverb) |
| `js/instrument-chart.js` | The fingering chart panel: lays out any instrument's chart from a definition, lights buttons, shows the out-of-range cue |
| `js/chart-violin.js` | The violin's definition for that panel: its drawing, its buttons and which note each plays |
| `js/app.js` | Wires up the controls, file loading, track mixing, the scrolling bar and the finger chart |
| `images/` | The treble clef, and the four hand pictures for the violin chart (`hand-1.png` to `hand-4.png`, cut from the finger-position chart of the earlier version of this page, which is in the git history) |
| `midi/` | The MIDI files: `FrogsTheme.mid` (the sample), `GlissandoDemo.mid` (the pitch-bend demo) and `Ctfrogrm.mid` (another arrangement of the same tune, kept from the earlier version; open it with "Open MIDI file") |
| `sounds/violin/` | The violin recordings and their manifest |
| `tools/build-violin.js` | Rebuilds the violin samples from the original recordings (Node) |
| `tools/make-glissando-demo.js` | Regenerates `midi/GlissandoDemo.mid` (Node) |
| `tools/test-engrave.js` | Tests the notation rules against rhythms whose correct notation is known (Node) |

### Adding a fingering chart for another instrument

1. Write a file like `js/chart-violin.js` that calls `InstrumentChart.define(key, definition)`. The definition gives the size of the stage, an SVG drawing of the instrument for the underlay, a list of buttons (position, note, label) and labels, and a function that describes a note's fingering in words.
2. Load it in `feature.php` after `instrument-chart.js`.
3. In `js/app.js`, the `chart` of that instrument's entry in `INSTRUMENTS` is the key (the entries already name one), and `PROGRAM_CHARTS` maps its General MIDI program number to it for "track's own instrument".

The underlay is drawn in full colour and faded by `.ic-underlay` in `style.css` (opacity 0.42): clear enough to recognise the instrument, faint enough to read the buttons over it.

It is plain JavaScript with no build step. PHP is only used to place the feature inside the site page.

The earlier attempts at this feature (`pages/instrument/` and `pages/current_project_construction/`) have been removed; they are in the git history if they are ever wanted.
