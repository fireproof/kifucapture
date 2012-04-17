/* ------------------- */
/*  GoTracer Functions */
/* ------------------- */


function GoTracer(img, canvas)
{
	this.img = img;
	this.canvas = canvas;
	this.ctx = canvas.getContext('2d');
	console.log('GoTracer - this.img.src: ' + this.img.src);
	console.log('GoTracer - this.canvas: ' + this.canvas);
	console.log('GoTracer - this.img.width: ' + this.img.width + ' this.img.height: ' + this.img.height);
}

GoTracer.prototype.setCorners = function()
{
	coords = coords.map( function(c) { return 1*c; }); // could dived each corner coordinate by the same amount as display 
	console.log('coords: ' + coords);
	
	this.corners = [
					new Point(coords[2], coords[3]),
					new Point(coords[6], coords[7]),
					new Point(coords[4], coords[5]),
					new Point(coords[0], coords[1])
					];
	console.log('this.corners: ');
	console.log(this.corners);
}


GoTracer.prototype.startScan = function()
{
	console.log('startScan');
	this.drawImage();
	this.calcRadii();  
	
	var sets = this.getSets(new Rect3D(this.corners));
	
	this.quickPartition(sets, 50);
	this.partition(sets, 3);
	this.assignSets(sets);
};

GoTracer.prototype.drawImage = function()
{
	console.log('drawImage');
	var aspectRatio = this.img.width / this.img.height;
	this.canvasWidth = Math.min(this.img.height * aspectRatio, this.img.width);
	this.canvasHeight = Math.min(this.img.width / aspectRatio, this.img.height);
	//console.log(this.img);
	console.log("drawImage - aspectRatio: " + aspectRatio);
	console.log("drawImage - image dimensions: " + this.img.width + "x" + this.img.height);
	console.log("drawImage - canvasWidth x Height: " + this.canvasWidth + "x" + this.canvasHeight);
	console.log("drawImage - this.canvas.width x height: " + this.canvas.width + "x" + this.canvas.height);
	// draw image at scale to fit in canvas width as set in onPhotoURISuccess/onDataSuccess
	this.ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
	// draw image at actual size (to match coordinates)
	//            this.ctx.drawImage(this.img, 0, 0);
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
	//console.log (blackCoords.join(''));
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

/* -------------------- */
/*   Preview Functions  */
/* -------------------- */

function Preview(cvs)
{
	console.log("Preview begins");
	this.canvas = cvs;
	this.ctx = this.canvas.getContext('2d');
	this.backgroundImage = new Image();
	this.backgroundImage.src = "images/blank_board.png";
}

Preview.prototype = {
	update: function(goTracer) {
		console.log("Preview.update");
		this.clear();
		this.draw(goTracer.blackSet.points, "black");
		this.draw(goTracer.whiteSet.points, "white");
	},
	clear: function() {
		console.log("Preview.clear");
		this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
	},
	draw: function(points, color) {
		console.log("Preview.draw");
		this.ctx.fillStyle = color == "white" ? "rgb(255,255,255)" : "rgb(0,0,0)";
		for ( var p=0 ; p<points.length ; p++ ) {
			this.drawStone(points[p]);
		}
	},
	
	// point here is anything with a .x and a .y, like a PointSet
	drawStone: function(point) {
		var x = 10 + 10.46*(point.coord[1].charCodeAt(0) - 97) -4;
		var y = 10 + 10.46*(point.coord[2].charCodeAt(0) - 97) -4;
		var r = 5;
		
		this.ctx.beginPath();
		this.ctx.arc(x, y, r, 0, 2*Math.PI, 0)
		this.ctx.fill();
		this.ctx.closePath();
	}
};

