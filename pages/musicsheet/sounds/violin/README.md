# Violin samples

A violin played with the bow and **without vibrato**, one recording for every semitone of first position (G3 to B5), each taken from the string that note is fingered on, plus a few higher notes on the E string. The music sheet page uses these for its "Violin" sound.

- **Source:** [University of Iowa Musical Instrument Samples](https://theremin.music.uiowa.edu/MIS.html), the medium-loud bowed violin scales, recorded by Lawrence Fritts.
- **Terms:** the collection is "freely available ... and may be downloaded and used for any projects, without restrictions". Credit is given here so the origin is known.

The files here are not the originals. Each note was cut from a scale recording to about two seconds, given a seamless loop so it can be held for any length, brought down to 32 kHz, and levelled to match the others. The playing is up to half a semitone out of tune from note to note; `violin.json` records how far (in cents) so the player can correct it, along with each file's loop points (in samples) and string.

To rebuild them from the original recordings, see `../../tools/build-violin.js`.
