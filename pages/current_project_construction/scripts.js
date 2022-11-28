var canvas;
var button;
var context;
var musicSheetStats;
var actionButtonStats = {"locationX":100, "locationY":100, "height":50, "width":100, "text": "Go"};
var barLineSpacing = 0;
var minHeight = 2*8*barLineSpacing; //2 hypermeasures * 7 lines (6 regular +2 extra)
var barWidth = 0;
var timingNumerator=0;
var timingDenominator=0;
var margin = 10;
var hypermeasureHeight=0;
var tempo = 60;//bpm

var song = {"beatsPerMeasure":4, "measuresPerHypermeasure":4, "hypermeasureCount":4};

function windowResize(){
    var screen = document.getElementById('contents');
    screen.style.minHeight=(minHeight);
    setCanvasSize();
    renderFrames();
}
function init(){
    canvas = document.getElementById('canvas');
    button = document.getElementById('button');
    context = canvas.getContext("2d");
    setCanvasSize();
    setButtonLocation();
    renderFrames();
    parseFile("FrogsTheme.mid", readInfo);

}
function readInfo(input){
    console.log(input);
}
function renderFrames(){
    if(!context){
        return;  
    }
    var size = getScreenSizeData();
    var startMusicSheet = size.x*(1/3);
    var height=size.y*(2/3);
    if(height<(hypermeasureHeight*song.hypermeasureCount)){
        height=hypermeasureHeight*song.hypermeasureCount;
    }
    context.lineWidth=2;
    //background
    context.fillStyle = "#F5F5DC";
    //"#F5F5DC"
    context.fillRect(0, 0, size.x, size.y+margin);
    //music sheet
    context.fillStyle = "#fff";
    context.fillRect(startMusicSheet, margin, (size.x)-startMusicSheet-margin, height+0.5);
    context.fillStyle = "#d3b38c";
    context.rect(startMusicSheet+0.5, margin+0.5, ((size.x)-startMusicSheet-margin)+0.5, height+0.5);
    context.stroke();
    //instrument panel
    context.fillStyle = "#fff";
    context.fillRect(margin, margin, startMusicSheet-(2*margin), height);
    context.fillStyle = "#d3b38c";
    context.rect(margin+0.5, margin+0.5, (startMusicSheet-(2*margin))+0.5, height+0.5);
    context.stroke();
    //draw music sheet
    drawMusicSheet(startMusicSheet, margin, size.x);
    drawInstrumentPanel();
}
function drawMusicSheet(startX, startY, endX){
    var yPosition=0;
    context.lineWidth=1;
    context.fillStyle = "#000";
    context.beginPath();
    for(var barNumber=0; barNumber<song.hypermeasureCount; barNumber+=1)
    for(var i=0; i<5; i++){
        yPosition = startY+(2*barLineSpacing)+(i*barLineSpacing);
        context.moveTo(startX+margin, Math.floor(yPosition+(barNumber*hypermeasureHeight))+(0.5));
        context.lineTo(endX-(2*margin), Math.floor(yPosition+(barNumber*hypermeasureHeight))+(0.5));
        context.stroke();
    }
}
function drawInstrumentPanel(){
    
}
function getScreenSizeData(){
    var canvasParent = document.getElementById('contents');
    var height = canvasParent.offsetHeight;
    var width = canvasParent.offsetWidth;
    if(height < (minHeight+margin)){
        height = minHeight+margin;
    }
    return {"x": width, "y":height};
}
function setCanvasSize(){
    var screenDimensions = getScreenSizeData();
    barLineSpacing = (0.012 * screenDimensions.x);
    hypermeasureHeight = Math.floor(margin+(2*barLineSpacing)+(5*barLineSpacing))+0.5;
    canvas.setAttribute("height", screenDimensions.y+margin);
    canvas.setAttribute("width", screenDimensions.x);
    console.log("canvas resized");
}
function setButtonLocation(){
    button.style.top = actionButtonStats.locationY+"px";
    button.style.left = actionButtonStats.locationX+"px";
    button.style.height = actionButtonStats.height+"px";
    button.style.width = actionButtonStats.width+"px";
    button.innerHTML = actionButtonStats.text;
    button.style.fontSize = actionButtonStats.height+"px";
    button.style.lineHeight = (actionButtonStats.height/(1.1))+"px";
}
function action(){
    console.log("clicked");
}