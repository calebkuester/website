var imageUsed = '';		//svg name/location
var command='';
var frequency = '';		//mhz
var note = ''; 			//c, c#, d, e♭, f, f#, g, g#, a, b♭, b
var octave = 0; 		//0, 1, 2, 3, 4, 5, 6, 7, 8
var staffLinePosition = 0;	//0 for middle
var currentTime=0;
var velocity=0;
var deltaTime=-1;
var blendMSB=0;
var blendLSB=0;
				//-5         
				//-4O--------
				//-3 O       
				//-2--O------
				//-1   O     
				// 0----O----
				// 1     O   
				// 2------O--
				// 3       O 
				// 4--------O
				// 5          
class NoteEvent {
	constructor(frequency, octave, imageFileName, noteLetter, command, velocity, deltaTime, notePosition, blendMSB, blendLSB) {
		this.frequency = frequency;
		this.octave=octave;
		this.imageUsed = imageFileName;
		this.note = noteLetter;
		this.command=command;
		//this.staffLinePosition = staffLinePosition;
		this.velocity=velocity;
		this.deltaTime=deltaTime;
		this.blendMSB=blendMSB;
		this.blendLSB=blendLSB;
		this.notePosition=notePosition;
	}
	getFrequency(){
		return this.frequency;
	}
	getNoteLetter(){
		return this.note;
	}
	setColor(){
		// color = #FF0000
	}
	playNote(){
		console.log("On: "+this.frequency);
		//o.start()
	}
	stopNote(){
		console.log("Off: "+this.frequency);
	}
	hasDeltaTime(){
		return (deltaTime>0);
	}
}


