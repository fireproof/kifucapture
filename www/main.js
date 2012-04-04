
var pictureSource;   // picture source
var destinationType; // sets the format of returned value 
var temp = "582,224,277,117,399,437,45,280"; // board corner coordinates will come from gocam library
var coords = temp.split(","); 

function onBodyLoad() {
    document.addEventListener("deviceready", onDeviceReady, false);
    console.log('onbodyload');
}

// PhoneGap is ready to be used!
function onDeviceReady() {
    pictureSource = navigator.camera.PictureSourceType;
    destinationType = navigator.camera.DestinationType;
}

// Called when a photo is successfully retrieved from camera
function onPhotoDataSuccess(imageData) {
    document.getElementById('message').innerHTML = imageData;
    
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    var image = new Image();
    
    image.onload = function(){
        
        var ratio = 1;
        var maxWidth = 640;
        var maxHeight = 480;
        var w = image.width;
        var h = image.height;
        
        if ( w > maxWidth) {
            ratio = maxWidth / w;
        }
        else if (h > maxHeight) {
            ratio = maxHeight / h;
        }
        var newWidth = w * ratio;
        var newHeight = h * ratio;
        
        ctx.canvas.width = newWidth;
        ctx.canvas.height = newHeight;
        
        ctx.drawImage(image, 0,0,newWidth,newHeight);
        
        goTracer = new GoTracer(image, canvas);
        goTracer.setCorners();
        goTracer.startScan();
        
        console.log(goTracer.getSGF());
        document.getElementById('message').innerHTML = goTracer.getSGF();
        writeFile(goTracer.getSGF());
        
    };
    
    image.src = imageData;
    
    
}



// Called when a photo is successfully retrieved from Library
function onPhotoURISuccess(imageURI) {
    
    //            document.getElementById('message').innerHTML = 'imageURI: ' + imageURI;
    
    /* Canvas manipulation */
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    
    var image = new Image();
    
    image.onload = function(){
        
        var ratio = 1;
        var maxWidth = 640;
        var maxHeight = 480;
        var w = image.width;
        var h = image.height;
        
        if ( w > maxWidth) {
            ratio = maxWidth / w;
        }
        else if (h > maxHeight) {
            ratio = maxHeight / h;
        }
        var newWidth = w * ratio;
        var newHeight = h * ratio;
        
        ctx.canvas.width = newWidth;
        ctx.canvas.height = newHeight;
        ctx.drawImage(image, 0,0, newWidth,newHeight);
        
        //printObject(ctx.drawImage);
        
        // a good point at which to get the corner coordinates from GoCam
        
        
        goTracer = new GoTracer(image, canvas);
        goTracer.setCorners();
        goTracer.startScan();
        
        //                console.log(goTracer.getSGF());
        //                document.getElementById('message').innerHTML = goTracer.getSGF();
        writeFile(goTracer.getSGF());
        
        // save SGF to disk? Send via Email? Open in Browser? Display using eidogo?
        
    };
    image.src = imageURI;               
}


// A button will call this function

function capturePhoto() {
    // Take picture using device camera and retrieve image as base64-encoded string
    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50 });
}

function capturePhotoEdit() {
    // Take picture using device camera, allow edit, and retrieve image as base64-encoded string  
    navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 20, allowEdit: true }); 
}

function getPhoto(source) {
    // Retrieve image file location from specified source
    navigator.camera.getPicture(onPhotoURISuccess, onFail, { quality: 50, 
                                destinationType: destinationType.FILE_URI,
                                sourceType: source });
}

// Called if something bad happens.
function onFail(message) {
    alert('Failed because: ' + message);
}

function printObject(o) {
    var out = '';
    for (var p in o) {
        out += p + ': ' + o[p] + '\n';
    }
    console.log(out);
}

// Write SGF file to disk.
function writeFile(SGF) {
    console.log("this is writefile");
    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem){
                             console.log("fileSystem");
                             fileSystem.root.getFile("SGF.txt", {create: true, exclusive: false}, function(fileEntry){
                                                     console.log("fileEntry");
                                                     fileEntry.createWriter(function(writer){
                                                                            writer.onwriteend = function(evt) {
                                                                            console.log("written");
                                                                            
                                                                            }
                                                                            writer.write(SGF);
                                                                            }, onFail);
                                                     }, onFail); 
                             }, onFail); 
}

function writePrefs {
    window.plugins.applicationPreferences.set('name_identifier', function(result) {
                                              alert("We got a setting: " + result);
                                              }, function(error) {
                                              alert("Failed to retrieve a setting: " + error);
                                              }
                                              );
}

            
/* ------------------- */
/*  GoTracer Functions */
/* ------------------- */


function GoTracer(img, canvas) {
    this.img = img;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    //            console.log('this.img.src: ' + this.img.src);
    //            console.log('this.canvas: ' + this.canvas);
}

GoTracer.prototype.setCorners = function() {
    coords = coords.map( function(c) { return 1*c; })
    //            console.log('coords: ' + coords);
    
    this.corners = [
                    new Point(coords[2], coords[3]),
                    new Point(coords[6], coords[7]),
                    new Point(coords[4], coords[5]),
                    new Point(coords[0], coords[1])
                    ];
    //            console.log('this.corners: ');
    //            console.log(this.corners);
}


GoTracer.prototype.startScan = function() {
    console.log('startScan');
    this.drawImage();
    this.calcRadii();  
    
    var sets = this.getSets(new Rect3D(this.corners));
    
    this.quickPartition(sets, 50);
    this.partition(sets, 3);
    this.assignSets(sets);
};

GoTracer.prototype.drawImage = function() {
    console.log('drawImage');
    var aspectRatio = this.img.width / this.img.height;
    this.canvasWidth = Math.min(this.img.height * aspectRatio, this.img.width);
    this.canvasHeight = Math.min(this.img.width / aspectRatio, this.img.height);
    //            console.log(this.img);
    //            console.log("aspectRatio: " + aspectRatio);
    //            console.log("image dimensions: " + this.img.width + "x" + this.img.height);
    //            // draw image at scale to fit in canvas width
    //            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    //            this.ctx.drawImage(this.img, 0, 0);
};

GoTracer.prototype.calcRadii = function() {
    var xs = this.corners.map(function(p) { return p.x });
    var ys = this.corners.map(function(p) { return p.y });
    var xMax = Math.max.apply(Math, xs);
    var xMin = Math.min.apply(Math, xs);
    var yMax = Math.max.apply(Math, ys);
    var yMin = Math.min.apply(Math, ys);
    this.xRadius = (xMax - xMin) / 100;
    this.yRadius = (yMax - yMin) / 100;
};

GoTracer.prototype.getSets = function(rect) {
    var sets = [];
    var measurements = 7;
    for (var x = 0; x < 19; x++)
    {
        for (var y = 0; y < 19; y++)
        {
            var l = 0, h = 0, count = 0;
            for (var t = 0; t < measurements; t++)
            {
                var phi = t/measurements*2*Math.PI;
                var c = rect.getPoint(x/18 + 0.012*Math.cos(phi), y/18 + 0.012*Math.sin(phi)).getColor(this.ctx);
                if (!isNaN(c.l) && !isNaN(c.h))
                {
                    l += c.l; h += c.h;
                    count++;
                }
            }
            l /= count; h /= count;
            var l1 = 0, h1 = 0, count = 0;
            for (var t = 0; t < 4; t++)
            {
                var phi = (t+0.5)/2*Math.PI;
                var x1 = x+0.7*Math.cos(phi);
                var y1 = y+0.7*Math.sin(phi);
                if (x1 >= 0 && y1 >= 0 && x1 <= 18 && y1 <= 18)
                {
                    var c = rect.getPoint(x1/18, y1/18).getColor(this.ctx);
                    if (!isNaN(c.l) && !isNaN(c.h))
                    {
                        l1 += c.l; h1 += c.h;
                        count++;
                    }
                }
            }
            l1 /= count; h1 /= count;
            
            sets.push(new PointSet({ 
                                   p: rect.getPoint(x/18, y/18),
                                   x: h - h1 - Math.abs(l - l1) + 64,
                                   y: l,
                                   coord: "[" + String.fromCharCode(y + 97) + String.fromCharCode(x + 97) + "]"
                                   }));
        }
    }
    return sets;
};

GoTracer.prototype.quickPartition = function(sets, target) {
    while (sets.length > target)
    {
        var smallestSet = sets.pop();
        var closestSet = null, closestSetIndex = -1, smallestDistance = Infinity;
        for (var i = 0; i < sets.length; i++)
        {
            var s = sets[i];
            var d = smallestSet.getDistanceTo(s);
            if (d < smallestDistance)
            {
                smallestDistance = d;
                closestSet = s;
                closestSetIndex = i;
            }
        }
        if (!closestSet) return
        sets.splice(closestSetIndex, 1);
        closestSet.add(smallestSet);
        for (var i = 0; i < sets.length; i++)
        {
            if (sets[i].points.length < closestSet.points.length)
            {
                sets.splice(i, 0, closestSet);
                break;
            }
        }
    }
};

GoTracer.prototype.partition = function(sets, target) {
    while (sets.length > target)
    {
        var indexOfClosestSet1, indexOfClosestSet2, smallestDistance = Infinity;
        for (var i = 0; i < sets.length; i++)
        {
            for (var j = i + 1; j < sets.length; j++)
            {
                var d = sets[i].getDistanceTo(sets[j]);
                if (d < smallestDistance)
                {
                    smallestDistance = d;
                    indexOfClosestSet1 = i;
                    indexOfClosestSet2 = j;
                }
            }
        }
        sets[indexOfClosestSet1].add(sets[indexOfClosestSet2]);
        sets.splice(indexOfClosestSet2, 1);
    }
};

GoTracer.prototype.assignSets = function(sets) {
    // Sort by lightness
    sets.sort(function(a, b) { return a.y - b.y; });
    this.blackSet = sets[0];
    
    // Sort by color
    sets.sort(function(a, b) { return a.x - b.x; });
    this.boardSet = sets[2] == this.blackSet ? sets[1] : sets[2];
    
    this.whiteSet = sets[0] == this.blackSet ? sets[1] : sets[0];
    
    this.blackSet.draw(this.ctx, "white");
    this.whiteSet.draw(this.ctx, "black");
    this.boardSet.draw(this.ctx, "brown");
};

GoTracer.prototype.getMatch = function() {
    return 1/3 * ( this.blackSet.getSpread() + this.whiteSet.getSpread() + this.boardSet.getSpread() );
}

GoTracer.prototype.getSGF = function() {
    var blackCoords = this.blackSet.points.map(function(pt) { return pt.coord; })
    var whiteCoords = this.whiteSet.points.map(function(pt) { return pt.coord; })
    //console.log (blackCoords.join(''));
    return '(;AB' + blackCoords.join('') + 'AW' + whiteCoords.join('') + ')';
};


function Point(x,y) {
    this.x = x;
    this.y = y;
}

Point.prototype.mix = function(that, f) {
    return new Point((1 - f) * this.x + f * that.x, (1 - f) * this.y + f * that.y);
};

Point.prototype.getColor = function(ctx) {
    try
    {
        var c = ctx.getImageData(this.x, this.y, 1, 1);
    } catch(e) { return {} }
    //  drawPixel(ctx, [0,160,0], this.x, this.y)
    var r = c.data[0];
    var g = c.data[1];
    var b = c.data[2];
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    return {h: (max - min) / (max + 100) * (256 + 100), l: (r + g + b) / 3};
}

Point.prototype.draw = function(ctx, c) {
    if (c.constructor == Array)
    c = "rgb(" + c[0]/256*100 + "%," + c[1]/256*100 + "%," + c[2]/256*100 + "%)";
    ctx.fillStyle = c || "white";
    ctx.fillRect(this.x - 1, this.y - 1, 3, 3);
};

Point.prototype.toString = function() {
    return Math.round(this.x) + "," + Math.round(this.y);
};

// A * x + B * y = C
function Line(p0, p1) {
    this.A = p1.y - p0.y;
    this.B = p0.x - p1.x;
    this.C = this.A * p0.x + this.B * p0.y;
    this.o = p0;
}

Line.prototype.getIntersectionWith = function(that) {
    var det = this.A * that.B - that.A * this.B;
    return new Point(
                     (that.B * this.C - this.B * that.C) / det,
                     (this.A * that.C - that.A * this.C) / det
                     );
};

Line.prototype.getLength = function() {
    if (!this.__length)
    this.__length = Math.sqrt(this.A * this.A + this.B * this.B);
    return this.__length;
};

Line.prototype.getDistanceTo = function(p) {
    return Math.abs(this.A * p.x + this.B * p.y - this.C) / this.getLength();
};

function Rect3D(corners) {
    //console.log("this.a: " + corners[0]);
    this.a = corners[0];
    this.b = corners[1];
    this.c = corners[2];
    this.d = corners[3];
    var xInf = (new Line(this.b, this.a)).getIntersectionWith(new Line(this.c, this.d));
    var yInf = (new Line(this.d, this.a)).getIntersectionWith(new Line(this.c, this.b));
    var horizon = new Line(xInf, yInf);
    this.za = 1 / horizon.getDistanceTo(this.a);
    this.zb = 1 / horizon.getDistanceTo(this.b);
    this.zc = 1 / horizon.getDistanceTo(this.c);
    this.zd = 1 / horizon.getDistanceTo(this.d);
}

Rect3D.prototype.getPoint = function(fx, fy) {
    var zab = this.za * (1 - fx) + this.zb * fx;
    var fab = fx * this.zb / zab;
    var zdc = this.zd * (1 - fx) + this.zc * fx;
    var fdc = fx * this.zc / zdc;
    var z = zab * (1 - fy) + zdc * fy;
    var f = fy * zdc / z;
    if (isNaN(f)) { fab = fx; fdc = fx; f = fy; }
    return this.a.mix(this.b, fab).mix(this.d.mix(this.c, fdc), f);
};

function PointSet(point) {
    this.points = [point];
    this.x = point.x;
    this.y = point.y;
}

PointSet.prototype.add = function(that) {
    var points = this.points.concat(that.points);
    this.x = (this.x * this.points.length + that.x * that.points.length) / points.length;
    this.y = (this.y * this.points.length + that.y * that.points.length) / points.length;
    this.points = points;
};

PointSet.prototype.getDistanceTo = function(that) {
    return Math.abs(this.x - that.x) + Math.abs(this.y - that.y);
};

PointSet.prototype.draw = function(ctx, color) {
    this.points.map(function(pt) { pt.p.draw(ctx, color); })
};

// PointSet.prototype.drawDebug = function(ctx, color)
// {
//   ctx.fillStyle = color;
//   for (var j = 0; j < this.points.length; j++)
//   {
//     var p = this.points[j];
//     ctx.fillRect(p.y / 2 - 1, p.x / 2 + 128 - 2, 2, 4);
//   }
// }

PointSet.prototype.getSpread = function() {
    var total = 0;
    var thisSet = this;
    this.points.map(function(p) { total += Math.abs(thisSet.x - p.x) + Math.abs(thisSet.y - p.y); } );
    return 100 - total / this.points.length;
}


function drawPixel(ctx, rgb, x, y) {
    try
    {
        var c = ctx.getImageData(x, y, 1, 1);
        c.data[0] = rgb[0];
        c.data[1] = rgb[1];
        c.data[2] = rgb[2];
        c.data[3] = 255;
        ctx.putImageData(c, x, y);
    }
    catch(e)
    {}
}



