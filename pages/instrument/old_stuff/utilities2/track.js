class Track {
	constructor(trackName, trackCommands, timingNumerator, timingDenominator, startingTempo, majorMinor, sharpsFlats) {
		this.commandList=trackCommands;
		this.trackName=trackName;
		this.timingNumerator=timingNumerator;
		this.timingDenominator=timingDenominator;
		this.currentTempo=startingTempo;
		this.majorMinor=majorMinor;
		this.sharpsFlats=sharpsFlats;
		
	}
	addClocksPerMetronomeTick(clocksPerMetronomeTick){
		this.clocksPerMetronomeTick=clocksPerMetronomeTick;
	}
	addThirtySecondNotesPerTwentyFourMidiClocks(input){
		this.thirtySecondNotesPerTwentyFourMidiClocks=input;
	}
	addNote(inputCommand){
		if(this.commandList!=null){
			this.commandList[this.commandList.length]=inputCommand;
		}
	}
	getCommandList(){
		return this.commandList;
	}
	getCommandCount(){
		return this.commandList.length;
	}
	setCurrentTempo(input){
		this.currentTempo=input;
	}
	getCurrentTempo(){
		return this.currentTempo;
	}
	getName(){
		if(this.trackName!=null){
			return this.trackName;
		}
		return null;
	}
	hasNotes(){
		if(this.commandList!=null){
			return (this.commandList.length>0);
		}else{
			return -1;
		}
	}
}
