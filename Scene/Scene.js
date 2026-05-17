class Scene {
    constructor() {
        this.groundObjID = 50;
        this.cubeStartObjID = 1;
        this.agentObjID = 49;

        this.ground = null;
        this.cubes = [];
        this.agent = null;
    };

    checkBound(value, min, max, offset) {
        if (value > min + offset && value < max - offset)
            return true;
        return false;
    }

    UpdatePosition(objID, positionOffset) {
        if (objID == this.agentObjID) {

            let newX = scene.agent.position[0] + positionOffset[0];
            let newZ = scene.agent.position[2] + positionOffset[2];

            if (this.checkBound(newX, this.ground.min[0], this.ground.max[0], this.agent.diameter / 2.0))
                this.agent.position[0] = newX;
            if (this.checkBound(newZ, this.ground.min[2], this.ground.max[2], this.agent.diameter / 2.0))
                this.agent.position[2] = newZ;
        } else if (objID > 0 & objID < this.agentObjID) {
            let cubeID = objID - this.cubeStartObjID;

            let newX = this.cubes[cubeID].position[0] + positionOffset[0];
            let newZ = this.cubes[cubeID].position[2] + positionOffset[2];

            if (this.checkBound(newX, this.ground.min[0], this.ground.max[0], this.cubes[cubeID].length / 2.0))
                this.cubes[cubeID].position[0] = newX;
            if (this.checkBound(newZ, this.ground.min[2], this.ground.max[2], this.cubes[cubeID].length / 2.0))
                this.cubes[cubeID].position[2] = newZ;
        }
    }
};
