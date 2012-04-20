/* --------------------------- */
/*     Filesystem Functions    */
/* --------------------------- */
/* get the root file system */
function getFileSystem(){
	window.requestFileSystem(LocalFileSystem.PERSISTENT, 0,
							 function(fileSystem){ // success get file system
							 root = fileSystem.root;
//							 console.log('getFileSystem - got filesystem for display: ' + root);
                             console.log(fileSystem.name);
                             console.log(fileSystem.root.name);
							 listDir(root);
							 }, function(evt){ // error get file system
							 console.log("File System Error: "+evt.target.error.code);
							 }
							 );
}


/* show the content of a directory */
function listDir(directoryEntry){
	if( !directoryEntry.isDirectory ) console.log('listDir incorrect type');
	
	currentDir = directoryEntry; // set current directory
	directoryEntry.getParent(function(par){ // success get parent
							 parentDir = par; // set parent directory
							 if( (parentDir.name == 'sdcard' && currentDir.name != 'sdcard') || parentDir.name != 'sdcard' ) $('#backBtn').show();
							 }, function(error){ // error get parent
							 console.log('Get parent error: '+error.code);
							 });
	
	var directoryReader = directoryEntry.createReader();
	directoryReader.readEntries(function(entries){
								var dirContent = $('#dirContent');
								dirContent.empty();
								
								var dirArr = new Array();
								var fileArr = new Array();
								for(var i=0; i<entries.length; ++i){ // sort entries
								var entry = entries[i];
                                var uri = entry.toURL();
                                console.log(uri);
								if( entry.isDirectory && entry.name[0] != '.' ) dirArr.push(entry);
								else if( entry.isFile && entry.name[0] != '.' ) fileArr.push(entry);
								}
								
								var sortedArr = dirArr.concat(fileArr); // sorted entries
								var uiBlock = ['a','b','c','d'];
								
								for(var i=0; i<sortedArr.length; ++i){ // show directories
								var entry = sortedArr[i];
								var blockLetter = uiBlock[i%4];
								if( entry.isDirectory )
								dirContent.append('<div class="ui-block-'+blockLetter+'"><div class="folder"><p>'+entry.name+'</p></div></div>');
								else if( entry.isFile )
								dirContent.append('<div class="ui-block-'+blockLetter+'"><div class="file"><p>'+entry.name+'</p></div></div>');
								}
								}, function(error){
								console.log('listDir readEntries error: '+error.code);
								});
}

/* read from file */
function readFile(fileEntry){
	if( !fileEntry.isFile ) console.log('readFile incorrect type');
	//                $.mobile.showPageLoadingMsg(); // show loading message
	
	fileEntry.file(function(file){
				   var reader = new FileReader();
				   reader.onloadend = function(evt) {
				   console.log("Read as data URL");
				   console.log(evt.target.result); // show data from file into console
				   };
				   reader.readAsDataURL(file);
				   
//                   $.mobile.hidePageLoadingMsg(); // hide loading message
				   
				   // dialog with file details
				   $('#file_details').html('<p><strong>Name:</strong> '+file.name+
                                           '<p><strong>Path:</strong> '+file.fullPath+
										   '</p><p><strong>Type:</strong> '+file.type+
										   '</p><p><strong>Last Modified:</strong> '+new Date(file.lastModifiedDate)+
										   '</p><p><strong>Size:</strong> '+file.size);
				   $('#get_file_details').trigger('click');
				   }, function(error){
				   console.log(evt.target.error.code);
				   });
}

/* open item */
function openItem(type){
	if( type == 'd' ){
		listDir(activeItem);
	} else if(type == 'f'){
		readFile(activeItem);
	}
}

/* get active item  */
function getActiveItem(name, type){
	if( type == 'd' && currentDir != null ){
		currentDir.getDirectory(name, {create:false},
								function(dir){ // success find directory
								activeItem = dir;
								activeItemType = type;
								}, 
								function(error){ // error find directory
								console.log('Unable to find directory: '+error.code);
								}
								);
	} else if(type == 'f' && currentDir != null){
		currentDir.getFile(name, {create:false},
						   function(file){ // success find file
						   activeItem = file;
						   activeItemType = type;
						   },
						   function(error){ // error find file
						   console.log('Unable to find file: '+error.code);
						   }
						   );
	}
}

/* get clipboard item for copy or move */
function getClipboardItem(action){
	if( activeItem != null) {
		clipboardItem = activeItem;
		clipboardAction = action;
	}
}

/* click actions */
function clickItemAction(){
	var folders = $('.folder');
	var files = $('.file');
	/* menu buttons */
	var menuDialog = $('#menuOptions');
	var openBtn = $('#openBtn');
	var deleteBtn = $('#deleteBtn');  
	
	folders.live('tap', function(){
				 var name = $(this).text();
				 getActiveItem(name, 'd');
				 $('#menu').trigger('click'); // menu dialog box
				 });
	
	files.live('tap', function(){
			   var name = $(this).text();
			   getActiveItem(name, 'f');
			   $('#menu').trigger('click'); // menu dialog box
			   });
	
	
	openBtn.click(function(){
				  menuDialog.dialog('close');
				  openItem(activeItemType);
				  
				  });
	
	
	deleteBtn.click(function(){
					if( activeItem != null && activeItemType != null){
					if(activeItemType=='d'){
					activeItem.removeRecursively(function(){
												 console.log('Directory removed recursively with success');
												 menuDialog.dialog('close');
												 listDir(currentDir);
												 }, function(error){
												 console.log('Directory remove recursively error: '+error.code);
												 });
					} else if(activeItemType=='f'){
					activeItem.remove(function(){
									  console.log('File removed with success');
									  menuDialog.dialog('close');
									  listDir(currentDir);
									  }, function(error){
									  console.log('File remove error: '+error.code);
									  });
					}
					}
					});
}
