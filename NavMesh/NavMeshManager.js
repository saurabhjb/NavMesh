class Rectangle {
    constructor(minX, minZ, maxX, maxZ) {
        this.minX = minX;
        this.minZ = minZ;

        this.maxX = maxX;
        this.maxZ = maxZ;
    }
};

class NavMeshManager {
    constructor(scene, cellSize) {
        this.groundWidth = scene.ground.max[0] - scene.ground.min[0];        
        this.groundHeight = scene.ground.max[2] - scene.ground.min[2];

        this.cellSize = cellSize;

        let numCellsWidth = Math.ceil(this.groundWidth / this.cellSize);
        let numCellsHeight = Math.ceil(this.groundHeight / this.cellSize);

        this.polygons = [];

        // Generate walkability grid
        this.walkableGrid = Array(numCellsHeight).fill(null).map(() => Array(numCellsWidth).fill(true));
        for (let cube of scene.cubes) {
            let position = cube.position;
            
            let l2 = cube.length / 2.0;

            let min = [position[0] - l2, position[2] - l2]; 
            let max = [position[0] + l2, position[2] + l2];

            // get grid number
            let minX = min[0] + this.groundWidth / 2.0;
            let minZ = min[1] + this.groundHeight / 2.0;
            let maxX = max[0] + this.groundWidth / 2.0;
            let maxZ = max[1] + this.groundHeight / 2.0;

            let gridMinX = Math.floor(minX / cellSize);
            let gridMinZ = Math.floor(minZ / cellSize);
            let gridMaxX = Math.ceil(maxX / cellSize);
            let gridMaxZ = Math.ceil(maxZ / cellSize);

            for (let h = gridMinZ; h < gridMaxZ; h++) {
                for (let w = gridMinX; w < gridMaxX; w++) {
                    this.walkableGrid[h][w] = false;
                }
            }
        }

        // Generate polygons
        const processed = Array(numCellsHeight).fill(null).map(() => Array(numCellsWidth).fill(false));

        for (let z = 0; z < numCellsHeight; z++) {
            for (let x = 0; x < numCellsWidth; x++) {
                if (this.walkableGrid[z][x] && !processed[z][x]) {
                    let minX = x;
                    let maxX = x;
                    let maxZ = z;

                    while (maxX + 1 < numCellsWidth && this.walkableGrid[z][maxX + 1] && !processed[z][maxX + 1])
                        maxX++;

                    while (maxZ + 1 < numCellsHeight) {
                        let canExpand = true;

                        for (let xx = minX; xx <= maxX; xx++) {
                            if (!this.walkableGrid[maxZ + 1][xx] || processed[maxZ + 1][xx]) {
                                canExpand = false;
                                break;
                            }
                        }

                        if (canExpand)
                            maxZ++;
                        else
                            break;
                    }

                    for (let zz = z; zz <= maxZ; zz++) {
                        for (let xx = minX; xx <= maxX; xx++) {
                            processed[zz][xx] = true;
                        }
                    }

                    this.polygons.push(new Rectangle(minX, z, maxX, maxZ));
                }
            }
        }

        this.GetPolygonsData();
    }

    ConstructNavMesh(ground) {

    }

    // For rendering purpose
    GetPointsData() {

    }

    GetPolygonsData() {
        let vertices = [];

        for (let poly of this.polygons) {
            let min = [poly.minX * this.cellSize, poly.minZ * this.cellSize];
            let max = [(poly.maxX + 1) * this.cellSize, (poly.maxZ + 1) * this.cellSize];

            vertices.push(min[0] - this.groundWidth / 2.0, -0.498, max[1] - this.groundHeight / 2.0);
            vertices.push(min[0] - this.groundWidth / 2.0, -0.498, min[1] - this.groundHeight / 2.0);
            vertices.push(max[0] - this.groundWidth / 2.0, -0.498, min[1] - this.groundHeight / 2.0);
            vertices.push(max[0] - this.groundWidth / 2.0, -0.498, max[1] - this.groundHeight / 2.0);
        }

        return new Float32Array(vertices);
    }
}