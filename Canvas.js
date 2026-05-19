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
var rightButtonPressed = false;
var readPixels = false;
var altKeyIsPressed = false;

var lastX = 0;
var lastY = 0;

var pixelX = -1;
var pixelY = -1;

var currentSelectedObject = -1;

var firstIntersectionPoint = false;

var lastIntersectionPoint = vec3.create();

var navMeshObj = null;

function mouseMove(event) {
    if (leftButtonPressed) {

        if (firstClick) {
            lastX = event.clientX;
            lastY = event.clientY;
            firstClick = false;
        }

        let deltaX = lastX - event.clientX;
        let deltaY = lastY - event.clientY;

        if (altKeyIsPressed) {
            cam.Update(deltaX, deltaY);
        } else {
            pixelX = event.clientX - 8;
            pixelY = canvas.height - event.clientY + 8;

            const intersectionPoint = findIntersectionPoint(pixelX, pixelY, vec3.fromValues(0.0, -0.5, 0.0), vec3.fromValues(0.0, 1.0, 0.0));
            if (firstIntersectionPoint) {
                lastIntersectionPoint = intersectionPoint;
                firstIntersectionPoint = false;
            }

            if (currentSelectedObject > 0) {
                const positionOffset = vec3.create();
                vec3.subtract(positionOffset, lastIntersectionPoint, intersectionPoint);
                positionOffset[0] = -positionOffset[0];
                positionOffset[2] = -positionOffset[2];

                lastIntersectionPoint = intersectionPoint;

                if (currentSelectedObject < scene.groundObjID) {
                    scene.UpdatePosition(currentSelectedObject, positionOffset);
                }
                else if (currentSelectedObject == scene.groundObjID) {
                    scene.AddToFinalPosition(positionOffset);
                }
            }
        }

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
    if (event.button == 0) {
        leftButtonPressed = false;

        if (firstIntersectionPoint)
            firstIntersectionPoint = false;
    }
    if (event.button == 2) {
        rightButtonPressed = false;
    }
}

function mouseDown(event) {
    if (event.button == 0) {
        leftButtonPressed = true;
        readPixels = true;

        firstClick = true;
        firstIntersectionPoint = true;
        pixelX = event.clientX - 8;
        pixelY = canvas.height - event.clientY + 8;

        //Identify selected object
        getObjID(pixelX, pixelY);

        if (currentSelectedObject == scene.groundObjID && firstIntersectionPoint && !altKeyIsPressed) {
            scene.UpdateFinalPosition(findIntersectionPoint(pixelX, pixelY, vec3.fromValues(0.0, -0.5, 0.0), vec3.fromValues(0.0, 1.0, 0.0)));
        }
    }
    if (event.button == 2) {
        rightButtonPressed = true;
    }
}

function keyUp(event) {
    switch (event.keyCode) {
        case 18:
            altKeyIsPressed = false;
            break;
    }
}

var counter = 0;

function keyDown(event) {
    switch (event.keyCode) {
        case 27:
            uninit();
            window.close();
            break;

        case 70:
            toggleFullscreen();
            break;

        case 18:
            altKeyIsPressed = true;
            break;

        case 65:
            counter = counter + 1;
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

// Pass 3 Render shapes overlay
var vao_point = null;
var vbo_pointVertex = null;

var vao_navmesh = null;
var vbo_navmesh_vertices = null;

var vao_graphPoints = null;
var vbo_graphPoints = null;

var vao_graphEdges = null;
var vbo_graphEdges = null;

var pointColor = [1.0, 1.0, 0.0, 1.0];
var navmeshColor = [0.0, 1.0, 1.0, 0.15];
var graphPointColor = [1.0, 0.0, 0.0, 1.0];
var graphEdgeColor = [1.0, 0.0, 1.0, 1.0];

var overlayRenderProgram = null;
var uniform_overlay_m_matrix = null;
var uniform_overlay_v_matrix = null;
var uniform_overlay_p_matrix = null;
var uniform_overlay_color = null;

function main() {
    canvas = document.getElementById("WGL2");
    if (!canvas) {
        console.log("obtaining canvas failed.");
    }

    canvasOriginalWidth = canvas.width;
    canvasOriginalHeight = canvas.height;

    window.addEventListener("keyup", keyUp, false)
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

function createOverlayRenderPassResources() {
    var vertexShader =
        "#version 300 es\n"
        + "\n"
        + "in vec3 vPosition;\n"
        + "\n"
        + "uniform mat4 u_m_matrix;\n"
        + "uniform mat4 u_v_matrix;\n"
        + "uniform mat4 u_p_matrix;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " gl_Position = u_p_matrix * u_v_matrix * u_m_matrix * vec4(vPosition, 1.0);\n"
        + " gl_PointSize = 5.0f;\n"
        + "}\n";
    var pixelShader =
        "#version 300 es\n"
        + "\n"
        + "precision highp float;\n"
        + "\n"
        + "uniform vec4 u_color;\n"
        + "\n"
        + "layout (location = 0) out vec4 fragColor;\n"
        + "\n"
        + "void main(void)\n"
        + "{\n"
        + " fragColor = u_color;\n"
        + "}\n";
    var overlay_vso = compileShader(gl.VERTEX_SHADER, vertexShader);
    var overlay_pso = compileShader(gl.FRAGMENT_SHADER, pixelShader);

    var shaderBindings = [
        { atribute: SHADER_ATTRIBUTES.POSITION, name: "vPosition" }
    ];

    overlayRenderProgram = createProgram(overlay_vso, overlay_pso, shaderBindings);

    uniform_overlay_m_matrix = gl.getUniformLocation(overlayRenderProgram, "u_m_matrix");
    uniform_overlay_v_matrix = gl.getUniformLocation(overlayRenderProgram, "u_v_matrix");
    uniform_overlay_p_matrix = gl.getUniformLocation(overlayRenderProgram, "u_p_matrix");

    uniform_overlay_color = gl.getUniformLocation(overlayRenderProgram, "u_color");

    // generate vaos and vbos
    // Point 
    vao_point = gl.createVertexArray();
    gl.bindVertexArray(vao_point);
    vbo_pointVertex = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_pointVertex);
    gl.bufferData(gl.ARRAY_BUFFER, 12, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    generateNavMeshResources();
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

    scene = new Scene();
    // Ground setup
    scene.ground = new Quad("ground", 10.0, 10.0, 11, 11);
    scene.ground.UpdatePosition(0.0, -0.5, 0.0);
    // Cube setup
    scene.cubes.push(new Cuboid("Obs1", 1.0, [-4.0, 0.0, -4.0]));
    scene.cubes.push(new Cuboid("Obs2", 1.0, [2.5, 0.0, 1.5]));
    scene.cubes.push(new Cuboid("Obs3", 1.0, [0.5, 0.0, 3.5]));
    scene.cubes.push(new Cuboid("Obs4", 1.0, [3.5, 0.0, -1.5]));
    // Agent setup
    scene.agent = new Cylinder("agent", 1.0, 2.0, 10, [2.5, 0.5, 1.5]);

    navMeshObj = new NavMeshManager(scene, 0.25);

    createFramebufferPassResources();
    createQuadRenderPassResources();
    createOverlayRenderPassResources();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
}

var colorAttachment0_color = [0.75, 0.75, 0.75, 1.0];
var colorAttachment1_color = [-1, 0, 0, 0];
var depthAttachment_color = [1.0];

function getObjID(mouseX, mouseY) {
    readPixels = false;

    gl.bindFramebuffer(gl.FRAMEBUFFER, dummyFBO);

    var data = new Uint8Array(4);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorAttachemnt_ObjIds, 0);
    gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data);

    if (data[0] > 0)
        currentSelectedObject = data[0];
    else
        currentSelectedObject = -1;
}

function findIntersectionPoint(mouseX, mouseY, planePoint, planeNormal) {
    const ndcX = 2.0 * mouseX / canvas.width - 1.0;
    const ndcY = 2.0 * mouseY / canvas.height - 1.0;

    const nearPoint = vec3.fromValues(ndcX, ndcY, 0.0);
    const farPoint = vec3.fromValues(ndcX, ndcY, 1.0);

    const viewMat = cam.GetView();
    const projMat = cam.GetProjection();

    const invViewProj = mat4.create();
    mat4.multiply(invViewProj, projMat, viewMat);
    mat4.invert(invViewProj, invViewProj);

    const rayOrigin = vec3.create();
    const rayFar = vec3.create();
    vec3.transformMat4(rayOrigin, nearPoint, invViewProj);
    vec3.transformMat4(rayFar, farPoint, invViewProj);

    const rayDirection = vec3.create();
    vec3.subtract(rayDirection, rayFar, rayOrigin);
    vec3.normalize(rayDirection, rayDirection);

    // get intersection point
    let intersectionPoint = vec3.fromValues(0.0, 0.0, 0.0);
    const denom = vec3.dot(rayDirection, planeNormal);

    if (Math.abs(denom) > 0.0001) {
        const originToPlanePoint = vec3.create();
        vec3.subtract(originToPlanePoint, planePoint, rayOrigin);

        const t = vec3.dot(originToPlanePoint, planeNormal) / denom;

        if (t >= 0)
            vec3.scaleAndAdd(intersectionPoint, rayOrigin, rayDirection, t);
    }

    return (intersectionPoint);
}

var numPolygons = 0;
var numGraphPoints = 0;
var numEdges = 0;

function generateNavMeshResources() {
    if (vao_navmesh)
        gl.deleteVertexArray(vao_navmesh);

    if (vbo_navmesh_vertices)
        gl.deleteBuffer(vbo_navmesh_vertices)

    // Navmesh
    vao_navmesh = gl.createVertexArray();
    gl.bindVertexArray(vao_navmesh);

    var navVertices = navMeshObj.GetPolygonsData();
    numPolygons = navVertices.length / (4 * 3);

    vbo_navmesh_vertices = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_navmesh_vertices);
    gl.bufferData(gl.ARRAY_BUFFER, navVertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    gl.bindVertexArray(null);

    // Graph Points and Edges
    var data  = navMeshObj.GetGraphPointsAndEdges();
    numGraphPoints = data.points.length / 3;
    numEdges = data.edges.length / (2 * 3);

    vao_graphPoints = gl.createVertexArray();
    gl.bindVertexArray(vao_graphPoints);
    vbo_graphPoints = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_graphPoints);
    gl.bufferData(gl.ARRAY_BUFFER, data.points, gl.STATIC_DRAW);
    gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    vao_graphEdges = gl.createVertexArray();
    gl.bindVertexArray(vao_graphEdges);
    vbo_graphEdges = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_graphEdges);
    gl.bufferData(gl.ARRAY_BUFFER, data.edges, gl.STATIC_DRAW);
    gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
}

function draw() {
    // Render Scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, colorAttachemnt_ObjIds, 0);

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
    gl.uniform1i(uniform_obj_id, 50);
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
    gl.uniform1i(uniform_obj_id, 49);
    gl.uniformMatrix4fv(uniform_model, false, modelMat);
    scene.agent.Render();

    gl.useProgram(null);

    // Render overlay
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, null, 0);

    gl.useProgram(overlayRenderProgram);

    gl.uniformMatrix4fv(uniform_overlay_p_matrix, false, projMat);
    gl.uniformMatrix4fv(uniform_overlay_v_matrix, false, viewMat);

    modelMat = mat4.create();
    mat4.translate(modelMat, modelMat, [0.0, 0.0, 0.0]);
    gl.uniformMatrix4fv(uniform_overlay_m_matrix, false, modelMat);
    
    // Point
    gl.uniform4fv(uniform_overlay_color, pointColor);
    gl.bindVertexArray(this.vao_point);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_pointVertex);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, scene.finalPosition);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    // NavMesh
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4fv(uniform_overlay_color, navmeshColor);
    gl.bindVertexArray(this.vao_navmesh);
    for (let i = 0; i < numPolygons; i++)
        gl.drawArrays(gl.TRIANGLE_FAN, i * 4, 4);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);

    // GraphPoints
    gl.uniform4fv(uniform_overlay_color, graphPointColor);
    gl.bindVertexArray(vao_graphPoints);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_graphPoints);
    for (let i = 0; i < numGraphPoints; i++)
        gl.drawArrays(gl.POINTS, i, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    
    // Edges
    gl.uniform4fv(uniform_overlay_color, graphEdgeColor);
    gl.bindVertexArray(vao_graphEdges);
    gl.lineWidth(10.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_graphEdges);
    for (let i = 0; i < numEdges; i++)
         gl.drawArrays(gl.LINES, i * 2, 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    gl.useProgram(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Render to Quad
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
