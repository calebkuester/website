class Hypermeasure{
	constructor(startX, startY, spacing, width, lineThickness, canvasFrame, clef_data){
		this.currentLocX=startX;
		this.currentLocY=startY;
		this.hyperMeasureWidth=width;
		this.hyperMeasureLineSpacing=spacing;
		this.spacing=spacing;
		this.lineThickness=lineThickness;
		this.canvasFrame=canvasFrame;
		this.clef_data=clef_data;
		this.totalTimeInMS=0;
		this.maxTimeInMS=0;
		this.noteEvents=[];
		this.atTMinusZero=this.spacing*4.5;
		this.bufferSpaceForStart=0;
		this.trackerPos=0;
		this.tracker;
		this.startTime=0;
		this.noteWidth=Math.ceil(this.spacing);
		this.noteHeight=Math.ceil(this.spacing*2.5);
		this.drawLines();
	}
	/*
		uses svg.js
	*/
	
	drawLines(){
		var firstMesureEnd = this.hyperMeasureWidth/4;
		var secondMesureEnd = this.hyperMeasureWidth/2;
		var thirdMesureEnd = 3*this.hyperMeasureWidth/4;
		this.group = this.canvasFrame.group();
		for(var i=0; i<5; i++){
			var line = this.canvasFrame.line(this.currentLocX, this.currentLocY+(i*this.spacing), (this.currentLocX+this.hyperMeasureWidth), this.currentLocY+(i*this.spacing)).stroke({ width: this.lineThickness });	
			this.group.add(line);
		}
		var firstLine = this.canvasFrame.line(this.currentLocX, this.currentLocY, this.currentLocX, this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness });	
		this.group.add(firstLine);
		var endLine = this.canvasFrame.line(this.currentLocX+this.hyperMeasureWidth, this.currentLocY, this.currentLocX+this.hyperMeasureWidth, this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness });	
		this.group.add(endLine);
		this.drawSVGs();
		this.tracker = this.canvasFrame.line(this.currentLocX+this.bufferSpaceForStart+this.atTMinusZero+this.trackerPos, 
			this.currentLocY, 
			this.currentLocX+this.atTMinusZero+this.bufferSpaceForStart+(this.trackerPos), 
			this.currentLocY+(4*this.spacing)).stroke({ width: this.lineThickness, color: 'red'});
		this.group.add(this.tracker);	

	}
	moveTracker(i, callback, startTime, lastTime){
		setTimeout(this.callStuff = function(){
			if(this.maxTimeInMS===0){
				//this actually stops progress if no instrument is selected
				state = 'stop';
				console.log('maxTimeInMS was '+this.maxTimeInMS);
				return;
			}else if(i<this.hyperMeasureWidth-this.atTMinusZero&&state === 'play'){
				var width = this.hyperMeasureWidth-this.currentLocX;
				//this.moveTracker(++i, callback, startTime);
				var currentTime = new Date().getTime();
				var elapsedTimeBetweenLoops=currentTime-lastTime;
				//variables: elapsed time, max time, 
				//advance amount = width * (elapsed time over total time)
				var advanceAmount = width*(elapsedTimeBetweenLoops/this.maxTimeInMS);
				this.trackerPos=i+advanceAmount;
				this.moveTracker(this.trackerPos, callback, startTime, currentTime);
				this.tracker.move(this.currentLocX+this.atTMinusZero+i, this.tracker.y());
			}else if(i<this.hyperMeasureWidth-this.currentLocX && state === 'pause'){
				//do nothing
			}else{
				callback();
			}
		}.bind(this), 10);
	}
	getTrackerPosition(){
		return this.trackerPos;
	}
	
	playNotes(i, callback, currentStartTime){
		var newTime = new Date().getTime();
		this.startTime=currentStartTime;
		this.moveTracker(i, callback, currentStartTime, newTime);	
	}
	getStartTime(){
		return this.startTime;
	}
	drawSVGs(){
		//this.clef_data.file_path
		//this.clef_data.file_path
		var clef = this.canvasFrame.image(this.clef_data.file_path , Math.ceil(this.spacing*2.5), Math.ceil(this.spacing*6.3));		
		clef.move(this.currentLocX, this.currentLocY-(Math.ceil(this.spacing*0.82)));
		this.group.add(clef);
	
	}
	setHypermeasureTimeInMS(time){
		this.maxTimeInMS=time;
	}
	reDraw(canvas){
		
		
	}
	moveTo(x, y){
		var tempLine;
		var numberOfElements = this.group.node.childElementCount;
		var changeX=0;
		var changeY=0;
		var currentX=0;
		var currentY=0;
		for(var i=0; i<numberOfElements; i++){					//move all of the lines
			tempLine=this.group.get(i);
			changeX=x-this.getXPosition();
			changeY=y-this.getYPosition();					//difference between current position and new position of current line
			if(this.group.get(i).type==="image"){
				if(this.group.get(i).src==this.clef_data.file_path){	//if it's a clef -- move it this way
					var currentElement = this.group.get(i);
					//this.group.get(i).move(x, y-Math.ceil(this.spacing*.82));
					currentElement.move(currentElement.x(), y-Math.ceil(this.spacing*0.82));
				}
			}else{		
				currentX=tempLine.node.x1.animVal.value;
				currentY=tempLine.node.y1.animVal.value;			//current position of current line
				tempLine.move(currentX+changeX, currentY+changeY);
			}
		}
		this.currentLocY=y;
		this.currentLocX=x;
	}
	hide(){
		
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
	addTotalTime(time){
		this.totalTimeInMS=time;
	}
	clearNotes(){
		//TODO: FIX
		/*
		var numberOfElements = this.group.length;
		console.log(this.group);
		for(var i=0; i<numberOfElements; i++){
			console.log(this.group.get(i));
			this.group.get(i).remove();
		}*/
	}
	addNoteEvent(singleNoteEvent, ticksPerMs){
		this.totalTimeInMS+=(singleNoteEvent[0].deltaTime*ticksPerMs);
		/*
		this.noteEvents[this.noteEvents.length]=singleNoteEvent[0];
		this.totalTimeInMS+=(singleNoteEvent[0].deltaTime*ticksPerMs);
		if(this.noteEvents[0].command==='ON'){
			var noteImage = this.canvasFrame.image(this.noteEvents[0].imageUsed , this.noteWidth, this.noteHeight);
			
			//noteImage.move(this.currentLocX+this.atTMinusZero-(this.noteWidth/2)+this.totalTimeInMS, this.currentLocY-(Math.ceil(this.spacing*0.15))+(this.noteEvents[0].notePosition*(this.spacing/2)));
			//;
			noteImage.move(this.currentLocX+this.atTMinusZero-(this.noteWidth/2)+(this.hyperMeasureWidth-this.currentLocX)*((this.totalTimeInMS)/this.maxTimeInMS), this.currentLocY-(Math.ceil(this.spacing*0.15))+(singleNoteEvent[0].notePosition*(this.spacing/2)));
			this.group.add(noteImage);
		}else if(this.noteEvents[0].command==='OFF'){
			
		}
		console.log(this.totalTimeInMS);
		console.log(singleNoteEvent);
		return this.maxTimeInMS-this.totalTimeInMS;

		//may return a negative number, which indicates that it is not only full, but the remaining time must be added to the next hypermeasure
		
		*/
	}
	isFull(){
		return (this.maxTimeInMS-this.totalTimeInMS)<=0;
	}
	stringDataReturned(){
		var stringData = '';
		var length = this.noteEvents.length;
		for(var i=0; i<length; i++){
			if(this.noteEvents[i].command==="ON"){
				stringData+='start-'+this.noteEvents[i].command+'-'+this.noteEvents[i].deltaTime +' ';
				
			}else if(this.noteEvents[i].command==="OFF"){
				stringData+='stop-'+this.noteEvents[i].command+'-'+this.noteEvents[i].deltaTime +' ';
			}
		}
		return stringData;
	}
}