class Point {
    constructor(x = 0.0, y = 0.0, z = 0.0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
};

var worldUp = [0.0, 1.0, 0.0];

const SHADER_ATTRIBUTES = {
    POSITION: 0,
    COLOR: 1,
    NORMAL: 2,
    TEXCOORD0 : 3
};

var gl = null;

var groundColor = [0.467, 0.247, 0.102];
var cubeColor = [0.25, 0.25, 0.25];
var agentColor = [0.0, 0.25, 0.75];