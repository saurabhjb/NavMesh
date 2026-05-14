var canvas = null;
var isFullscreen = false;
var canvasOriginalWidth = 0;
var canvasOriginalHeight = 0;

var cam = null;
var scene = null;

var requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    null;

var cancelAnimationFrame =
    window.cancelAnimationFrame || window.cancelRequestAnimationFrame ||
    window.mozCancelAnimationFrame || window.mozCancelRequestAnimationFrame ||
    window.oCancelAnimationFrame || window.oCancelRequestAnimationFrame ||
    window.msCancelAnimationFrame || window.msCancelRequestAnimationFrame ||
    window.webkitCancelAnimationFrame || window.webkitCancelRequestAnimationFrame ||
    null;

// Shader and its resources
var shaderProgram;
var vertexShader;
var fragmentShader;

var uniformModel;
var uniformView;
var uniformProjection;
var uniformColor;


// Callbacks
var firstClick = true;
var leftButtonPressed = false;

var lastX = 0;
var lastY = 0;

function mouseMove(event) {
    if (leftButtonPressed) {
        
        if (firstClick)
        {
            lastX = event.clientX;
            lastY = event.clientY;
            firstClick = false;
        }

        let deltaX = lastX - event.clientX;
        let deltaY = lastY - event.clientY;

        cam.Update(deltaX, deltaY);
        
        lastX = event.clientX;
        lastY = event.clientY;
    }
}

function contextMenu(event) {
    event.preventDefault();
    // Pass this to mouse down event
    mouseDown(event);
}

function resize() {
    if (isFullscreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvasOriginalWidth;
        canvas.height = canvasOriginalHeight;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    cam.UpdateAspectRation(canvas.width, canvas.height);
}

function mouseUp(event) {
    if (event.button == 0)
    {
        leftButtonPressed = false;
        firstClick = true;
    }
}

function mouseDown(event) {
    if (event.button == 0)
        leftButtonPressed = true;
}

function keyDown(event) {
    switch (event.keyCode) {
        case 27:
            uninit();
            window.close();
            break;

        case 65:
            updateProjetionMatrices();
            break;

        case 70:
            toggleFullscreen();
            break;
    }
}

function scroll(event) {
    cam.UpdateFOV(event.deltaY / 10000.0)
}

function main() {
    canvas = document.getElementById("WGL2");
    if (!canvas) {
        console.log("obtaining canvas failed.");
    }
    else {
        console.log("Obtaining canvas succeeded.");
    }

    canvasOriginalWidth = canvas.width;
    canvasOriginalHeight = canvas.height;

    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("mouseup", mouseUp, false);
    window.addEventListener("mousedown", mouseDown, false);
    window.addEventListener("resize", resize, false);
    canvas.addEventListener("wheel", scroll, false);
    canvas.addEventListener("mousemove", mouseMove, false);
    canvas.addEventListener("contextmenu", contextMenu, false);

    init();

    resize();
    
    draw();
}

function toggleFullscreen() {
    var fullscreen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullscreenElement || document.msFullscreenElement || null;

    if (fullscreen_element == null) {
        if (canvas.requestFullscreen)
            canvas.requestFullscreen();
        else if (canvas.webkitRequestFullscreen)
            canvas.webkitRequestFullscreen();
        else if (canvas.mozRequestFullscreen)
            canvas.mozRequestFullscreen();
        else if (canvas.msRequestFullscreen)
            canvas.msRequestFullscreen();

        isFullscreen = true;
    }
    else {
        if (document.exitFullscreen)
            document.exitFullscreen()
        else if (document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if (document.msExitFullscreen)
            document.msExitFullscreen();

        isFullscreen = false;
    }
}

function init() {
    gl = canvas.getContext("webgl2");
    if (gl == null) {
        console.log("Failed to get the rendering Context from WebGL2.");
        return;
    }

    cam = new Camera();

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    var vertexShaderSourceCode = 
        "#version 300 es\n"
        + "\n"
        + "in vec4 vPosition;\n"
        + "\n"
        + "uniform mat4 u_m_matrix;\n"
        + "uniform mat4 u_v_matrix;\n"
        + "uniform mat4 u_p_matrix;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " gl_Position = u_p_matrix * u_v_matrix * u_m_matrix * vPosition;\n"
        + "}\n";
    vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSourceCode);

    var fragmentShaderSourceCode =
        "#version 300 es\n"
        + "\n"
        + "precision highp float;\n"
        + "\n"
        + "uniform vec3 u_color;\n"
        + "\n"
        + "out vec4 fragColor;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " fragColor = vec4(u_color, 1.0);\n"
        + "}\n";
    fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

    var shaderBindings = [
        { atribute: SHADER_ATTRIBUTES.POSITION, name: "vPosition" }
    ];

    shaderProgram = createProgram(vertexShader, fragmentShader, shaderBindings);
    uniformModel = gl.getUniformLocation(shaderProgram, "u_m_matrix");
    uniformView = gl.getUniformLocation(shaderProgram, "u_v_matrix");
    uniformProjection = gl.getUniformLocation(shaderProgram, "u_p_matrix");
    uniformColor = gl.getUniformLocation(shaderProgram, "u_color");

    const ext = gl.getExtension("WEBGL_polygon_mode");
    ext.polygonModeWEBGL(gl.FRONT_AND_BACK, ext.FILL_WEBGL);

    scene = new Scene();
    // Ground setup
    scene.ground = new Quad("ground", 10.0, 10.0, 11, 11);
    scene.ground.UpdatePosition(0.0, -0.5, 0.0);
    // Cube setup
    scene.cubes.push(new Cuboid("Obs1", 1.0, [0.5, 0.0, 0.5]));
    scene.cubes.push(new Cuboid("Obs2", 1.0, [1.5, 0.0, 1.5]));
    scene.cubes.push(new Cuboid("Obs3", 1.0, [2.5, 0.0, 2.5]));
    scene.cubes.push(new Cuboid("Obs4", 1.0, [3.5, 0.0, 3.5]));
    // Agent setup
    scene.agent = new Cylinder("agent", 1.0, 2.0, 10, [2.5, 0.5, 1.5]);
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.75, 0.75, 0.75, 1.0);
    gl.clearDepth(1.0);
}

function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    var viewMat = cam.GetView();
    var projMat = cam.GetProjection();

    var modelViewProjectionMatrix = mat4.create();

    mat4.multiply(modelViewProjectionMatrix, projMat, viewMat);

    gl.uniformMatrix4fv(uniformProjection, false, projMat);
    gl.uniformMatrix4fv(uniformView, false, viewMat);
    
    var modelMat = scene.ground.GetTransformMatrix();
    gl.uniform3fv(uniformColor, groundColor);
    gl.uniformMatrix4fv(uniformModel, false, modelMat);
    scene.ground.Render();

    for (cube in scene.cubes) {
        modelMat = scene.cubes[cube].GetTransformMatrix();
        gl.uniform3fv(uniformColor, cubeColor);
        gl.uniformMatrix4fv(uniformModel, false, modelMat);
        scene.cubes[cube].Render();
    }

    modelMat = scene.agent.GetTransformMatrix();
    gl.uniform3fv(uniformColor, agentColor);
    gl.uniformMatrix4fv(uniformModel, false, modelMat);
    scene.agent.Render();

    gl.useProgram(null);

    requestAnimationFrame(draw, canvas);
}
