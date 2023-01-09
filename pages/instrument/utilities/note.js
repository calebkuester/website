const noteImage = null;
var previousNote = null;
var nextNote = null;
var fequency = null;
var ms = 0;
var duration = 1/2 //half, quarter, eighth, sixteenth, full, etc.
var isHollow = false;
var position = null;
var scale = null;
/*
      -       = 6 a down
              = 5 g down
------------- = 4 f down
              = 3 e down
------------- = 2 d down
              = 1 c down
------------- = 0 b down
              = -1 a up
------------- = -2 g up
              = -3 f up
------------- = -4 e up
              = -5 d up
      -       = -6 c up
*/

function getPreviousNote() {
    return previousNote;
}
function getNextNote() {
    return nextNote;
}
function getFrequency() {
    return fequency;
}
function getTiming() {
    return timing;
}
function setPreviousNote() {
}
function setNextNote() {
}
function setFrequency() {
}
function setTiming() {
}