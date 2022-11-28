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
	constructor(octave, imageFileName, command, velocity, deltaTime, blendMSB, blendLSB, noteData, clef) {
		this.octave=octave;
		this.imageUsed = imageFileName;
		this.command=command;
		this.velocity=velocity;
		this.deltaTime=deltaTime;
		this.blendMSB=blendMSB;
		this.blendLSB=blendLSB;
		this.clef=clef;
		this.getInfoFromNote(noteData);
		
	}
	getTicks(){
		return this.deltaTime;
	}
	getInfoFromNote(val){
		this.noteFrequency = (440 / 32)*(Math.pow(2, (val-9)/12));
		this.notePosition = this.notePositionFunction(val);
		this.noteLetter = this.getNoteLetter(val);
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
	}
	getNoteLetter(val){
		//TODO: Make this work properly
		return '-';
	}
	convertTicksToWidth(ticksPerMs, usableWidth, msPerMesasure, measuresPerHypermeasure){
		return ((this.getTicks()*ticksPerMs)*(usableWidth))/(msPerMesasure*measuresPerHypermeasure);
	}
}


