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
                                 console.log("listGamesArchive says -- mobile.chanagePage: gamesArchive");
                                 $.mobile.changePage("#gamesArchive");
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
                                 callback(highestGameIDinDB);
                                 }, function (tx, error) {
                                    console.log('could not SELECT id FROM GAMES - ' + error.message);
                                    return;
                                 });
                   });            
}



/* -------------------------- */
//       Save Forms
/* -------------------------- */

function saveGameFormSubmit() {
    // used when starting a new game
    savePrefsFormtoDB();
    selectAction();
}

function editGameFormSubmit() {
    // for editing an existing game
    savePrefsFormtoDB();
}

function editGameDetails(gameid){
    console.log('editGameDetails gameid='+gameid);
    // TODO: are SQL results an array?
    // TODO: seems like the val() stuff should put the array into the form... but no go.
    // setup edit Form using supplied GAME id
    // get game info from DB, load it into an array, populate editGameForm using array
    var db = window.openDatabase("Database", "1.0", "Moku", 200000);
    db.transaction(function(tx){
                   tx.executeSql('SELECT * FROM GAMES WHERE id='+gameid, [], function(tx, results) {
                                 // http://stackoverflow.com/questions/172524/populate-a-form-with-data-from-an-associative-array-with-jquery
                                 // the following isn't working because I don't understand jQuery.
                                 try {
                                 $.each(results.rows, function(name,value) { 
                                        $("#editGameForm input[name='" + name + "']").val(value); 
                                        console.log(name +" "+ value);});
                                 }catch(e){
                                 console.log('editGameDetails jquery error: ' +e);
                                 }
                                 }, errorCB);
                   }, errorCB);
}


function savePrefsFormtoDB() {
    // TODO - should probably be just :input so that it will work with saveGameForm and editGameForm
    // ... 
    var fields = $("#prefsForm :input").serializeArray();
    
    var d = new Date();
    var DTval = d.getFullYear() +"-"+ d.getMonth() +"-"+ d.getDate();
    
    var updateString = " ";
    jQuery.each(fields, function(i, field){
                if (field.name == 'SZ') {
                currentBoardSize = field.value;
                }
                if (field.value != '') {
                updateString += field.name +'="'+ field.value +'",';
                }
                });
    updateString += 'DT="'+DTval+'"';
    
    var updateGameSQL = 'UPDATE GAMES SET '+ updateString +' WHERE id='+ currentGameID;
    
    var db = window.openDatabase("Database", "1.0", "Moku", 200000);
    db.transaction(
                   function(tx){
                   tx.executeSql(updateGameSQL);
                   }, errorCB, listGamesDB);
}


/* -------------------------- */
//    New Game Functions
/* -------------------------- */
/*  create a new record in GAMES db
    and sets currentGameID to that new gameid
    then go to SaveGame page to set details
*/
function newGameRecord() {
    console.log('newGameRecord called');
    var db = window.openDatabase("Database", "1.0", "Moku", 200000);
    db.transaction(function (tx) {
                   tx.executeSql('INSERT INTO GAMES (gamedata) VALUES ("")');
                   }, errorCB, function () {
                   // set currentGameID to new (highest) in Database
                   getHighestGameID(function (highestId) {
                                    currentGameID = highestId;
                                    console.log('currentGameID is now '+currentGameID);
                                    });
                   });
    console.log("newGameRecord says -- mobile.changePage: saveGame");
    $.mobile.changePage("#saveGame");
    
}


function stopGameCapture() {
    console.log('stopGameCapture called');
    // Finish game Recording
    // set currentGameID to zero, ie Not Recording.
    currentGameID = 0;
}


function confirmNewGame(button) {
    // 1: NO
    // 2: YES (start new Capture session)
    if (button == 2){
        // create new game record, set currentGameID
        newGameRecord();
        // TODO Stop image capture (NOT IN PLACE YET)
        
        // enable Grid and Save buttons
        $('#game-control-buttons').show();
        
    }
}


function newGame() {
    console.log('newGame?');
    // Check for currently running Capture Session
    // if there's already a game, check to see if user wants to stop and create a new one:
    if (currentGameID > 0) {
        console.log('currentGameID "'+ currentGameID +'" is greater than 0 so a capture session is already running');
//        navigator.notification.vibrate(1000);
        navigator.notification.confirm(
                                       'Stop current game capture and start a new one?',  // message
                                       confirmNewGame,                                  // callback to invoke with index of button pressed
                                       'Capture session running',                       // title
                                       'No,Yes'                                         // buttonLabels
                                       );
    }
    else {        
        // Otherwise, no existing games, so create new game record, start capture
        console.log('currentGameID is NOT greater than 0, so there is NO capture session running');
        newGameRecord();
    }
}

/* -------------------------- */
//         Accept Grid        //
/* -------------------------- */
function acceptGrid() {
    // If the grid looks good
    // write initial grid to disk/add to database?
    if (currentGameID > '0') { $('#game-control-buttons').show(); } // TODO hide instructions
    
    // go to main page
    // reload Eidogo
    reloadEidogo();
    console.log("acceptGrid says -- mobile.changePage: page1");
    $.mobile.changePage("#page1");
    
    // TODO start Automatic Image Capture
    // NOT IMPLEMENTED YET
}


/* -------------------------- */
// Canvas2ImagePlugin Function
/* -------------------------- */
/*
    used to save a canvas image to filesystem
 */
function saveImage()
{
    var canvas2ImagePlugin = window.plugins.canvas2ImagePlugin;
    canvas2ImagePlugin.saveImageDataToLibrary(
                                              function(msg){
                                              console.log(msg);
                                              }, 
                                              function(err){
                                              console.log(err);
                                              }, 
                                              'canvas'
                                              );
}

/* ------------------- */
/*  PhoneGap Functions */
/* ------------------- */

// USED FOR "CAMERA" CAPTURE
// Take picture using device camera and retrieve image as base64-encoded string
// savetoPhotoAlbum is turned on to compare with Canvas2Image Plugin 
function capturePhoto() {
    /*
     
     File saved to Photo Album is full-size, no cropping, regardless of targetWidth/Height
     
     Orientation and cropping/size issues will be resolved in Cordova 1.7 according to mailing lists
     
     targetWidth:100, targetHeight:400
     correctOrientation: 0
     take the picture with phone sideways and the resulting cropped image has object pointing sideways
     (CAN'T REPLICATE THIS)
     correctOrientation: 1
     take the picture with phone sideways and resulting cropped image has object pointing up
     
     
     targetWidth:320, targetHeight:240 (also 480, 640)
     correctOrientation: 0
     picture taken upright, image is cropped object pointing up (top and bottom cropped)
     picture taken sideways, image is object pointing  up (image resized to correct dimensions)
     correctOrientation: 1
     picture taken upright, image is cropped, object pointing up (top and bottom cropped)
     picture taken sideways, image has object pointing up (image resized to correct dimensions)
          
     */
    console.log("capturePhoto says -- mobile.changePage: camera");
    $.mobile.changePage("#camera");
    navigator.camera.getPicture(onPhotoURISuccess, onFail, { 
                                quality: 50, 
                                targetWidth: idealWidth,
                                targetHeight: idealHeight,
                                correctOrientation: 0,
                                saveToPhotoAlbum: 0
                                });
    
}

// PHOTO LIBRARY
// Retrieve image file location from var source (eg Photo Library)
function getPhoto(source) {
    console.log("getPhoto says -- mobile.changePage: camera");
    $.mobile.changePage("#camera");
    navigator.camera.getPicture(onPhotoURISuccess, onFail, { 
                                quality: 50, 
                                destinationType: destinationType.FILE_URI,
                                targetWidth: idealWidth,
                                targetHeight: idealHeight,
                                correctOrientation: 1,
                                sourceType: source,
                                saveToPhotoAlbum: 0
                                });
}

// NOT CURRENTLY USED
// Take picture using device camera, allow edit, and retrieve image as base64-encoded string  
function capturePhotoEdit() {
    navigator.camera.getPicture(onPhotoURISuccess, onFail, { quality: 20, allowEdit: true }); 
}


/*--------------------------------------------- */
//         initial GRID DETECTION               //
/*--------------------------------------------- */

// Called when a photo is successfully retrieved
// and coordinates are needed.
function onPhotoURISuccess(imageURI) {
    currentMoveID = currentMoveID + 1;
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    var secondCanvas = document.getElementById("secondcanvas");
    var secondCtx = secondCanvas.getContext("2d");
    
    var image = new Image();
    
    image.onload = function(){
        
        // ------------------------------------------------------------------
        // default size
        
        // set canvas height and width to match image.
        ctx.canvas.width = idealWidth;
        ctx.canvas.height = idealHeight;
        
        // show loading message
        // TODO - fix display. doesn't show when taking a second picture? spinner no spinny?
        
//        $.mobile.showPageLoadingMsg("b", "This is only a test", true);
        
        ctx.drawImage(image, 0,0);
        
        // ------------------------------------------------------------------
        // Canvas2ImagePlugin saves to Photo Library (maybe sends to Documents or temp dir instead?)
        // might not be necessary if capturePhoto can specify w x h 
        try {
            //            saveImage();
            console.log("Image would be saved, but hey, let's not fill up the library right now");
        } catch (e) {
            console.log("can't save image - Exception: "+e);
        }
        
        // ------------------------------------------------------------------
        // a good point at which to get the corner coordinates from GoCam
        // First pass only, unless following image changes considerably.
        
        console.log("About to run GocamPlugin");
        
        // try timing GocamPlugin
        var startTime = new Date();
        console.log("GocamPlugin startTime: " + startTime);
        
        filename = imageURI.replace("file://localhost", '');
        try {
            GocamPlugin.nativeFunction([filename] ,
                                       function(result) {
                                       var endTime = new Date();
                                       console.log("GocamPlugin endTime: " + endTime);
                                       console.log("GocamPlugin took: " + (endTime - startTime) + "ms");
                                       //                                                   coords = result;
                                       goTracer = new GoTracer(image, canvas);
                                       goTracer.setCorners(result);
                                       goTracer.startScan();
                                       console.log(goTracer.getSGF());
                                       
                                       // all done, hide loading message
//                                       $.mobile.hidePageLoadingMsg();
                                       
                                       // Approve or Update current moves in SGF file?
                                       // temporary - just write all SGF to file.
//                                       writeFile(goTracer.getSGF(), function(){
//                                                 reloadEidogo();
//                                                 });
                                       writeFile(goTracer.getSGF(), function(){
                                                 console.log('this is where we used to reload Eidogo');
                                                 });
                                       // save move to databse
                                       saveMovetoDB(goTracer.getSGF());
                                       
                                       // ------------------------------------------------------------------
                                       // save SGF to disk? Send via Email? Open in Browser? Display using eidogo?
                                       // save in iTunes
                                       
                                       },
                                       
                                       function(error) {
                                       console.log("GoCam - Error : \r\n"+error);      
                                       }
                                       ); 
        } catch (e) {
            console.log("Exception: "+e);
        }
        
    };
    image.src = imageURI;
    
    
}


// used instead of console.log in a few instances.
function printObject(o) {
    var out = '';
    for (var p in o) {
        out += p + ': ' + o[p] + '\n';
    }
    console.log(out);
}


/* -------------------------------- */
//      Write SGF to file           //
/* -------------------------------- */
function writeFile(SGF, callback) {
    console.log("writeFile begins");
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
                             console.log("writeFile root filesystem: " + fileSystem.root.name);
                             fileSystem.root.getFile("SGF.txt", {create: true, exclusive: false}, function(fileEntry){
                                                     console.log("writeFile - fileEntry");
                                                     fileEntry.createWriter(function(writer){
                                                                            writer.onwriteend = function(evt) {
                                                                            console.log("writeFile - SGF.txt written");
                                                                            callback();
                                                                            }
                                                                            writer.write(SGF);
                                                                            }, onFail);
                                                     }, onFail); 
                             }, onFail); 
}


function onFail(err) {
    console.log(err)
}


/* -------------------------- */
//    ActionSheet Function    //
//   Select Camera/Photo Lib  //
/* -------------------------- */
function selectAction() {
    var actionSheet = window.plugins.actionSheet;
//    console.log("selectAction says -- mobile.changePage: camera");
//    $.mobile.changePage("#camera");
    // Select Source
    actionSheet.create('Select Image Source', ['Camera', 'Photo Library', 'Cancel'], function(buttonValue, buttonIndex) {
                       
                       switch (arguments[1])
                       {
                       case 0:
                       capturePhoto();
                       imageSource = "camera"; // set default image source
                       break;
                       case 1:
                       getPhoto(pictureSource.PHOTOLIBRARY);
                       imageSource = "photolibrary";
                       break;
                       default:
//                       $.mobile.changePage("#page1");
                       console.log('selectAction default case says: go back to page1');
                       }

                       
                       }, {cancelButtonIndex: 2});
    
}

/* -------------------------- */
//     Eidogo SGF display     //
/* -------------------------- */
function reloadEidogo() {
    // set sgfUrl to "SGF.txt" for local browser testing
    // set sgfUrl to "../../Documents/SGF.txt" (saved by writeFile) for other tests
    var player = new eidogo.Player({
                                   container:       "player-container", // HTML element id indicating where to put the player
                                   theme:           "compact",          // "standard" or "compact"
                                   sgfUrl:          "../../Documents/SGF.txt", // relative URL (within same domain) to SGF file to load 
                                   loadPath:        [0, 1000],  // Location within the game tree to start. 1000 should start at last move.
                                   mode:            "play",     // "play" or "view"
                                   showComments:    false,
                                   showPlayerInfo:  false,
                                   showGameInfo:    false,
                                   showTools:       false,
                                   showOptions:     false,
                                   markCurrent:     true,
                                   markVariations:  false,
                                   markNext:        true,
                                   enableShortcuts: false,
                                   problemMode:     false
                                   });
    console.log("Eidogo reloaded");
    
    // TODO: send a move to eidogo - not here, this is just for testing.
    //                try {
    ////                    player.setColor('B');
    ////                    player.createMove('dj');
    //                    player.playMove('B','dj');
    //                }catch(e){
    //                    console.log(e);
    //                }
    // how to add some HTML to this without modifying the source js?
    //                $('.controls-container').append("<form id='sliderform'><label id='sliderlabel' for='slider'>Move:</label><input type='range' name='slider' id='slider' value='50' min='0' max='400' data-highlight='true' /></form>");
    
}