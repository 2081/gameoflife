var gpu = new GPU();

var opt = {
    dimensions: [100, 100]
};


var W = 64;

function makePadFunc( dims, pad ){

	var dims = dims.slice();
	for( var d = 0; d < dims.length && d < 2; ++d ) dims[d] += 2*pad;

	return gpu.createKernel(function( A ){
		if( this.thread.x >= this.constants.pad && this.thread.x < this.dimensions.x - this.constants.pad	
			&& this.thread.y >= this.constants.pad && this.thread.y < this.dimensions.y - this.constants.pad){
			return A[this.thread.y - this.constants.pad][this.thread.x - this.constants.pad];
		} else {
			return 0;
		}
	}, {
		dimensions: dims,
		constants: {
			pad: pad
		}
	});
}


function makeConvFunc( dims, ksize, stride, pad ){ // in_c, out_c,

	var padFunc = makePadFunc(dims, pad);

	var convFunc = gpu.createKernel(function( A, K ){

		var x = this.constants.pad + this.thread.x*this.constants.stride;
		var y = this.constants.pad + this.thread.y*this.constants.stride;

		var k2 = Math.floor((this.constants.ksize-1)/2.0);

		var res = 0;

		for( var i = 0; i < this.constants.ksize; ++i ){
			for( var j = 0; j < this.constants.ksize; ++j ){
				res = res + A[y+j-k2][x+i-k2] * K[j][i];
			}
		}

		return res;

	}, {
		dimensions : [
			(dims[0] - ksize + 2*pad)/stride + 1,
			(dims[1] - ksize + 2*pad)/stride + 1
		],
		constants: {
			ksize: ksize,
			stride: stride,
			pad: pad
		},
		debug: false
	});

	return function( A, K ){
		return convFunc(padFunc(A), K);
	}

}


// console.log( makePadFunc([2, 2], 1)([[1, 2], [3, 4]]) );


// console.log( makeConvFunc([2, 2], 3, 1, 1)([[1, 2], [3, 4]], [[0, 0, 0], [0, 1, 0], [0, 0, 0]]) );
// console.log( makeConvFunc([2, 2], 2, 1, 0)([[1, 2], [3, 4]], [[1, 0], [0, 0]]) );
// console.log( makeConvFunc([2, 2], 2, 1, 0)([[1, 2], [3, 4]], [[0, 1], [0, 0]]) );
// console.log( makeConvFunc([2, 2], 2, 1, 0)([[1, 2], [3, 4]], [[0, 0], [1, 0]]) );
// console.log( makeConvFunc([2, 2], 2, 1, 0)([[1, 2], [3, 4]], [[0, 0], [0, 1]]) );

// makeConvFunc(1, 1, 3, 1, 2 );

// var now = Date.now();

// // for( var i = 0; i < 100; ++i) makeConvFunc([2, 2], 3, 1, 1)([[1, 2], [3, 4]], [[0, 0, 0], [0, 1, 0], [0, 0, 0]])

// // console.log('create + use', Date.now() - now )
// // now = Date.now();
// var f = makeConvFunc([2, 2], 3, 1, 1);
// for( var i = 0; i < 100; ++i) f([[1, 2], [3, 4]], [[0, 0, 0], [0, 1, 0], [0, 0, 0]])

// console.log('create once then use', Date.now() - now )

// var now = Date.now();

// for( var i = 0; i < 100; ++i) f([[1, 2], [3, 4]], [[0, 0, 0], [0, 1, 0], [0, 0, 0]])

// console.log('just use', (Date.now() - now)/100 )

// -----------------------------------------------------------

function DNA( dna ){

	// this.baseRadius = 


}

function Cell( dna ){

	this.radius = 1;
	this.x = 0;
	this.y = 0;
	this.color = 0;

	this.vx = thix.vy = 0;


}

/*

for i in N chromosomes

- angle : any value ( %2pi in computations )
- power : 0 - pmax
- duration: 0 - 10 000ms
- time: 0 - 15 000ms * i


*/
var GRAVITY = true;
var PMAX = 5000000;
var DURATION_MAX = 5000;
var TIME_MAX = 5000;
var N_TARGET = 3;
var TARGET_RADIUS = 40;

var N_BALLS = 100;

var W = 1000, H = 600;
var VMAX = Math.max(W,H);
var G = 2000;
var K = 0.47;

var dt_divisor = 1;


var crng = new RNG('chromosome'+Math.random());

function Chromosome( n, zero ){
	this.angle = crng.uniform()*2*Math.PI;
	this.power = zero ? 0 : crng.random(0, PMAX);
	this.duration = zero ? 0 : crng.random(0, DURATION_MAX);
	this.time = zero ? 0 : crng.random(0, (n || 1)*TIME_MAX);
}

var colorrng = new RNG('color');
function Ball( x, y, r, zero ){

	this.chromosomes = [];
	this.chromosomes.push( new Chromosome(1, zero) );
	this.chromosomes.push( new Chromosome(2, zero) );
	this.chromosomes.push( new Chromosome(3, zero) );

	this.zpriority = Math.random();

	this.density = 2;
	this.k = K;

	this.x = x || W/2;
	this.y = y || H-25;
	this.radius = r || 25;

	this.lastx = this.x;
	this.lasty = this.y;

	// this.style = 'rgb('+colorrng.random(0,255)+','+colorrng.random(0,255)+','+colorrng.random(0,255)+')';
	this.red = colorrng.random(0,255);
	this.green = colorrng.random(0,255);
	this.blue = colorrng.random(0,255);

	this.vx = 0; //Math.random()*2000 - 1000;
	this.vy = 0; //Math.random()*2000 - 1000; //-5000;

	this.cx = 0;
	this.cy = 0;


	this.target = 0;
	this.distance = -1;
	this.target_times = [];
	this.time = null;

}

var trng = new RNG('targets');
var targets = [];
var best_target = 0;

function getTarget( n ){
	return targets[n] || (targets[n] = {
		x: trng.uniform()*W,
		y: trng.uniform()*H,
		count: 0
	});
}

getTarget(0);
getTarget(1);


// -----------------------------------------------------------


var canvas = document.getElementById('canvas');
canvas.width = W;
canvas.height = H;

console.log(new Chromosome());

var rng = new RNG('citrouille');
var rng_land = new RNG('hamburger');

canvas.addEventListener('mousedown', function(){
	console.log('down');
	dt_divisor = 0.1;
});
canvas.addEventListener('mouseup', function(){
	console.log('up');
	dt_divisor = 1;
});


var balls = [];
// balls.push(new Ball(100, null, 100));
// balls.push(new Ball(350, null, 50));
// balls.push(new Ball(600, null, 10));

for( var i = 0; i < N_BALLS; ++i ) balls.push(new Ball(W/2, H-25, 25, true));
// for( var i = 0; i < 100; ++i ) balls.push(new Ball(rng.random(30, 570), rng.random(100, 400), 25));

console.log(balls);

var context = canvas.getContext("2d");

function contract( dx ){
	return 1 - Math.exp(-3*dx);
}
function release( c ){
	return -Math.log(1-Math.min(c, 0.99999999999999))/3;
}

function posAt( dt, g, m, k, fx, fy, vx0, vy0, x0, y0, r ){

	// console.log(dt);

	var tau = m/k,
		gamx = tau*(fx/m),
		gamy = tau*(g + fy/m),
		deltax = tau*(vx0 - gamx),
		deltay = tau*(vy0 - gamy);

	function pos( t ){
		return {
			x: -deltax*Math.exp(-t/tau) + gamx*t + deltax + x0,
			y: -deltay*Math.exp(-t/tau) + gamy*t + deltay + y0
		}
	}

	var t1 = 0, t2 = dt, t = t2;
	var p = pos( t2 );

	var outY = function( p ){ return p.y - r < 0 || p.y + r > H; };
	var outX = function( p ){ return p.x - r < 0 || p.x + r > W; };

	if( outY(p) || outX(p) ){

		do{
			var t = (t1 + t2)/2;
			var p_ = pos(t);

			if( outY(p_) || outX(p_) ){
				t2 = t;
			} else {
				t1 = t;
			}

		}while(t2 - t1 > 0.005 );



		var p2 = pos(t1);

		var vx = (vx0 - gamx)*Math.exp(-t1/tau) + gamx;
		var vy = (vy0 - gamy)*Math.exp(-t1/tau) + gamy;

		if( outY(p) ){
			vy *= -0.55;
			vx *= 1-1.85*dt;
		}
		if( outX(p) ){
			vx *= -0.55;
			vy *= 1-1.85*dt;
		}

		if( p2.y - r < 0 ) p2.y = r;
		if( p2.y + r > H ) p2.y = H - r;
		if( p2.x - r < 0 ) p2.x = r;
		if( p2.x + r > W ) p2.x = W - r;

		if( Math.max(Math.abs(vy), Math.abs(vx)) * (dt - t1) >= 0.5 ){
			return posAt( dt - t1, g, m, k, fx, fy, vx, vy, p2.x, p2.y );
		} else {
			return {
				x: p2.x,
				y: p2.y,
				vx: 0,
				vy: 0
			};

		}

	}

	var result = {
		x: p.x,
		y: p.y,
		vx: (vx0 - gamx)*Math.exp(-t/tau) + gamx,
		vy: (vy0 - gamy)*Math.exp(-t/tau) + gamy
	};


	if( Math.abs(result.vx) < 1 ) result.vx = 0;
	if( Math.abs(result.vy) < 1 ) result.vy = 0;

	return result;
}



function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

var start, t1, elapsed_t1, time_left = null;


function step(t2) {
	if( time_left == null ) time_left = TIME_MAX;
	if(!elapsed_t1) elapsed_t1 = 0;
	if(!start) start = t2;
	if(!t1) t1 = t2;
	var dt = t2 - t1;
	var t = t2 - start;

	dt /= dt_divisor
	var elapsed_t2 = elapsed_t1 + dt;

	var dt1000 = dt/1000;

	context.clearRect( W/2 - 100, 0, 200, 100);

	for(var i in balls){
		var ball = balls[i];

		context.clearRect(ball.x - 2*ball.radius, ball.y - 2*ball.radius, 4*ball.radius, 4*ball.radius);
	}
	for(var i in targets){
		var t = targets[i];

		context.clearRect(t.x - 50, t.y - 50, 100, 100);
	}

	var mvx = 0, mvy = 0;

	for(var i in balls){
		var ball = balls[i];

		var vol = 0.75*3.14*ball.radius*ball.radius*ball.radius;
		
		var m = vol * ball.density;

		var times = [elapsed_t1, elapsed_t2];
		for( var j in ball.chromosomes ){
			var c = ball.chromosomes[j];
			if( c.time > elapsed_t1  && c.time < elapsed_t2 ) times.push(c.time);
			if( c.time + c.duration > elapsed_t1  && c.time + c.duration < elapsed_t2 ) times.push(c.time + c.duration);
		}

		times = times.sort(function(a, b){ return a - b;});

		ball.lastx = ball.x;
		ball.lasty = ball.y;

		for(var j = 0; j < times.length - 1; ++j ){


			var t1_ = times[j],
				t2_ = times[j+1],
				t12 = (t1_ + t2_)/2;

			// console.log(t1_, t2_);
			// console.log(t2_ > t1_);

			var fx = 0;
			var fy = 0;

			for( var k in ball.chromosomes ){
				var c = ball.chromosomes[k];
				if( c.time < t12 && c.time + c.duration > t12 ){
					fx += Math.cos(c.angle) * c.power*100;
					fy -= Math.sin(c.angle) * c.power*100;
				}
			}

			// var tau = m/ball.k;

			// console.log(t2_ - t1_);

			var pos = posAt( (t2_ - t1_)/(1000) , G, m, ball.k, fx, fy, ball.vx, ball.vy, ball.x, ball.y, 0);

			// console.log(ball.x, ball.y, ball.vx, ball.vy)
			// console.log(pos);

			ball.x = pos.x;
			ball.y = pos.y;
			ball.vx = pos.vx;
			ball.vy = pos.vy;

		}

	}

	for(var i = 0; i < balls.length; ++i){
		var ball = balls[i];

		var n = ball.target,
			target = getTarget(n);

		var d1 = Math.sqrt(Math.pow(target.x - ball.x, 2) + Math.pow(target.y - ball.y, 2)),
			d2 = Math.sqrt(Math.pow(target.x - (ball.lastx+ball.x)/2, 2) + Math.pow(target.y - (ball.lasty+ball.y)/2, 2));//,
			// d3 = Math.sqrt(Math.pow(ball.lastx - ball.x, 2) + Math.pow(ball.lasty - ball.y, 2));

		if( d1 <= Math.abs(TARGET_RADIUS - ball.radius)
			||  d2 <= Math.abs(TARGET_RADIUS - ball.radius) ) {
			if( target.count === 0 ){
				time_left += TIME_MAX;
				best_target = ball.target+1;
			}
			target.count++;
			ball.target++;
			ball.distance = -1;
			ball.target_times.push(elapsed_t2);
			i--;

		} else if( ball.distance < 0 || d1 < ball.distance ){
			ball.distance = d1;
		}


	}

	for(var i = targets.length-Math.min(3, targets.length); i < targets.length; ++i){
		var t = targets[i];

		context.beginPath();
		context.arc(t.x+2, t.y+3, TARGET_RADIUS, 0, 2 * Math.PI, false);
		context.fillStyle = 'rgba(0,0,0,0.2)';
		context.fill();

		context.beginPath();
		context.arc(t.x, t.y, TARGET_RADIUS, 0, 2 * Math.PI, false);
		context.fillStyle = 'rgba(255,255,255,1)';
		context.fill();

		context.beginPath();
		context.arc(t.x, t.y, TARGET_RADIUS - 2, -Math.PI/2, 2*Math.PI*t.count/N_BALLS -Math.PI/2, false);
		context.lineWidth = 4;
		context.strokeStyle = '#3d8ee8';
		context.stroke();

		context.fillStyle = 'rgba(0,0,0,0.2)';
		context.font = "30px Roboto";
		context.textAlign = "center";
		context.textBaseline = 'middle';
		context.fillText(pad(i+1, 2),t.x,t.y);
	}

	balls.sort(function(b1, b2){ return 2*(b1.target- b2.target) + b1.zpriority - b2.zpriority});

	for(var i in balls){
		var ball = balls[i];

		var scy = 1-Math.max( ball.y + ball.radius - H, - ball.y + ball.radius, 0)/ball.radius/2,
			scx = 1-Math.max( ball.x + ball.radius - W, - ball.x + ball.radius, 0)/ball.radius/2;

		var dx = 0, dy = 0;

		function f( x ){
			var n = 8;
			// return n*x/((n-1)*x+1);
			return -x/((n-1)*x-n);
			// var k = 2.75;
			// return (Math.atan(10*(x-0.5)) + k/2)/k;

			// return Math.pow(x, 2);
		}

		if( true ){
			var speed = 1500;
			var v = 1 + f((1-Math.min(speed, Math.abs(ball.vy))/speed))*4.5;
			var scy_ = 1 - (1-scy)/v ;
			var scx_ = 1 - (1-scx)/v ;

			dy = 2*(scy_-scy) * ball.radius;
			dx = 2*(scx_-scx) * ball.radius;

			scy = scy_;
			scx = scx_;
		}

		scx2 = scx + (1-scy)
		scy2 = scy + (1-scx)

		context.save();

		context.translate(
			(ball.x > W/2 ? -1 : 1)*(Math.abs(dx) + ball.radius*(1-scx)),
			(ball.y > H/2 ? -1 : 1)*(Math.abs(dy) + ball.radius*(1-scy))
		);
		context.scale(scx2, scy2);

		context.beginPath();
		context.arc((ball.x + 2)/scx2, (ball.y+3)/scy2, ball.radius, 0, 2 * Math.PI, false);
		context.fillStyle = 'rgba(0,0,0,0.1)';
		context.fill();


		context.beginPath();
		context.arc((ball.x)/scx2, ball.y/scy2, ball.radius, 0, 2 * Math.PI, false);
		context.fillStyle = 'rgba('+ball.red+','+ball.green+','+ball.blue+','+ (ball.target == best_target ? 1 : 0.2)+')';
		context.fill();

		context.fillStyle = 'rgba(255,255,255,0.75)';
		context.font = "18px Roboto";
		context.textAlign = "center";
		context.textBaseline = 'middle';
		context.fillText(pad(ball.target, 2), ball.x/scx2, ball.y/scy2);

		context.beginPath();
		context.strokeStyle = 'white';

		context.moveTo(ball.x/scx2, ball.y/scy2);
		context.lineTo((ball.x + 50*ball.vx/VMAX)/scx2, ((ball.y)+50*ball.vy/VMAX)/scy2);
		context.stroke();



		context.restore();

	}

	var minutes = Math.floor((time_left/60000)),
		seconds = Math.ceil((time_left/1000)) - 60*minutes;

	context.fillStyle = 'rgba(255,255,255,1)';
	context.font = "42px Roboto";
	context.textAlign = "center";
	context.textBaseline = 'top';
	context.fillText(pad(minutes, 2)+':'+pad(seconds, 2), W/2, 0);


	time_left -= dt;

	if( time_left < 0 ){
		time_left = TIME_MAX;
		// dt_divisor = 20;

		function score( ball ){
			ball.score = 0;
			for( var i = 0; i < ball.target; ++i ) ball.score += (W+H) / Math.max(1, ball.target_times[i]);
			ball.score += (W+H-ball.distance) / Math.max( 1, elapsed_t2 - (ball.target > 0 ? ball.target_times[ball.target-1] : 0));
			// console.log(ball.score);
			return ball;
		}
		function sortBalls( b1, b2 ){
			return b2.score - b1.score;
		}

		var sorted_balls = balls.map(score).sort(sortBalls);

		console.log('best score:', sorted_balls[0].score);
		console.log('lowest score:', sorted_balls[N_BALLS-1].score);

		// console.log(sorted_balls);
		// a = g;

		var n_select = Math.floor(0.2*N_BALLS);
		var selected = sorted_balls.slice(0, n_select);

		var new_balls = [];

		for( var i = 0; i < n_select; ++i ){
			var b = new Ball();
			b.chromosomes = selected[i].chromosomes;
			new_balls.push(b);
		}

		for( var i = n_select; i < N_BALLS; ++i ){
			var r1 = brng.random(0, n_select),
				r2 = brng.random(0, n_select - 1);
			if( r2 >= r1 ) r2 += 1;
			new_balls.push( breed( selected[r1], selected[r2] ) );
		}

		targets = [];
		trng = new RNG('targets');
		best_target = 0;

		balls = new_balls;
		elapsed_t1 = elapsed_t2 = 0;

		context.clearRect(0, 0, W, H);

	}


	t1 = t2;
	elapsed_t1 = elapsed_t2;
	window.requestAnimationFrame(step);
}

window.requestAnimationFrame(step);


var brng = new RNG('breeding');

function breed( b1, b2 ){
	var b = new Ball();

	if( brng.random(0,1) ){
		var b_ = b2;
		b2 = b1;
		b1 = b_;
	}

	b.red = 0.9*b1.red + 0.1*b2.red;
	b.green = 0.9*b1.green + 0.1*b2.green;
	b.blue = 0.9*b1.blue + 0.1*b2.blue;

	for( var i = 0; i < b.chromosomes.length; ++i ){
		// var r = brng.random(0,1);
		var c1 = b1.chromosomes[i],
			c2 = b2.chromosomes[i],
			c3 = new Chromosome();

		for( var key in c3 ){
			var r = brng.uniform();
			if( r < 0.005 || r > 0.995 ){
				var color = ['red','green','blue'][brng.random(0,2)];
				b[color] = 0.2*brng.random(0,255) + 0.8*b[color];
			} else {
				var c = r < 0.9 ? c1 : c2;
				if( brng.uniform() < 0.1 ){
					c3[key] = 0.9*c[key] + 0.1*c3[key];
					console.log('RARE');
				} else {
					c3[key] = c[key];
				}
			} 
		}

		b.chromosomes[i] = c3;

	}
	return b;
}
