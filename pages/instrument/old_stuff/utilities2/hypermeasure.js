class Hypermeasure{
	constructor(startX, startY, spacing, width, lineThickness, canvasFrame, clef_data, order, oscillator, gain, audio){
		this.noteIcon = '../utilities/image_assets/filled_notehead_with_stem.svg';
		if(canvasFrame!=null){
			this.audio=audio;
			this.oscillator=oscillator;
			this.gain=gain;
			this.order = order;
			this.currentLocX=startX;
			this.currentLocY=startY;
			this.hyperMeasureWidth=width;
			this.hyperMeasureLineSpacing=spacing;
			this.spacing=spacing;
			this.cleftWidth=this.spacing*2.5;
			this.lineThickness=lineThickness;
			this.canvasFrame=canvasFrame;
			this.clef_data=clef_data;
			this.nextHypermeasure = null;
			this.trackerSpeedCoefficient = 1;
			this.resetAll();
			this.lastNotePlayed = 0;
		}
	}
	resetAll(){
		this.gain.gain.value=0.00001;//eliminate first click
		this.isPlaying=false;
		this.countedNoteTime=0;
		this.halfOfANoteSize = this.cleftWidth/2;
		this.currentNote=0;
		this.moveComplete=true;
		this.group = this.canvasFrame.group();
		this.trackerDidMove=false;
		this.notesAvailable=false;
		this.isFilled=false;
		this.spaceUsed=0;
		this.maxTimeInMS=0;
		this.noteEvents=[];
		this.atTMinusZero=this.cleftWidth;
		this.bufferSpaceForStart=0;
		this.trackerPos=this.halfOfANoteSize;
		this.measuresAdded=0;
		this.tracker;
		this.startTime=0;
		this.noteWidth=Math.ceil(this.spacing);
		this.noteHeight=Math.ceil(this.spacing*2.5);
		this.noteCount=0;
		this.ticksPerQuarterNote=0;
		this.maxSpaceAvailable=0;
		this.isLastHypermeasure=false;
		this.startPos=this.currentLocX+this.trackerPos+this.bufferSpaceForStart+this.atTMinusZero;
		this.hypermeasureTimer=0; // time spent since starting
		this.usableWidth = (this.currentLocX+this.hyperMeasureWidth)-this.startPos ;//the distance that the tracker moves through the hypermeasure
		this.percentOfUsableSpace = this.usableWidth/this.hyperMeasureWidth;
		this.drawLines();
	}
	drawLines(){
		var text = this.canvasFrame.plain(this.order);
		text.move(this.currentLocX, this.currentLocY);
		this.group.add(text);
		for(var i=0; i<5; i++){
			var line = this.canvasFrame.line(this.currentLocX, this.currentLocY+(i*this.spacing), (this.currentLocX+this.hyperMeasureWidth), this.currentLocY+(i*this.spacing)).stroke({ width: this.lineThickness });	
			this.group.add(line);
		}
		var firstLine = this.canvasFrame.line(this.currentLocX, this.currentLocY, this.currentLocX, this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness });	
		this.group.add(firstLine);
		var endLine = this.canvasFrame.line(this.currentLocX+this.hyperMeasureWidth, this.currentLocY, this.currentLocX+this.hyperMeasureWidth, this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness });	
		this.group.add(endLine);
		this.drawSVGs();
		this.tracker = this.canvasFrame.line(this.startPos, 
			this.currentLocY, 
			this.startPos, 
			this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness, color: 'red'});
		this.group.add(this.tracker);

	}
	setNextHypermeasure(input){
		this.nextHypermeasure = input;
	}
	convertMSToTrackerDistance(msInput){
		var maxDistance = this.hyperMeasureWidth-this.atTMinusZero;
		return (msInput*maxDistance)/this.maxTimeInMS;
	}
	moveTracker(i, callback, startTime, lastTime, ticksPerMS, context){
		this.isPlaying=true;
		var noteTime;
		setTimeout(this.callStuff = function(){
			var maxDistance = this.hyperMeasureWidth-this.atTMinusZero;
			if(this.maxTimeInMS===0){
				//this stops progress if no instrument is selected
				return;
			}else if(i<=(maxDistance) && state === 'play'){
				var width = this.hyperMeasureWidth-this.currentLocX;
				var currentTime = new Date().getTime();
				//ms between loops
				var elapsedTimeBetweenLoops=currentTime-lastTime;
				//slow down or speed up based on manual input? (will not change if untouched)
				elapsedTimeBetweenLoops = elapsedTimeBetweenLoops*(1/(this.trackerSpeedCoefficient));
				//add to the hypermeasure timer (decreased later when current note is finished)
				this.hypermeasureTimer+=elapsedTimeBetweenLoops;
				//console.log(Math.ceil(this.hypermeasureTimer)+' / '+this.maxTimeInMS);
				if(this.noteEvents[this.currentNote]!==undefined){
					noteTime = this.noteTimeConvertedToMs(this.noteEvents[this.currentNote].data.deltaTime);
					console.log(this.usableWidth+' * '+this.noteEvents[this.currentNote].data.deltaTime+' / '+this.maxTimeInMS+' = '+noteTime );
					//this.usableWidth*(time)/(this.maxTimeInMS);
					//console.log(Math.round(this.hypermeasureTimer)+' '+this.noteEvents[this.currentNote].data.command+' noteMS: '+this.noteEvents[this.currentNote].data.deltaTime);
				}
				if(this.hypermeasureTimer>=noteTime){
					this.hypermeasureTimer -= noteTime;
					this.currentNote+=1;
				}
				var advanceAmount = width*(elapsedTimeBetweenLoops/this.maxTimeInMS);
				this.trackerPos=i+advanceAmount;
				//console.log(i+'/'+maxDistance);
				//console.log(this.hypermeasureTimer);
				this.moveTracker(this.trackerPos, callback, startTime, currentTime, ticksPerMS, context);	//in context of this (next iteration)
				this.tracker.move(this.currentLocX+this.atTMinusZero+i, this.tracker.y());			        //in context of the object defined by svg.js
			}else if(state === 'pause'){
				//do nothing
			}else if(state !== 'stop' && !this.nextHypermeasure.isDone() && this.nextHypermeasure.hypermeasureHasNotes()){
				//if 'stop' hasn not been pressed and next hypermeasure is not already spent and next hypermeasure has notes
				//case where 'switch' must be called -- moving the hypermeasure to its place
				this.trackerDidMove = true;								//this one is done
				callback(context);									//call 'switch'
				this.nextHypermeasure.playNotes(callback, new Date().getTime(), ticksPerMS, context);	//start the next hypermeasure playing
			}else if(state === 'stop' || !this.nextHypermeasure.hypermeasureHasNotes()){
				console.log('done');
				stopPressed();										//calls method in testMusicSheet1
			}
		}.bind(this), 10);
	}
	setTrackerSpeedCoefficient(input){
		this.trackerSpeedCoefficient = input;
	}
	getTrackerPosition(){
		return this.trackerPos;
	}
	hypermeasureIsFull(){
		if(this.isFilled!==undefined&&this.isFilled!==null){
			return this.isFilled;
		}
		return false;
	}
	pressNote(val){
	    console.log('NOTE PRESSED');
		this.oscillator.frequency.value = this.returnNoteFrequency(val);
		this.gain.gain.value = 1;
		this.gain.gain.exponentialRampToValueAtTime(
  			1, this.audio.currentTime + 0.02
		);
	}
	releaseNote(){
		this.gain.gain.exponentialRampToValueAtTime(
  			0.00001, this.audio.currentTime + 0.03
		);
	}
	blendNote(lsb, msb, note, deltaTime){
		console.log("blend: lsb: "+lsb+' and msb: '+msb+' and note: '+note+' delta time:'+deltaTime+' current time: '+this.audio.currentTime);
		var oldFrequency = this.returnNoteFrequency(note);
		//var newFrequency = Math.round( oldFrequency*(1+(msb/100)) );
		//this.oscillator.frequency.value = this.oscillator.frequency.value=newFrequency;
		this.gain.gain.value = 1;
		this.oscillator.frequency.setValueAtTime(oldFrequency, this.audio.currentTime+deltaTime);
	}
	hypermeasureHasNotes(){
		if(this.notesAvailable!==undefined&&this.notesAvailable!==null){
			return this.notesAvailable;
		}
		return false;
	}
	playNotes(callback, currentStartTime, context, ticksPerMs, speed){
		var newTime = new Date().getTime();
		this.startTime=currentStartTime;
		this.moveTracker(this.trackerPos, callback, currentStartTime, newTime, context, ticksPerMs, this.trackerSpeedCoefficient);	
	}
	isDone(){
		return this.trackerDidMove;
	}
	getStartTime(){
		return this.startTime;
	}
	drawSVGs(){
		var clef = this.canvasFrame.image(this.clef_data.file_path , Math.ceil(this.cleftWidth), Math.ceil(this.spacing*6.3));
		clef.move(this.currentLocX, this.currentLocY-(Math.ceil(this.spacing*0.82)));
		this.group.add(clef);
	
	}
	noteTimeConvertedToMs(time){
		return this.usableWidth*(time)/(this.maxTimeInMS);
	}
	setHypermeasureTimeInMS(time){
		this.maxTimeInMS=time;
		this.maxSpaceAvailable=this.usableWidth*(time)/(this.maxTimeInMS);
	}
	getNoteCount(){
		return this.noteCount;
	}
	getUnitVector(fromX, fromY, toX, toY){
		var vectorX = toX-fromX;	//far-near
		var vectorY = toY-fromY;
		var divisorX = vectorX*vectorX;	//for pythagorean theorem
		var divisorY = vectorY*vectorY;
		var divisor = Math.sqrt(divisorX+divisorY);//distance to move
		return {unitX: (vectorX/divisor), unitY: (vectorY/divisor), distanceLeft: divisor};
	}
	moveTo(x, y, increment, distance, deltaVelocityCoefficient, frameIncrementMinimum, context){
		this.moveComplete = false;
		var numberOfElements = context.group.node.childElementCount;
		var unitVector = context.getUnitVector(context.getXPosition(), context.getYPosition(), x, y);
		setTimeout(function(){
			var currentXMovement = 0;
			var currentYMovement = 0;
			
			if(Math.abs(x-context.getXPosition())<(increment)){
				currentXMovement = x-context.getXPosition();
			}else{
				currentXMovement = unitVector.unitX*increment;
			}
			
			if(Math.abs(y-context.getYPosition())<(increment)){
				currentYMovement = y-context.getYPosition();
			}else{
				currentYMovement = unitVector.unitY*increment;
			}
			for(var i=0; i<(numberOfElements); i++){
				var currentElement = context.group.get(i);
				if(currentElement!==null&&currentElement!==undefined){
					var newLocX = currentElement.x()+(currentXMovement);
					var newLocY = currentElement.y()+(currentYMovement);
					currentElement.move(newLocX, newLocY);
				}
			}
			context.currentLocX=context.currentLocX+currentXMovement;
			context.currentLocY=context.currentLocY+currentYMovement;
			if(context.getXPosition()===x && context.getYPosition()===y){
				if(context.isDone()){
					//if the hypermeasure has already played, clear it and get more notes
					context.clearNotes();
					musicPanel.fillHypermeasure(context);
				}
				context.moveComplete = true;
			}else{
				if(increment<(frameIncrementMinimum)){
					increment=frameIncrementMinimum; 
				}else if(increment>frameIncrementMinimum){
					increment = increment*deltaVelocityCoefficient;
				}
				context.moveTo(x, y, increment, distance, deltaVelocityCoefficient, frameIncrementMinimum, context);
			}
		}, 10);
	}
	moveDidComplete(){
		return this.moveComplete;
	}
	getXPosition(){
		return this.currentLocX;
	}
	getYPosition(){
		return this.currentLocY;
	}
	getCurrentSpacing(){
		return this.spacing;
	}
	addNoteEvent(singleNoteEvent, ticksPerMs, msPerMesasure, measuresPerHypermeasure){
		//console.log(ticksPerMs);
		if(this.noteEvents.length===0){
			this.notesAvailable=true;
			//TODO: check to see if time should be added to the beginning of this
			//It will in some cases (where a note intends to last longer than the end of the previous measure)
		}else{
			var noteSize = ((singleNoteEvent[0].deltaTime*ticksPerMs)*(this.usableWidth))/(msPerMesasure*measuresPerHypermeasure);
			this.spaceUsed += noteSize;
		}
		if(singleNoteEvent[0].command==='ON'){
			this.noteCount++;
			var y = this.currentLocY-(Math.ceil(this.spacing*0.15))+(this.getNotePosition(singleNoteEvent[0].note)*(this.spacing/2));
			var noteImage = this.canvasFrame.image(this.noteIcon , this.noteWidth, this.noteHeight);
			noteImage.move(this.startPos+this.spaceUsed-(this.noteWidth/2), y);
			this.group.add(noteImage);
		}
		this.noteEvents[this.noteEvents.length]={data: singleNoteEvent[0], location: (this.startPos+this.spaceUsed-this.startPos)};
	}
	hasRoomFor(time, ticksPerMs, ticsPerQuarterNote){
		if((this.maxSpaceAvailable-(this.spaceUsed+noteSize)<=1)){
			this.isFilled=true;
		}
		if(isNaN(time)||time===undefined||time===null){
			return true;
		}
		var noteSize = this.usableWidth*(time*ticksPerMs)/(this.maxTimeInMS);
		var smallestNoteSize = (ticsPerQuarterNote*ticksPerMs)/8;
		return (this.maxSpaceAvailable-(this.spaceUsed+noteSize)>1);
	}
	stringDataReturned(){
		var stringData = '';
		var length = this.noteEvents.length;
		for(var i=0; i<length; i++){
			if(this.noteEvents[i].data.command==="ON"){
				stringData+='start-'+this.noteEvents[i].data.command+'-'+this.noteEvents[i].data.deltaTime +' ';
				
			}else if(this.noteEvents[i].data.command==="OFF"){
				stringData+='stop-'+this.noteEvents[i].data.command+'-'+this.noteEvents[i].data.deltaTime +' ';
			}
		}
		return stringData;
	}
	getNotePosition(val){
		//only works in G clef
		//https://en.wikipedia.org/wiki/Clef
		//TODO: add case for alternative clefs
		var retVal=0;
		switch(val){
			case 70://A#
				retVal= 8;
				break;
			case 71://B
				retVal= 7;
				break;
			case 72://C
				retVal= 6;
				break;
			case 73://C#
				retVal= 6;
				break;
			case 74://D
				retVal= 5;
				break;
			case 75://D#
				retVal= 5;
				break;
			case 76://E
				retVal= 4;
				break;
			case 77://F
				retVal= 3;
				break;
			case 78://F#
				retVal= 3;
				break;
			case 79://G
				retVal= 2;
				break;
			case 80://G#
				retVal= 2;
				break;
			case 81://A
				retVal= 1;
				break;
			case 82://A#
				retVal= 1;
				break;
			case 83://B
				retVal= 0;
				break;
			case 84://C
				retVal= -1;
				break;
			case 85://C#
				retVal= -1;
				break;
			case 86://D
				retVal= -2;
				break;
			case 87://D#
				retVal= -2;
				break;
			case 88://E
				retVal= -3;
				break;
			case 89://F
				retVal= -4;
				break;
			case 90://F#
				retVal= -4;
				break;
			case 91://G
				retVal= -5;
				break;
			case 92://G#
				retVal= -5;
				break;
			case 93://A
				retVal= -6;
				break;
			case 94://A#
				retVal= -6;
				break;
			case 95://B
				retVal= -7;
				break;
			case 96://C
				retVal= -8;
				break;
			case 97://C#
				retVal= -9;
				break;
			case 98://D
				retVal= -10;
				break;
		}
		return retVal+1;
	}
	returnNoteFrequency(val){
		return (440 / 32)*(Math.pow(2, (val-9)/12));
	}
	destroy(){
		console.log('destroy');
		this.group.node.remove();
	}
	clearNotes(){
		this.group.node.remove();
		this.group = this.canvasFrame.group();
		this.resetAll();
	}
	commandCalled(command, data){
		switch(command){				
			case "ON":
				this.oscillator.frequency.value = this.returnNoteFrequency(data.data.note);
				this.gain.gain.value = 1;
				break;
			case "OFF":
				this.gain.gain.value = 0.00001;
				break;
			case "BLEND":
				this.gain.gain.value = 1;
				break;
			default:
				break;
			//TODO: Account for timing changes here as well
		}
	}
}