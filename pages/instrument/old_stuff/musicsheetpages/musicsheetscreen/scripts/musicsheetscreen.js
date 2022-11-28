noteEvent = {
	setData(octave, imageFileName, command, velocity, deltaTime, blendMSB, blendLSB, noteData, clef) {
		this.octave=octave;
		this.imageUsed = imageFileName;
		this.command=command;
		this.velocity=velocity;
		this.deltaTime=deltaTime;
		this.blendMSB=blendMSB;
		this.blendLSB=blendLSB;
		this.clef=clef;
		this.getInfoFromNote(noteData);
	},
	getTicks(){
		return this.deltaTime;
	},
	getInfoFromNote(val){
		this.noteFrequency = (440 / 32)*(Math.pow(2, (val-9)/12));
		this.notePosition = this.notePositionFunction(val);
		this.noteLetter = this.getNoteLetter(val);
	},
	getFrequency(){
		return this.frequency;
	},
	getNoteLetter(){
		return this.note;
	},
	setColor(){
		// color = #FF0000
	},
	notePositionFunction(val){
		//only works in G clef
		//https://en.wikipedia.org/wiki/Clef
		//TODO: add case for alternative clefs
		var retVal=0;
		switch(val){
			case 70://A#
				retVal+= 9;
				break;
			case 71://B
				retVal+= 8;
				break;
			case 72://C
				retVal+= 7;
				break;
			case 73://C#
				retVal+= 7;
				break;
			case 74://D
				retVal+= 6;
				break;
			case 75://D#
				retVal+= 6;
				break;
			case 76://E
				retVal+= 5;
				break;
			case 77://F
				retVal+= 4;
				break;
			case 78://F#
				retVal+= 4;
				break;
			case 79://G4
				retVal+= 3;
				break;
			case 80://G#
				retVal+= 3;
				break;
			case 81://A
				retVal+= 2;
				break;
			case 82://A#
				retVal+= 2;
				break;
			case 83://B
				retVal+=1;
				break;
			case 84://C
				
				break;
			case 85://C#
				
				break;
			case 86://D
				retVal+= -1;
				break;
			case 87://D#
				retVal+= -1;
				break;
			case 88://E
				retVal+= -2;
				break;
			case 89://F
				retVal+= -3;
				break;
			case 90://F#
				retVal+= -3;
				break;
			case 91://G
				retVal+= -4;
				break;
			case 92://G#
				retVal+= -4;
				break;
			case 93://A
				retVal+= -5;
				break;
			case 94://A#
				retVal+= -5;
				break;
			case 95://B
				retVal+= -6;
				break;
			case 96://C
				retVal+= -7;
				break;
			case 97://C#
				retVal+= -8;
				break;
			case 98://D
				retVal+= -9;
				break;
		}
		return retVal;
	},
	/*getNoteLetter(val){
		//TODO: Make this work properly
		return '-';
	}*/
	convertTicksToWidth(ticksPerMs, usableWidth, msPerMesasure, measuresPerHypermeasure){
		return ((this.getTicks()*ticksPerMs)*(usableWidth))/(msPerMesasure*measuresPerHypermeasure);
	}
};
musicPanel={
    currentHypermeasureIndex:1,
    trackerSpeedCoefficient:0,
    singleTrackData:[],
    measuresPerHypermeasure:4,
    incrementFrameBy:10,
    listOfHypermeasures:[],
    setProgressSpeedCoefficient(val){
        var length = this.listOfHypermeasures.length;
		for(var i=0; i<length; i++){
			//instantly change tracker speed
			this.listOfHypermeasures[i].setTrackerSpeedCoefficient(val);
		}
    },
    play(){
        var numberOfHypermeasures = this.listOfHypermeasures.length;
        this.listOfHypermeasures[this.currentHypermeasureIndex].playNotes(
            this.switchToNextMeasure,
            new Date().getTime(),
            (this),
            this.msPerTick,
            this.trackerSpeedCoefficient
        );
    },
    switchToNextMeasure(context){
        console.log("Switching!");
        if(context.listOfHypermeasures != null){
    		var length = context.listOfHypermeasures.length;
    		for(var i=0; i<length; i++){
    			//move each to the previous panel position
    			var previoustIndex = (i===0) ? length-1 : ((i-1)%length);
    			var currentIndex = i%length;
    			console.log('previoustIndex: '+previoustIndex+' currentIndex: '+currentIndex);
    			if(previoustIndex<0){
    				previoustIndex=length-1;
    			}
    			context.shiftPanel(context.listOfHypermeasures[currentIndex], context.listOfHypermeasures[previoustIndex], context);
    		}
        }
	},

	shiftPanel(fromPanel, toPanel, context){
		fromPanel.moveTo(toPanel.getXPosition(), toPanel.getYPosition(), this.incrementFrameBy, this.spaceBetweenHypermeasures, 1, this.incrementFrameBy, fromPanel);
	},

    stopSound(){
    },

    fillNotes(midiFileHeader, trackData, trackName){
        var hypermeasureGroupLength;
        var bpm;
        var secondsPerQuarterNote;
        var numberOfTotalCommands;
        var hyperMeasureTimeInMS;
        var i;
        this.clearAllNotes(this);
		this.headerTiming = midiFileHeader;
		this.trackData=trackData;
		this.trackName=trackName;
		console.log(trackName+' selected');
		console.log('trackData is: ');
		console.log(this.headerTiming);
		bpm = (60000000/(trackData.currentTempo))*(trackData.timingDenominator/4);
		console.log('bpm = '+bpm);
		console.log("microseconds per beat = "+trackData.currentTempo);
		console.log("millisecondsper beat = "+trackData.currentTempo/1000);
		console.log("time signature = "+trackData.timingNumerator+'/'+trackData.timingDenominator);
		console.log("thirtySecond Notes Per 24 midi clocks = "+this.headerTiming.ticksPerQuarterNote);
		if(this.headerTiming.timingFormat==1){
			console.log("Ticks per frame = "+ this.headerTiming.ticksPerFrame);
			console.log("Frames per Second = "+this.headerTiming.framesPerSecond);
		}else if(this.headerTiming.timingFormat===0){
			console.log("ticks per quarter note= "+this.headerTiming.ticksPerQuarterNote);
		}
		console.log('a hypermeasure has '+this.measuresPerHypermeasure+' measures');
		console.log('a measure has '+this.trackData.timingNumerator+' beats');
		console.log('a beat is a 1/'+this.trackData.timingDenominator+' note');
		console.log('a 1/'+this.trackData.timingDenominator+' note has '+this.headerTiming.ticksPerQuarterNote+' ticks');
		console.log(this.headerTiming.ticksPerQuarterNote+' ticks = '+(this.trackData.currentTempo/1000)+'ms');
		this.msPerTick = ((this.trackData.currentTempo/1000)/this.headerTiming.ticksPerQuarterNote);
		console.log('1 tick = '+this.msPerTick+'ms');
		console.log('80 ticks = '+this.msPerTick*80+'ms, which is 1/'+(1000/(this.msPerTick*80))+' of a second');
		secondsPerQuarterNote = this.trackData.currentTempo / 1000000;
		this.msPerMesasure = (secondsPerQuarterNote*1000)*(4/this.trackData.timingDenominator)*this.trackData.timingNumerator;
		this.hyperMeasureTimeInMS = this.measuresPerHypermeasure*this.msPerMesasure;
		console.log('ms per hyperMeasure is '+this.hyperMeasureTimeInMS);
		for(i=0; i<this.listOfHypermeasures.length; i++){
		    this.listOfHypermeasures[i].setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		    this.listOfHypermeasures[i].setNextHypermeasure(this.listOfHypermeasures[(i+1)%this.listOfHypermeasures.length]);
		}
		speedSliderValueChanged(0);
		setHypermreasureTimeForAllPanels(hyperMeasureTimeInMS)
		console.log('======================================');
		/**************************************************************************************/
		this.trackCommands = this.makeNotes(this.trackData.commandList, IMAGE_ASSETS.filled_notehead_with_stem);
		numberOfTotalCommands = this.trackData.commandList.length;
		for(i=0; i<(numberOfTotalCommands); i++){
			this.singleTrackData[i]=this.trackData.commandList[i];
		}
		hypermeasureGroupLength = this.listOfHypermeasures.length;
		for(i=0; i<(hypermeasureGroupLength); i++){
			this.fillHypermeasure(this.listOfHypermeasures[(i+1)%hypermeasureGroupLength]);
		}
    },
    fillHypermeasure(hypermeasure){
		//each hypermeasure will be filled by note events (start/stop/change timing/etc.)
		var i=0;
		hypermeasure.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		var len=this.singleTrackData.length;
		while(this.singleTrackData[0]!==undefined && hypermeasure.hasRoomFor(this.singleTrackData[0].deltaTime, this.msPerTick, this.headerTiming.ticksPerQuarterNote)&&i<(len)){
			var noteData = this.singleTrackData.splice(0, 1);
			hypermeasure.addNoteEvent(noteData, this.msPerTick, this.msPerMesasure, this.measuresPerHypermeasure);
			i++;
		}
		return (this.singleTrackData.length<1);
	},
    makeNotes(listOfCommands, noteImage){
        var tempArray = [];
		var length = listOfCommands.length;
		var note = {};
		for(var i=0; i<length; i++){
		    note = noteEvent;
		    note.setData(
		        0, 
				noteImage, 
				listOfCommands[i].command, 
				listOfCommands[i].velocity, 
				listOfCommands[i].deltaTime, 
				listOfCommands[i].MSB, 
				listOfCommands[i].LSB, 
				listOfCommands[i].note, 
				'G'
		    );
		    tempArray[i] = Object.assign({}, note);
		}
		return tempArray;
    },
    clearAllNotes(){
        var length = this.listOfHypermeasures.length;
		for(var i=0; i<(length); i++){
			this.listOfHypermeasures[i].clearNotes();
		}
    },
    clearAll(){
    }
};
var BUFFER_X = 50;
var BUFFER_Y = 50;
var MEASURES_PER_HYPERMEASURE = 4;
var IMAGE_ASSETS = {
    "clefImage": "images/GClef.svg", "width": 28, "height": 70,
    "note":"images/filled_notehead_with_stem.svg"
};
var FRAME_INCREMENT = 10;            //move frames by this amount each tick
var LINE_THICKNESS = 1;
var SHIFT_UP_SPEED = 1;
var MUSIC_SHEET_DIV_NAME = 'musicSheetCanvas';
var state = 'stop';
var noteFrequencyTable;
var allKnownNotes = {};
var notesFrame;                     //svg that will be containing all of the drawn components
var spaceBetweenHypermeasures;      //space between groups of lines with notes on them
var spaceBetweenSingleMusicLines;   //space between individual music lines
var containerHeight;
var containerWidth;
var hypermeasureWidth;
var midiCommands = {};
var singleTrackData=[];
var trackCommands = [];
var positions;
var midiTrackList = [];
var state = "stop";

function fillHypermeasure(hypermeasure){
	//each hypermeasure will be filled by note events (start/stop/change timing/etc.)
	var i=0;
	hypermeasure.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
	var len = this.singleTrackData.length;
	while(this.singleTrackData[0]!==undefined && hypermeasure.hasRoomFor(this.singleTrackData[0].deltaTime, this.msPerTick, musicPanel.headerTiming.ticksPerQuarterNote)&&i<(len)){
		var noteData = this.singleTrackData.splice(0, 1);
		hypermeasure.addNoteEvent(noteData, this.msPerTick, this.msPerMesasure, this.measuresPerHypermeasure);
		i++;
	}
	return (this.singleTrackData.length<1);
}

function setHypermreasureTimeForAllPanels(timeInMS){
    for(var i=0; i<MEASURES_PER_HYPERMEASURE; i++){
        musicPanel.listOfHypermeasures[i].setHypermeasureTimeInMS(timeInMS)
    }
}

function loadData(audioContext, player, standardNotes, buttons){
    this.audioContext = audioContext;
    this.player = player;
    this.standardNotes = standardNotes;
    this.buttonMap = buttons;
    //called in musicsheet.php
	noteFrequencyTable = setFrequencyTable();
	setAllNotes();
	var fileName='./songs/FrogsTheme.mid';
	//parseFile is in functions.js
	parseFile(fileName, dataLoaded);
}

function setAllNotes(){
    var noteIndexInt=0;
    for(var noteIndex in noteFrequencyTable){
        noteIndexInt = parseInt(noteIndex)+2;
        allKnownNotes[getNoteLetter(noteIndex)+"-"+Math.floor(((noteIndexInt+10)-1)/12)] = [noteIndex, noteFrequencyTable[noteIndexInt+10]];
    }
}

function sizeUpButtonPanel(fingerPositionDivInfo){
    document.getElementById('buttonOverlay').style.width=fingerPositionDivInfo.width+"px";
    document.getElementById('buttonOverlay').style.height=fingerPositionDivInfo.height+"px";
    document.getElementById('buttonOverlay').style.marginTop=fingerPositionDivInfo.top+"px";
    document.getElementById('buttonOverlay').style.marginLeft=fingerPositionDivInfo.left+"px";
}

function moveAndResizeNoteLights(fingerPositionDivInfo){
    var fingerPositions = document.getElementsByClassName("note");
    var lightbulbWidth = (fingerPositionDivInfo.width * 0.1);
    var lightbulbHeight = (fingerPositionDivInfo.height * 0.1);
    var spaceBetweenBulbsX = fingerPositionDivInfo.width*0.02;
    var spaceBetweenBulbsY = fingerPositionDivInfo.height*0.025;
    for(var divIndex in fingerPositions){
        if(fingerPositions[divIndex] !==null && fingerPositions[divIndex].id !== undefined){
            fingerPositions[divIndex].style.width = lightbulbWidth+"px";
            fingerPositions[divIndex].style.height = lightbulbHeight+"px";
            fingerPositions[divIndex].style.marginLeft = (((divIndex%4)*(lightbulbWidth+spaceBetweenBulbsX))+(fingerPositionDivInfo.width*0.22))+1+"px";
            fingerPositions[divIndex].style.marginTop = ((Math.floor(divIndex/4)*(lightbulbHeight+spaceBetweenBulbsY))+(spaceBetweenBulbsY-3.5))+"px";
        }
    }
}

function dataLoaded(){
    //parsedMidiFile is in functions.js
	console.log(parsedMidiFile);
	window.addEventListener("resize", screenResized);
	trackList(parsedMidiFile, createMusicPanel);
}

function setFrequencyTable(){
	var a6 = 440; //key a6 is 440 hz
	var table = [];
	for(var i=0; i<128; i++){
		//algorithm to generate a frequency
		table[i]=(a6 / 32)*(Math.pow(2, (i-9)/12));
	}
	return table;
}

function createMusicPanel(){
    fillTrackDropdown();
}

function resizeNotesPanel(container){
    var height = container.clientHeight;
    var width = container.clientWidth;
    spaceBetweenHypermeasures = Math.ceil(0.30*height);
    spaceBetweenSingleMusicLines = height/25;
    instrumentPanelWidth = width/3;
    container.innerHTML = "";//Clear the contents of the div (the lines would stay otherwise)
    this.notesFrame = new SVG(MUSIC_SHEET_DIV_NAME).size(instrumentPanelWidth*2-7, height);
	this.notesFrame.move(0,0);
	hypermeasureWidth = Math.ceil((2*width)/3)-(50);
	positions = [
    	{x: BUFFER_X + hypermeasureWidth, y: BUFFER_Y+(2*spaceBetweenHypermeasures)}, 
    	{x: BUFFER_X, y: BUFFER_Y}, 
    	{x: BUFFER_X, y: BUFFER_Y+spaceBetweenHypermeasures}, 
    	{x: BUFFER_X, y: BUFFER_Y+(2*spaceBetweenHypermeasures)}
    ];
    for(var i = 0; i < MEASURES_PER_HYPERMEASURE; i++){
        hypermeasure.setData(positions[i].x, positions[i].y, spaceBetweenSingleMusicLines, hypermeasureWidth-BUFFER_X, LINE_THICKNESS, this.notesFrame, IMAGE_ASSETS, i, this.audioContext, this.player, this.standardNotes, this.buttonMap);
        musicPanel.listOfHypermeasures[i] = Object.assign({}, hypermeasure);
    }
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
		    midiTrackList[midiTrackList.length] = {
		        "trackName":trackName,
		        "commandList":midiObject.tracks[i].metaEventList,
		        "timingNumerator":currentNumerator,
		        "timingDenominator":currentDenominator,
		        "currentTempo": startingTempo,
		        "majorMinor": majorMinor,
		        "sharpsFlats":sharpsFlats
		    };
		}
	}
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
	var octaveNotes = ["C", "C#/D♭", "D", "D#/E♭", "E", "F", "F#/G♭", "G", "G#/A♭", "A", "A#/B♭", "B"];
	return octaveNotes[input%12];
}

function convertNoteToKeyNumber(input){
	return (input%12)-6;
}

function screenResized(){
    var fingerPositionDivInfo = document.getElementById('fingerPositions').getBoundingClientRect();
    $("#fingerPositions").empty();
	sizeUpButtonPanel(fingerPositionDivInfo);
	moveAndResizeNoteLights(fingerPositionDivInfo);
	resizeNotesPanel(document.getElementById(MUSIC_SHEET_DIV_NAME));
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

function playButtonPressed(actionButton){
    //If they pressed play, show option to pause
    actionButton.innerText = "Pause";
    state = "play";
    actionButton.className = 'btn btn-warning';
    musicPanel.play();
}

function pauseButtonPressed(actionButton){
    actionButton.innerText = "Play";
    state = "pause";
    actionButton.className = 'btn btn-success';
}

function stopButtonPressed(actionButton){
    actionButton.innerText = "Play";
    state = "stop";
    actionButton.className = 'btn btn-success';
}

function actionButtonPressed(){
	if(musicPanel.listOfHypermeasures[1].noteEvents.length<1){
	    //if no notes, ignore play press
		return;
	}
	var actionButton = document.getElementById('actionButton');
	if(state === "stop"){
	    //if button text is currently "Stop"
	    playButtonPressed(actionButton);
	}else if(state === "pause"){
	    //if button text is currently "Pause"
	    playButtonPressed(actionButton);
	}else if(state === "play"){
	    //if button text is currently "play"
	    pauseButtonPressed(actionButton);
	}
}

function stopPressed(){
	for(var i=0;i<musicPanel.listOfHypermeasures.length; i++){
	    musicPanel.listOfHypermeasures[i].releaseAllNotes();
	}
	stopButtonPressed(document.getElementById('actionButton'));
}

function fillTrackDropdown(){
	var dropdownButton = document.getElementById("selectATrack");
	$("#selectATrack").empty();//remove all of the options currently in the track selector
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
			break;
		}
	}
}

function trackChanged(trackData, trackName, trackNumber){
	musicPanel.fillNotes(parsedMidiFile.header, trackData, trackName);
}

function clearAll(){
	musicPanel.clearAllNotes();
	document.getElementById("trackSelectorButton").innerText="Select Track";
	stopPressed();
}