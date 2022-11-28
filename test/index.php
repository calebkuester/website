<script src='../assets/WebAudioFontPlayer.js'></script>
<script src='../assets/sound/0400_Aspirin_sf2_file.js'></script>
<style>
    .button1{
        width:100px;
        height:50px;
        background-color: #EEEEEE;
    }
    .button1:hover{
        background-color: #AAAAAA;
    }
    
</style>
<button class="button1" onmousedown="playPipe(pipe1);" onmouseup="stopPipe(pipe1);" onmouseout="stopPipe(pipe1);"/>
<button class="button1" onmousedown="playPipe(pipe2);" onmouseup="stopPipe(pipe2);" onmouseout="stopPipe(pipe2);"/>
<button class="button1" onmousedown="playPipe(pipe3);" onmouseup="stopPipe(pipe3);" onmouseout="stopPipe(pipe3);"/>
<button class="button1" onmousedown="playPipe(pipe4);" onmouseup="stopPipe(pipe4);" onmouseout="stopPipe(pipe4);"/>
<button class="button1" onmousedown="playPipe(pipe5);" onmouseup="stopPipe(pipe5);" onmouseout="stopPipe(pipe5);"/>
<button class="button1" onmousedown="playPipe(pipe6);" onmouseup="stopPipe(pipe6);" onmouseout="stopPipe(pipe6);"/>
<button class="button1" onmousedown="playPipe(pipe7);" onmouseup="stopPipe(pipe7);" onmouseout="stopPipe(pipe7);"/>
<button class="button1" onmousedown="playPipe(pipe8);" onmouseup="stopPipe(pipe8);" onmouseout="stopPipe(pipe8);"/>
<button class="button1" onmousedown="playPipe(pipe9);" onmouseup="stopPipe(pipe9);" onmouseout="stopPipe(pipe9);"/>
<button class="button1" onmousedown="playPipe(pipe10);" onmouseup="stopPipe(pipe10);" onmouseout="stopPipe(pipe10);"/>
<button class="button1" onmousedown="playPipe(pipe11);" onmouseup="stopPipe(pipe11);" onmouseout="stopPipe(pipe11);"/>
<button class="button1" onmousedown="playPipe(pipe12);" onmouseup="stopPipe(pipe12);" onmouseout="stopPipe(pipe12);"/>
<button class="button1" onmousedown="playPipe(pipe13);" onmouseup="stopPipe(pipe13);" onmouseout="stopPipe(pipe13);"/>
    
</div>

<script >
		var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
		var audioContext = new AudioContextFunc();
		var player=new WebAudioFontPlayer();
		player.loader.decodeAfterLoading(audioContext, '_tone_0400_Aspirin_sf2_file');
		var pipe1={key:4*12+0};
		var pipe2={key:4*12+2};
		var pipe3={key:4*12+4};
		var pipe4={key:4*12+5};
		var pipe5={key:4*12+7};
		var pipe6={key:4*12+9};
		var pipe7={key:4*12+11};
		var pipe8={key:5*12+0};
		var pipe9={key:5*12+2};
		var pipe10={key:5*12+4};
		var pipe11={key:5*12+5};
		var pipe12={key:5*12+7};
		var pipe13={key:5*12+9};
		function playPipe(pipe){
			stopPipe(pipe);
			pipe.envelope=player.queueWaveTable(audioContext, audioContext.destination, _tone_0400_Aspirin_sf2_file, -5, pipe.key, 999,true);
		}
		function stopPipe(pipe){
			if(pipe.envelope){
				pipe.envelope.cancel();
				pipe.envelope=null;
			}
		}
        for(var i=0;i<_tone_0400_Aspirin_sf2_file.zones.length;i++){
          _tone_0400_Aspirin_sf2_file.zones[i].ahdsr=false;
        }
/*
    window.frequencies = {};
    this.stop = true;
    this.frequency = 140;// la frecuencia
    this.waveform = "sine";// la forma de onda
    this.dur = .5;// la duraci贸n en segundos

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function setup(){
        var startingFrequency=16.35;
        var maxOctave = 8;
        var scalePosition = 0;
        for(var octaveNumber=0;octaveNumber<=maxOctave;i++){
            if(octaveNumber == 0){
                scalePosition = 2;
            }
        }
    }
    const context = new AudioContext()
    
    document.querySelector('button').addEventListener('click', () => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();

      
      this.oscillator = audioCtx.createOscillator();
      this.gain = audioCtx.createGain();
      this.oscillator.type = this.waveform;
      this.oscillator.frequency.value = this.frequency;  
      this.gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0);
      this.oscillator.connect(this.gain);
      this.gain.connect(audioCtx.destination);
      this.oscillator.start(audioCtx.currentTime);
      this.stop = false;
      this.oscillator.stop(audioCtx.currentTime + this.dur); 
      this.oscillator.onended = ()=>this.stop = true;
    })
    */
//function myFunction() {
    //oscillator.start();
    //onclick="myFunction()"
//}
// Using WebAudiApi frequencies
//https://codepen.io/enxaneta/pen/6a6b7c1091cc242b6210630cf11538f0

//const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

//const frequencies = [4186.01, 3951.07, 3729.31, 3520.00, 3322.44, 3135.96, 2959.96, 2793.83, 2637.02, 2489.02, 2349.32, 2217.46, 2093.00, 1975.53, 1864.66, 1760.00, 1661.22, 1567.98, 1479.98, 1396.91, 1318.51, 1244.51, 1174.66, 1108.73, 1046.50, 987.767, 932.328, 880.000, 830.609, 783.991, 739.989, 698.456, 659.255, 622.254, 587.330, 554.365, 523.251, 493.883, 466.164, 440.000, 415.305, 391.995, 369.994, 349.228, 329.628, 311.127, 293.665, 277.183, 261.626, 246.942, 233.082, 220.000, 207.652, 195.998, 184.997, 174.614, 164.814, 155.563, 146.832, 138.591, 130.813, 123.471, 116.541, 110.000, 103.826, 97.9989, 92.4986, 87.3071, 82.4069, 77.7817, 73.4162, 69.2957, 65.4064, 61.7354, 58.2705, 55.0000, 51.9130, 48.9995, 46.2493, 43.6536, 41.2035, 38.8909, 36.7081, 34.6479];
/*
const symbols = ['\u2669','\u266a',' \u266b','\u266c'];

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let cw = canvas.width = window.innerWidth,
  cx = cw / 2;
let ch = canvas.height = window.innerHeight,
  cy = ch / 2;

let w = cw/12;
let h = ch/6;

let requestId = null;
const rad = Math.PI / 180;

const rects = [];
const notes = [];
const particles = [];

class Rect{
  constructor(x,y,freq){
    this.w = w
    this.h = h;
    this.x = x;
    this.y = y;
    // audio
    this.stop = true;
    this.frequency = freq;// la frecuencia
    this.waveform = "triangle";// la forma de onda
    this.dur = .75;// la duraci贸n en segundos
    this.initialGain = .15;
  }
  
  
  
  update(cw,ch){
    this.w = cw/12;
    this.h = ch/6;
  }
  
  isPointInPath(m){
    let x = this.x*this.w;
    let y = this.y*this.h;
    ctx.beginPath();
    ctx.rect(x,y,this.w,this.h);
    if (ctx.isPointInPath(m.x, m.y) & this.stop){this.play()}
  }
}

for(let y = 0; y < 6; y++){
  for(let x = 0; x < 12; x++){
    let freq = frequencies[rects.length];
    let r = new Rect(x,y,freq);
    
    rects.push(r);
  }
}

class Particle{
  constructor(){
  this.r = 50 + Math.random()*100;
  this.x = this.r + Math.random() * (cw - this.r);
  this.y = Math.random() * ch;
  this.speed = .5 + Math.random()*2;
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.x, this.y,this.r,0,2*Math.PI);
    ctx.fillStyle = grd();
    ctx.fill();
  }
  update(){
    if(this.y < -this.r){
      this.y = ch + this.r;
      this.x = this.r + Math.random() * (cw - this.r);
    }
    this.y -= this.speed;
  }
}

for(let i = 0;i < 20; i++){
  let p = new Particle();
  particles.push(p)
}

class Note{
  constructor(m){
    this.text = symbols[~~(Math.random()*symbols.length)];
    this.x = m.x;
    this.y = m.y;
    this.fontSize = 10+ ~~(Math.random()*40);
    this.alp = 1;
    this.speed = Math.random() +.5;
    this.frames = Math.random()*360;
    this.angle = Math.sin(frames*rad) * Math.PI/2;
  }
  
  draw(){
    ctx.save(); 
    ctx.translate(this.x,this.y); 
    ctx.rotate(this.angle);
    ctx.font = this.fontSize+"px Verdana";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillStyle = `rgba(0, 0, 0, ${this.alp})`;
    ctx.fillText(this.text,0,0);
    ctx.restore();
  }
  
  update(){
    this.frames ++;
    this.fontSize +=.1;
    this.alp -=.01;
    this.angle = Math.sin(this.frames*rad) * Math.PI/2;
    this.y -= this.speed;
    this.x += Math.sin(this.frames*rad);   
  }
}

function Draw() {
requestId = window.requestAnimationFrame(Draw);
ctx.clearRect(0,0,cw,ch);

particles.map((p) => {
    p.update();
    p.draw();
}); 
notes.map((n,index) => {
     n.update();
     n.draw();
     if(n.alp <=0){notes.splice(index, 1);}
   });

}


function Init() {
  if (requestId) {
    window.cancelAnimationFrame(requestId);
    requestId = null;
}


cw = canvas.width = window.innerWidth,w = cw/12;
ch = canvas.height = window.innerHeight,h = ch/6;
rects.map((r) => r.update(cw,ch));
particles.map((p) => p.update());
Draw();
};

setTimeout(function() {
    Init();
    window.addEventListener('resize', Init, false);
}, 15);

canvas.addEventListener("mousemove",function(evt){
  let m = oMousePos(canvas, evt);
  rects.map((r) => r.isPointInPath(m));//sound
  
  if(Math.random() < .4){//notes
  let note = new Note(m);
  notes.push(note);}
});

function grd(){
  let grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
  grd.addColorStop(0,"#ff8701");
  grd.addColorStop(1,"#ffac02");
  return grd;
}


function oMousePos(canvas, evt) {
  var ClientRect = canvas.getBoundingClientRect();
  return { //objeto
    x: Math.round(evt.clientX - ClientRect.left),
    y: Math.round(evt.clientY - ClientRect.top)
  }
}// JavaScript Document*/
</script>