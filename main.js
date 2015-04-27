function init()
{
    //CREATE NEW THREE JS SCENE
    var scene = new THREE.Scene();
    
    //INIT AND SET UP RENDER
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var renderer = new THREE.WebGLRenderer({antialias:true});
        renderer.setClearColor(new THREE.Color('lightgrey'), 1)
        renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT); // SET RENDER SIZE
        document.body.appendChild( renderer.domElement ); // APPEND RENDER CANVAS TO BODY
        renderer.domElement.id = "canvas_threeJS"; // SET CANVAS ID
    
    //ADD CAMERA TO THE SCENE
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR =1000;
    var camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
        camera.position.set(-4,6,12);
        scene.add(camera);
    
    
    //HANDLE WINDOW RESIZE
	window.addEventListener('resize', function(){
		renderer.setSize( window.innerWidth, window.innerHeight )
		camera.aspect	= window.innerWidth / window.innerHeight
		camera.updateProjectionMatrix();
	}, false);
    
    
    //ADD AMBIENT LIGHT
    var ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight)
    
    // 3d PAN AND ZOOM CONTROLS
    var controls = new THREE.OrbitControls(camera,renderer.domElement);
        controls.maxDistance = 14;
        controls.noPan = true;
        controls.maxPolarAngle = 1.4;
    
    //ADD POINT LIGHT
    var light = new THREE.PointLight(0xffffff,.7);
        light.position.set(0,7,3);
        scene.add(light);
    
    //INIT PHYSICS
    var world = new p2.World();
        world.sleepMode = p2.World.BODY_SLEEPING;
        world.setGlobalStiffness(1e6);
        world.solver.iterations = 30;
        world.defaultContactMaterial.relaxation= 2;
        world.defaultContactMaterial.restitution= 0.001;
    
        world.on('beginContact', function (e) 
        {
            //LAND ON TARGET
            if(e.bodyA.name == "ground" && e.bodyB.target)
            {
                e.bodyB.on('sleep',winner)
            }
            
            //LAND OUTSIDE
            if(e.bodyA.name == "backGround" && e.bodyB.target)
            {
                e.bodyB.on('sleep',loose)
            }
            
            
        });
        
    //INIT DEBUG VIEW
    var physicsDebug = new debug(world);
    
    //GET THE DROPDOWN MENU 
    var levelSelect =  document.getElementById("levelSelect");
    //ADD EVENT TO THE DROPDOWN MENU
    levelSelect.addEventListener("change", loadLevel);
    
    //ADD XML LOADER
    var xhttp = new XMLHttpRequest();
        xhttp.open("GET","assets/level_1.svg",false);
        xhttp.onload = parseSVG;
        xhttp.send();
    
    
    //GET ALL LAYERS/LEVELS FROM SVG 
    function parseSVG()
    {
        //GET ALL LAYERS
        var layers = xhttp.responseXML.getElementsByTagName("g");
        
        //ADD NEW OPTION TO THE SELECT MENU FOR EACH LAYER
        for (var i = 0; i < layers.length; i++) 
        { 
            var option = document.createElement("option");
                option.text = layers[i].getAttribute("inkscape:label"); //GET LAYER NAME
                option.id = layers[i].getAttribute("id"); //ADD ID
                levelSelect.add(option);    
        };
    };
    
    //SVG OFFSET VALUES
    var mirrorY = xhttp.responseXML.getElementsByTagName("svg")[0].getAttribute("height"); //MIRROR Y VALUE
    var centerX = xhttp.responseXML.getElementsByTagName("svg")[0].getAttribute("width")/2; //MOVE TO CENTER X
    
    //LOAD LEVEL SELECTED BY DROPDOWN MENU
    function loadLevel(e)
    {
        
        var selected = xhttp.responseXML.getElementById(levelSelect[levelSelect.selectedIndex].id);
        var level = selected.getElementsByTagName("rect");
        
        //DESTROY CURRENT LEVEL
        destroyLevel();
        
        //REMOVE WIN/LOOSE SCREEN
        document.getElementById("winScreen").style.visibility ="hidden";
        document.getElementById("looseScreen").style.visibility ="hidden";
        
        //PARSE LOADED SVG FILE
        for (var i = 0; i < level.length; i++) 
        { 
            if(level[i].getAttribute("id").indexOf("ground") > -1)
            {
                addGround(level[i])
            }
            else
            {
                addBox(level[i])
            };
        };
    };
    
    //LOAD FIRST LEVEL
    loadLevel();
    
    //ARRAY HOLDS OBJECTS TO REMOVE
    var removeBodys = [];
    
    //REMOVE LEVEL
    function destroyLevel()
    {
        //GET ALL BODIES IN THE WORLD
        for (var i = 0; i < world.bodies.length; i++) 
        { 
            if(world.bodies[i].name == "box" || world.bodies[i].name == "ground")
            {
                removeBodys.push(world.bodies[i]);
                scene.remove( world.bodies[i].data );
            };
        };  
        
    };
    
    //YOU TOTALLY WON
    function winner(e)
    {
        e.target.off('sleep',winner);
        document.getElementById("winScreen").style.visibility ="visible";
    }
    
    //YOU SCREWED UP
    function loose(e)
    {
        e.target.off('sleep',loose);
        document.getElementById("looseScreen").style.visibility ="visible";
    }
    
    
    //ADD CLICK EVENT
    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'touchstart', onDocumentMouseDown, false );
    
    var raycaster = new THREE.Raycaster(); 
    var mouse = new THREE.Vector2(); 

    function onDocumentMouseDown( event ) {

        event.preventDefault();
        
        //IS TOUCH OR CLICK EVENT
        if(event.type == 'mousedown')
        {
            mouse = new THREE.Vector2(
            ( event.clientX / window.innerWidth ) * 2 - 1,
          - ( event.clientY / window.innerHeight ) * 2 + 1
            );
        }
        else
        {
             mouse = new THREE.Vector2(
            ( event.touches[0].clientX / window.innerWidth ) * 2 - 1,
          - ( event.touches[0].clientY / window.innerHeight ) * 2 + 1
            )
        };
        
        //SEND RAY IN 3D SPACE
        raycaster.setFromCamera( mouse, camera );
        
        //GET OBJECTS IN TOUCH/CLICK POSITION
        var intersects = raycaster.intersectObjects( scene.children );

        if ( intersects.length > 0 ) {
            
            //CHECK IF OBJECT CAN BE DESTROYED
            if(intersects[0].object.name == "cube" && !intersects[0].object.data.target)
            {
                //PREPARE TO REMOVE 2D OBJECT
                removeBodys.push(intersects[0].object.data);
                //REMOVE 3D OBJECT
                scene.remove( intersects[0].object );
                
                //AWAKE EACH BODY IN P2 WORLD
                for (var i = 0; i < world.bodies.length; i++) 
                { 
                  world.bodies[i].wakeUp()
                }
            };
            
        };
    };
    
    //ADD SKYBOX/BACKGROUND
    addBackground();
    
    
    //FUNCTION TO ADD SKYBOX/BACKGROUND
    function addBackground()
    {
        //CREATE NEW TEXTURE FROM IMAGE
        var skyBoxTexture = new THREE.ImageUtils.loadTexture( 'assets/grid.png' );
            skyBoxTexture.wrapS = skyBoxTexture.wrapT = THREE.RepeatWrapping; 
            skyBoxTexture.repeat.set( 4, 4 );

        //CREATE NEW MATERIAL WITH TEXTURE APPLIED
        var floorMat =  new THREE.MeshPhongMaterial( { map: skyBoxTexture, side: THREE.BackSide,shininess: 1} );

        //CREATE NEW 3d BOX MESH WITH MATERIAL
        var skyBox = new THREE.Mesh(new THREE.BoxGeometry(20,20,20), floorMat);
            skyBox.position.y += 10;
            scene.add(skyBox);
        
        //CREATE NEW P2 PHYSICS BODY -> 2d GROUNDPLANE
        var planeShape = new p2.Plane();
        var planeBody = new p2.Body({position:[0,0]});
            planeBody.name = "backGround"; //ADD NAME TO 2d OBJECT
            planeBody.data = skyBox; //ADD MESH OBJECT
            planeBody.addShape(planeShape);
            world.addBody(planeBody);
        
    }
    
    //FUNCTION TO ADD NEW GROUND TARGET
    function addGround(boxData)
    {
        var x = boxData.getAttribute("x")-centerX+(boxData.getAttribute("width")/2);
        var y = mirrorY-boxData.getAttribute("y")-(boxData.getAttribute("height")/2)
        var w = boxData.getAttribute("width");
        var h = boxData.getAttribute("height");
        var color = boxData.style.fill;
        //CREATE NEW MATERIAL WITH RANDOM COLOR
        var material = new THREE.MeshPhongMaterial( { color: color } );
        
        
        //CREATE NEW 3d BOX MESH WITH MATERIAL
        var cube = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), material);
            cube.position.set(x,y,0);
            cube.name = "ground"
            scene.add(cube);
        
        //CREATE NEW P2 PHYSICS BODY -> 2d BOX
        var boxShape = new p2.Rectangle(w,h);
        var boxBody = new p2.Body({ mass:0, position:[x,y]});
            boxBody.data = cube;
            boxBody.name="ground";
            boxBody.allowSleep = true;
            boxBody.sleepSpeedLimit = 1; // Body will feel sleepy if speed<1 (speed is the norm of velocity)
            boxBody.sleepTimeLimit =  2; // Body falls asleep after 1s of sleepiness
            boxBody.addShape(boxShape);
            world.addBody(boxBody);
            cube.data = boxBody;
        
    }
    
    
    //FUNCTION TO ADD NEW RANDOM BOX
    function addBox(boxData)
    {
        var x = boxData.getAttribute("x")-centerX+(boxData.getAttribute("width")/2);
        var y = mirrorY-boxData.getAttribute("y")-(boxData.getAttribute("height")/2)
        var w = boxData.getAttribute("width");
        var h = boxData.getAttribute("height");
        var color = boxData.style.fill;
        //CREATE NEW MATERIAL WITH RANDOM COLOR
        var material = new THREE.MeshPhongMaterial( { color: color } );
        
        
        //CREATE NEW 3d BOX MESH WITH MATERIAL
        var cube = new THREE.Mesh(new THREE.BoxGeometry(w, h, .75), material);
            cube.position.set(x,y,0);
            cube.name = "cube"
            scene.add(cube);
        
        //CREATE NEW P2 PHYSICS BODY -> 2d BOX
        var boxShape = new p2.Rectangle(w,h);
        var boxBody = new p2.Body({ mass:1, position:[x,y]});
            boxBody.data = cube;
            boxBody.name="box";
            boxBody.allowSleep = true;
            boxBody.sleepSpeedLimit = 1; // Body will feel sleepy if speed<1 (speed is the norm of velocity)
            boxBody.sleepTimeLimit =  2; // Body falls asleep after 1s of sleepiness
            boxBody.addShape(boxShape);
            world.addBody(boxBody);
            cube.data = boxBody;
        
        
            if(boxData.id.indexOf("target") > -1)
            {
                boxBody.target = true;
            }
    }
    
    
    //START RENDER
    var clock = new THREE.Clock();
    update();
    
    function update(nowMsec)
    {
        
        //REMOVEVE FROM PHYSICS WORLD
        if(removeBodys.length > 0)
        {
            for (var i = 0; i < removeBodys.length; i++) 
            { 
                world.removeBody(removeBodys[i]);
            }
            
            removeBodys = []
        }
        
        //GET DELTA TIME
        var  delta = clock.getDelta();
        
        //KEEP FRAMES ABOVE 24
//        if(delta > 1/24){delta = 1/30}
        
        //UPDATE PHYSICS
        world.step(1/60,delta);
        
        //DRAW DEBUG
        physicsDebug.update()
        //FOR EACH 2d BODY IN THE WORLD
        for (var i = 0; i < world.bodies.length; i++) 
        { 
            //IF 2d BODY HAS NAME BOX
            if(world.bodies[i].name == "box")
            {
                //UPDATE 3d MESH BODY POSITION AND ROTATION ACCORDINGLY
                world.bodies[i].data.position.set(world.bodies[i].position[0],world.bodies[i].position[1],0);
                world.bodies[i].data.rotation.z = world.bodies[i].angle; 
            }
        };  
        
        //UPDATE 3D SCENE
        renderer.render( scene, camera );
        
        //KEEP UPDATING
        requestAnimationFrame( update );
    };
};

var debug = function(world)
{
    //CREATE AND DEFINE DEBUG CANVAS
    var canvas = document.createElement("canvas");        // Create a <canvas> element
        document.body.appendChild(canvas);
        canvas.style.position = "absolute";
        canvas.style.backgroundColor = "rgba(100,100,100,0.5)";
        canvas.style.zIndex = "100";
        canvas.style.left = "0px";
        canvas.width =window.innerWidth/6;
        canvas.height = window.innerHeight/6;
    
    this.w = canvas.width;
    this.h = canvas.height;
    
    this.world = world;
    
    this.ctx = canvas.getContext("2d");
    this.ctx.lineWidth = 0.05;
    this.ctx.strokeStyle = '#b22020';
    
}

debug.prototype.drawPlane = function() 
{
    var y = 0;
    this.ctx.moveTo(-this.w, y);
    this.ctx.lineTo( this.w, y);
    this.ctx.stroke();
}

debug.prototype.drawBox = function(body) 
{
        this.ctx.beginPath();
        var x = body.position[0],
            y = body.position[1];
        this.ctx.save();
        this.ctx.translate(x, y);        // Translate to the center of the box
        this.ctx.rotate(body.angle);  // Rotate to the box body frame
        this.ctx.rect(-body.shapes[0].width/2, -body.shapes[0].height/2, body.shapes[0].width, body.shapes[0].height);
        this.ctx.stroke();
        this.ctx.restore();
}

debug.prototype.update = function() 
{
    this.ctx.clearRect(0,0,this.w,this.h);

    this.ctx.save();
    this.ctx.translate(this.w/2, this.h-10);  // Translate to the center
    this.ctx.scale(15, -15);       // Zoom i
    
    // Draw all bodies
    for (var i = 0; i < this.world.bodies.length; i++) 
    { 
        if(this.world.bodies[i].name == "box" || this.world.bodies[i].name == "ground")
        {
            this.drawBox(this.world.bodies[i]);
        }
    };  
    
    this.drawPlane();
    
    this.ctx.restore();
}



