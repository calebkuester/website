var standardNotes = {
    //0:{key:196, note:"G3"},
    //0:{key:4*12+7, note:"G3"},
    0:{key:4*12+7, note:"G3"},
    1:{key:4*12+8, note:"GA3"},
    2:{key:4*12+9, note:"A3"},
    3:{key:4*12+10, note:"AB3"},
    4:{key:4*12+11, note:"B3"},
    5:{key:5*12+0, note:"C4"},
    6:{key:5*12+1, note:"CD4"},
    7:{key:5*12+2, note:"D4"},
    8:{key:5*12+2, note:"D4"},
    9:{key:5*12+3, note:"DE4"},
    10:{key:5*12+4, note:"E4"},
    11:{key:5*12+5, note:"F4"},
    12:{key:5*12+6, note:"FG4"},
    13:{key:5*12+7, note:"G4"},
    14:{key:5*12+8, note:"GA4"},
    15:{key:5*12+9, note:"A4"},
    16:{key:5*12+9, note:"A4"},
    17:{key:5*12+10, note:"AB4"},
    18:{key:5*12+11, note:"B4"},
    19:{key:6*12+0, note:"C5"},
    20:{key:6*12+1, note:"CD5"},
    21:{key:6*12+2, note:"D5"},
    22:{key:6*12+3, note:"DE5"},
    23:{key:6*12+4, note:"E5"},
    24:{key:6*12+4, note:"E5"},
    25:{key:6*12+5, note:"F5"},
    26:{key:6*12+6, note:"FG5"},
    27:{key:6*12+7, note:"G5"},
    28:{key:6*12+8, note:"GA5"},
    29:{key:6*12+9, note:"A5"},
    30:{key:6*12+10, note:"AB5"},
    31:{key:6*12+11, note:"B5"}
};
var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContextFunc();
var player = new WebAudioFontPlayer();
player.loader.decodeAfterLoading(audioContext, '_tone_0401_FluidR3_GM_sf2_file');

var pipe;
function playPipe(pipeNum){
    pipe = standardNotes[pipeNum];
    pipe.envelope=player.queueWaveTable(audioContext, audioContext.destination, _tone_0401_FluidR3_GM_sf2_file, -5, pipe.key, 999,true);
    stopPipe(pipe);
}
function stopPipe(pipeNum){
    pipe = standardNotes[pipeNum];
    if(pipe && pipe.envelope){
        pipe.envelope.cancel();
        pipe.envelope=null;
    }
}
function sizeUpButtonPanel(fingerPositionDivInfo){
    var buttonOverlay = document.getElementById('buttonOverlay');
    buttonOverlay.style.width=fingerPositionDivInfo.width + "px";
    buttonOverlay.style.height=fingerPositionDivInfo.height + "px";
    buttonOverlay.style.marginTop=fingerPositionDivInfo.top + "px";
    buttonOverlay.style.marginLeft=fingerPositionDivInfo.left + "px";
}
function moveAndResizeNoteLights(fingerPositionDivInfo){
    var fingerPositions = document.getElementsByClassName("note");
    var lightbulbWidth = (fingerPositionDivInfo.width * 0.1);
    var lightbulbHeight = (fingerPositionDivInfo.height * 0.1);
    var spaceBetweenBulbsX = fingerPositionDivInfo.width*0.02;
    var spaceBetweenBulbsY = fingerPositionDivInfo.height*0.025;
    for(var divIndex in fingerPositions){
        if(fingerPositions[divIndex] !==null && fingerPositions[divIndex].id !== undefined){
            fingerPositions[divIndex].style.width = lightbulbWidth+"px";
            fingerPositions[divIndex].style.height = lightbulbHeight+"px";
            fingerPositions[divIndex].style.marginLeft = (((divIndex%4)*(lightbulbWidth+spaceBetweenBulbsX))+(fingerPositionDivInfo.width*0.22))+1+"px";
            fingerPositions[divIndex].style.marginTop = ((Math.floor(divIndex/4)*(lightbulbHeight+spaceBetweenBulbsY))+(spaceBetweenBulbsY-3.5))+"px";
        }
    }
}
function resizeFingerPositionElements(divBoundingRectangle) {
    sizeUpButtonPanel(divBoundingRectangle);
    moveAndResizeNoteLights(divBoundingRectangle);
}