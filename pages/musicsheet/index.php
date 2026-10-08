<?php
	// The violin music sheet page. feature.php checks SITE_PAGE, so it is only
	// shown through a site page like this one.
	define('SITE_PAGE', true);
?>
<!doctype html>
<html lang="en">
	<head>
	  <meta charset="utf-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1">
	  <title>Violin music sheet</title>
	  <link rel="shortcut icon" href="#"/>
	</head>
	<body>
		<?php include(__DIR__ . '/feature.php'); ?>
	</body>
</html>
