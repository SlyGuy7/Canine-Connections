<?php

//create a new php data object connection to the mysql database
$pdo = new PDO(
	"mysql:host=localhost;dbname=adoption_cent", //tells php which database to connect to
	"deryk", //dbname
	"REDACTED" //db password
);

echo "Backend running. DB connected SUCCESSFULLY."; //a simple msg to comfirm its up and running
