/* -------------------------- */
//  Database Functions
/* -------------------------- */

// Populate the database 
function populateDB(tx) {
	console.log('populateDB called');
	tx.executeSql('DROP TABLE IF EXISTS MOVES');
	tx.executeSql('DROP TABLE IF EXISTS GAMES');
	tx.executeSql('CREATE TABLE IF NOT EXISTS MOVES (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, gameid, movedata)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS GAMES (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, PB, BR, PW, WR, SZ, KM, HA, DT, gamedata)');
	// PB, BR, PW, WR, SZ, KM, HA, DT, 
}

// Query the database
function queryDB(tx) {
	console.log("queryDB called");
	tx.executeSql('SELECT * FROM MOVES', [], querySuccess, errorCB);
}

// Query the success callback
function querySuccess(tx, results) {
	var len = results.rows.length;
	console.log("MOVES table: " + len + " rows found.");
	for (var i=0; i<len; i++){
		console.log("Row = " + i + " ID = " + results.rows.item(i).id + " movedata = " + results.rows.item(i).movedata);
	}
}

// Error callback
function errorCB(err) {
	console.log("ERROR processing SQL: "+err.code);
}

// Success callback
function successCB() {
	console.log("successCB called");
	var db = window.openDatabase("Database", "1.0", "Moku", 200000);
	db.transaction(queryDB, errorCB);
}

/* -------------------------- */
//       Save Move
/* -------------------------- */

// Save a move to the Database
function saveMovetoDB(newMove) {
	var db = window.openDatabase("Database", "1.0", "Moku", 200000);
	db.transaction(function(tx){
			tx.executeSql('INSERT INTO MOVES (gameid, movedata) VALUES ('+ currentGameID +', "'+ newMove +'")');
		}, errorCB, function() {
			var db = window.openDatabase("Database", "1.0", "Moku", 200000);
			db.transaction(function(tx){
				tx.executeSql('SELECT * FROM MOVES', [], function(tx, results) {
					var len = results.rows.length;
					console.log("MOVES table: " + len + " rows found.");
					for (var i=0; i<len; i++){
						console.log("Row = " + i + " ID = " + results.rows.item(i).id + " gameid = "+ results.rows.item(i).gameid +" movedata = " + results.rows.item(i).movedata);
					}
				}, errorCB);
			}, errorCB);
		});
}

/* -------------------------- */
//       GAME listing
/* -------------------------- */

function listGamesArchive() {
	// lists GAMES db on gamesArchive page
	var list = '';
	var db = window.openDatabase("Database", "1.0", "Moku", 200000);
	db.transaction(function(tx){
	   tx.executeSql('SELECT * FROM GAMES', [], function(tx, results) {
		 var len = results.rows.length;
		 console.log("GAMES table: " + len + " rows found.");
		 for (var i=0; i<len; i++){
			 var pb = '';
			 var pw = '';
			 var row = results.rows.item(i);
			 if (row.SZ !== null) {
				 if (row.PB !== null ){ pb = '<br />Black: '+ row.PB; }
				 if (row.PW !== null ){ pw = '<br />White: '+ row.PW; }
				 list += "<li><a href=\"#\" onclick=\"viewGameDetails();\"><h3>" + row.DT +"</h3><p>"+ pb +pw  +"<br />Board size: "+ row.SZ +"</p></a></li>";
			 }
		 }
		 $('ul#archive-list').html(list);
		 $('ul#archive-list').listview('refresh');
		 $.mobile.changePage($("#gamesArchive"));
		 }, errorCB);
	}, errorCB);                
}

function listGamesDB() {
	// spit GAMES db to console.
	var db = window.openDatabase("Database", "1.0", "Moku", 200000);
	db.transaction(function(tx){
	   tx.executeSql('SELECT * FROM GAMES', [], function(tx, results) {
		 var len = results.rows.length;
		 console.log("GAMES table: " + len + " rows found.");
		 for (var i=0; i<len; i++){
			var row = results.rows.item(i);
			console.log("Row " + i + ": id=" + row.id +" PB="+ row.PB +" BR="+ row.BR +" PW="+ row.PW +" WR="+ row.WR +" SZ="+ row.SZ +" KM="+ row.KM +" HA="+ row.HA +" DT="+ row.DT +" gamedata = " + row.gamedata);
		 }
		}, errorCB);
	}, errorCB);
}



function getHighestGameID(callback) {
	var db = window.openDatabase("Database", "1.0", "Moku", 200000);
	db.transaction(function (tx) {
	   tx.executeSql("SELECT id FROM GAMES", [], function (tx, result) {
		 var highestGameIDinDB = 0;
		 for (var i = 0; i < result.rows.length; ++i) {
			var row = result.rows.item(i);
			if (row['id'] > highestGameIDinDB) {
				highestGameIDinDB = row['id'];
			}
		 }
		 console.log('getHighestGameID says: ' + highestGameIDinDB);
		 callback(highestGameIDinDB);
		 }, function (tx, error) {
			console.log('could not SELECT id FROM GAMES - ' + error.message);
			return;
		 });
	   });            
}
