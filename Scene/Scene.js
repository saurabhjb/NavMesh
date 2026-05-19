class Scene {
    constructor() {
        this.groundObjID = 50;
        this.cubeStartObjID = 1;
        this.agentObjID = 49;

        this.ground = null;
        this.cubes = [];
        this.agent = null;

        this.finalPosition = vec3.fromValues(0.0, -0.49999, 0.0);
    };

    CheckCubeCubeCollision(newX, newZ, selectedCube) {
        for (let cubeID in this.cubes) {
            if (parseInt(cubeID) != selectedCube) {
                let cube = this.cubes[cubeID];

                let cube1_min = [cube.position[0] - 0.5, cube.position[2] - 0.5];
                let cube1_max = [cube.position[0] + 0.5, cube.position[2] + 0.5];

                let cube2_min = [newX - 0.5, newZ - 0.5];
                let cube2_max = [newX + 0.5, newZ + 0.5];

                let startOverlapX = Math.max(cube1_min[0], cube2_min[0]);
                let endOverlapX = Math.min(cube1_max[0], cube2_max[0]);

                let startOverlapZ = Math.max(cube1_min[1], cube2_min[1]);
                let endOverlapZ = Math.min(cube1_max[1], cube2_max[1]);

                if (startOverlapX < endOverlapX && startOverlapZ < endOverlapZ)
                    return (true);
            }
        }

        return (false);
    }

    CheckCubeCylinderCollision(newX, newZ) {
        for (let cube of this.cubes) {
            let dx = cube.position[0] - newX;
            let dz = cube.position[2] - newZ;

            let d = Math.sqrt(dx * dx + dz * dz);
            
            if (d < 1.0) {
                return (true);
            }
        }

        return (false);
    }

    CheckCylinderCubeCollision(newX, newZ) {
        let dx = this.agent.position[0] - newX;
        let dz = this.agent.position[2] - newZ;

        let d = Math.sqrt(dx * dx + dz * dz);
        
        if (d < 1.0) {
            return (true);
        }
        return (false);
    }

    checkBound(value, min, max, offset) {
        if (value > min + offset && value < max - offset)
            return true;
        return false;
    }

    UpdateFinalPosition(newPosition) {
        if (this.checkBound(newPosition[0], this.ground.min[0], this.ground.max[0], this.agent.diameter / 2.0))
            this.finalPosition[0] = newPosition[0];
        if (this.checkBound(newPosition[1], this.ground.min[2], this.ground.max[2], this.agent.diameter / 2.0))
            this.finalPosition[2] = newPosition[2];
        this.finalPosition[1] = -0.499999;
    }

    AddToFinalPosition(positionOffset) {
        let newX = this.finalPosition[0] + positionOffset[0];
        let newZ = this.finalPosition[2] + positionOffset[2];

        if (this.checkBound(newX, this.ground.min[0], this.ground.max[0], this.agent.diameter / 2.0))
            this.finalPosition[0] = newX;
        if (this.checkBound(newZ, this.ground.min[2], this.ground.max[2], this.agent.diameter / 2.0))
            this.finalPosition[2] = newZ;
        this.finalPosition[1] = -0.499999;
    }

    UpdatePosition(objID, positionOffset) {
        if (objID == this.agentObjID) {
            let newX = this.agent.position[0] + positionOffset[0];
            let newZ = this.agent.position[2] + positionOffset[2];

            if (!this.CheckCubeCylinderCollision(newX, newZ)) {
                if (this.checkBound(newX, this.ground.min[0], this.ground.max[0], this.agent.diameter / 2.0))
                    this.agent.position[0] = newX;
                if (this.checkBound(newZ, this.ground.min[2], this.ground.max[2], this.agent.diameter / 2.0))
                    this.agent.position[2] = newZ;
            }
        } else if (objID > 0 & objID < this.agentObjID) {
            let cubeID = objID - this.cubeStartObjID;

            let newX = this.cubes[cubeID].position[0] + positionOffset[0];
            let newZ = this.cubes[cubeID].position[2] + positionOffset[2];

            if (!this.CheckCylinderCubeCollision(newX, newZ) && !this.CheckCubeCubeCollision(newX, newZ, cubeID)) {
                if (this.checkBound(newX, this.ground.min[0], this.ground.max[0], this.cubes[cubeID].length / 2.0))
                    this.cubes[cubeID].position[0] = newX;
                if (this.checkBound(newZ, this.ground.min[2], this.ground.max[2], this.cubes[cubeID].length / 2.0))
                    this.cubes[cubeID].position[2] = newZ;
            }
        }
    }
};
