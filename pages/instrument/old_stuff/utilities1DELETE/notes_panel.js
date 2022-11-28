class NotesManager{
	constructor(spaceBetweenHypermeasures, 
					width, 
					height,
					instrumentPanelDivName, 
					musicSheetDivName, 
					spaceBetweenLines, 
					hypermeasureWidth, 
					lineThickness, 
					bufferX, 
					bufferY,
					measuresPerHypermeasure,
					clefObject,
					doLoop){
		this.setAudio();
		this.instrumentPanelWidth = width/3;
		this.instrumentFrame = new SVG(instrumentPanelDivName).size(this.instrumentPanelWidth-7, height);/*-7 because otherwise, screen adjusts to move notes down when instrument selector is clicked*/
		this.notesFrame = new SVG(musicSheetDivName).size(this.instrumentPanelWidth*2-7, height);/*-7 because otherwise, screen adjusts to move notes down when instrument selector is clicked*/
		this.notesFrame.move(0,0);
		this.instrumentFrame.move(0,0);
		this.doLoop=doLoop;
		
		this.incrementFrameBy = 10;
		this.spaceBetweenHypermeasures=spaceBetweenHypermeasures;
		this.screenWidth=width;
		this.screenHeight=height;
		this.bufferY=bufferY;
		this.bufferX=bufferX;
		this.spaceBetweenLines=spaceBetweenLines;
		this.lineThickness=lineThickness;
		this.hypermeasureWidth=hypermeasureWidth;
		this.positions = [
			{x: bufferX+hypermeasureWidth, y: bufferY+(2*spaceBetweenHypermeasures)}, 
			{x: bufferX, y: bufferY}, 
			{x: bufferX, y: bufferY+spaceBetweenHypermeasures}, 
			{x: bufferX, y: bufferY+(2*spaceBetweenHypermeasures)}
		];
		this.measuresPerHypermeasure=measuresPerHypermeasure;
		this.midiCommands = {};
		this.singleTrackData=[];
		this.trackCommands = [];
		this.shiftUpSpeedIncrement = 1;

		this.listOfHypermeasures = [];
		this.deadPanel = new Hypermeasure(this.positions[0].x, this.positions[0].y, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, this.notesFrame, clefObject, 0, this.oscillator, this.gain, this.audio);
		this.livePanel = new Hypermeasure(this.positions[1].x, this.positions[1].y, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, this.notesFrame, clefObject, 1, this.oscillator, this.gain, this.audio);
		this.waitPanel = new Hypermeasure(this.positions[2].x, this.positions[2].y, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, this.notesFrame, clefObject, 2, this.oscillator, this.gain, this.audio);
		this.sparePanel = new Hypermeasure(this.positions[3].x, this.positions[3].y, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, this.notesFrame, clefObject, 3, this.oscillator, this.gain, this.audio);
		this.listOfHypermeasures[0]=this.deadPanel;
		this.listOfHypermeasures[1]=this.livePanel;
		this.listOfHypermeasures[2]=this.waitPanel;
		this.listOfHypermeasures[3]=this.sparePanel;
		var length = this.listOfHypermeasures.length;
		for(var i=0; i<(length); i++){
			this.listOfHypermeasures[i].setNextHypermeasure(this.listOfHypermeasures[(i+1)%length])
		}
		this.posOut=this.pos1-spaceBetweenHypermeasures;
		
		return this;
	}
	fillNotes(headerTiming, trackData, trackName){
		this.clearAllNotes(this);
		this.headerTiming = headerTiming;
		this.trackData=trackData;
		this.trackName=trackName;

		console.log(trackName+' selected');
		console.log('trackData is: ');
		console.log(headerTiming);
		var bpm = (60000000/(trackData.currentTempo))*(trackData.timingDenominator/4);
		console.log('bpm = '+bpm);
		console.log("microseconds per beat = "+trackData.currentTempo);
		console.log("millisecondsper beat = "+trackData.currentTempo/1000);
		console.log("time signature = "+trackData.timingNumerator+'/'+trackData.timingDenominator);

		console.log("thirtySecond Notes Per 24 midi clocks = "+headerTiming.ticksPerQuarterNote);
		if(headerTiming.timingFormat==1){
			console.log("Ticks per frame = "+ headerTiming.ticksPerFrame);
			console.log("Frames per Second = "+headerTiming.framesPerSecond);
		}else if(headerTiming.timingFormat==0){
			console.log("ticks per quarter note= "+headerTiming.ticksPerQuarterNote);
		}
		
		console.log('a hypermeasure has '+this.measuresPerHypermeasure+' measures');
		console.log('a measure has '+trackData.timingNumerator+' beats');
		console.log('a beat is a 1/'+trackData.timingDenominator+' note');
		console.log('a 1/'+trackData.timingDenominator+' note has '+headerTiming.ticksPerQuarterNote+' ticks');
		console.log(headerTiming.ticksPerQuarterNote+' ticks = '+(trackData.currentTempo/1000)+'ms');
		this.ticksPerMs = ((trackData.currentTempo/1000)/headerTiming.ticksPerQuarterNote);
		console.log('1 tick = '+this.ticksPerMs+'ms');
		console.log('80 ticks = '+this.ticksPerMs*80+'ms, which is 1/'+(1000/(this.ticksPerMs*80))+' of a second');
		var secondsPerQuarterNote = trackData.currentTempo / 1000000;
		this.msPerMesasure = (secondsPerQuarterNote*1000)*(4/trackData.timingDenominator)*trackData.timingNumerator;
		this.hyperMeasureTimeInMS = this.measuresPerHypermeasure*this.msPerMesasure;
		console.log('ms per hyperMeasure is '+this.hyperMeasureTimeInMS);
		this.livePanel.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		this.waitPanel.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		this.sparePanel.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		this.deadPanel.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		console.log('======================================');
		/**************************************************************************************/
		this.trackCommands = this.makeNotes(this.trackData.commandList);
		var numberOfTotalCommands = trackData.commandList.length;
		for(var i=0; i<(numberOfTotalCommands); i++){
			this.singleTrackData[i]=trackData.commandList[i];
		}
		
		var hypermeasureGroupLength = this.listOfHypermeasures.length;
		for(var i=0;i<(hypermeasureGroupLength); i++){
			this.fillHypermeasure(this.listOfHypermeasures[(i+1)%hypermeasureGroupLength]);
		}
	}
	play(){
		console.log('play pressed');
		var length = this.listOfHypermeasures.length;
		for(var i=0; i<length; i++){
			if(this.listOfHypermeasures[i].isPlaying){
				this.listOfHypermeasures[i].playNotes(this.switch, new Date().getTime(), this);
				return;
			}
		}
		this.listOfHypermeasures[1].playNotes(this.switch, new Date().getTime(), this);
	}
	fillHypermeasure(hypermeasure){
		//each hypermeasure will be filled by note events (start/stop/change timing/etc.)
		console.log('filling notes');
		var i=0;
		hypermeasure.setHypermeasureTimeInMS(this.hyperMeasureTimeInMS);
		var len=this.singleTrackData.length;
		while(this.singleTrackData[0]!=undefined && hypermeasure.hasRoomFor(this.singleTrackData[0].deltaTime, this.ticksPerMs, this.headerTiming.ticksPerQuarterNote)&&i<(len)){
			var noteData = this.singleTrackData.splice(0, 1);
			hypermeasure.addNoteEvent(noteData, this.ticksPerMs, this.msPerMesasure, this.measuresPerHypermeasure);
			//hypermeasure.addNoteEvent(noteData, this.ticksPerMs, this.msPerMesasure, this.measuresPerHypermeasure);
			i++;
		}
		return (this.singleTrackData.length<1);
	}
	setProgressSpeedCoefficient(val){
		var length = this.listOfHypermeasures.length;
		for(var i=0; i<length; i++){
			//instantly change tracker speed
			this.listOfHypermeasures[i].setTrackerSpeedCoefficient(val);
		}
	}
	switch(context){
		console.log('switch');
		var length = context.listOfHypermeasures.length;
		for(var i=0; i<4; i++){
			//move each to the previous panel position
			var previoustIndex = ((i-1)%length);
			var currentIndex = i%length;
			if(previoustIndex<0){
				previoustIndex=length-1;
			}
			context.shiftPanel(context.listOfHypermeasures[currentIndex], context.listOfHypermeasures[previoustIndex], context);
		}
	}
	waitForAllMoves(callback, context){
		setTimeout(function(){
			var length = context.listOfHypermeasures.length;
			var allDone = true;
			for(var i=0; i<(length); i++){
				allDone = context.listOfHypermeasures[i].moveDidComplete();
				if(allDone===false){
					break;
				}
			}
			if(allDone){
				callback(context);
			}else{
				//console.log('waiting');
				context.waitForAllMoves(callback, context);
			}
		}, 10);
	}
	resetToBeginning(context){
		context.clearAllNotes()
		context.fillNotes(context.headerTiming, context.trackData, context.trackName);
		context.resetAllPanelPositions();
		
	}
	stopSound(){
		this.gain.gain.exponentialRampToValueAtTime(
  			0.00001, this.audio.currentTime + 0.04
		)
	}
	stop(){
		this.stopSound();
		this.waitForAllMoves(this.resetToBeginning, this);
	}
	clearAllNotes(){
		var length = this.listOfHypermeasures.length;
		for(var i=0; i<(length); i++){
			this.listOfHypermeasures[i].clearNotes();
		}
	}
	shiftPanel(fromPanel, toPanel){
		//console.log(toPanel.getXPosition()+' '+toPanel.getYPosition()+' '+this.incrementFrameBy+' '+this.spaceBetweenHypermeasures+' '+1+' '+this.incrementFrameBy+' '+fromPanel);
		fromPanel.moveTo(toPanel.getXPosition(), toPanel.getYPosition(), this.incrementFrameBy, this.spaceBetweenHypermeasures, 1, this.incrementFrameBy, fromPanel);
		
	}
	resetAllPanelPositions(){
		var length = this.listOfHypermeasures.length;
		for(var i=0; i<length; i++){
			//instantly move all of the frames back to their original spots
			this.listOfHypermeasures[i].moveTo(this.positions[i].x, this.positions[i].y, 1000, 0, 1, 1000, this.listOfHypermeasures[i]);
		}
	}
	setAudio(){
		this.audio = new AudioContext();
		this.oscillator = this.audio.createOscillator();
		this.oscillator.type=this.oscillator.SINE;
		this.oscillator.frequency.value = 0;
		this.oscillator.start(0);
		this.gain = this.audio.createGain();
		
		this.oscillator.connect(this.gain);
		this.gain.connect(this.audio.destination);
		
		this.gain.gain.value = 0;
		

	}
	makeNotes(listOfCommands){
		var tempArray = [];
		console.log(listOfCommands);
		var length = listOfCommands.length;
		var tempNoteImage = '../utilities/image_assets/filled_notehead_with_stem.svg'; //TODO: make this dynamic
		for(var i=0; i<length; i++){
			tempArray[i] = new NoteEvent(
				0, 
				tempNoteImage, 
				listOfCommands[i].command, 
				listOfCommands[i].velocity, 
				listOfCommands[i].deltaTime, 
				listOfCommands[i].MSB, 
				listOfCommands[i].LSB, 
				listOfCommands[i].note, 
				'G');
		}
		return tempArray;
	}
}
