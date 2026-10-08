var shortInfoSubCategory = {0:{name:"Interesting Factoids",location:"../text-data/me/short-info/email.txt"},1:{name:"Lineage",location:"../text-data/me/short-info/lineage.txt"}};
var goalsSubCategory = {0:{name:"Ireland",location:"Goals/Ireland.txt"},1:{name:"Great Barrier Reef",location:"Goals/Great-barrier-reef.txt"},2:{name:"C/C++",location:"Goals/C-cplusplus.txt"},3:{name:"Network",location:"Goals/Network.txt"}};
var personalitySubCategory = {0:{name:"Myers-Briggs Info",location:null},1:{name:"INTP",location:null}};
var salesforceSubcategory = {
    0:{name:"MSU",location:null},
    1:{name:"Westfield",location:null},
    2:{name:"Ameriprise",location:null},
    3:{name:"Google",location:null}};
var meCategory = {
    0:{text:"Name",options:null,location:"../text-data/me/name.txt"},
    1:{text:"Short Info",options:shortInfoSubCategory,location:null},
    2:{text:"History",options:null,location:"../text-data/me/history.txt"}, 
    3:{text:"Goals",options:goalsSubCategory,location:null}, 
    4:{text:"Personality",options:personalitySubCategory,location:null}
};
var projectsCategory = {
    0:{text:"Salesforce",options:salesforceSubcategory,location:null},
    1:{text:"Whale",options:null,location:null},
    2:{text:"Present",options:null,location:null},
    3:{text:"This Website",options:null,location:null},
    4:{text:"Pop-up Target",options:null,location:null},
    5:{text:"Violin",options:null,location:"/text-data/projects/Violin.txt"},
    6:{text:"Time Management App",options:null,location:null},
    7:{text:"Debate Website",options:null,location:null}
};
var resumeCategory = {
    0:{text:"Resume Details",options:null,location:"../text-data/resume/index.php"}
};
var educationCategory = {
    0:{text:"High School",options:null,location:null},
    1:{text:"Community College",options:null,location:null},
    2:{text:"University",options:null,location:null}
};
var listOfFeatureOptions = {//master list
    0:{'Me':meCategory,location:"../text-data/root-menu/me.txt"},
    1:{'Projects':projectsCategory,location:"../text-data/root-menu/projects.txt"},
    2:{'Resume':resumeCategory,location:"../text-data/root-menu/resume.txt"},
    3:{'Education':educationCategory,location:"../text-data/root-menu/education.txt"}
};
var loadedOnce = false;
var infoSquareDivId = "infoSquare";
var mainImageAspectRatio = 3.05;//should be three width per one height
var arrowClickedColor="#000000";
var arrowUnclickedColor="#FFFFFF";
var listOfFeatureXPositions = [];
var quantityOfPositions = 0;
var sizeOfCurrentFeature = 40;
var sizeOfArrow = 50;
var sizeOfOtherFeature = 15;
var featureIndex=0;//cycles from 0 to listOfFeatureOptions.length and back
var startFeaturePosition = 0;
var cntrlPanlId="control-panel";
var dotURL="../assets/brown-button.svg";
var svgNamespace = "http://www.w3.org/2000/svg";
var currentInfoXPosition = 0;//to store the x-value of location of the info div
var currentInfoYPosition = 0;//to store the y-value of location of the info div
var currentInfoWidth=0;//to store the current width of the info div
var currentInfoBoxWidth=0; //for snapshotting its current size before increase;
var currentTime = new Date().getTime();
var centerLocation = {};
var infoSquareTopOffset=0;
var infoSquareMinimizedHeight = 0;
var infoSquareMinimizedWidth = 0;
var infoSquareTakeOverWidth = 0;
var infoSquareTakeOverHeight = 0;
var infoSquareTakeOver = false;
var actionTimeout = 500;//must be unified or stuff doesn't always load
var topOrBottomBuffer = 4;
var swapperPosition = 0;

$(window).resize(function(){
  $("#"+cntrlPanlId).empty();
  setMainImageSize();
  if((new Date().getTime()-currentTime)>actionTimeout-1){
    this.currentTime=new Date().getTime();
    setTimeout(init, actionTimeout);
  }
});

function setMainImageSize(){
  var mainImagePane = $("#pictureSquare");
  var width = mainImagePane.width();
  var height = mainImagePane.height();
  var newHeight = height;
  newHeight=(width/mainImageAspectRatio);
  mainImagePane.height(newHeight);
  setCenterPaneStatsAfterImageAdjustment();
}

function setCenterPaneStatsAfterImageAdjustment(){
  var location;
  this.centerLocation = getCenterPositionForBallForCurrentFeature();
  this.infoSquareTopOffset = $("#pictureSquare").height()+$("#controlsSquare").height()+topOrBottomBuffer+14;//+14 padding
  this.infoSquareMinimizedHeight = ($(window).height()-infoSquareTopOffset - topOrBottomBuffer);
  this.infoSquareMinimizedWidth = "100%";
  this.infoSquareTakeOverWidth = ($(window).width() * 0.8);
  this.infoSquareTakeOverHeight = ($(window).height() - (2 * (topOrBottomBuffer)));
  this.currentInfoYPosition = infoSquareTopOffset;
  if(!loadedOnce){
    location = listOfFeatureOptions[featureIndex].location;
    loadInfoContentIntoDiv("info-"+swapperPosition, location);
    loadImageToDiv("../assets/me2LowRes2.jpg", "lowResPicture", function (){
      loadImageToDiv("../assets/me2.jpg", "loadedPicture", "lowResPicture", null);
    }());
    loadedOnce=true;
  }
}

function init(){
  var infoSquare = $("#"+infoSquareDivId);
  this.quantityOfPositions = (2*(Object.keys(listOfFeatureOptions).length))-1;
  this.currentInfoXPosition = infoSquare.offset().left;
  this.infoSquareTakeOverHeight = ($(window).height() - 2 * (topOrBottomBuffer));
  getAllFeaturePositions(listOfFeatureXPositions);
  changeFeaturesNavText();
  setMainImageSize();
  addControlPanel();
  resizeAndMoveInfoSquare(infoSquare);
}

function resizeAndMoveInfoSquare(infoSquare){
  if(!this.infoSquareTakeOver){
    infoSquare.height(this.infoSquareMinimizedHeight);
    infoSquare.css({top: this.currentInfoYPosition});
  }else{
    $("#go-away-box").css("margin-left", (infoSquareTakeOverWidth-45-10));
    infoSquare.width(this.infoSquareTakeOverWidth);
    infoSquare.height(this.infoSquareTakeOverHeight);
  }
}

function addControlPanel(){
  addFeatureOptionIndicators();
  addControls();
}

function addFeatureOptionIndicators(){
  var controlPanel = document.getElementById(cntrlPanlId);
  for(var currentIndex in listOfFeatureOptions){
    if(parseInt(currentIndex)===featureIndex){
      createBallImageDiv(
          this.sizeOfCurrentFeature, 
          this.sizeOfCurrentFeature, 
          controlPanel, 
          parseInt(currentIndex), 
          this.listOfFeatureXPositions[parseInt(currentIndex)+startFeaturePosition-featureIndex], 
          this.centerLocation.y, 
          "current-feature");
    }else{
      createBallImageDiv(
          this.sizeOfCurrentFeature, 
          this.sizeOfCurrentFeature, 
          controlPanel, 
          parseInt(currentIndex), 
          this.listOfFeatureXPositions[parseInt(currentIndex)+startFeaturePosition-featureIndex], 
          this.centerLocation.y, 
          "not-current-feature");
    }
  }
}

function addControls(){
  var leftButtonStyles = "navigate-button";
  var rightButtonStyles = "navigate-button";
  addImageDiv(
      this.sizeOfArrow, 
      this.sizeOfArrow, 
      this.cntrlPanlId, 
      "left-arrow", 
      this.listOfFeatureXPositions[0]-(sizeOfOtherFeature*2)-(sizeOfArrow/2), /*to the left of the left-most bubble position*/
      this.centerLocation.y-(sizeOfArrow/2), 
      leftButtonStyles, 
      "clickNavigateFeatures(-1)",
      arrowUnclickedColor);
  addImageDiv(sizeOfArrow, 
      sizeOfArrow, 
      cntrlPanlId, 
      "right-arrow", 
      this.listOfFeatureXPositions[listOfFeatureXPositions.length-1]+(sizeOfOtherFeature*2), /*to the right of the right-most bubble position*/
      this.centerLocation.y-(sizeOfArrow/2), 
      rightButtonStyles, 
      "clickNavigateFeatures(1)",
      arrowUnclickedColor);
  addImageDiv(this.sizeOfArrow+20, 200, this.cntrlPanlId, "previousPlaque", this.listOfFeatureXPositions[0]-(sizeOfOtherFeature*2)-(sizeOfArrow/2)-(200), this.centerLocation.y-(sizeOfArrow/2)-10, "previousAndNextPlaque", "");
  addImageDiv(this.sizeOfArrow+20, 200, this.cntrlPanlId, "nextPlaque", this.listOfFeatureXPositions[listOfFeatureXPositions.length-1]+(sizeOfOtherFeature*2)+sizeOfArrow, this.centerLocation.y-(sizeOfArrow/2)-10, "previousAndNextPlaque", "");
  changePreviousNextDivText();
  retrieveSVGForDiv("../assets/rightArrow.svg", "right-arrow");
  retrieveSVGForDiv("../assets/leftArrow.svg", "left-arrow");
}

function getCurrentPositionPlusOffset(amount){
  var tempIndex = featureIndex;
  if(amount < 0 && featureIndex === 0){
    tempIndex = quantityOfPositions+1;
  }
  return ((tempIndex+amount)%(Object.keys(listOfFeatureOptions).length));
}

function addMouseDownFunction(Id, functionToTriggerOnClick){
  var element = $("#"+Id);
  element.mousedown(function(){
    element.css("fill", arrowClickedColor);
  });
  element.mouseup(function(){
    element.css("fill", arrowUnclickedColor);
  });
}

function retrieveSVGForDiv(fileName, Id){
  $.get(fileName, function(data, status){
    $("#"+Id).append(data.documentElement);
  });
}

function addImageDiv(height, width, parent, Id, locX, locY, styleClass, onclick, defaultColor){
  var newDiv = document.createElement("div");
  newDiv.setAttribute("id", Id);
  newDiv.setAttribute("onclick", onclick);
  $("#"+parent).append(newDiv);
  $("#"+Id).addClass(styleClass);
  $("#"+Id).css({"position":"absolute","left":locX,"top":locY,"fill":defaultColor, "height":height, "width":width});
  if(onclick!=null){
    addMouseDownFunction(Id, onclick);
  }
}

function createBallImageDiv(height, width, parent, id, x, y, ballType){
  var newDiv = document.createElement("div");
  $(newDiv).addClass('feature-ball '+ballType);
  newDiv.setAttribute("id", "feature-indicator-"+id);
  newDiv.setAttribute("style", "position:absolute;left:"+x+"px;top:"+(y-(height/2)-2)+"px;");
  parent.appendChild(newDiv);
}

function getAllFeaturePositions(){
  var centerLocation = getCenterPositionForBallForCurrentFeature();
  var actualIndex = -Math.floor(quantityOfPositions/2);
  startFeaturePosition = -actualIndex;
  var minusOffset = actualIndex*(25)*2;
  for(var i=0; i<this.quantityOfPositions; i++){
    if(actualIndex>0){
      listOfFeatureXPositions[i]=centerLocation.x+15+(actualIndex*25)-(sizeOfCurrentFeature/2);
    }else{
      listOfFeatureXPositions[i]=centerLocation.x+(actualIndex*25)-(sizeOfCurrentFeature/2);
    }
    actualIndex++;
  }
}

function getCenterPositionForBallForCurrentFeature(){
    //var bigBallSize = getSizeOfElement('current-feature');
    var locationOfControlPanel = getPositionOfElement(cntrlPanlId);
    var sizeOfControlPanel = getSizeOfElement(cntrlPanlId);
    var xPos = getPositionOfElement(cntrlPanlId).x+
    (getSizeOfElement(cntrlPanlId).x/2);
    var yPos = getPositionOfElement(cntrlPanlId).y+
    (getSizeOfElement(cntrlPanlId).y/2);
    return {x: xPos,y: yPos};
}

function getPositionOfElement(id) {
    var element = document.getElementById(id);
    return {x: element.offsetLeft,y: element.offsetTop};
}

function getSizeOfElement(id) {
    var element = document.getElementById(id);
    return {x: element.offsetWidth,y: element.offsetHeight};
}

function clickNavigateFeatures(leftOrRight){
  var controlPanel = document.getElementById(cntrlPanlId);
  var divs=$(controlPanel).children();
  var i=0;
  var location;
  featureIndex=getCurrentPositionPlusOffset(leftOrRight);
  this.swapperPosition = (featureIndex)%2;
  location = listOfFeatureOptions[featureIndex].location;
  for(var divIndex in divs){
    //only check for each individual div
    if((typeof divs[divIndex])==='object' 
        && $(divs[divIndex]).hasClass("feature-ball")){
      if(i===featureIndex){
        $(divs[divIndex]).removeClass("not-current-feature");
        $(divs[divIndex]).addClass("current-feature");
      }else if($(divs[divIndex]).hasClass("feature-ball")){
         $(divs[divIndex]).removeClass("current-feature");
         $(divs[divIndex]).addClass("not-current-feature");
      }
      //animate({csv args}, #ms, callback)
      $(divs[divIndex]).animate({left: listOfFeatureXPositions[(i + startFeaturePosition - featureIndex)]}, 100, null);
      i++;
    }else if((typeof divs[divIndex])==='object' 
        && $(divs[divIndex]).hasClass("navigate-button")){
    }
  }
  changeFeaturesNavText(true);
  swapInfoDivs();
  loadInfoContentIntoDiv("info-"+swapperPosition, location);
}

function spinDiv(divId, degrees, distance, duration, callback){
  var div = $(divId);
  $({deg: 0}).animate({deg: -360}, {
      duration:duration,
      step:function(now) {
        div.css({
          transform:'rotate('+now+'deg)'
        });
      }
  }, callback);
}

function swapInfoDivs(){
  var nextDivId="#info-"+swapperPosition;
  var currentDivId="#info-"+((swapperPosition+1)%2);
  var currentDiv = $(currentDivId);
  var nextDiv = $(nextDivId);
  var duration = 200;
  var moveLocationY = 500;
  var moveLocationX = ($( window ).width()+currentDiv.width())/2;
  nextDiv.css({left:moveLocationX, top:-moveLocationY});
  $("#info-"+swapperPosition).removeClass("hidden");
  spinDiv(
      currentDivId,
      360,
      moveLocationX/2,
      duration,
      null);
  currentDiv.animate({left:"-"+moveLocationX, top:-moveLocationY}, duration, function(){
      $("#info-"+((swapperPosition+1)%2)).addClass("hidden");
  });
  spinDiv(
      nextDivId,
      360,
      moveLocationX/2,
      duration,
      null);
  nextDiv.animate({left:0, top:0}, duration, null);
}

var navItemTime = 170;//ms for one nav item to shrink to nothing, or to grow back
var navItemStagger = 45;//ms between one item starting to move and the next
var navChangeCount = 0;//counts changes, so a newer change cancels one still in progress

//Shows the current feature in the right-side nav. With animate, the old items
//shrink to nothing one after another, the list is refilled, the new items grow
//back to full size and the title lights up, so it is plain that the nav changed.
function changeFeaturesNavText(animate){
  var list = $("#featureDropdownList");
  var oldItems = list.children(".nav-option");
  var thisChange = ++navChangeCount;
  oldItems.stop(true, true);
  if(!animate || oldItems.length===0){
    fillFeaturesNav();
    return;
  }
  oldItems.css("overflow", "hidden");
  oldItems.each(function(index){
    $(this).delay(index*navItemStagger).animate({height:0, opacity:0}, navItemTime);
  });
  setTimeout(function(){
    if(thisChange!==navChangeCount){
      return;//the arrows were pressed again; that change will fill the nav
    }
    fillFeaturesNav();
    shineFeaturesNavTitle();
    list.children(".nav-option").each(function(index){
      var item = $(this);
      var fullHeight = item.height();
      item.css({height:0, opacity:0, overflow:"hidden"});
      item.delay(index*navItemStagger).animate({height:fullHeight, opacity:1}, navItemTime, function(){
        //back to its natural size, so its submenu can still open
        item.css({height:"", opacity:"", overflow:""});
      });
    });
  }, navItemTime+((oldItems.length-1)*navItemStagger));
}

function fillFeaturesNav(){
  var list = $("#featureDropdownList");
  list.children(".nav-option").remove();
  if($("#featuresNavTitle").length===0){
    list.prepend("<p id='featuresNavTitle' class='nav-title'></p>");
  }
  $("#featuresNavTitle").text(Object.keys(listOfFeatureOptions[featureIndex])[0]);
  changeFeaturesNavOptions();
}

//turns the title bright gold with a light passing across it, then back to normal
function shineFeaturesNavTitle(){
  var title = $("#featuresNavTitle");
  title.removeClass("nav-title-shine");
  void title[0].offsetWidth;//lets the animation start again if it was already running
  title.addClass("nav-title-shine");
}
function changeFeaturesNavOptions(){
  var i=0;
  var divString = "";
  var optionsLength = 0;
  var options = 0;
  var currentOption = Object.keys(listOfFeatureOptions[featureIndex]);
  var listOfAllOptions = listOfFeatureOptions[featureIndex][Object.keys(listOfFeatureOptions[featureIndex])[0]];
  var locationOfArticle = "";
  for(var key in listOfAllOptions){
    var menuInfo = listOfAllOptions[key];
    if(menuInfo.options!=null){
      divString = "<li class='nav-option'><a href='#featuresSubmenu"+i+"' data-toggle='collapse' aria-expanded='false' class='dropdown-toggle'>"+menuInfo.text+"</a><ul class='collapse list-unstyled' id='featuresSubmenu"+i+"'>";
      optionsLength = Object.keys(menuInfo.options).length;
      options = menuInfo.options;
      for(var j=0;j<optionsLength;j++){
        if(options[j].location!=null){
          locationOfArticle = "id='"+options[j].location+"' onclick='pushUpInfoBox(this)'";
        }else{
          locationOfArticle='';
        }
        divString+="<li "+locationOfArticle+"><a href='javascript:void(0)'>"+options[j].name+"</a></li>";
      }
    }else{
      if(menuInfo.location!=null){
        locationOfArticle="id='"+menuInfo.location+"' onclick='pushUpInfoBox(this)'";
      }else{
        locationOfArticle='';
      }
      divString = "<li class='nav-option'"+locationOfArticle+"><a href='javascript:void(0)'>"+menuInfo.text+"</a><ul class='collapse list-unstyled' id='featuresSubmenu"+i+"'>";
    }
    divString += "</ul></li>";
    $("#featureDropdownList").append(divString);
    i++;
  }
  changePreviousNextDivText();
}

function changePreviousNextDivText(){
  var previousDiv = $("#previousPlaque");
  var nextDiv = $("#nextPlaque");
  previousDiv.html("<p>"+Object.keys(listOfFeatureOptions[getCurrentPositionPlusOffset(-1)])[0]+"</p>");
  nextDiv.html("<p>"+Object.keys(listOfFeatureOptions[getCurrentPositionPlusOffset(+1)])[0]+"</p>");
}

function pushUpInfoBox(input){
  this.infoSquareTakeOver = true;
  var moveBox = ($(window).width()/2)*0.1357;//fix to center TODO
  $("#go-away-box").css("margin-left", (infoSquareTakeOverWidth-45-10));
  loadInfoContentIntoDiv("info-"+this.swapperPosition, "blankpage.html");
  $("#"+infoSquareDivId).animate({top:5, left:-moveBox, width:infoSquareTakeOverWidth}, 100, function(){
    $("#"+infoSquareDivId).removeClass("info-benign");
    $("#"+infoSquareDivId).addClass("take-over");
    $("#"+infoSquareDivId).height(infoSquareTakeOverHeight);
    setTimeout(function(){
      $("#go-away-box").removeClass('hidden');
      loadInfoContentIntoDiv("info-"+this.swapperPosition, input.id);
    }, 300);
    
  });
}
function minimizeInfo(){
  this.infoSquareTakeOver = false;
  $("#"+infoSquareDivId).addClass("info-benign");
  $("#"+infoSquareDivId).removeClass("take-over");
  $("#"+infoSquareDivId).height(this.infoSquareMinimizedHeight);
  $("#"+infoSquareDivId).css({top:this.currentInfoYPosition, left: 0});
  $("#"+infoSquareDivId).width(this.infoSquareMinimizedWidth);
  $("#go-away-box").addClass('hidden');
  var location = listOfFeatureOptions[featureIndex].location;
  loadInfoContentIntoDiv("info-"+swapperPosition, location);
}

function loadInfoContentIntoDiv(divId, location){
  $("#"+divId).empty();
  if(location===null){
    return;
  }
  $.get(location, function(data, status){
    $("#"+divId).append(data);
  });
}

function loadImageToDiv(url, imageIdToChange, fadeOutDiv, callback){
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      $("#"+imageIdToChange).attr('src', reader.result);
      if(fadeOutDiv!==null){
        $("#"+fadeOutDiv).animate({opacity:0}, 200, null);
      }
      callback;
    };
    reader.readAsDataURL(xhr.response);
  };
  xhr.open("GET", url);
  xhr.responseType = "blob";
  xhr.send();
}











