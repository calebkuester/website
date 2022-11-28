var context = null;	
var oscillator = null;
var gain = null;
var trackName = '';
var commandList = null;
var timingNumberator = 0;
var timingDenominator = 0;
var clocksPerMetronomeTick = 0;
var thirtySecondNotesPerTwentyFourMidiClocks = 0;
var numberOfSharps=0;
var numberOfFlats=0;
var majorMinor="";



class Track {
	constructor() {
		this.context = new AudioContext();
		this.oscillator=this.context.createOscillator();
		this.gain = this.context.createGain();
		this.commandList=new Array();
	}
	addName(trackName){
		this.trackName=trackName;
	}
	addTimingNumerator(numerator){
		this.timingNumerator = numerator;
	}
	addTimingDenominator(denominatorExponent){
		this.timingDenominator = Math.pow(2, denominatorExponent);
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
	addSharpsFlats(input){
		if(input<0){
			this.numberOfFlats=-input;
		}else if(input>0){
			this.numberOfSharps=input;
		}else{
			//key of c
		}
	}
	addMajorMinor(input){
		if(input==0){
			this.majorMinor = 'major';
		}else if(input==1){
			this.majorMinor = 'minor';
		}else{
			//something went wrong. The only two values are zero and one.
		}
	}
	getContext(){
		return this.context;
	}
	getOscillator(){
		return this.oscillator;
	}
	getGain(){
		return this.gain;
	}
	getCommandList(){
		return this.commandList;
	}
	getCommandCount(){
		return this.commandList.length;
	}
	hasNotes(){
		if(this.commandList!=null){
			return (this.commandList.length>0);
		}else{
			return -1;
		}
	}
}
