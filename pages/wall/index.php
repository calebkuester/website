<style>
#container, body {
  margin:0;
  height:100%;
  width:100%;
  position:relative;
}
#saveButton {
  text-align: center;
  z-index:3;
  background-color:blue;
  right:0px;
  height:50px;
  width:200px;
  position:absolute;
}
#toolPaletteContainer {
  height:30%;
  width:200px;
  z-index:3;
  left:0px;
  position:absolute;
}
#goAwayButton {
  background-color:#808080;
  height:20px;
  width:100%;
  text-align: center;
}
#canvas {
  z-index:1;
}
#controlPanel {
  height:100%;
  width:100%;
  background-color:#f0f0f0;
}
#controlPanel:hover {
  opacity:0.5;
}
#topRight {
  visibility: hidden;
  z-index:2;
  border-top: 5px solid red;
  border-right: 5px solid red;
  position: absolute;
  width: 10px;
  height: 10px;
}
#topLeft {
  visibility: hidden;
  z-index:2;
  border-top: 5px solid red;
  border-left: 5px solid red;
  position: absolute;
  width: 10px;
  height: 10px;
}
#bottomRight {
  visibility: hidden;
  z-index:2;
  border-bottom: 5px solid red;
  border-right: 5px solid red;
  position: absolute;
  width: 10px;
  height: 10px;
}
#bottomLeft {
  visibility: hidden;
  z-index:2;
  border-bottom: 5px solid red;
  border-left: 5px solid red;
  position: absolute;
  width: 10px;
  height: 10px;
}
</style>
<script>
var textDataApproved = {};
var textDataUnapproved = {};
var isMouseDown = false;
var canvas = null;
var context = null;
var lastPosition = null;
var topOfDrawing=0;
var bottomOfDrawing=0;
var rightSideOfDrawing=0;
var leftSideOfDrawing=0;
var topRightDiv;
var topLeftDiv;
var bottomRightDiv;
var bottomLeftDiv;
document.onmousedown = function() {isMouseDown = true};
document.onmouseup   = function() {
  isMouseDown = false
  lastPosition=null;
};
document.onmousemove = function() {
  if(isMouseDown){
    draw();
  }
};
function loadPage(){
  canvas = document.getElementById("canvas");
  textDataApproved = loadDataFromApprovedFile(renderData);
  resizeCanvas();
  topRightDiv=document.getElementById("topRight");
  topLeftDiv=document.getElementById("topLeft");
  bottomRightDiv=document.getElementById("bottomRight");
  bottomLeftDiv=document.getElementById("bottomLeft");
}
function renderData(data){
  console.log(data);
  context = canvas.getContext("2d");
}
function loadDataFromApprovedFile(callback){
  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", "data.txt", true);
  rawFile.onreadystatechange = function() {
    if (rawFile.readyState === 4) {
      callback(rawFile.responseText);
    }
  }
  rawFile.send();
}
function resizeCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
function draw(){
    //console.log(leftSideOfDrawing+' '+rightSideOfDrawing+' '+topOfDrawing+' '+bottomOfDrawing);
  if(leftSideOfDrawing===0&&rightSideOfDrawing===0&&topOfDrawing===0&&bottomOfDrawing===0){
    leftSideOfDrawing=event.clientX;
    rightSideOfDrawing=event.clientX;
    topOfDrawing=event.clientY;
    bottomOfDrawing=event.clientY;
    console.log(leftSideOfDrawing+' '+rightSideOfDrawing+' '+topOfDrawing+' '+bottomOfDrawing);
    topLeftDiv.style.left = leftSideOfDrawing+"px";
    topLeftDiv.style.top = topOfDrawing+"px";
    topLeftDiv.style.visibility = "";
    topRightDiv.style.left = rightSideOfDrawing+"px";
    topRightDiv.style.top = topOfDrawing+"px";
    topRightDiv.style.visibility = "";
    bottomLeftDiv.style.left = leftSideOfDrawing+"px";
    bottomLeftDiv.style.top = bottomOfDrawing+"px";
    bottomLeftDiv.style.visibility = "";
    bottomRightDiv.style.left = rightSideOfDrawing+"px";
    bottomRightDiv.style.top = bottomOfDrawing+"px";
    bottomRightDiv.style.visibility = "";
  }
  
  if(lastPosition===null){
    //context.fillRect(event.clientX,event.clientY,1,1);
  }else{
    context.moveTo(lastPosition.x, lastPosition.y);
    context.lineTo(event.clientX, event.clientY);
    context.stroke();
  }
  lastPosition = {x:event.clientX,y:event.clientY};
  drawImageBoundaries(event.clientX, event.clientY);
}
function drawImageBoundaries(x, y){
  if(x<leftSideOfDrawing){
    leftSideOfDrawing=x;
    topLeftDiv.style.left = x+"px";
    bottomLeftDiv.style.left = x+"px";
  }
  if(x>rightSideOfDrawing){
    rightSideOfDrawing=x;
    topRightDiv.style.left = (x-10)+"px";
    bottomRightDiv.style.left = (x-10)+"px";
  }
  if(y<topOfDrawing){
    topOfDrawing=y;
    topLeftDiv.style.top = y+"px";
    topRightDiv.style.top = y+"px";
  }
  if(y>bottomOfDrawing){
    bottomOfDrawing=y;
    bottomLeftDiv.style.top = (y-10)+"px";
    bottomRightDiv.style.top = (y-10)+"px";
  }
}
function save(){
  console.log("save clicked");
}
function controlPanelClicked(){
  console.log("tool pallette clicked");
}
function minimizeToolPallette(){
  console.log("go away clicked");
}
</script>
<head><meta http-equiv="Content-Type" content="text/html; charset=ibm866">
  <link rel="shortcut icon" href="#"/>
</head>
<body onload="loadPage()">
  <div id="container">
    <div id="topRight"></div>
    <div id="topLeft"></div>
    <div id="bottomRight"></div>
    <div id="bottomLeft"></div>
    <div id="saveButton" onclick="save()">
      Save
    </div>
    <div id="toolPaletteContainer">
      <div id="controlPanel" onclick="controlPanelClicked()"></div>
      <div id="goAwayButton" onclick="minimizeToolPallette()">
        Minimize&nbsp;△
      </div>
    </div>
    <canvas id="canvas" width="100%" height="100%">
      Your browser does not support the 21st century. Please download more ram and gigabytes.
    </canvas>
  </div>
</body>