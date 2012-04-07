
/*
 * Analyze POSTed image
 */
var exec = require("child_process").exec;
var Canvas = require('canvas');
var fs = require("fs");
var buffer = "";
var filename = "";
var coords = "";
var im = require('imagemagick');

exports.analyze = function(req, res){
  //res.send('OK', 200);
  console.log(req.files.image_file.path);
  
  var filepath = req.files.image_file.path;
  fs.linkSync(filepath, filepath + ".jpg");

  //var imagefile = filepath + '.jpg';
  
  // images can be too big. 640x480 is about right.
  // create a new Canvas image, resize, save to disk?
  
  // imagemagick doesn't create the file quickly enough?
  // or is this a sync/async issue?
  var bigfile = filepath + '.jpg'
  var imagefile = filepath + 'sm.jpg'
  
  // send file to jhead to fix EXIF rotation
  exec("./jhead -autorot " + bigfile, function (error, stdout, stderr) {
          console.log ('command for jhead: ./jhead -autorot ' + bigfile);
          console.log (stdout);
    im.resize({
        srcPath: bigfile,
        dstPath: imagefile,
        width:   640
        }, function(err, stdout, stderr){
          if (err) throw err;
          console.log('resized');
                    
            // send file to gocam
            exec("./gocam_test " + imagefile, function (error, stdout, stderr) {
          
              var s = stdout.replace(/\n/, "").split(" "); 
              filename = "/" + s[0];
              coords = s[1].split(",");
              console.log('gocam coords: ' + coords);
              var boardImage = fs.readFileSync(imagefile);
              
              img = new Canvas.Image;
              img.src = boardImage;
              
              var w = img.width;
              var h = img.height;
              canvas = new Canvas(w,h);
             
              doMain();
              
              // for testing purposes
              var out = fs.createWriteStream('public/output.jpg')
              , stream = canvas.createJPEGStream();
            
              stream.on('data', function(chunk){
                out.write(chunk);
              });
              
              stream.on('end', function() {
                console.log('saved public/output.jpg' );
              });
              // end testing
              
              //res.header('Content-Type', 'text/plain');
              //res.send(goTracer.getSGF(), 200);
              
              fs.writeFile('public/output.sgf', goTracer.getSGF(), function (err) {
                if (err) throw err;
                res.download('public/output.sgf', 'public/output.sgf');
              });
            }); // end of exec gocam_test
      }); // end of im.resize
  }); // end of exec jhead

}; // end of exports.analyze


/*
** FUNCTIONS
*/

function doMain () {
  goTracer = new GoTracer(img, canvas);
  setCorners();
  goTracer.startScan();
}

function GoTracer(img, canvas)
{
  this.img = img;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
}

function setCorners()
{
  coords = coords.map( function(c) { return 1*c; })
// 
//   console.log ("0: " + coords[0]);
//   console.log ("1: " + coords[1]);
//   console.log ("2: " + coords[2]);
//   console.log ("3: " + coords[3]);
//   console.log ("4: " + coords[4]);
//   console.log ("5: " + coords[5]);
//   console.log ("6: " + coords[6]);
//   console.log ("7: " + coords[7]);
//   console.log("4,5  0,1  2,3  6,7");
//   
//   goTracer.corners = [
//     new Point(coords[4], coords[5]),
//     new Point(coords[0], coords[1]),
//     new Point(coords[2], coords[3]),
//     new Point(coords[6], coords[7])
//   ];

// mirrored left->right, top->bottom -- swapped 1 & 2, 3 & 4
//   goTracer.corners = [
//     new Point(coords[0], coords[1]),
//     new Point(coords[4], coords[5]),
//     new Point(coords[6], coords[7]),
//     new Point(coords[2], coords[3])
//   ];

  
  if (coords[7] > coords[3]) {
    // Works with Orig_example.jpg (Top L highest)
    // fails with Good_EXIF.jpg (Top R hightes)-- mirrored top to bottom - swapped 1,2 & 3,4
    goTracer.corners = [
      new Point(coords[2], coords[3]),
      new Point(coords[6], coords[7]),
      new Point(coords[4], coords[5]),
      new Point(coords[0], coords[1])
    ];
    console.log("2,3  6,7  4,5  0,1  ");
    console.log("Top Left corner is highest");
  }
  else {
    // works with Good_EXIF.jpg (Top R highest)
    // fails with Orig_example.jpg (Top L highest) mirrored Top to bottom
    goTracer.corners = [
      new Point(coords[6], coords[7]),
      new Point(coords[2], coords[3]),
      new Point(coords[0], coords[1]),
      new Point(coords[4], coords[5])
      
    ];
   console.log("6,7  2,3   0,1   4,5  ");
   console.log("Top Right corner is highest");
  }

  console.log('goTracer.corners: ' + goTracer.corners);
}

GoTracer.prototype.startScan = function()
{
  this.drawImage();
  this.calcRadii();  

  var sets = this.getSets(new Rect3D(this.corners));
  
  this.quickPartition(sets, 50);
  this.partition(sets, 3);
  this.assignSets(sets);
};

GoTracer.prototype.drawImage = function()
{
  var aspectRatio = this.img.width / this.img.height;
  this.canvasWidth = Math.min(this.img.height * aspectRatio, this.img.width);
  this.canvasHeight = Math.min(this.img.width / aspectRatio, this.img.height);
  //console.log(img);
  //console.log("aspectRatio: " + aspectRatio);
  //console.log("image dimensions: " + this.img.width + "x" + this.img.height);
  // draw image at scale to fit in canvas width
  //this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
  this.ctx.drawImage(img, 0, 0);
};

GoTracer.prototype.calcRadii = function()
{
  var xs = this.corners.map(function(p) { return p.x });
  var ys = this.corners.map(function(p) { return p.y });
  var xMax = Math.max.apply(Math, xs);
  var xMin = Math.min.apply(Math, xs);
  var yMax = Math.max.apply(Math, ys);
  var yMin = Math.min.apply(Math, ys);
  this.xRadius = (xMax - xMin) / 100;
  this.yRadius = (yMax - yMin) / 100;
};

GoTracer.prototype.getSets = function(rect)
{
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

GoTracer.prototype.quickPartition = function(sets, target)
{
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

GoTracer.prototype.partition = function(sets, target)
{
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

GoTracer.prototype.assignSets = function(sets)
{
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

GoTracer.prototype.getMatch = function()
{
  return 1/3 * ( this.blackSet.getSpread() + this.whiteSet.getSpread() + this.boardSet.getSpread() );
}

GoTracer.prototype.getSGF = function()
{
  var blackCoords = this.blackSet.points.map(function(pt) { return pt.coord; })
  var whiteCoords = this.whiteSet.points.map(function(pt) { return pt.coord; })
  
  return '(;AB' + blackCoords.join('') + 'AW' + whiteCoords.join('') + ')';
};


function Point(x,y)
{
  this.x = x;
  this.y = y;
}

Point.prototype.mix = function(that, f)
{
  return new Point((1 - f) * this.x + f * that.x, (1 - f) * this.y + f * that.y);
};

Point.prototype.getColor = function(ctx)
{
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

Point.prototype.draw = function(ctx, c)
{
  if (c.constructor == Array)
    c = "rgb(" + c[0]/256*100 + "%," + c[1]/256*100 + "%," + c[2]/256*100 + "%)";
  ctx.fillStyle = c || "white";
  ctx.fillRect(this.x - 1, this.y - 1, 3, 3);
};

Point.prototype.toString = function()
{
  return Math.round(this.x) + "," + Math.round(this.y);
};

// A * x + B * y = C
function Line(p0, p1)
{
  this.A = p1.y - p0.y;
  this.B = p0.x - p1.x;
  this.C = this.A * p0.x + this.B * p0.y;
  this.o = p0;
}

Line.prototype.getIntersectionWith = function(that)
{
  var det = this.A * that.B - that.A * this.B;
  return new Point(
    (that.B * this.C - this.B * that.C) / det,
    (this.A * that.C - that.A * this.C) / det
  );
};

Line.prototype.getLength = function()
{
  if (!this.__length)
    this.__length = Math.sqrt(this.A * this.A + this.B * this.B);
  return this.__length;
};

Line.prototype.getDistanceTo = function(p)
{
  return Math.abs(this.A * p.x + this.B * p.y - this.C) / this.getLength();
};

function Rect3D(corners)
{
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

Rect3D.prototype.getPoint = function(fx, fy)
{
  var zab = this.za * (1 - fx) + this.zb * fx;
  var fab = fx * this.zb / zab;
  var zdc = this.zd * (1 - fx) + this.zc * fx;
  var fdc = fx * this.zc / zdc;
  var z = zab * (1 - fy) + zdc * fy;
  var f = fy * zdc / z;
  if (isNaN(f)) { fab = fx; fdc = fx; f = fy; }
  return this.a.mix(this.b, fab).mix(this.d.mix(this.c, fdc), f);
};

function PointSet(point)
{
  this.points = [point];
  this.x = point.x;
  this.y = point.y;
}

PointSet.prototype.add = function(that)
{
  var points = this.points.concat(that.points);
  this.x = (this.x * this.points.length + that.x * that.points.length) / points.length;
  this.y = (this.y * this.points.length + that.y * that.points.length) / points.length;
  this.points = points;
};

PointSet.prototype.getDistanceTo = function(that)
{
  return Math.abs(this.x - that.x) + Math.abs(this.y - that.y);
};

PointSet.prototype.draw = function(ctx, color)
{
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

PointSet.prototype.getSpread = function()
{
  var total = 0;
  var thisSet = this;
  this.points.map(function(p) { total += Math.abs(thisSet.x - p.x) + Math.abs(thisSet.y - p.y); } );
  return 100 - total / this.points.length;
}


function drawPixel(ctx, rgb, x, y)
{
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