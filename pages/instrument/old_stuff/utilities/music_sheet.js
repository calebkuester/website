<script type="text/javascript">
	var stringPlacementFromX=0;
	var stringPlacementFromY=0;
	var stringPlacementToX=0;
	var stringPlacementToY=0;
	var musicSheetFromX=0;
	var musicSheetFromY=0;
	var musicSheetToX=0;
	var musicSheetToY=0;
	var buffer = 50;

	function loadSheet(){
		console.log('here: loadSheet()');
		
	}

		
		
	function initialize(){
		var canvas = document.getElementById('musicSheet');
		
		var stringPlacementFromX=0;
		var stringPlacementFromY=0;
		var stringPlacementToX=(canvas.width/3);
		var stringPlacementToY=(canvas.height);
		var musicSheetFromX=0;
		var musicSheetFromY=0;
		var musicSheetToX=0;
		var musicSheetToY=0;
		
		var ctx = canvas.getContext('2d');
		/*fill area for instrument panel*/
		ctx.fillStyle = '#CCCCFF';
		ctx.fillRect(0, 0, canvas.width/3, canvas.height);
	
		/*fill area for realtime music sheet*/
		ctx.fillStyle = "#DDDDDD";
		ctx.fillRect(canvas.width/3, 0, canvas.width*(2/3), canvas.height);
		
		console.log('assets');
		var note = <?php echo loadAssetFiles();?>;
		
		//parse song()
		//plot NotePanel()
		//draw violin with buttons
		//start music()
		/**************************Test Draw-All-Items Section****************************/
		//var image = new Image();
		//image.load(note);
		console.log('?');
		/*
		if(note!=null){
			console.log(note);
		}else{
			console.log('asset was not loaded');
			return;
		}
		var data = encodeURIComponent(note);
		var img = new Image();
	
		img.onload = function() {
			for(var i=0;i<20; i++){
				ctx.drawImage(img, i*20, 0);
				canvas.toBlob(function(blob) {
	     				var newImg = document.getElementById('musicSheet'),
		     			url = URL.createObjectURL(blob);
		     			newImg.onload = function() {     				
		     				URL.revokeObjectURL(url);
		   			};
		   			newImg.src = url;
		   			document.body.appendChild(newImg);
		 		});
			}
			ctx.drawImage(img, 100, 0);
			canvas.toBlob(function(blob) {
     				var newImg = document.getElementById('musicSheet'),
	     			url = URL.createObjectURL(blob);
	     			newImg.onload = function() {     				
	     				URL.revokeObjectURL(url);
	   			};
	   			newImg.src = url;
	   			document.body.appendChild(newImg);
	 		});
		}
		
		img.src = "data:image/svg+xml," +data;
		*/
		/**************************Test Draw-All-Items Section****************************/


	}
	function sheetLoaded(){
		var canvas = document.getElementById('musicSheet');
		var context = canvas.getContext('2d');
		window.addEventListener('resize', resizeCanvas, false);
		function resizeCanvas() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			initialize(); 
    	}
    	resizeCanvas();
	}

</script>