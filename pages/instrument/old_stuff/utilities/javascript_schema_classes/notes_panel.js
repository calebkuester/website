var instrumentFrame;
var livePanel;
var waitPanel1;
var waitPanel2;
var sparePanel;
var progressPanel;

var posOut=0;
var pos1=0;
var pos2=0;
var pos3=0;
var pos4=0;
var shiftUpSpeedIncrement = 19;
var shiftLeftSpeedIncrement = 160;
var bufferY;
var bufferX;
var screenWidth=0;
var MSPerHypermeasure =0;
var TicksPerMs = 0;

var spaceBetweenHypermeasures=0;

this.clefObject = {"file_path": '../utilities/image_assets/GClef.svg', "width": 28, "height": 70};

var shift1=0;	//allowing concurrency
var shift2=0;	//these are flags to make sure that each of the shift functions are given a chance to complete before finalizing the shift
var shift3=0;
var shift4=0;

var midiCommands = {};
var singleTrackData=[];


function notesFramePanel(spaceBetweenHypermeasures, width, height, divName, spaceBetweenLines, hypermeasureWidth, lineThickness, bufferX, bufferY, midiData, MSPerHypermeasure, TicksPerMs){
	midiCommands = Object.assign(midiData);

	this.instrumentFrame = SVG(divName).size(((2*width)/3), height);
	this.spaceBetweenHypermeasures=spaceBetweenHypermeasures;
	this.screenWidth=width;
	
	this.bufferY=bufferY;
	this.bufferX=bufferX;
	this.spaceBetweenLines=spaceBetweenLines;
	this.lineThickness=lineThickness;
	this.hypermeasureWidth=hypermeasureWidth;

	this.pos1=bufferY;
	this.pos2=bufferY+spaceBetweenHypermeasures;
	this.pos3=bufferY+(2*spaceBetweenHypermeasures);
	this.pos4=bufferY+(3*spaceBetweenHypermeasures);
	this.MSPerHypermeasure=MSPerHypermeasure;
	this.TicksPerMs=TicksPerMs;

	this.livePanel = new Hypermeasure(bufferX, pos1, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, instrumentFrame, this.clefObject);
	this.waitPanel1 = new Hypermeasure(bufferX, pos2, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, instrumentFrame, this.clefObject);
	//this.waitPanel2 = new Hypermeasure(bufferX, pos3, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, instrumentFrame, this.clefObject);
	this.sparePanel = new Hypermeasure(bufferX, pos3, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, instrumentFrame, this.clefObject);
	this.posOut=pos1-spaceBetweenHypermeasures;
	return this;
}
function shiftUp(){
	if(livePanel!=null){
		//console.log('1 was not null');
		shift1=1;
		shiftPanel(livePanel.getYPosition(), posOut, livePanel, spaceBetweenHypermeasures);
	}
	if(waitPanel1!=null){
		shift2=1;
		//console.log('2 was not null');
		shiftPanel(waitPanel1.getYPosition(), pos1, waitPanel1, spaceBetweenHypermeasures);
	}
	//if(waitPanel2!=null){
		//shift3=1;
		//console.log('3 was not null');
		//shiftPanel(waitPanel2.getYPosition(), pos2, waitPanel2, spaceBetweenHypermeasures);
	//}
	if(sparePanel!=null){
		shift4=1;
		//console.log('4 was not null');
		shiftPanel(sparePanel.getYPosition(), pos2, sparePanel, spaceBetweenHypermeasures);
	}
}
function shiftPanel(current, destination, currentPanel, distance){
	if(currentPanel===null){
		return;
	}
	setTimeout(function(){
		if(current>(destination)){
			currentPanel.moveTo(currentPanel.getXPosition(), current);
			if((current-shiftUpSpeedIncrement)>destination){
				current-=shiftUpSpeedIncrement;
			}else{
				current=destination;						//never takes the panel beyond its destination, even if the increment is a constant greater than one
			}
			
			shiftPanel(current, destination, currentPanel, distance);
		}else{										//shift is finished
			currentPanel.moveTo(currentPanel.getXPosition(), current);
			if(currentPanel==livePanel){
				shift1=0;
			}else if(currentPanel==waitPanel1){
				shift2=0;
			}else if(currentPanel==waitPanel2){
				shift3=0;
			}else if(currentPanel==sparePanel){
				shift4=0;
				shift3=0;
			}
			if((shift1+shift2+shift3+shift4)==0){					//merge non-blocking processes back into 1 -- If this is the last one, give all panels the next one's info
				livePanel=waitPanel1;
				waitPanel1=sparePanel;
				//waitPanel1=waitPanel2;
				//waitPanel2=sparePanel;
				//starting at screenWidth causes it to appear off the screen.
				sparePanel=new Hypermeasure(bufferX, pos3, spaceBetweenLines, hypermeasureWidth-bufferX, lineThickness, instrumentFrame, this.clefObject);
				sparePanel.setHypermeasureTimeInMS(MSPerHypermeasure);
				shiftSubIn();
				if(state ==='play'){
					livePanel.playNotes(0, shiftUp, new Date().getTime());
				}
			}
		}
	}, 10);
}
function resetHypermeasures(){
	//TODO: FIX
	//this.livePanel.clearNotes();
	//this.waitPanel1.clearNotes();
	//this.sparePanel.clearNotes();
}
function shiftSubIn(){
	setTimeout(function(){
		if(sparePanel.getYPosition()>bufferX){
			var speed = Math.ceil((sparePanel.getXPosition()/screenWidth)*shiftLeftSpeedIncrement);
			if((sparePanel.getXPosition()-speed)>bufferX){
				sparePanel.moveTo(sparePanel.getXPosition()-(speed), sparePanel.getYPosition());
				shiftSubIn();
			}else{
				//console.log(bufferX);
				sparePanel.moveTo(bufferX, sparePanel.getYPosition());
			}
		}
	}, 10);
}
function startPlaying(){
	if(livePanel.getTrackerPosition()===0){
		livePanel.playNotes(livePanel.getTrackerPosition(), shiftUp, new Date().getTime());
	}else{
		livePanel.playNotes(livePanel.getTrackerPosition(), shiftUp, livePanel.getStartTime());
	}
	
}
function stopPlaying(){
	//console.log('reset all notes placeholder');
}
function fillHypermeasure(notesList, panel){
	
}
function trackChanged(trackData, trackName){
	if(trackData== null|| typeof(trackData)=='undefined'){
		console.log('was empty');
		return;
	}
	for(var i=0; i<trackData.length; i++){
		this.singleTrackData[i]=trackData[i];
	}
	resetHypermeasures();
	livePanel.setHypermeasureTimeInMS(MSPerHypermeasure);
	waitPanel1.setHypermeasureTimeInMS(MSPerHypermeasure);
	sparePanel.setHypermeasureTimeInMS(MSPerHypermeasure);
	var i=0;
	while(!livePanel.isFull()&&i<trackData.length){
		var a = this.singleTrackData.splice(0, 1);
		livePanel.addNoteEvent(a, this.TicksPerMs);
		i++;
	}
	var second = 0;
	while(!waitPanel1.isFull()&&i<trackData.length){
		waitPanel1.addNoteEvent(this.singleTrackData.splice(0, 1), this.TicksPerMs);
		i++;
		second++;
	}
	var third=0;
	while(!sparePanel.isFull()&&i<trackData.length){
		sparePanel.addNoteEvent(this.singleTrackData.splice(0, 1), this.TicksPerMs);
		i++;
		third++;
	}
}