var midiTrackList = [];
var measuresPerHypermeasure=3;
var musicPanel;
var parsedMidiFile = [];
//var midiFileName = '../utilities/songs/FrogsTheme.mid';
var noteFrequencyTable;

function loadData(midiFileName){
    noteFrequencyTable = setFrequencyTable();
    parseFile(midiFileName, dataLoaded);
}
function dataLoaded(){
    if(parsedMidiFile.length > 0){
        trackList(parsedMidiFile, null);
    }
}
function setFrequencyTable(){
    var a = 440; //key a is 440 hz
    var table = [];
    for(var i=0; i<128; i++){
        //algorithm to generate a frequency
        table[i] = (a / 32) * (Math.pow(2, ((i - 9) / 12)));
    }
    return table;
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
                    trackName = midiObject.tracks[i].metaEventList[j].trackName;
                    break;
                case 'ON':
                    //note found
                    hasNotes = true;
                    break;
                case '51':startingTempo = midiObject.tracks[i].metaEventList[j].tempo;
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
            midiTrackList[midiTrackList.length]=new Track(trackName, midiObject.tracks[i].metaEventList, currentNumerator, currentDenominator, startingTempo, majorMinor, sharpsFlats);
        }

    }
    return;
}
function getFrequency(input){
    return noteFrequencyTable[input];
}
function getOctave(input){
    return Math.floor(input/12)-5;
}
function getNoteLetter(input){
    var octaveList = ["C", "C#/D♭", "D", "D#/E♭", "E", "F", "F#/G♭", "G", "G#/A♭", "A", "A#/B♭", "B"];
    return octaveList[input%12];
}
function convertNoteToKeyNumber(input){
    return (input % 12) - 6;
}
function parseFile(fileName, callback){
	parsedMidiFile = [];
	fetch(fileName).then(function(response) {
	  	response.blob().then(function(blob) {
	  		var base64 = new FileReader();
	  		base64.readAsDataURL(blob); 
	  		base64.onloadend = function(){
	  			var rawFile = atob(base64.result);
	  			callback(parseRawBytes(rawFile));
	  		};
	  	});
	});
}
function atob(string) {
	// base64 character set, plus padding character (=)
	let b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
	// Regular expression to check formal correctness of base64 encoded strings
	let b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
	// remove data type signatures at the begining of the string
	// eg :  "data:audio/mid;base64,"
	string = string.replace( /^.*?base64,/ , '');
	// atob can work with strings with whitespaces, even inside the encoded part,
	// but only \t, \n, \f, \r and ' ', which can be stripped.
	string = String(string).replace(/[\t\n\f\r ]+/g, '');
	if (!b64re.test(string)){
		throw new TypeError('Failed to execute _atob() : The string to be decoded is not correctly encoded.');
    }
	// Adding the padding if missing, for semplicity
	string += '=='.slice(2 - (string.length & 3));
	let bitmap, result = '';
	let r1, r2, i = 0;
	for (; i < string.length;) {
		bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12
		| (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));

		result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255)
		: r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255)
		: String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
	}
	return toUnit8(result);
}
function toUnit8(raw){
    let rawLength = raw.length;
    let t_array = new Uint8Array(new ArrayBuffer(rawLength));
    for(let i=0; i<rawLength; i++) t_array[i] = raw.charCodeAt(i);
    return t_array;
}
function getChunkSize(rawBytes, location, size){
    var bytes = [];
    for(var i = 0; i < size; i++){
        bytes.push(rawBytes[location + i])
    }
    return get32IntFromBytes(bytes);
}
function getStringFromBytes(rawBytes, location, size){
    var returnValue = "";
    for(var i = 0; i < size; i++){
        returnValue += String.fromCharCode(rawBytes[location + i]);
    }
    return returnValue;
}
function parseHeader(data, headerIndicator, chunkSize){
    var midiFileFormat = get32IntFromBytes([0, 0, data[0], data[1]]);
    if(chunkSize !== 6 || midiFileFormat == 2 || midiFileFormat == 0){
		throw new Error("MIDI file type not yet supported");
	}
    var division = (data[4] << 4) + data[5];
    var numberOfTracks = get32IntFromBytes([0, 0, data[2], data[3]]);
    var ticksPerQuarterNote;
    var smpteAndMidiTimeCode;
    var timingFormatType = (0x80 & data[4]);
    var ticksPerFrame;
    if(timingFormatType == 0){// if bit 15 of division is zero, the bits 14 through 0 represent the number of delta time "ticks" in a quarter-note
        ticksPerQuarterNote = get32IntFromBytes([0, 0, data[4], data[5]]) >> 2;
    }else if (timingFormatType == 0x80){
        smpteAndMidiTimeCode = get32IntFromBytes([0xFF, 0xFF, ((data[4] & 0x3F) | 0xC0), data[5]]) >> 7;
        // one of four values: -24, -25, -29, or -30
        ticksPerFrame = data[5];
        // typically 4, 8, 10, 80, or 100
        // This stream code allows exact specifications of time-code-based tracks, but also allows millisecond-based tracks by specifying 25 frames/sec and a resolution of 40 units per frame.
        // If the events in a file are stored with a bit resolution of 30-frame time code, the division word would be 0xE250.
    }
    var returnValue = {
        midiFileFormat: midiFileFormat,
        type: headerIndicator,
        headerSize: chunkSize,
        numberOfTracks: numberOfTracks,
        timingFormatType: timingFormatType,
        ticksPerQuarterNote: ticksPerQuarterNote,
        smpteAndMidiTimeCode: -smpteAndMidiTimeCode,
        ticksPerFrame: ticksPerFrame,
        division: division
    };
    return returnValue;
}
function parseTrack1(trackData, trackType, chunkSize){
    var returnValue = {'type': trackType, chunkSize: chunkSize};
    return returnValue;
}
function parseRawBytes(rawBytes){
	var trackNumber = 0;
    var data = {};
    var tracks = {};
    var sizeOfTrackType = 4;
    var headerString = "MThd";
    var trackString = "MTrk";
    for(var i = 0; i < rawBytes.length;){
        var trackType = getStringFromBytes(rawBytes, i, sizeOfTrackType);
        if(trackType == headerString){
            i += headerString.length; // already read these
            var chunkSize = getChunkSize(rawBytes, i, 4);
            i += 4; // size of 32 bit number
            var headerData = rawBytes.slice(i, i + chunkSize);
            data.header = parseHeader(headerData, headerString, chunkSize);
            i += chunkSize;
        }else if(trackType == trackString){
            i += trackString.length; // already read these
            var chunkSize = getChunkSize(rawBytes, i, 4);
            i += 4; // size of 32 bit number
            var trackData = rawBytes.slice(i, i + chunkSize);
            tracks[trackNumber] = parseTrack1(trackData, trackType, chunkSize);
            i += chunkSize;
            trackNumber++;
        }else{
            console.log('NOT SUPPOSED TO BE HERE');
            i += 1;
        }
    }
    data.tracks = tracks;
    console.log(data);
	// for(var i = 0; i < rawBytes.length; i++){
	// 	if(String.fromCharCode(rawBytes[i])==='M'&&String.fromCharCode(rawBytes[i+1])=='T'){
	// 		chunkSize = get32IntFromBytes([rawBytes[i+4], rawBytes[i+5], rawBytes[i+6], rawBytes[i+7]]);
	// 		parseChunk(rawBytes.slice(i, chunkSize + 8 + i), chunkSize, trackNumber);
	// 		i += chunkSize;							//fast-forward to the next chunk
	// 		trackNumber++;
	// 	}
	// }
	return parsedMidiFile;
}
function parseChunk(rawBytes, chunkSize, trackNumber){
	var chunkType = '';
	for(var i=0; i<4; i++){
		chunkType += String.fromCharCode(rawBytes[i]);
	}
	if(chunkType === "MThd"){
		parseHeader(rawBytes, chunkSize);
	}else if(chunkType === "MTrk"){
		parseTrack(rawBytes, chunkSize, trackNumber);
	}else{
		//unknown track type
	}
}
function parseTrack(rawBytes, chunkSize, trackNumber){
    var temp_max = 0xFF;
	var i = 0;
	var deltaTime = 0;
	var metaEventList = [];
	var chunkType = "";
	var timingByteMask = 0x80;
	var trackIdTypeSize = 4;
	var nextCommand = "";
	var positionOfCommandSizeVar = 2;
	var lastCommandEndPosition = 0;
	while(i < trackIdTypeSize){
	    chunkType += String.fromCharCode(rawBytes[i]);
        i++;
	}
    var chunkSize = get32IntFromBytes([rawBytes[i],rawBytes[i+1],rawBytes[i+2],rawBytes[i+3]]);
    console.log('chunkSize: '+chunkSize);
	i+=4;//bypass track size
	lastCommandEndPosition=i;
	var retObj = {type: chunkType, chunkSize: chunkSize, metaEventList: metaEventList};
	for(i=0;i < rawBytes.length; i+=1){
	    var singleCommand={};
	    if((rawBytes[i])>=0xF0){
	        i+=1;//move from 0xFx to command type
	        var argLength=0;
	        switch(rawBytes[i]){
				case 0x00:
					//Sequence number
					//unnecessary, but does exist on some tracks
					lastCommandEndPosition=i+1; //+1 so that 0x00 is not counted in variable-length timer
					break;
				case 0x01:
					//Text event
					//not used for sound processing
					lastCommandEndPosition=i+1; //+1 so that 0x00 is not counted in variable-length timer
					break;
				case 0x02:
					//Copyright notice
					//Could use that in the future
					lastCommandEndPosition=i+1;
					break;
				case 0x03:
					//Sequence or track name
                    var trackTitle = "";
					singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					singleCommand.command = "03";
					i += 1;
					argLength = rawBytes[i];
					i += 1;//space between length of name and start of name
					for(var j = 0; j < argLength; j++){
						trackTitle += String.fromCharCode(rawBytes[i+j]);
					}
					i+=j;//already read these bytes
					console.log(trackTitle);
					singleCommand.trackName = trackTitle;
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				case 0x04:
					//Instrument name -- usually not used (track name preferred)
					lastCommandEndPosition=i+1;
					break;
				case 0x05:
					//Lyric text
					//Each syllable will usually be a separate event
					lastCommandEndPosition=i+1;
					break;
				case 0x06:
					//Marker text
					//Text marker to label a section of music
					lastCommandEndPosition=i+1;
					break;
				case 0x07:
					//Cue point
					//A text description of an event happening at that point.
					lastCommandEndPosition=i+1;
					break;
				case 0x20:
					//MIDI channel prefix assignment
					lastCommandEndPosition=i+1;
					break;
				case 0x2F:
					//End of Track
					//size of packet payload is always zero;
					singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					singleCommand.command = "2F";
					metaEventList[metaEventList.length]=singleCommand;
					retObj.metaEventList=(metaEventList);
					insertObject(retObj);
					i+=2;// extend past the command and the following byte
					return;//end of this track
				case 0x51:
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					//Tempo setting
					//Change the tempo mid-track
					//FF 51 03 tttttt (in microeconds per quarter note)
					//or "24ths of a microsecond  per  MIDI clock"
					//tttttt=50000 -500,000 usec/quarter note
					singleCommand.command = "51";
					i+=1//pass 0x51
					var argLength = rawBytes[i];//length of argument
					i+=1//length of argument
					var tempoArray=[0];//get32IntFromBytes requires four digits. Only have 3.
					for(var j=0;j<argLength; j++){
						tempoArray[tempoArray.length]=rawBytes[i+j];
					}
					i+=j;//already read these bytes
					var tempo=get32IntFromBytes(tempoArray);
					if(tempo==0||tempo===null){
						singleCommand.tempo=(500000);
					}else{
						singleCommand.tempo=(tempo);
					}
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				case 0x54:
					//SMPTE offset
					lastCommandEndPosition=i;
					break;
				case 0x58:
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
				    i+=1;//pass 0x58
					//Time Signature
					//(nn/(2^dd))
					//4/4 time is 4/(2^2)
					//cc: MIDI Clocks per metronome tick
					//bb: Number of 1/32 notes per 24 MIDI clocks (8 is standard)
					if(rawBytes[i]!=4){//size of packet payload is always 4;
					    throw "Malformed or unknown midi file structure";
					}
					i+=1;//move to first command
					singleCommand.command = "58";
					singleCommand.nn=rawBytes[i];//numerator for time signature
					i+=1;
					singleCommand.dd=rawBytes[i];//2^dd for denominator in time signature
					i+=1;
					singleCommand.cc=rawBytes[i];//MIDI clocks between metronome ticks
					i+=1;
					singleCommand.bb=rawBytes[i];//32nd notes per 24 midi clocks (usually 8)
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;//+1 to skip singleCommand.bb position (otherwise counted by next command)
					break; 
				case 0x59:
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					//Key Signature
					//sf: number of sharps or flats
					//	-7=7 flats
					//	7=7 sharps
					//	0=key of C
					//mi: 
					//	0: major key
					//	1: minor key
					//size of packet payload is always 2;
					i+=1;//pass 0x59
					if(rawBytes[i]!=2){//size of packet payload is always 4;
					    throw "Malformed or unknown midi file structure";
					}
					i+=1;//move to first number
					singleCommand.command = "59";
					singleCommand.sf=rawBytes[i];//0 = c
					i+=1;
					singleCommand.mi=rawBytes[i];//0 = major 1 = minor
					
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				case 0x7F:
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					//Sequencer specific event
					i+=1;//move to quantity of bytes in this packet
					var length = rawBytes[i];
					var arrayOfEventBytes = [0];
					for(var iterator = 0; iterator<length; iterator++){
					    arrayOfEventBytes[arrayOfEventBytes.length]=rawBytes[i];
					    i+=1;
					}
					if(arrayOfEventBytes.length===4){
					    metaEventList[metaEventList.length]={command:"7f", data:get32IntFromBytes(arrayOfEventBytes)};
					}else{
					    //I have no idea how big this thing can get
					}
					lastCommandEndPosition=i+1;
					break;
				default:
					break;
					//unknown F-command (have seen this in some MIDI files -- must be supported without crashing, but can be ignored)
			}
	    }else{
	        var command = (rawBytes[i]);
			switch(command){
				case (0x80|(trackNumber)):
					//Note off
					singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					singleCommand.command = "8"+trackNumber;
					i+=1;
					singleCommand.note = rawBytes[i];
					i+=1;
					singleCommand.velocity = rawBytes[i];
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				case (0x90|(trackNumber)):
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					//Note on
					singleCommand.command = "9"+trackNumber;
					i+=1;
					singleCommand.note = rawBytes[i];
					i+=1;
					singleCommand.velocity = rawBytes[i];
					
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				case (0xA0|(trackNumber)):
					//Note Aftertouch
					lastCommandEndPosition=i+1;
					break;
				case (0xB0|(trackNumber)):
					i+=1;
					//Controller
					singleCommand.controllerEvent={track: trackNumber, value: rawBytes[i]};
					lastCommandEndPosition=i+1;
					break;
				case (0xC0|(trackNumber)):
					//Program Change
                    i+=1;//bypass 0xC0
                    singleCommand.programChangeEvent={track: trackNumber, value: rawBytes[i]};
                    lastCommandEndPosition=i+1;
					break;
				case (0xD0|(trackNumber)):
					//Channel Aftertouch
					lastCommandEndPosition=i+1;
					//i++;
					break;
				case (0xE0|(trackNumber)):
				    singleCommand.deltaTime = getDeltaTime(rawBytes.slice(lastCommandEndPosition, i));
					//Pitch Bend -- In a string instrument, your finger position on the neck can move slightly up, or down to slightly change the pitch
					singleCommand.command = "E"+trackNumber;
					i+=1;
					singleCommand.LSB = rawBytes[i];
					i+=1;
					singleCommand.MSB = rawBytes[i];
					metaEventList[metaEventList.length]=singleCommand;
					lastCommandEndPosition=i+1;
					break;
				default:
				    if(i>8){
                        //console.log(i);
				    }
				    //console.log(i+": "+rawBytes[i-6].toString(16)+' '+rawBytes[i-5].toString(16)+' '+rawBytes[i-4].toString(16)+' '+rawBytes[i-3].toString(16)+' '+rawBytes[i-2].toString(16)+' '+rawBytes[i-1].toString(16)+' ['+rawBytes[i].toString(16)+'] '+rawBytes[i+1].toString(16)+' '+rawBytes[i+2].toString(16)+' '+rawBytes[i+3].toString(16));
				    break;
			}
	    }
	}
}
function getDeltaTime(byteArray){
	var output=0;
	//byte array will be of size=5
	//If the number of bytes we want is 3, then [0=yes][1=yes][2=yes][3=no][4=no]
	//In order of most significant to least significant in this example = 2, 1, 0
	for(var i=byteArray.length; i>0; i--){
		output = (output | (byteArray[i]&0x7F)<<((i-1)*7));
		//every 8 bits will shift only 7 bits. We do not want the lead bit
		//0x7F is the byte mask to remove the lead bit
	}
	return output;
}
function insertObject(retObj){
	if(parsedMidiFile["tracks"]==null){
		parsedMidiFile["tracks"]=[retObj];
	}else{
		parsedMidiFile["tracks"].push(retObj);
	}
}
// function parseHeader(rawBytes){
// 	var headerSize = get32IntFromBytes([rawBytes[4], rawBytes[5], rawBytes[6], rawBytes[7]]);
// 	var formatType = get32IntFromBytes([0, 0, rawBytes[8], rawBytes[9]]);
	
// 	if(headerSize!==6||formatType==2||formatType==0){
// 		throw new Error("MIDI file type not yet supported");
// 		return;
// 	}
// 	var numberOfTracks = get32IntFromBytes([0, 0, rawBytes[10], rawBytes[11]]);
// 	var timingFormatType = (rawBytes[12] & 0x80) >> 7;
// 	var ticksPerQuarterNote = get32IntFromBytes([0, 0, (rawBytes[12] & 0x7F), rawBytes[13]]);
// 	var framesPerSecond = get32IntFromBytes([0, 0, 0, (rawBytes[12] & 0x7F)]);
// 	if(framesPerSecond!=0){
// 	    framesPerSecond=-framesPerSecond;
// 	}
// 	var ticksPerFrame = get32IntFromBytes([0, 0, 0, rawBytes[13]]);
// 	var header = {
// 		type: "MThd", 
// 		headerSize: headerSize, 
// 		formatType: formatType, 
// 		numberOfTracks: numberOfTracks, 
// 		timingFormat: timingFormatType, 
// 		framesPerSecond: framesPerSecond, 
// 		ticksPerFrame: ticksPerFrame,
// 		ticksPerQuarterNote: ticksPerQuarterNote
// 	};
// 	parsedMidiFile["header"] = header;
// }
function get32IntFromBytes(array){
	var uint8bytes = Uint8Array.from(array);
	dataview = new DataView(uint8bytes.buffer);
	return dataview.getInt32(0);//big-endian
}