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

// Callbacks
var firstClick = true;
var leftButtonPressed = false;
var readPixels = false;

var lastX = 0;
var lastY = 0;

var pixelX = -1;
var pixelY = -1;

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

    createFramebuffers();

    cam.UpdateAspectRation(canvas.width, canvas.height);
}

function mouseUp(event) {
    if (event.button == 0)
    {
        leftButtonPressed = false;
        firstClick = true;
        readPixels = true;
        pixelX = event.clientX - 8;
        pixelY = canvas.height - event.clientY + 8;
    }
}

function mouseDown(event) {
    if (event.button == 0) {
        leftButtonPressed = true;
    }
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

// Pass 1
var dummyFBO = null;

var framebuffer = null;
var colorAttachment_output = null;
var colorAttachemnt_ObjIds = null;
var depthAttachment = null;

var fboProgram = null;

var uniform_model = null;
var uniform_view = null;
var uniform_projection = null;

var uniform_obj_color = null;

// Pass 2
var vao_quadRender = null;
var vbo_quadIndices = null;

var quadRenderProgram = null;
var uniform_texture_sampler = null;

function main() {
    canvas = document.getElementById("WGL2");
    if (!canvas) {
        console.log("obtaining canvas failed.");
    }

    canvasOriginalWidth = canvas.width;
    canvasOriginalHeight = canvas.height;

    window.addEventListener("keydown", keyDown, false);
    canvas.addEventListener("mouseup", mouseUp, false);
    canvas.addEventListener("mousedown", mouseDown, false);
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

function createFramebuffers() {
    if (framebuffer != null)
        gl.deleteFramebuffer(framebuffer);

    if (colorAttachment_output != null)
        gl.deleteTexture(colorAttachment_output);

    if (colorAttachemnt_ObjIds != null)
        gl.deleteTexture(colorAttachemnt_ObjIds);

    if (depthAttachment != null)
        gl.deleteTexture(depthAttachment);

    // Framebuffer setup
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    // Color Attachment Output
    colorAttachment_output = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorAttachment_output);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, canvas.width, canvas.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Color Attachment ObjIds
    colorAttachemnt_ObjIds = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colorAttachemnt_ObjIds);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, canvas.width, canvas.height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Depth Attachment
    depthAttachment = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthAttachment);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Attach to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorAttachment_output, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, colorAttachemnt_ObjIds, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthAttachment, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function createFramebufferPassResources() {
    dummyFBO = gl.createFramebuffer();

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
    var fragmentShaderSourceCode =
        "#version 300 es\n"
        + "\n"
        + "precision highp float;\n"
        + "precision highp int;\n"
        + "\n"
        + "uniform vec3 u_color;\n"
        + "uniform int u_objID;\n"
        + "\n"
        + "layout (location = 0) out vec4 fragColor;\n"
        + "layout (location = 1) out vec4 outObjID;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " fragColor = vec4(u_color, 1.0);\n"
        + " outObjID = vec4(float(u_objID) / 255.0, 0, 0, 1);\n"
        + "}\n";
    
    var vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSourceCode);
    var fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSourceCode);

    var shaderBindings = [
        { atribute: SHADER_ATTRIBUTES.POSITION, name: "vPosition" }
    ];

    fboProgram = createProgram(vertexShader, fragmentShader, shaderBindings);
    uniform_model = gl.getUniformLocation(fboProgram, "u_m_matrix");
    uniform_view = gl.getUniformLocation(fboProgram, "u_v_matrix");
    uniform_projection = gl.getUniformLocation(fboProgram, "u_p_matrix");
    uniform_obj_color = gl.getUniformLocation(fboProgram, "u_color");
    uniform_obj_id = gl.getUniformLocation(fboProgram, "u_objID");

    createFramebuffers();
}

function createQuadRenderPassResources() {
    var quadVertexShaderSource = 
        "#version 300 es\n"
        + "\n"
        + "vec4 QuadVertices[4] = vec4[4](\n"
        + " vec4(-1.0, -1.0, 0.0, 1.0),\n"
        + " vec4(-1.0, 1.0, 0.0, 1.0),\n"
        + " vec4(1.0, 1.0, 0.0, 1.0),\n"
        + " vec4(1.0, -1.0, 0.0, 1.0)\n"
        + ");\n"
        + "\n"
        + "vec2 QuadTexcoords[4] = vec2[4](\n"
        + " vec2(0.0, 0.0),\n"
        + " vec2(0.0, 1.0),\n"
        + " vec2(1.0, 1.0),\n"
        + " vec2(1.0, 0.0)\n"
        + ");\n"
        + "\n"
        + "out vec2 outTexcoord;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " gl_Position = QuadVertices[gl_VertexID];"
        + " outTexcoord = QuadTexcoords[gl_VertexID];"
        + "}\n";
    var quadPixelShaderSource = 
        "#version 300 es\n"
        + "\n"
        + "precision highp float;\n"
        + "\n"
        + "in vec2 outTexcoord;\n"
        + "\n"
        + "uniform sampler2D u_texture_sampler;\n"
        + "\n"
        + "out vec4 fragColor;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " fragColor = texture(u_texture_sampler, outTexcoord);\n"
        + "}\n";
    var quad_vso = compileShader(gl.VERTEX_SHADER, quadVertexShaderSource);
    var quad_pso = compileShader(gl.FRAGMENT_SHADER, quadPixelShaderSource);
    quadRenderProgram = createProgram(quad_vso, quad_pso, []);

    uniform_texture_sampler = gl.getUniformLocation(quadRenderProgram, "u_texture_sampler");

    let indices = [0, 2, 1, 0, 3, 2];
    var indicesData = new Uint32Array(indices, 0, indices.length);

    // generate vaos and vbos
    vao_quadRender = gl.createVertexArray();
    gl.bindVertexArray(vao_quadRender);

    vbo_quadIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo_quadIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    gl.bindVertexArray(null);
}

function renderShapes() {
    var vertexShader = 
        "#version 300 es\n"
        + "\n"
        + "in vec4 vPosition;\n"
        + "\n"
        + "uniform mat4 u_m_matrix;\n"
        + "uniform mat4 u_v_matrix;\n"
        + "uniform mat4 u_m_matrix;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " gl_Position = u_p_matrix * u_v_matrix * u_m_matrix * vPosition;\n"
        + "}\n";

    var pixelShader = 
        "#version 300 es\n"
        + "\n"
        + "uniform vec4 u_color;\n"
        + "\n"
        + "out vec4 fragColor;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " fragColor = u_color;\n"
        + "}\n";
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

    const ext = gl.getExtension("WEBGL_polygon_mode");
    ext.polygonModeWEBGL(gl.FRONT_AND_BACK, ext.FILL_WEBGL);

    const ext2 = gl.getExtension("EXT_color_buffer_float");
    if (!ext2) {
        console.log("Extension not supported.");
    }

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
    
    createFramebufferPassResources();
    createQuadRenderPassResources();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
}

var colorAttachment0_color = [0.75, 0.75, 0.75, 1.0];
var colorAttachment1_color = [-1, 0, 0, 0];
var depthAttachment_color = [1.0];

function draw() {
    // Pass 1
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.drawBuffers([
        gl.COLOR_ATTACHMENT0,
        gl.COLOR_ATTACHMENT1
    ]);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearBufferfv(gl.COLOR, 0, colorAttachment0_color);
    gl.clearBufferfv(gl.COLOR, 1, colorAttachment1_color);
    gl.clearBufferfv(gl.DEPTH, 0, depthAttachment_color);

    gl.useProgram(fboProgram);

    var viewMat = cam.GetView();
    var projMat = cam.GetProjection();

    gl.uniformMatrix4fv(uniform_projection, false, projMat);
    gl.uniformMatrix4fv(uniform_view, false, viewMat);
    
    var modelMat = scene.ground.GetTransformMatrix();
    gl.uniform3fv(uniform_obj_color, groundColor);
    gl.uniform1i(uniform_obj_id, 33);
    gl.uniformMatrix4fv(uniform_model, false, modelMat);
    scene.ground.Render();

    for (let i = 0; i < scene.cubes.length; i++) {
        objID = i + 1;
        modelMat = scene.cubes[i].GetTransformMatrix();
        gl.uniform3fv(uniform_obj_color, cubeColor);
        gl.uniform1i(uniform_obj_id, objID);
        gl.uniformMatrix4fv(uniform_model, false, modelMat);
        scene.cubes[i].Render();
    }

    modelMat = scene.agent.GetTransformMatrix();
    gl.uniform3fv(uniform_obj_color, agentColor);
    gl.uniform1i(uniform_obj_id, 34);
    gl.uniformMatrix4fv(uniform_model, false, modelMat);
    scene.agent.Render();

    gl.useProgram(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (readPixels) {
        readPixels = false;

        gl.bindFramebuffer(gl.FRAMEBUFFER, dummyFBO);

        var data = new Uint8Array(4);
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorAttachemnt_ObjIds, 0);
        gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // console.log(data);

        // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorAttachment_Position, 0);
        // gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);
        
        // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Ray Cast
        // Convert mouse position to NDC
        var ndcX = pixelX / canvas.width * 2.0 - 1.0;
        var ndcY = pixelY / canvas.height * 2.0 - 1.0;

        console.log(ndcX, " ", ndcY);

        var invProjView = mat4.create;
        mat4.multiply(invProjView, viewMat, projMat)
        mat4.invert(invProjView, invProjView);

        let ndcNear = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
        let worldNear = vec4.create();

        vec4.transformMat4(worldNear, ndcNear, invProjView);

        worldNear[0] = worldNear[0] / worldNear[3];
        worldNear[1] = worldNear[1] / worldNear[3];
        worldNear[2] = worldNear[2] / worldNear[3];
        worldNear[3] = worldNear[3] / worldNear[3];

        console.log(ndcNear);
        console.log(worldNear);

    }

    // Pass 2
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(quadRenderProgram);

    gl.bindTexture(gl.TEXTURE_2D, colorAttachment_output);
    gl.uniform1i(uniform_texture_sampler, 0);

    gl.bindVertexArray(vao_quadRender);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vbo_quadIndices);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    gl.useProgram(null);

    requestAnimationFrame(draw, canvas);
}
