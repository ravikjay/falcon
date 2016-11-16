// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), .5, 1, 1, 40, "" ) ); }


// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "logo.png", "earth.gif", "fire.jpg", "space2.jpg", "asteroid3.jpg", "spacehull.jpg", "planet.jpg", "rings.jpg", "star.jpg", "bluestar.jpg", "crystal.jpg" ];

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, .2, .4, 1 );		// Background color
		
		for( var i = 0; i < texture_filenames_to_load.length; i++ )
			initTexture( texture_filenames_to_load[i], true );
		
		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );
		self.m_triangle = new triangle();
		self.m_crystal = new crystal();
		self.m_textline = new text_line(100);

		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translation(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0002 * animation_delta_time;
		var meters_per_frame  = .01 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

Animation.prototype.drawAsteroid = function( stack, model_transform, asteroid)
{
	stack.push(model_transform);
		//model_transform = mult(model_transform, translation(0, 0, 0));
			model_transform = mult(model_transform, scale(10, 10, 10));
				this.m_sphere.draw(this.graphicsState, model_transform, asteroid);
    model_transform = stack.pop();
    return model_transform;
}

Animation.prototype.goFalcon = function( stack, model_transform, spacehull, jet_blue, darkspacehull, black)
{
	stack.push(model_transform);
		if (this.graphicsState.animation_time/1000 > 1 && this.graphicsState.animation_time/1000 < 20) {
			model_transform = mult(model_transform, translation(0, this.graphicsState.animation_time/1000, 0));
		}
			if (this.graphicsState.animation_time/1000 > 20) {
				model_transform = mult(model_transform, translation(0, 20, 0));
			}
				if (this.graphicsState.animation_time/1000 > 40) {
					model_transform = mult(model_transform, translation(0, 0, -17*this.graphicsState.animation_time/1000));
				}
					model_transform = this.drawFalcon(stack, model_transform, spacehull, jet_blue, darkspacehull, black);
	model_transform = stack.pop();

	return model_transform;
}

Animation.prototype.drawFalcon = function( stack, model_transform, spacehull, jet_blue, darkspacehull, black)
{
	// Draw Perimeter
	model_transform = this.drawPerimeter(stack, model_transform, spacehull, jet_blue, darkspacehull);

    // Draw Ceiling
    model_transform = this.drawCeiling(stack, model_transform, spacehull, darkspacehull, black);

    // Draw Hull
    model_transform = this.drawHull(stack, model_transform, spacehull, darkspacehull);


    // DEVELOPMENT SECTION *** DELETE AFTER FINISHING DESIGN ****

    // **** END OF DEVELOPMENT CODE SECTION *****

    return model_transform;
}

Animation.prototype.drawPerimeter = function( stack, model_transform, spacehull, jet_blue, darkspacehull)
{
	// Draw Base Ring
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, -20));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, scale(20, 20, 6));
					this.m_cylinder.draw(this.graphicsState, model_transform, spacehull);
    model_transform = stack.pop();

    // Draw Afterburner
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 0, -14));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, scale(17, 15, 3));
					this.m_cylinder.draw(this.graphicsState, model_transform, jet_blue);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawCeiling = function( stack, model_transform, spacehull, darkspacehull, black)
{
	// Draw Base Ceiling
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 3, -20));
			model_transform = mult(model_transform, scale(20, 0, 20));
				this.m_sphere.draw(this.graphicsState, model_transform, spacehull);
    model_transform = stack.pop();

    // Draw Blaster Cockpit
    model_transform = this.drawBlasterCockpit(stack, model_transform, darkspacehull);

    // Draw Nose Wings
    model_transform = this.drawNoseWings(stack, model_transform, darkspacehull);

    // Draw Ceiling Details
    model_transform = this.drawCeilingDetail(stack, model_transform, darkspacehull, black);

    return model_transform;
}

Animation.prototype.drawCeilingDetail = function( stack, model_transform, darkspacehull, black)
{
	// Draw Ceiling Tubes
	model_transform = this.drawCeilingTubes(stack, model_transform, darkspacehull);

	// Draw Other Details
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(-3, 3, -12));
			model_transform = mult(model_transform, scale(2, .5, 2));
				this.m_sphere.draw(this.graphicsState, model_transform, black);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(3, 3, -12));
			model_transform = mult(model_transform, scale(2, .5, 2));
				this.m_sphere.draw(this.graphicsState, model_transform, black);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-6, 3, -8));
			model_transform = mult(model_transform, scale(2, .5, 2));
				this.m_sphere.draw(this.graphicsState, model_transform, black);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(6, 3, -8));
			model_transform = mult(model_transform, scale(2, .5, 2));
				this.m_sphere.draw(this.graphicsState, model_transform, black);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 3, -8));
			model_transform = mult(model_transform, scale(2, .5, 2));
				this.m_sphere.draw(this.graphicsState, model_transform, black);
    model_transform = stack.pop();

	return model_transform;
}

Animation.prototype.drawCannon = function( stack, model_transform, darkspacehull)
{
	// Draw Cannon
	return model_transform;
}

Animation.prototype.drawCeilingTubes = function( stack, model_transform, darkspacehull)
{
	// Draw Center Sphere
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 4, -20));
			model_transform = mult(model_transform, scale(4, 1, 4));
				this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    // Draw Cannon

    // Draw Right Horizontal Ceiling Tubes
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(20, 3, -19));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
			    model_transform = mult(model_transform, rotation(90, 0, 0, 1));
					model_transform = mult(model_transform, scale(2, 0, 2));
						this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(12, 3, -19));
			model_transform = mult(model_transform, rotation(90, 0, 1, 0));
				model_transform = mult(model_transform, scale(2, 2, 16));
					this.m_cylinder.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(4, 3, -19));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, rotation(90, 0, 0, 1));
					model_transform = mult(model_transform, scale(2, 0, 2));
						this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    // Draw Left Horizontal Ceiling Tubes
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-4, 3, -19));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
			    model_transform = mult(model_transform, rotation(90, 0, 0, 1));
					model_transform = mult(model_transform, scale(2, 0, 2));
						this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-12, 3, -19));
			model_transform = mult(model_transform, rotation(90, 0, 1, 0));
				model_transform = mult(model_transform, scale(2, 2, 16));
					this.m_cylinder.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-20, 3, -19));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, rotation(90, 0, 0, 1));
					model_transform = mult(model_transform, scale(2, 0, 2));
						this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawNoseWings = function( stack, model_transform, darkspacehull)
{
	// Draw Cockpit
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 2, -40));
			model_transform = mult(model_transform, rotation(90, 0, 0, 1));
				model_transform = mult(model_transform, scale(3, 3, 15));
					this.m_cylinder.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

	// Draw Right-Upper NoseWing
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(5, 2, -35));
			model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
				model_transform = mult(model_transform, scale(8, 20, 0));
					this.m_triangle.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(3.5, 0, -45));
			model_transform = mult(model_transform, rotation(90, 0, 0, 1));
				model_transform = mult(model_transform, scale(4, 3, 20));
					this.m_cube.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    // Draw Right-Lower NoseWing
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(5, -2, -35));
			model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
				model_transform = mult(model_transform, scale(8, 20, 0));
					this.m_triangle.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    // Draw Left-Upper Wing
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-5, 2, -35));
			model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
				model_transform = mult(model_transform, rotation(180, 0, 1, 0));
					model_transform = mult(model_transform, scale(8, 20, 0));
						this.m_triangle.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-3.5, 0, -45));
			model_transform = mult(model_transform, rotation(90, 0, 0, 1));
				model_transform = mult(model_transform, scale(4, 3, 20));
					this.m_cube.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    // Draw Left-Lower Wing
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-5, -2, -35));
			model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
				model_transform = mult(model_transform, rotation(180, 0, 1, 0));
					model_transform = mult(model_transform, scale(8, 20, 0));
						this.m_triangle.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawBlasterCockpit = function( stack, model_transform, darkspacehull)
{
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(16, 3, -25));
			model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
				model_transform = mult(model_transform, scale(3, 2, 5));
					this.m_fan.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(22, 3, -22));
				model_transform = mult(model_transform, rotation(90, 1, 0, 0));
					model_transform = mult(model_transform, scale(3, 0, 3));
						this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(22, 3, -26));
			model_transform = mult(model_transform, scale(3, 3, 8));
				this.m_cylinder.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(22, 3, -30));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, scale(3, 0, 3));
					this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawHull = function( stack, model_transform, spacehull, darkspacehull)
{
	// Draw Base Hull
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, -3, -20));
				model_transform = mult(model_transform, scale(20, 0, 20));
					this.m_sphere.draw(this.graphicsState, model_transform, spacehull);
    model_transform = stack.pop();

    // Draw Landing Gear
	model_transform = this.drawLandingGear(stack, model_transform, darkspacehull);

    return model_transform;
}

Animation.prototype.drawLandingGear = function( stack, model_transform, darkspacehull)
{
	// Draw Back-Right
	model_transform = this.drawLandingGearFunction(stack, model_transform, darkspacehull, 2, -7.5, -9);

	// Draw Top-Right
	model_transform = this.drawLandingGearFunction(stack, model_transform, darkspacehull, 2, -7.5, -29);

	stack.push(model_transform);
	model_transform = mult(model_transform, rotation(180, 0, 1, 0));	
	// rotate/reflect the right side of Landing Gear 
	// subtract 2 from X & add 40 to Z to move Back Landing Gear fully into place
	
	// Draw Back-Left
	model_transform = this.drawLandingGearFunction(stack, model_transform, darkspacehull, 0, -7.5, 31);

	// Draw Top-Left
	model_transform = this.drawLandingGearFunction(stack, model_transform, darkspacehull, 0, -7.5, 11);
	
	model_transform = stack.pop();

	return model_transform;
}

// ** This function contains a two­ level hierarchical object (Landing Gear Arms)
Animation.prototype.drawLandingGearFunction = function( stack, model_transform, darkspacehull, x_coord, y_coord, z_coord)
{
	// Landing Gear
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(x_coord, y_coord, z_coord));
		model_transform = mult(model_transform, scale(1/2, 1/2, 1/2));
			stack.push(model_transform);
				// Upper Landing Gear Platform
				stack.push(model_transform);
					model_transform = mult(model_transform, rotation(90, 0, 1, 0));
						model_transform = mult(model_transform, translation(0, 8, -20));
							model_transform = mult(model_transform, scale(20, 1, 20));
								this.m_cube.draw(this.graphicsState, model_transform, darkspacehull);
			    model_transform = stack.pop();
			    stack.push(model_transform);
			    	// Landing Arm
			    	model_transform = mult(model_transform, rotation(90, 0, 1, 0));
						model_transform = mult(model_transform, translation(0, 9, -25));
						if (this.graphicsState.animation_time/1000 > 0 && this.graphicsState.animation_time/1000 < 10) {
							model_transform = mult(model_transform, rotation(-90*Math.abs(Math.sin((1/2)*this.graphicsState.animation_time/4000)), 1, 0, 0));}
							if (this.graphicsState.animation_time/1000 > 10) {model_transform = mult(model_transform, rotation(-90, 1, 0, 0));}
								model_transform = mult(model_transform, translation(0, -8, -3));	// move axis aka move point of rotation for leg (pivot)
									model_transform = mult(model_transform, scale(3, 15, 3));
										this.m_cube.draw(this.graphicsState, model_transform, darkspacehull);
									model_transform = mult(model_transform, scale(1/3, 1/15, 1/3));
								model_transform = mult(model_transform, translation(0, 8, 3));
								
								// Landing Pad
								model_transform = mult(model_transform, rotation(180, 1, 0, 0));
									model_transform = mult(model_transform, translation(-5, 15, 5));
									if (this.graphicsState.animation_time/1000 > 0 && this.graphicsState.animation_time/1000 < 10) {
										model_transform = mult(model_transform, rotation(90*Math.abs(Math.sin((1/2)*this.graphicsState.animation_time/4000)), 1, 0, 0));}
										if (this.graphicsState.animation_time/1000 > 10) {model_transform = mult(model_transform, rotation(90, 1, 0, 0));}
											model_transform = mult(model_transform, translation(5, 0, 0));
												model_transform = mult(model_transform, scale(10, .5, 10));
													this.m_sphere.draw(this.graphicsState, model_transform, darkspacehull);
			    model_transform = stack.pop();
			model_transform = stack.pop();
	model_transform = stack.pop();

	return model_transform;
}

Animation.prototype.drawSpace = function( stack, model_transform, space)
{
	var scalex = 800;
	var scaley = 800;

	// Draw Wrap Cylinder
	stack.push(model_transform);
		model_transform = mult(model_transform, rotation(180, 1, 0, 1));
			model_transform = mult(model_transform, rotation(90, 1, 0, 0));
				model_transform = mult(model_transform, scale(scalex, scaley, 1000));
					this.m_cylinder.draw(this.graphicsState, model_transform, space);
    model_transform = stack.pop();

    // Draw Bottom Circle
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, -500, 0));
			model_transform = mult(model_transform, scale(scalex, 0, scalex));
				this.m_sphere.draw(this.graphicsState, model_transform, space);
    model_transform = stack.pop();

    // Draw Bottom Circle
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, 500, 0));
			model_transform = mult(model_transform, scale(scalex, 0, scalex));
				this.m_sphere.draw(this.graphicsState, model_transform, space);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawPlanets = function( stack, model_transform, planet, rings, star, star2, bluestar)
{
	// Draw Saturn
	model_transform = this.drawSaturn(stack, model_transform, planet, rings);

	// Draw Star
	model_transform = this.drawSun(stack, model_transform, star, star2, bluestar);

	return model_transform;
}

Animation.prototype.drawSaturn = function( stack, model_transform, planet, rings)
{
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(-200, -100, -400));
			model_transform = mult(model_transform, scale(150, 150, 150));
				this.m_sphere.draw(this.graphicsState, model_transform, planet);
    model_transform = stack.pop();

    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-200, -100, -400));
			model_transform = mult(model_transform, rotation(15, 0, 1, 1));
			model_transform = mult(model_transform, scale(300, 0, 300));
				this.m_sphere.draw(this.graphicsState, model_transform, rings);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawSun = function( stack, model_transform, star, star2, bluestar)
{
	// Draw Red Sol
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(+250, +180, -550));
			model_transform = mult(model_transform, scale(70, 70, 70));
				this.m_sphere.draw(this.graphicsState, model_transform, star);
    model_transform = stack.pop();

    // Draw Smaler Purple Sol
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-320, +200, -500));
			model_transform = mult(model_transform, scale(40, 40, 40));
				this.m_sphere.draw(this.graphicsState, model_transform, star2);
    model_transform = stack.pop();

    // Draw Big Blue Sol
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(+300, -150, -550));
			model_transform = mult(model_transform, scale(100, 100, 100));
				this.m_sphere.draw(this.graphicsState, model_transform, bluestar);
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawDeathStar = function( stack, model_transform, spacehull, darkspacehull)
{
	//z = -400;
	// Draw Death Star
    stack.push(model_transform);
		model_transform = mult(model_transform, translation(-20, 0, 600));
			model_transform = mult(model_transform, scale(300, 300, 300));
				this.m_sphere.draw(this.graphicsState, model_transform, spacehull);
    model_transform = stack.pop();

  //   // Draw Circle Strip
  //   stack.push(model_transform);
		// model_transform = mult(model_transform, translation(-20, 0, 600));
		// 	model_transform = mult(model_transform, rotation(90, 1, 0, 0));
		// 		model_transform = mult(model_transform, scale(320, 350, 350));
		// 			this.m_cylinder.draw(this.graphicsState, model_transform, darkspacehull);
  //   model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawTractorBeam = function( stack, model_transform, paleyellow)
{
	stack.push(model_transform);
		if (this.graphicsState.animation_time/1000 > 25 && this.graphicsState.animation_time/1000 < 40) {
			model_transform = mult(model_transform, translation(0, 0, -20));
				model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/40, 0, 1, 0));
					model_transform = mult(model_transform, rotation(-90, 1, 0, 0));
						model_transform = mult(model_transform, scale(5, 5, 18));
							this.m_fan.draw(this.graphicsState, model_transform, paleyellow);
		}
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawCrystal = function( stack, model_transform, crystal, paleyellow)
{
	/** TESTING PURPOSES **/
	// stack.push(model_transform);
	// 	model_transform = mult(model_transform, scale(50, 50, 50));
	// 		this.m_crystal.draw(this.graphicsState, model_transform, crystal);
	// model_transform = stack.pop();
	/** TESTING **/

	stack.push(model_transform);
		model_transform = this.drawTractorBeam(stack, model_transform, paleyellow);
		model_transform = mult(model_transform, translation(0, 0, -20));
		if (this.graphicsState.animation_time/1000 > 20 && this.graphicsState.animation_time/1000 < 30) {
			model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/40, 0, 1, 0));
				model_transform = mult(model_transform, scale(7, 7, 7));
					this.m_crystal.draw(this.graphicsState, model_transform, crystal);
		}
			if (this.graphicsState.animation_time/1000 > 30 && this.graphicsState.animation_time/1000 < 39) {
				model_transform = mult(model_transform, translation(0, -25, 0));
					model_transform = mult(model_transform, translation(0, this.graphicsState.animation_time/1000, 0));
						model_transform = mult(model_transform, scale(4, 4, 4));
							this.m_crystal.draw(this.graphicsState, model_transform, crystal);
			}
				if (this.graphicsState.animation_time/1000 > 39 && this.graphicsState.animation_time/1000 < 40) {
					model_transform = mult(model_transform, translation(0, 15, 0));
						model_transform = mult(model_transform, scale(2, 2, 2));
							this.m_crystal.draw(this.graphicsState, model_transform, crystal);
				}
    model_transform = stack.pop();

    return model_transform;
}

Animation.prototype.drawPlatform = function( stack, model_transform, redspacehull, darkspacehull)
{
	// Draw Base Platform
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, -15, -20));
				model_transform = mult(model_transform, scale(40, 1, 40));
					this.m_sphere.draw(this.graphicsState, model_transform, redspacehull);
    model_transform = stack.pop();

    // Draw Extending Arm
	stack.push(model_transform);
		model_transform = mult(model_transform, translation(0, -18, 70));
				model_transform = mult(model_transform, scale(40, 5, 250));
					this.m_cube.draw(this.graphicsState, model_transform, darkspacehull);
    model_transform = stack.pop();

	return model_transform;
}

Animation.prototype.moveCamera = function()
{
	if (this.graphicsState.animation_time/1000 > 0 && this.graphicsState.animation_time/1000 < 5) {
		this.graphicsState.camera_transform = lookAt( vec3(0,-(this.graphicsState.animation_time/2000),20), vec3(1,-5, 1), vec3(0,1,0)); 
	}

	if (this.graphicsState.animation_time/1000 > 5 && this.graphicsState.animation_time/1000 < 10) {
		this.graphicsState.camera_transform = lookAt( vec3(0,-50,20), vec3(1,-50+(this.graphicsState.animation_time/2000), 1), vec3(0,1,0)); 
	}

	if (this.graphicsState.animation_time/1000 > 15 && this.graphicsState.animation_time/1000 < 19.15) { //4.15
		//this.graphicsState.camera_transform = mult(this.graphicsState.camera_transform, rotation(20*Math.abs(Math.sin(this.graphicsState.animation_time/100000)), 0, 1, 0));
		this.graphicsState.camera_transform = lookAt( vec3(100*Math.cos(this.graphicsState.animation_time/1000), 
			0, -100+(100*Math.sin(this.graphicsState.animation_time/1000))), vec3(1,-5, -100), vec3(0,1,0)); 
		//this.graphicsState.camera_transform = lookAt( vec3(0,-50,20), vec3(1,-5, 1), vec3(0,1,0)); 
	}

	if (this.graphicsState.animation_time/1000 > 20 && this.graphicsState.animation_time/1000 < 25) {
		this.graphicsState.camera_transform = lookAt( vec3(0,-5+(this.graphicsState.animation_time/2000),20), vec3(1,5, 1), vec3(0,1,0)); 
	}

	if (this.graphicsState.animation_time/1000 > 25 && this.graphicsState.animation_time/1000 < 30) {
		this.graphicsState.camera_transform = lookAt( vec3(0,10-(this.graphicsState.animation_time/2000),20), vec3(1,-5, 1), vec3(0,1,0)); 
	}
}

Animation.prototype.drawBegin = function( stack, model_transform, black, greyPlastic, logo)
{
	if (this.graphicsState.animation_time/1000 == 0) {
		// Draw Base Platform
		stack.push(model_transform);
			model_transform = mult(model_transform, rotation(90, 0, 0, 1));
				model_transform = mult(model_transform, translation(0, -15, 0));
						model_transform = mult(model_transform, scale(400, 400, 1));
							this.m_cube.draw(this.graphicsState, model_transform, black);
	    model_transform = stack.pop();

		// Draw Base Platform
		stack.push(model_transform);
			model_transform = mult(model_transform, translation(0, 65, 1));
				model_transform = mult(model_transform, rotation(180, 0, 0, 1));
					//model_transform = mult(model_transform, rotation(90, 0, 0, 0));
						model_transform = mult(model_transform, scale(70, 30, 1));
							this.m_cube.draw(this.graphicsState, model_transform, logo);
	    model_transform = stack.pop();

	    stack.push(model_transform);
	    	model_transform = mult(model_transform, translation(-70, 40, 1));
				model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
					model_transform = mult(model_transform, scale(5, 5, 5));
							this.m_textline.set_string("Han Solo stole the last lightsaber crystal");
								this.m_textline.draw(this.graphicsState, model_transform, false, vec4( 0,0,0,1 ));
	    model_transform = stack.pop();

	    stack.push(model_transform);
	    	model_transform = mult(model_transform, translation(-30, 30, 1));
				model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
					model_transform = mult(model_transform, scale(5, 5, 5));
							this.m_textline.set_string("from the Death Star.");
								this.m_textline.draw(this.graphicsState, model_transform, false, vec4( 0,0,0,1 ));
	    model_transform = stack.pop();

	    stack.push(model_transform);
	    	model_transform = mult(model_transform, translation(-75, 15, 1));
				model_transform = mult(model_transform, rotation(-90, 0, 1, 0));
					model_transform = mult(model_transform, scale(5, 5, 5));
							this.m_textline.set_string("Now he must take off and jump to lightspeed!");
								this.m_textline.draw(this.graphicsState, model_transform, false, vec4( 0,0,0,1 ));
	    model_transform = stack.pop();
	}

	return model_transform;
}

var sound = new Audio("starwars.mp3");

// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) {
			this.graphicsState.animation_time += this.animation_delta_time;
			this.moveCamera(); 
		}
		prev_time = time;
		
		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		// Materials: Declare new ones as needed in every function.
		// 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
		var purplePlastic = new Material( vec4( .9,.5,.9,1 ), .2, .5, .8, 40 ), // Omit the final (string) parameter if you want no texture
			greyPlastic = new Material( vec4( .5,.5,.5,1 ), .7, .8, .5, 20 ),
			jet_blue = new Material( vec4( 0,1,1,1 ), .5, .8, .5, 20, "fire.jpg" ),
			black = new Material( vec4( 0,0,0,1 ), .7, .8, .5, 20 ),
			paleyellow = new Material( vec4( 1,1,0,.15 ), 1, .8, .5, 20 ),
			space = new Material( vec4( .5,.5,.7,1 ), .3, 1, .5, 40, "space2.jpg" ),
			asteroid = new Material( vec4( .5,.5,.5,1 ), .1, 1, .5, 40, "asteroid3.jpg" ),
			darkspacehull = new Material( vec4( .5,.5,.5,1 ), .3, 1, .5, 40, "spacehull.jpg" ),
			spacehull = new Material( vec4( .5,.5,.5,1 ), .5, 1, .5, 40, "spacehull.jpg" ),
			redspacehull = new Material( vec4( .5,.5,.5,1 ), .5, 1, .5, 40, "spacehull.jpg" ),
			planet = new Material( vec4( .5,.5,.5,1 ), .5, 1, .5, 40, "planet.jpg" ),
			star = new Material( vec4( .5,.5,.5,1 ), .7, .8, .5, 20, "star.jpg"),
			bluestar = new Material( vec4( .5,.5,.5,1 ), .7, .8, .5, 20, "bluestar.jpg"),
			star2 = new Material( vec4( .5,.5,1,1 ), .7, .8, .5, 20, "star.jpg"),
			crystal = new Material( vec4( 1,.5,.7,1 ), .5, .8, .5, 20, "crystal.jpg"),
			logo = new Material( vec4( 0,0,0,1 ), 1, 1, 1, 20, "logo.png"),
			rings = new Material( vec4( .5,.5,.5,1 ), 1, 1, .5, 40, "rings.jpg" );

		/**********************************
		Start coding here!!!!
		**********************************/
		
		var stack = [];

		if (animate)
			sound.play();

		/** Build Space **/
		model_transform = this.drawSpace(stack, model_transform, space);

		/** Establish the origin **/
		model_transform = mult(model_transform, translation(0, -35, -80));

		/** Build Planets **/
		model_transform = this.drawPlanets(stack, model_transform, planet, rings, star, star2, bluestar);

		/** Build Death Star **/
		model_transform = this.drawDeathStar(stack, model_transform, spacehull, darkspacehull);

		/************* TESTING PURPOSES ONLY *******************/
		//model_transform = mult(model_transform, rotation(this.graphicsState.animation_time/40, 0, 1, 0));
		/*********************************************************/

		/** Build crystal **/
		model_transform = this.drawCrystal(stack, model_transform, crystal, paleyellow);

		/** Build Landing Platform **/
		model_transform = this.drawPlatform(stack, model_transform, redspacehull, darkspacehull);

		/** Build Falcon **/
		model_transform = this.goFalcon(stack, model_transform, spacehull, jet_blue, darkspacehull, black);

		/** Build Screen **/
		model_transform = this.drawBegin(stack, model_transform, black, greyPlastic, logo);

	}	



Animation.prototype.update_strings = function( debug_screen_strings )		// Strings this particular class contributes to the UI
{
	debug_screen_strings.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	//debug_screen_strings.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	//debug_screen_strings.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	//debug_screen_strings.string_map["thrust"] = "Thrust: " + thrust;
	debug_screen_strings.string_map["FPS"] = "FramesPerSecond: " + 1000/Math.floor(this.animation_delta_time);
}