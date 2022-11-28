<div id="instrumentPanel">
	<script type='text/javascript' src='../instrument/utilities/functions.js'></script>
	<div id="menuFrame">
		<div class="container-fluid">
			<div class="container">
				<div class="row justify-content-start">
					<div class="col-2">
						Instrument
					</div>
					<div class="col-2">
						<div class="dropdown" id="instrument-list-id">
							<button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="instrumentMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								Select Instrument
							</button>
							<div class="dropdown-menu" id="instrumentOptions" aria-labelledby="dropdownMenuButton">
								<?php include(getcwd()."/utilities/instruments/instrumentList.php"); ?>
							</div>
						</div>
					</div>
				</div>
				<div class="row justify-content-start">
					<div class="col-2">
						Play
					</div>
					<div class="col-2">
						<div class="dropdown" id="play-mode-id">
							<button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="musicTypeMenu" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								Select Mode
							</button>
							<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
								<a class="dropdown-item" href="#">Song</a>
								<a class="dropdown-item" href="#">Demo</a>
								<a class="dropdown-item" href="#">Custom Song</a>
								<a class="dropdown-item" href="#">Scales</a>
							</div>
						</div>
					</div>
					<div id="getSongFromText" class="col-2 hide">
						From
					</div>
					<div id="getSongFromDropdown" class="col-2 hide">
						Dropdown
					</div>
					<div id="localSongListText" class="col-2 hide">
						List
					</div>
					<div id="localSongListDropdown" class="col-2 hide">
						Dropdown
					</div>
					<div id="getMyOwnSongText" class="col-2 hide">
						Upload
					</div>
					<div id="getMyOwnSongDropdown" class="col-2 hide">
						Upload Select
					</div>
				</div>
				<div class="row justify-content-start">
					<div class="col-2">
						Scale
					</div>
					<div class="col-2">
						<div class="dropdown" id="clef-id">
							<button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="scaleDropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
								Select Clef
							</button>
							<div class="dropdown-menu" aria-labelledby="dropdownMenuButton">
								<a class="dropdown-item" href="#">G-Clef</a>
								<a class="dropdown-item" href="#">C-Clef</a>
								<a class="dropdown-item" href="#">F-Clef</a>
								<a class="dropdown-item" href="#">Octave-Clef</a>
							</div>
						</div>
					</div>
				</div>
				<button type="button" class="btn btn-secondary" onclick="forwardToMusicSheet()" >Submit</button>
			</div>
		</div>
	</div>
</div>