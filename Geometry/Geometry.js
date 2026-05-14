class Geometry {
    constructor(name) {
        this.name = name;

        this.min = [];
        this.max = [];

        this.vertices = [];
        this.indices = [];

        this.vao = null;
        this.vbo_vertices = null;
        this.vbo_indices = null;

        this.position = [0.0, 0.0, 0.0];
    }

    GetTransformMatrix() {
        var modelMat = mat4.create();
        mat4.translate(modelMat, modelMat, this.position);
        return modelMat;
    }

    UpdatePosition(x, y, z) {
        this.position = [x, y, z];
    }

    Update(delta) {

    }

    Render() {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo_indices);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_INT, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }
}

class Quad extends Geometry {
    constructor(name, length, width, lengthParts, widthParts) {
        super(name);
        
        let l2 = length / 2.0;
        let w2 = width / 2.0;
        
        this.min = [-l2, 0.0, -w2];
        this.max = [l2, 0.0, w2];

        this.GenerateVerticesAndIndices(length, width, lengthParts, widthParts);
    }

    GenerateVerticesAndIndices(length, width, lengthParts, widthParts) {
        let deltaLength = length / (lengthParts - 1);
        let deltaWidth = width / (widthParts - 1);

        for (let j = 0; j < widthParts; j++)
        {
            for (let i = 0; i < lengthParts; i++)
            {
                let x = this.min[0] + i * deltaLength;
                let y = 0.0;
                let z = this.min[2] + j * deltaWidth;

                this.vertices.push(x, y, z);
            }
        }

        for (let j = 0; j < widthParts - 1; j++)
        {
            for (let i = 0; i < lengthParts - 1; i++)
            {
                let vi0 = i + j * lengthParts;
                let vi1 = i + (j + 1) * lengthParts;
                let vi2 = vi0 + 1;
                let vi3 = vi1 + 1;

                this.indices.push(
                    vi0, vi1, vi2,
                    vi2, vi1, vi3
                );
            }
        }

        var verticesData = new Float32Array(this.vertices, 0, this.vertices.length);
        var indicesData = new Uint32Array(this.indices, 0, this.indices.length);

        // generate vaos and vbos
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo_vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_vertices);
        gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.vbo_indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo_indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        gl.bindVertexArray(null);
    }
}

class Cuboid extends Geometry {
    constructor(name, length, position) {
        super(name);

        let s2 = length / 2.0;

        this.min = [-s2, -s2, -s2];
        this.max = [s2, s2, s2];

        this.position = position;

        this.GenerateVerticesAndIndices();
    }

    GenerateVerticesAndIndices() {
        this.vertices = [
            this.min[0], this.min[1], this.min[2], // v0
            this.min[0], this.max[1], this.min[2], // v1
            this.max[0], this.max[1], this.min[2], // v2
            this.max[0], this.min[1], this.min[2], // v3
            this.max[0], this.min[1], this.max[2], // v4
            this.max[0], this.max[1], this.max[2], // v5
            this.min[0], this.max[1], this.max[2], // v6
            this.min[0], this.min[1], this.max[2]  // v7
        ];

        this.indices = [
            0, 2, 1, 0, 3, 2,
            3, 5, 2, 3, 4, 5,
            4, 6, 5, 4, 7, 6,
            7, 1, 6, 7, 0, 1,
            7, 3, 0, 7, 4, 3,
            1, 5, 6, 1, 2, 5
        ];

        var verticesData = new Float32Array(this.vertices, 0, this.vertices.length);
        var indicesData = new Uint32Array(this.indices, 0, this.indices.length);

        // generate vaos and vbos
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo_vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_vertices);
        gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.vbo_indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo_indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        gl.bindVertexArray(null);
    }
}

class Cylinder extends Geometry {
    constructor(name, diameter, height, parts, position) {
        super(name);

        this.position = position;

        this.GenerateVerticesAndIndices(diameter, height, parts);
    }

    GenerateVerticesAndIndices(diameter, height, parts) {
        this.diameter = diameter;
        this.height = height;

        this.vertices.push(0.0, this.height / 2.0, 0.0);
        for (let i = 0; i < parts; i++) {
            let angle = 360 / parts;

            let x = diameter * Math.cos(Math.PI * i * angle / 180.0) / 2.0;
            let y = height / 2.0;
            let z = diameter * Math.sin(Math.PI * i * angle / 180.0) / 2.0;
            this.vertices.push(x, y, z);
        }

        this.vertices.push(0.0, -this.height / 2.0, 0.0);
        for (let i = 0; i < parts; i++) {
            let angle = 360 / parts;

            let x = diameter * Math.cos(Math.PI * i * angle / 180.0) / 2.0;
            let y = -height / 2.0;
            let z = diameter * Math.sin(Math.PI * i * angle / 180.0) / 2.0;
            this.vertices.push(x, y, z);
        }

        for (let i = 1; i <= parts ; i++) {
            let i0 = 0;
            let i1 = i;
            let i2 = i + 1;
            if (i2 > parts)
                i2 = i2 - parts;
            this.indices.push(i0, i1, i2);
        }

        for (let i = 2 + parts; i <= 1 + 2 * parts ; i++) {
            let i0 = 1 + parts;
            let i1 = i;
            let i2 = i + 1;
            if (i2 > 1 + 2 * parts)
                i2 = i2 - parts;
            this.indices.push(i0, i1, i2);
        }

        for (let i = 0; i < parts; i++) {
            let vi0 = 1 + i;
            let vi1 = 2 + parts + i;
            let vi2 = vi1 + 1;
            let vi3 = vi0 + 1;

            if (vi2 > 1 + 2 * parts)
                vi2 = vi2 - parts;
            if (vi3 > parts)
                vi3 = vi3 - parts;

            let data = [vi0, vi1, vi2, vi3];

            this.indices.push(
                vi0, vi1, vi3,
                vi3, vi1, vi2
            );
        }

        var verticesData = new Float32Array(this.vertices, 0, this.vertices.length);
        var indicesData = new Uint32Array(this.indices, 0, this.indices.length);

        // generate vaos and vbos
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo_vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_vertices);
        gl.bufferData(gl.ARRAY_BUFFER, verticesData, gl.STATIC_DRAW);
        gl.vertexAttribPointer(SHADER_ATTRIBUTES.POSITION, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(SHADER_ATTRIBUTES.POSITION);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.vbo_indices = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vbo_indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        gl.bindVertexArray(null);
    }
}

