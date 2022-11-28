<script src="https://cdnjs.cloudflare.com/ajax/libs/svg.js/2.6.5/svg.js" integrity="sha256-81Oyfi8LP8gMM9ILF+IjKbSXuYo7rrML+5kH4lwwCHs=" crossorigin="anonymous"></script>

<script type="text/javascript" src="../utilities2/hypermeasure.js"></script>
<script type="text/javascript" src="../utilities2/notes_panel.js"></script>
<script type="text/javascript" src="../utilities2/note.js"></script>
<script type="text/javascript" src="../utilities2/track.js"></script>

<!--https://www.npmjs.com/package/midi-parser-js-->
<script type='text/javascript' src='../utilities/third_party_resources/midi-parser.js'></script>
<script type='text/javascript' src='../utilities/functions.js'></script>


<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.9/umd/popper.min.js" integrity="sha384-ApNbgh9B+Y1QKtv3Rn7W3mgPxhU9K/ScQsAP7hUibX39j7fakFPskvXusvfa0b4Q" crossorigin="anonymous"></script>
<script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>

<style>
	html, body{
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
	}
	body{
		background-color: #777;
		min-width: 80em;
		min-height: 40em;
	}
	#musicSheetCanvas{
		width: 100%;
		height: 66%;
		background-color: #EEE;
	}
	#instrumentCanvas{
		width: 33%;
		height: 100%;
		background-color: #DFD;
		margin: 0 auto;
		float: left;
	}
	#buttonPanel{
		padding-top: 2%;
	}
	.sheetPanel{
		margin-left: auto;
		margin-right: auto;
		min-width: 80em;
	}
	.btn{
		min-width: 40%;
	}
		#trackSelectorButton{
		min-width: 150px;
	}
	.slider:hover {
	    opacity: 1;
	}
	.container{
		margin-left: 0;
		padding-left: 0;
		margin-right: 0;
		padding-right: 0;
		max-width: none;
	}
	.slider::-webkit-slider-thumb {
	    -webkit-appearance: none;
	    appearance: none;
	    width: 25px;
	    height: 25px;
	    background: #6C82F0;
	    cursor: pointer;
	}
	
	.slider::-moz-range-thumb {
	    width: 25px;
	    height: 25px;
	    cursor: pointer;
	}
	.slider {
	    -webkit-appearance: none;
	    width: 100%;
	    height: 25px;
	    background: #d3d3d3;
	    outline: none;
	    opacity: 0.7;
	    -webkit-transition: .2s;
	    transition: opacity .2s;
	}
	#speedDisplay{
		
	}
	#speedText{
		
	}
	.centered-text{
		text-align: center;
	}
	.hide{
		visibility: hidden;
		display: none;
	}
</style

<body>
	<div class="container">
		<div id="instrumentCanvas"></div>
		<div id="musicSheetCanvas"></div>
	</div>
	
	<div id="buttonPanel" class="container sheetPanel">
		<div class="row">
			<div class="col-md-4">
				<div class="track-dropdown">
				    Play Track:&nbsp;
			  		<button id="trackSelectorButton" class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="musicTrackMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
						Select Track
					</button>
					<div id="selectATrack" class="dropdown-menu" aria-labelledby="dropdownMenuButton">
					</div>
					<br/>
					<br/>
					As Instrument:&nbsp;
			  		<button id="instrumentSelectorButton" class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="instrumentMenu" data-toggle="instrumentDropdown" aria-haspopup="true" aria-expanded="false">
						Violin
					</button>
				</div>
			</div>
			<div class="col-md-4"><button id="clearButton" type="button" class="btn btn-danger" onclick='clearAll();'>X</button></div>
			<div class="col-md-4">Column</div>
		</div>
		<div class="row">
			<div class="col-md-4">
				&nbsp;<br/>
				<button id="playButton" type="button" class="btn btn-success" onclick='playPressed();'>Play</button>
				<button id="pauseButton" type="button" class="btn btn-warning hide" onclick='pausePressed();'>Pause</button>
				<button id="stopButton" type="button" class="btn btn-danger" onclick='stopPressed();'>Stop</button>
			</div>
			<div class="col-md-4">
				<div id ="speedText" class="centered-text">
					Change Speed
				</div>
				<div id="speedSlider" class="slidecontainer">
					<input type="range" min="-10" max="10" value="0" class="slider" id="range" oninput="speedSliderValueChanged(this.value);">
				</div>
				<div id ="speedDisplay" class="centered-text">
					0
				</div>
			</div>
		</div>
	</div>	
</body>

<script>
	var midiTrackList = [];
	var measuresPerHypermeasure=3;
	var musicPanel;
	var state = 'stop';
	var clefObject = {"file_path": "../utilities/image_assets/GClef.svg", "width": 28, "height": 70};
	
	function loadData(){
		noteFrequencyTable = setFrequencyTable();
		var fileName='../utilities/songs/FrogsTheme.mid';
		parseFile(fileName, dataLoaded);
	}
	loadData();
	
	function dataLoaded(){
		console.log(parsedMidiFile);
		window.addEventListener("resize", screenResized);
		trackList(parsedMidiFile, createMusicPanel);
	}
	function setFrequencyTable(){
		var a = 440; //key a is 440 hz
		var table = [];
		for(var i=0; i<128; i++){
			//algorithm to generate a frequency
			table[i]=(a / 32)*(Math.pow(2, (i-9)/12));
		}
		return table;
	}
	function createMusicPanel(){
		//spaceBetweenHypermeasures, width, height, divName, spaceBetweenLines, hypermeasureWidth, lineThickness, bufferX, bufferY, midiData, MSPerHypermeasure, TicksPerMs
		var musicSheetDivName= 'musicSheetCanvas';
		var instrumentDivName= 'instrumentCanvas';
		var containerHeight = document.getElementById(musicSheetDivName).clientHeight;
		var containerWidth = document.getElementById(musicSheetDivName).clientWidth;
		var spaceBetweenHypermeasures =Math.ceil(0.30*containerHeight);
		var spaceBetweenSingleMusicLines = containerHeight/25;
		var musicSheetStartLocX=0;
		var musicSheetStartLocY=0;
		var hypermeasureWidth =Math.ceil((2*containerWidth)/3)-(50);
		var lineThickness = 1;
		var xMarginForNotesPanel = 50;
		var yMarginForNotesPanel = 50;
		var loopRequested = false;
		fillTrackDropdown();
		musicPanel = new NotesManager(
		    spaceBetweenHypermeasures, 
			containerWidth, 
			containerHeight, 
			instrumentDivName, 
			musicSheetDivName, 
			spaceBetweenSingleMusicLines, 
			hypermeasureWidth, 
			lineThickness, 
			xMarginForNotesPanel, 
			yMarginForNotesPanel, 
			measuresPerHypermeasure, 
			clefObject, 
			loopRequested);
	}
	function trackList(midiObject, callback){
		var numberOfTracks = midiObject.header.numberOfTracks;
		var startingTempo = 500000;//if this is not set, defaults to 50k
		var currentNumerator = 4;
		var currentDenominator = 4;
		var current32NotesPer24Clocks = 0;
		var currentClocksPerTick = 0;
		var majorMinor=0;
		var sharpsFlats=0;
		for(var i=0; i<numberOfTracks; i++){
			//read through all tracks and find: notes, track name, tempo, timing, and key
			var trackName = '';
			var hasNotes = false;
			var length = midiObject.tracks[i].metaEventList.length;
			for(var j=0; j<length; j++){
				var command = midiObject.tracks[i].metaEventList[j].command;
				switch(command){
					case '03':
						//track name found
						trackName=midiObject.tracks[i].metaEventList[j].trackName;
						break;
					case 'ON':
						//note found
						hasNotes=true;
						break;
					case '51':startingTempo=midiObject.tracks[i].metaEventList[j].tempo;
						//tempo instruction found
						break;
					case '58':
						//timing instruction found (4/4, 3/4, etc.)
						currentNumerator = midiObject.tracks[i].metaEventList[j].nn;
						currentDenominator = Math.pow(2, midiObject.tracks[i].metaEventList[j].dd);
						currentClocksPerTick = midiObject.tracks[i].metaEventList[j].cc;
						current32NotesPer24Clocks = midiObject.tracks[i].metaEventList[j].bb;
						break;
					case '59':
						//key major, or minor instruction found
						majorMinor=midiObject.tracks[i].metaEventList[j].mi;
						sharpsFlats=midiObject.tracks[i].metaEventList[j].sf;
						break;
					default:
						break;
				}
			}
			if(hasNotes){
				midiTrackList[midiTrackList.length]=new Track(trackName, midiObject.tracks[i].metaEventList, currentNumerator, currentDenominator, startingTempo, majorMinor, sharpsFlats);
			}

		}
		console.log(midiTrackList);
		callback();
		return;
	}
	function getFrequency(input){
		return noteFrequencyTable[input];
	}
	function getOctave(input){
		return Math.floor(input/12)-5;
	}
	function getNoteLetter(input){
		var octaveList = ["C", "C#/D♭", "D", "D#/E♭", "E", "F", "F#/G♭", "G", "G#/A♭", "A", "A#/B♭", "B"];
		return octaveList[input%12];
	}
	function convertNoteToKeyNumber(input){
		return (input%12)-6;
	}
	function screenResized(){
		console.log('screenResized');
		//set timer to refresh the screen
	}
	function speedSliderValueChanged(value){
		if(value>0){
			document.getElementById('speedDisplay').innerText='+'+value;
			musicPanel.setProgressSpeedCoefficient(1+(0.04*(-value)));
		}else{
			document.getElementById('speedDisplay').innerText=value;
			musicPanel.setProgressSpeedCoefficient(1+(0.5*(-value)));
		}
	}
	function playPressed(){
		if(musicPanel.listOfHypermeasures[1].noteEvents.length<1){
		    //if no notes, ignore play press
			return;
		}
		var playButton = document.getElementById('playButton');
		var pauseButton = document.getElementById('pauseButton');
		if(state==='stop'){
			state = 'play';
			musicPanel.play();
		}else if(state==='pause'){
			state = 'play';
			musicPanel.play();
		}
		playButton.classList.add('hide');
		pauseButton.classList.remove('hide');
	}
	function pausePressed(){
		var playButton = document.getElementById('playButton');
		var pauseButton = document.getElementById('pauseButton');
		if(state==='play'){
			state='pause';
		}
		playButton.classList.remove('hide');
		pauseButton.classList.add('hide');
		musicPanel.stopSound();
	}
	function stopPressed(){
		musicPanel.deadPanel.releaseNote();
		musicPanel.livePanel.releaseNote();
		musicPanel.waitPanel.releaseNote();
		musicPanel.sparePanel.releaseNote();
		var playButton = document.getElementById('playButton');
		var pauseButton = document.getElementById('pauseButton');
		if(state==='play'){
			state = 'stop';
			musicPanel.stop();
		}else if(state==='pause'){
			state = 'stop';
			musicPanel.stop();
		}
		if(playButton.classList.contains('hide')){
			playButton.classList.remove('hide');
			pauseButton.classList.add('hide');
		}
	}
	function fillTrackDropdown(){
		var dropdownButton = document.getElementById("selectATrack");
		$("#selectATrack").empty();								//remove all of the options currently in the track selector
		var length = midiTrackList.length;
		
		for(var i=0;i<length; i++){
			var li = document.createElement("li");
			li.classList.add("dropdown-item");
			li.appendChild(document.createTextNode(midiTrackList[i].trackName));
			li.addEventListener("click", trackSelected);
			dropdownButton.appendChild(li);
		}
	}
	function trackSelected(target){
		var selectedValue=target.srcElement.childNodes[0].nodeValue;
		document.getElementById("trackSelectorButton").innerText=selectedValue;
		var length = midiTrackList.length;
		for(var i=0; i<length; i++){
			if(midiTrackList[i].trackName===selectedValue){
				trackChanged(midiTrackList[i], midiTrackList[i].trackName, i);
				console.log(midiTrackList[i]);
				break;
			}
		}
	}
	function trackChanged(trackData, trackName, trackNumber){
		console.log(trackData);
		musicPanel.fillNotes(parsedMidiFile.header, trackData, trackName);
	}
	function clearAll(){
		musicPanel.clearAllNotes();
		document.getElementById("trackSelectorButton").innerText="Select Track";
		stopPressed();
		
	}
</script>