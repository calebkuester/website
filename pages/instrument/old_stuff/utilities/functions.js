//	var URL = 'calebkuester.com';
var instrument='test';
var mode='test';
var clef='test';
var parsedMidiFile = [];
function forwardToMusicSheet() {
	window.location.href = "/pages/instrument/pages/testMusicSheet1.php?instrument="+instrument+'&mode='+mode+'&clef='+clef;
}
function showClass(className) {
	document.getElementById("className").className = element.className.replace(/\hidden\b/g, "");
}
function hideClass(className) {
	document.getElementById("className").className = element.className+' hidden';
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
	if (!b64re.test(string))
		throw new TypeError('Failed to execute _atob() : The string to be decoded is not correctly encoded.');
	
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
function parseRawBytes(rawBytes){
	var trackNumber=-2; //so the header and the first (empty) track bumps to 0, then track numbers are assigned correctly.
	var chunkSize;
	for(var i=0; i<rawBytes.length; i++){
		chunkSize=0;
		if(String.fromCharCode(rawBytes[i])==='M'&&String.fromCharCode(rawBytes[i+1])=='T'){
			chunkSize = get32IntFromBytes([rawBytes[i+4], rawBytes[i+5], rawBytes[i+6], rawBytes[i+7]]);
			parseChunk(rawBytes.slice(i, chunkSize+8+i), chunkSize, trackNumber);
			i+=chunkSize;							//fast-forward to the next chunk
			trackNumber++;
		}
	}
	return parsedMidiFile;
	//console.log(parsedMidiFile);
}
function parseChunk(rawBytes, chunkSize, trackNumber){
	var chunkType = '';
	for(var i=0; i<4; i++){
		chunkType += String.fromCharCode(rawBytes[i]);
	}
	if(chunkType==="MThd"){
		parseHeader(rawBytes, chunkSize);
	}else if(chunkType==="MTrk"){
		parseTrack(rawBytes, chunkSize, trackNumber);
	}else{
		//unknown track type
	}
}
function parseTrack(rawBytes, chunkSize, trackNumber){
	var chunkType='';
	var idSize=4;
	var positionOfCommandSizeVar=2;
	var nextDeltaTimeByteCount=1;
	var metaEventSize=0;
	var sizeSize = 4;
	for(var i=0; i<4; i++){
		chunkType += String.fromCharCode(rawBytes[i]);
	}
	var retObj = {type: chunkType, chunkSize: chunkSize, metaEventList: []};
	var metaEventList=[];
	var deltaTime=0;
	var timingByteMask=0x80;
	var sizeOfDeltaTime=0;
	var beginningBytes=[];
	for(var i=idSize+sizeSize;i<rawBytes.length; i++){
		//first, find the timing packet
		sizeOfDeltaTime = 0;
		var testString = rawBytes[i].toString(16)+' '+rawBytes[i+1].toString(16)+' '+rawBytes[i+2].toString(16)+' '+rawBytes[i+3].toString(16);
		
		if((rawBytes[i]&timingByteMask)==timingByteMask){				//if lead bit is 1
			beginningBytes = [rawBytes[i], rawBytes[i+1], rawBytes[i+2], rawBytes[i+3], rawBytes[i+4]];
			for(var j=1; j<4; j++){							//while the following bytes have a lead bit of 1
				if((rawBytes[i+j]&timingByteMask)!=timingByteMask){		//if this bit does not have a lead bit of 1 (end of timing packet)
					i+=j+1;							//push the index of the array off of the timing packet
					sizeOfDeltaTime=j+1;				//number of bytes = the amount moved-forward + 1 because we were already looking forward from the first byte
					deltaTime = getDeltaTime(beginningBytes, sizeOfDeltaTime);		//call function to translate the bytes into a number
					break;
				}
			}
		}else{										//if lead bit is 0
			deltaTime = rawBytes[i];
			sizeOfDeltaTime=1;
			i++;
		}
		//next, find the meta event packets
		if((rawBytes[i])>=0xF0){//0xFx
			metaEventSize=rawBytes[i+positionOfCommandSizeVar];
			switch(rawBytes[i+1]){
				case 0x00:
					//Sequence number
					//unnecessary, but does exist on some tracks
					break;
				case 0x01:
					//Text event
					//Literally any text you want
					break;
				case 0x02:
					//Copyright notice
					break;
				case 0x03:
					//Sequence or track name
					var singleCommand={};
					singleCommand.command = "03";
					var trackTitle="";
					var j=0;
					for(var j=0;j<metaEventSize; j++){
						trackTitle+=String.fromCharCode(rawBytes[i+j+positionOfCommandSizeVar+1]);
					}
					singleCommand.trackName=trackTitle;
					metaEventList[metaEventList.length]=singleCommand;
					singleCommand.deltaTime = deltaTime;
					break;
				case 0x04:
					//Instrument name -- usually not used (track name preferred)
					break;
				case 0x05:
					//Lyric text
					//Each syllable will usually be a separate event
					break;
				case 0x06:
					//Marker text
					//Text marker to label a section of music
					break;
				case 0x07:
					//Cue point
					//A text description of an event happening at that point.
					break;
				case 0x20:
					//MIDI channel prefix assignment
					break;
				case 0x2F:
					var singleCommand={};
					//EOF
					//size of packet payload is always zero;
					singleCommand.command = "2F";
					singleCommand.deltaTime = deltaTime;
					metaEventList[metaEventList.length]=singleCommand;
					retObj["metaEventList"]=(metaEventList);
					insertObject(retObj);
					return;//end of this track
				case 0x51:
					//Tempo setting
					//Change the tempo mid-track
					//FF 51 03 tttttt (in microeconds per quarter note)
					//or "24ths of a microsecond  per  MIDI clock"
					//tttttt=50000 -500,000 usec/quarter note
					var singleCommand={};
					singleCommand.command = "51";
					var tempo=get32IntFromBytes([0, rawBytes[i+3], rawBytes[i+4], rawBytes[i+5]]);
					
					if(tempo==0){
						singleCommand.tempo=(500000);
					}else{
						singleCommand.tempo=(tempo);
					}
					singleCommand.deltaTime = deltaTime;
					metaEventList[metaEventList.length]=singleCommand;
					metaEventList[metaEventList.length]=singleCommand;
					break;
				case 0x54:
					//SMPTE offset
					/*
					This  event, if present, designates the SMPTE time at which  the  track
					chunk  is supposed to start. It should be present at the  beginning  of
					the  track,  that is, before any nonzero delta-times,  and  before  any
    				transmittable  MIDI  events. the hour must be encoded  with  the  SMPTE
					format, just as it is in MIDI Time Code. In a format 1 file, the  SMPTE
					Offset must be stored with the tempo map, and has no meaning in any  of
					the other tracks. The ff field contains fractional frames, in 100ths of
					a  frame,  even in SMPTE-based tracks which specify a  different  frame
					subdivision for delta-times.
					Read more: http://www.intel-assembler.it/portale/5/midi-file-format/specification-for-midi-format-11.asp#ixzz5L4EuFMJa
					*/
					break;
				case 0x58:
					var singleCommand={};
					//Time Signature
					//nn/(2^dd)
					//4/4 time is 4/(2^2)
					//cc: MIDI Clocks per metronome tick
					//bb: Number of 1/32 notes per 24 MIDI clocks (8 is standard)
					//size of packet payload is always 4;
					singleCommand.command = "58";
					singleCommand.nn=rawBytes[i+3];
					singleCommand.dd=rawBytes[i+4];
					singleCommand.cc=rawBytes[i+5];
					singleCommand.bb=rawBytes[i+6];
					metaEventList[metaEventList.length]=singleCommand;
					singleCommand.deltaTime = deltaTime;
					break; 
				case 0x59:
					var singleCommand={};
					//Key Signature
					//sf: number of sharps or flats
					//	-7=7 flats
					//	7=7 sharps
					//	0=key of C
					//mi: 
					//	0: major key
					//	1: minor key
					//size of packet payload is always 2;
					singleCommand.command = "59";
					singleCommand.sf=rawBytes[i+3];
					singleCommand.mi=rawBytes[i+4];
					metaEventList[metaEventList.length]=singleCommand;
					singleCommand.deltaTime = deltaTime;
					break;
				case 0x7F:
					//Sequencer specific event
					break;
				default:
					break;
					//unknown F-command (have seen this in some MIDI files -- must be supported, but can be ignored)
			}
			i+=2+metaEventSize;			//ff (i++) + 2f (1) + # of bytes after event header
		}else {						//if not an F-command, then it is a midi event
								//Only the first 8 bits matter. The second 8-bits are the channel
			//next, find the event packets									
			var value = (rawBytes[i]);
			switch(value){
				case (0x80|(trackNumber)):
					//Note off
					var singleCommand={};
					singleCommand.command = "OFF";
					singleCommand.note = rawBytes[i+1];
					singleCommand.velocity = rawBytes[i+2];
					singleCommand.deltaTime = deltaTime;
					metaEventList[metaEventList.length]=singleCommand;
					break;
				case (0x90|(trackNumber)):
					//Note on
					var singleCommand={};
					singleCommand.command = "ON";
					singleCommand.note = rawBytes[i+1];
					singleCommand.velocity = rawBytes[i+2];
					singleCommand.deltaTime = deltaTime;
					metaEventList[metaEventList.length]=singleCommand;
					i+=2;
					break;
				case (0xA0|(trackNumber)):
					//Note Aftertouch
					break;
				case (0xB0|(trackNumber)):
					i+=2;
					//Controller
					break;
				case (0xC0|(trackNumber)):
					//Program Change
					i++;
					break;
				case (0xD0|(trackNumber)):
					//Channel Aftertouch
					i++;
					break;
				case (0xE0|(trackNumber)):
					//Pitch Bend -- In a string instrument, your finger position on the neck can move slightly up, or down to slightly change the pitch
					var singleCommand={};
					singleCommand.command = "BLEND";
					singleCommand.LSB = rawBytes[i+1];
					singleCommand.MSB = rawBytes[i+2];
					singleCommand.deltaTime = deltaTime;
					metaEventList[metaEventList.length]=singleCommand;
					i+=2;
					break;
			}
		}
	}
}
function getDeltaTime(byteArray, numberOfBytes){
	var output=0;
	//byte array will be of size=5
	//If the number of bytes we want is 3, then [0=yes][1=yes][2=yes][3=no][4=no]
	//In order of most significant to least significant in this example = 2, 1, 0
	var thisString="";
	for(var i=numberOfBytes; i>0; i--){
		output = (output | (byteArray[numberOfBytes-i]&0x7F)<<((i-1)*7));
		thisString = thisString+""+(numberOfBytes-i)+" "+(byteArray[numberOfBytes-i]&0x7F)+" was shifted by "+((i-1)*7)+" to make "+((byteArray[numberOfBytes-i]&0x7F)<<((i-1)*7))+"<<  >>";
		//tempVar=0;
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
function parseHeader(rawBytes){
	var headerSize = get32IntFromBytes([rawBytes[4], rawBytes[5], rawBytes[6], rawBytes[7]]);
	var formatType = get32IntFromBytes([0, 0, rawBytes[8], rawBytes[9]]);
	
	if(headerSize!==6||formatType!=1){
		throw new Error("MIDI file type not supported");
		return;
	}
	var numberOfTracks = get32IntFromBytes([0, 0, rawBytes[10], rawBytes[11]]);
	var timingFormatType = (rawBytes[12] & 0x80) >> 7;
	var ticksPerQuarterNote = get32IntFromBytes([0, 0, (rawBytes[12] & 0x7F), rawBytes[13]]);
	var framesPerSecond = -get32IntFromBytes([0, 0, 0, (rawBytes[12] & 0x7F)]);
	var ticksPerFrame = get32IntFromBytes([0, 0, 0, rawBytes[13]]);
	var header = {
		type: "MThd", 
		headerSize: headerSize, 
		formatType: formatType, 
		numberOfTracks: numberOfTracks, 
		timingFormat: timingFormatType, 
		framesPerSecond: framesPerSecond, 
		ticksPerFrame: ticksPerFrame,
		ticksPerQuarterNote: ticksPerQuarterNote
	};
	parsedMidiFile["header"] = header;
}
function get32IntFromBytes(array){
	var uint8bytes = Uint8Array.from(array);
	dataview = new DataView(uint8bytes.buffer);
	return dataview.getInt32(0);											//big-endian
}