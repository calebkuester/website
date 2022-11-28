<?php
	$myfile = fopen(getcwd()."/utilities/instruments/instruments.txt", "r") or die("Unable to open file: ".getcwd()."/instruments.txt");

	$instrumentCSV = fread($myfile,filesize(getcwd()."/utilities/instruments/instruments.txt"));
	//echo $instrumentCSV;
	$instrumentList = explode(", ", $instrumentCSV);
	for ($i = 0; $i < count($instrumentList); $i++) {
    		echo "<a class='dropdown-item' href='#'>$instrumentList[$i]</a>";
		
	}
?>