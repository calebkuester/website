<?php

static $directory = "/home/dkaqsw06un33/public_html/utilities/image_assets";
static $assets = array();

function getFileCount(){
//utilities/image_assets/

	
	$files1 = scandir("/home/dkaqsw06un33/public_html/utilities/image_assets", 1);

	for ($i = 0; $i < count($files1); $i++) {
		if(count(preg_split("/\./", $files1[$i]))>1 && preg_split("/\./", $files1[$i])[1]=='svg'){
			$retString = $retString . "$files1[$i]" . ' ';
		}
	}			

	return $retString;

	//return $files1[0];

	//return preg_split("/\./", $files1[0])[1];
	
}
function getFileNames(){
	$retVal = array();
	$allFiles = scandir($GLOBALS['directory']);								//this is how global variables are accessed.
	
	$quantity = count($allFiles);
	for ($i = 0; $i < $quantity; $i++) {
		if(count(preg_split("/\./", $allFiles[$i]))>1 && preg_split("/\./", $allFiles[$i])[1]=='svg'){
			//$retString = $retString . "$allFiles[$i]" . ' ';
			$retVal[] = $allFiles[$i];								//this is one of several ways to add items to an array -- traditional approaches didn't seem to work
		}
	}
	return $retVal;
}
function loadAssetFiles(){
	$statement="";
	$listOfFileNames=getFileNames();
	$quantity = count($listOfFileNames);
	$tempFile;
	$tempString="";
	for ($i = 0; $i < $quantity; $i++) {

		$statement = $statement . "" . json_encode($listOfFileNames[$i]) . 'asdf';

		$tempFile = fopen($GLOBALS['directory']."/".$listOfFileNames[$i], "r");
		while(!feof($tempFile)) {
			$tempString = $tempString.fgetc($tempFile);
			//echo fgetc($tempFile);
		}
		$assets[] = json_encode($tempString);
		//return $tempString;
	}
	
	return $assets[0];

}
function getNote(){
	return $GLOBALS['assets'][0];
}
?>
