<script src="./scripts/svg.js"></script>
<script src="./scripts/violin.js"></script>
<script src='http://www.calebkuester.com/assets/WebAudioFontPlayer.js'></script>
<script type='text/javascript' src='http://www.calebkuester.com/assets/sound/0401_FluidR3_GM_sf2_file.js'></script>
<script type='text/javascript' src='../scripts/functions.js'></script>
<script src="./scripts/musicsheetscreen.js"></script>
<script src="./scripts/hypermeasure.js"></script>


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
	#fingerPositions{
	    width: 95%;
	    margin-left: 2%;
	    margin-top: 10%;
	}
	#buttonOverlay{
	    position: absolute;
	    z-index:1;
	}
	.note{
        position: absolute;
	    border-radius: 50%;
	}
</style

<body>
	<div class="container">
		<div id="instrumentCanvas">
		    <div id="buttonOverlay">
		        <div id="G3" class="note" onmousedown="playPipe(0);" onmouseup="stopPipe(0);" onmouseout="stopPipe(0);")></div>
		        <div id="D4" class="note" onmousedown="playPipe(8);" onmouseup="stopPipe(8);" onmouseout="stopPipe(8);"></div>
		        <div id="A4" class="note" onmousedown="playPipe(16);" onmouseup="stopPipe(16);" onmouseout="stopPipe(16);"></div>
		        <div id="E5" class="note" onmousedown="playPipe(24);" onmouseup="stopPipe(24);" onmouseout="stopPipe(24);"></div>
		        
		        <div id="GA3" class="note" onmousedown="playPipe(1);" onmouseup="stopPipe(1);" onmouseout="stopPipe(1);"></div>
		        <div id="DE4" class="note" onmousedown="playPipe(9);" onmouseup="stopPipe(9);" onmouseout="stopPipe(9);"></div>
		        <div id="AB4" class="note" onmousedown="playPipe(17);" onmouseup="stopPipe(17);" onmouseout="stopPipe(17);"></div>
		        <div id="F5" class="note" onmousedown="playPipe(25);" onmouseup="stopPipe(25);" onmouseout="stopPipe(25);"></div>
		        
		        <div id="A3" class="note" onmousedown="playPipe(2);" onmouseup="stopPipe(2);" onmouseout="stopPipe(2);"></div>
		        <div id="E4" class="note" onmousedown="playPipe(10);" onmouseup="stopPipe(10);" onmouseout="stopPipe(10);"></div>
		        <div id="B4" class="note" onmousedown="playPipe(18);" onmouseup="stopPipe(18);" onmouseout="stopPipe(18);"></div>
		        <div id="FG5" class="note" onmousedown="playPipe(26);" onmouseup="stopPipe(26);" onmouseout="stopPipe(26);"></div>
		        
		        <div id="AB3" class="note" onmousedown="playPipe(3);" onmouseup="stopPipe(3);" onmouseout="stopPipe(3);"></div>
		        <div id="F4" class="note" onmousedown="playPipe(11);" onmouseup="stopPipe(11);" onmouseout="stopPipe(11);"></div>
		        <div id="C5" class="note" onmousedown="playPipe(19);" onmouseup="stopPipe(19);" onmouseout="stopPipe(19);"></div>
		        <div id="G5" class="note" onmousedown="playPipe(27);" onmouseup="stopPipe(27);" onmouseout="stopPipe(27);"></div>
		        
		        <div id="B3" class="note" onmousedown="playPipe(4);" onmouseup="stopPipe(4);" onmouseout="stopPipe(4);"></div>
		        <div id="FG4" class="note" onmousedown="playPipe(12);" onmouseup="stopPipe(12);" onmouseout="stopPipe(12);"></div>
		        <div id="CD5" class="note" onmousedown="playPipe(20);" onmouseup="stopPipe(20);" onmouseout="stopPipe(20);"></div>
		        <div id="GA5" class="note" onmousedown="playPipe(28);" onmouseup="stopPipe(28);" onmouseout="stopPipe(28);"></div>
		        
		        <div id="C4" class="note" onmousedown="playPipe(5);" onmouseup="stopPipe(5);" onmouseout="stopPipe(5);"></div>
		        <div id="G4" class="note" onmousedown="playPipe(13);" onmouseup="stopPipe(13);" onmouseout="stopPipe(13);"></div>
		        <div id="D5" class="note" onmousedown="playPipe(21);" onmouseup="stopPipe(21);" onmouseout="stopPipe(21);"></div>
		        <div id="A5" class="note" onmousedown="playPipe(29);" onmouseup="stopPipe(29);" onmouseout="stopPipe(29);"></div>
		        
		        <div id="CD4" class="note" onmousedown="playPipe(6);" onmouseup="stopPipe(6);" onmouseout="stopPipe(6);"></div>
		        <div id="GA4" class="note" onmousedown="playPipe(14);" onmouseup="stopPipe(14);" onmouseout="stopPipe(14);"></div>
		        <div id="DE5" class="note" onmousedown="playPipe(22);" onmouseup="stopPipe(22);" onmouseout="stopPipe(22);"></div>
		        <div id="AB5" class="note" onmousedown="playPipe(30);" onmouseup="stopPipe(30);" onmouseout="stopPipe(30);"></div>
		        
		        <div id="D4" class="note" onmousedown="playPipe(7);" onmouseup="stopPipe(7);" onmouseout="stopPipe(7);"></div>
		        <div id="A4" class="note" onmousedown="playPipe(15);" onmouseup="stopPipe(15);" onmouseout="stopPipe(15);"></div>
		        <div id="E5" class="note" onmousedown="playPipe(23);" onmouseup="stopPipe(23);" onmouseout="stopPipe(23);"></div>
		        <div id="B5" class="note" onmousedown="playPipe(31);" onmouseup="stopPipe(31);" onmouseout="stopPipe(31);"></div>
		    </div>
		    <img id="fingerPositions" src="./images/violin-finger-positions.png" onload="screenResized()"/>
		</div>
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
				<button id="actionButton" type="button" class="btn btn-success" onclick='actionButtonPressed();'>Play</button>
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
    var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
	var audioContext = new AudioContextFunc();
	var player = new WebAudioFontPlayer();
	player.loader.decodeAfterLoading(audioContext, '_tone_0401_FluidR3_GM_sf2_file');
	var pipe;
	function playPipe(pipeNum){
	    pipe = standardNotes[pipeNum];
	    pipe.envelope=player.queueWaveTable(audioContext, audioContext.destination, _tone_0401_FluidR3_GM_sf2_file, -5, pipe.key, 999,true);
		stopPipe(pipe);
	}
	function stopPipe(pipeNum){
	    pipe = standardNotes[pipeNum];
		if(pipe && pipe.envelope){
			pipe.envelope.cancel();
			pipe.envelope=null;
		}
	}
	loadData(audioContext, player, standardNotes, document.getElementById("buttonOverlay").children);
</script>