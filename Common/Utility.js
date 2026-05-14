class ShaderBinding
{
    ShaderBinding(attribute, name) {
        this.attribute = attribute;
        this.name = name;
    }
}

function compileShader(shaderType, shaderSource) {
    var shaderObject = gl.createShader(shaderType);
    gl.shaderSource(shaderObject, shaderSource);
    gl.compileShader(shaderObject);

    if (!gl.getShaderParameter(shaderObject, gl.COMPILE_STATUS))
    {
        var error = gl.getShaderInfoLog(shaderObject);
        if (error.length > 0) {
            var log;
            switch (shaderType)
            {
                case gl.VERTEX_SHADER:
                    log += "Vertex Shader ";
                    break;
                case gl.FRAGMENT_SHADER:
                    log += "Fragment Shader ";
                    break;
            }
            log += "Error: " + error;
            console.log(log);
            uninit();
        }
    }

    return (shaderObject);
}

function createProgram(vertex, fragment, shaderBindings) {
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);

    for (binding in shaderBindings) {
        gl.bindAttribLocation(program, binding.attribute, binding.name);
    }

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var error = gl.getProgramInfoLog(program);

        if (error.length > 0) {
            console.log("Program Error: " + error);
            uninit();
        }
    }

    return (program);
}
