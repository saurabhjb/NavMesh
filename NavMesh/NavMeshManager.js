class Rectangle {
    constructor(minX, minZ, maxX, maxZ) {
        this.minX = minX;
        this.minZ = minZ;

        this.maxX = maxX;
        this.maxZ = maxZ;
    }
};

class Edge {
    constructor(p0, p1, portalIndex) {
        this.p0 = p0;
        this.p1 = p1;

        this.portalIndices = [];
        this.portalIndices.push(portalIndex);
    }

    IsValid(x, z) {
        return !((this.p0 == p0 || this.p0 == p1) && (this.p1 == p0 || this.p1 == p1));
    }
};

class GraphNode {
    constructor() {
        this.graphPointIndex = -1;
        this.connectedEdges = new Map();
    }
};

class NavMeshManager {
    GenerateWalkableGrid(scene) {
        this.walkableGrid = Array(this.numCellsHeight).fill(null).map(() => Array(this.numCellsWidth).fill(true));
        for (let cube of scene.cubes) {
            let position = cube.position;
            
            let l2 = cube.length / 2.0;

            let min = [position[0] - l2 + this.groundWidth / 2.0 - scene.agent.diameter / 2.0, position[2] - l2 + this.groundHeight / 2.0  - scene.agent.diameter / 2.0]; 
            let max = [position[0] + l2 + this.groundWidth / 2.0 + scene.agent.diameter / 2.0, position[2] + l2 + this.groundHeight / 2.0 + scene.agent.diameter / 2.0];

            // get grid number
            let gridMinX = Math.floor(min[0] / this.cellSize);
            let gridMinZ = Math.floor(min[1] / this.cellSize);
            let gridMaxX = Math.ceil(max[0] / this.cellSize);
            let gridMaxZ = Math.ceil(max[1] / this.cellSize);

            for (let h = gridMinZ; h < gridMaxZ; h++) {
                for (let w = gridMinX; w < gridMaxX; w++) {
                    this.walkableGrid[h][w] = false;
                }
            }
        }
    }

    GeneratePolygons() {
        const processed = Array(this.numCellsHeight).fill(null).map(() => Array(this.numCellsWidth).fill(false));

        for (let z = 0; z < this.numCellsHeight; z++) {
            for (let x = 0; x < this.numCellsWidth; x++) {
                if (this.walkableGrid[z][x] && !processed[z][x]) {
                    let minX = x;
                    let maxX = x;
                    let maxZ = z;

                    while (maxX + 1 < this.numCellsWidth && this.walkableGrid[z][maxX + 1] && !processed[z][maxX + 1])
                        maxX++;

                    while (maxZ + 1 < this.numCellsHeight) {
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
    }

    GeneratePortals() {
        for (let poly of this.polygons) {
            let g0 = [poly.minX, poly.minZ];
            let g1 = [poly.maxX + 1, poly.minZ];
            let g2 = [poly.maxX + 1, poly.maxZ + 1];
            let g3 = [poly.minX, poly.maxZ + 1];
            
            let index_g0 = this.CheckGraphNodeExists(this.graphPoints, g0);
            if (index_g0 == -1) {
                this.graphPoints.push(g0);
                index_g0 = this.graphPoints.length - 1;
            }
            let index_g1 = this.CheckGraphNodeExists(this.graphPoints, g1);
            if (index_g1 == -1) {
                this.graphPoints.push(g1);
                index_g1 = this.graphPoints.length - 1;
            }
            let index_g2 = this.CheckGraphNodeExists(this.graphPoints, g2);
            if (index_g2 == -1) {
                this.graphPoints.push(g2);
                index_g2 = this.graphPoints.length - 1;
            }
            let index_g3 = this.CheckGraphNodeExists(this.graphPoints, g3);
            if (index_g3 == -1) {
                this.graphPoints.push(g3);
                index_g3 = this.graphPoints.length - 1;
            }
            
            this.portals.push([index_g0, index_g1, index_g2, index_g3]);
        }
    }

    GeneratePortalEdges() {
        let count = 0;
        let portalIndex = 0;
        for (let portal of this.portals) {
            let es = [
                new Edge(portal[0], portal[1], portalIndex),
                new Edge(portal[1], portal[2], portalIndex),
                new Edge(portal[3], portal[2], portalIndex),
                new Edge(portal[0], portal[3], portalIndex)
            ];
            
            if (this.edges.length == 0) {
                this.edges.push(es[0], es[1], es[2], es[3]);
            }
            else {
                let edgesToAdd = [];
            
                for (let e of es) {
                    let eData = this.CheckPointIsOnAnyEdgeAxis(e.p0, e.p1);

                    if (eData.edgeIndex != -1) {
                        let existingEdge = this.edges[eData.edgeIndex];
                        let newEdge = e;

                        let eg0 = this.graphPoints[existingEdge.p0];
                        let eg1 = this.graphPoints[existingEdge.p1];

                        let ng0 = this.graphPoints[newEdge.p0];
                        let ng1 = this.graphPoints[newEdge.p1];

                        if (eData.isHorizontalAligned) {
                            var startOverlap = Math.max(eg0[0], ng0[0]);
                            var endOverlap = Math.min(eg1[0], ng1[0]);

                            if (startOverlap < endOverlap) {
                                // Split
                                if (eg0[0] < ng0[0]) {
                                    if (eg1[0] < ng1[0]) {
                                        // eg0 - ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));

                                    } else if (eg1[0] > ng1[0]) {
                                        // eg0 - ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // eg0 - ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                } else if (eg0[0] > ng0[0]) {
                                    if (ng1[0] < eg1[0]) {
                                        // ng0 - eg0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));
                                    } else if (eg1[0] > ng1[0]) {
                                        // ng0 - eg0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // ng0 - eg0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                } else { // if they are same
                                    if (eg1[0] < ng1[0]) {
                                        // eg0/ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));
                                    } else if (eg1[0] > ng1[0]) {
                                        // eg0/ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                        
                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // eg0/ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                }

                                // delete exising edge
                                this.edges.splice(eData.edgeIndex, 1);
                            } else {
                                edgesToAdd.push(e);
                            }
                        } else if (eData.isVerticalAligned) {
                            var startOverlap = Math.max(eg0[1], ng0[1]);
                            var endOverlap = Math.min(eg1[1], ng1[1]);

                            if (startOverlap < endOverlap) {
                                // Split
                                if (eg0[1] < ng0[1]) {
                                    if (eg1[1] < ng1[1]) {
                                        // eg0 - ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));

                                    } else if (eg1[1] > ng1[1]) {
                                        // eg0 - ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // eg0 - ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                } else if (eg0[1] > ng0[1]) {
                                    if (ng1[1] < eg1[1]) {
                                        // ng0 - eg0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));
                                    } else if (eg1[1] > ng1[1]) {
                                        // ng0 - eg0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // ng0 - eg0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                } else { // if they are same
                                    if (eg1[1] < ng1[1]) {
                                        // eg0/ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[0]));
                                    } else if (eg1[1] > ng1[1]) {
                                        // eg0/ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                        
                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[0]));
                                    } else { // if they are same
                                        // eg0/ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);
                                    }
                                }

                                // delete exising edge
                                this.edges.splice(eData.edgeIndex, 1);
                            } else {
                                edgesToAdd.push(e);
                            }
                        } 
                    } else {
                        edgesToAdd.push(e);
                    }
                }

                for (let e of edgesToAdd) {
                    if (!this.CheckIfEdgeExists(e))
                        this.edges.push(e);
                }
            }
            
            portalIndex = portalIndex + 1;
        }
    }

    constructor(scene, cellSize) {
        this.groundWidth = scene.ground.max[0] - scene.ground.min[0];        
        this.groundHeight = scene.ground.max[2] - scene.ground.min[2];

        this.cellSize = cellSize;

        this.numCellsWidth = Math.ceil(this.groundWidth / this.cellSize);
        this.numCellsHeight = Math.ceil(this.groundHeight / this.cellSize);

        this.polygons = [];

        this.walkableGrid = []
        this.graphPoints = [];
        this.edges = [];
        this.portals = [];

        // Generate walkability grid
        this.GenerateWalkableGrid(scene);

        // Generate polygons
        this.GeneratePolygons();

        // Generate portals
        this.GeneratePortals();

        // Generate portal edges
        this.GeneratePortalEdges();
    }

    CheckIfEdgeExists(e) {
        for (let edge of this.edges) {
            if (e.p0 == edge.p0 && e.p1 == edge.p1) {
                return (true);
            }
        }
        return (false);
    }

    CheckPointIsOnAnyEdgeAxis(p0, p1) {
        let g0 = this.graphPoints[p0];
        let g1 = this.graphPoints[p1];
 
        for (let edge in this.edges) {
            let eg0 = this.graphPoints[this.edges[edge].p0];
            let eg1 = this.graphPoints[this.edges[edge].p1];
            
            var out = {
                edgeIndex: -1,
                isHorizontalAligned: false,
                isVerticalAligned: false
            };

            // Check for vertical axis
            if (eg0[0] == g0[0] && eg1[0] == g1[0]) {
                let overlapStart = Math.max(eg0[1], g0[1]);
                let overlapEnd = Math.min(eg1[1], g1[1]);

                if (overlapStart < overlapEnd) {
                    out.edgeIndex = parseInt(edge);
                    out.isVerticalAligned = true;
                }
            }
            // Check for horizontal axis
            if (eg0[1] == g0[1] && eg1[1] == g1[1]) {
                let overlapStart = Math.max(eg0[0], g0[0]);
                let overlapEnd = Math.min(eg1[0], g1[0]);

                if (overlapStart < overlapEnd) {
                    out.edgeIndex = parseInt(edge);
                    out.isHorizontalAligned = true;
                }
            }
            if (out.edgeIndex > -1)
                break;
        }

        return (out);
    }

    CheckGraphNodeExists(graphNodes, node) {
        var nodeIndex = -1;
        var nodeExists = false;
        for (let n in graphNodes) {
            if (graphNodes[n][0] == node[0] && graphNodes[n][1] == node[1]) {
                nodeExists = true;
                nodeIndex = parseInt(n);
            }
        }
        return (nodeIndex);
    }

    FindPolygonID(locX, locZ) {
        for (let portal in this.portals) {
            let portalMin = this.graphPoints[this.portals[portal][0]];
            let portalMax = this.graphPoints[this.portals[portal][2]];

            if (portalMin[0] <= locX && locX <= portalMax[0] - 1) {
                if (portalMin[1] <= locZ && locZ <= portalMax[1] - 1) {
                    return (parseInt(portal));
                }
            }
        }
        return (-1);
    }

    FindNearestPoint(locX, locZ) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < this.graphPoints.length; i++) {
            let dx = this.graphPoints[i][0] - locX;
            let dz = this.graphPoints[i][1] - locZ;
            let distance = dx * dx + dz * dz;

            if (distance < minDistance) {
                minDistance = distance;
                nearestIndex = i;
            }
        }

        return nearestIndex;
    }

    Heuristic(fromIndex, toIndex) {
        let from = this.graphPoints[fromIndex];
        let to = this.graphPoints[toIndex];
        
        let dx = from[0] - to[0];
        let dz = from[1] - to[1];
        
        return Math.sqrt(dx * dx + dz * dz);
    }

    Distance(fromPoint, toPoint) {
        let from = this.graphPoints[fromPoint];
        let to = this.graphPoints[toPoint];
        
        let dx = from[0] - to[0];
        let dz = from[1] - to[1];
        
        return Math.sqrt(dx * dx + dz * dz);
    }

    EdgeIsConnected(startEdge, endEdge) {
        for (let edge of this.edges) {
            if ((edge.p0 === startEdge && edge.p1 === endEdge) ||
                (edge.p0 === endEdge && edge.p1 === startEdge)) {
                return true;
            }
        }
        return false;
    }

    GetNeighbors(nodeIndex) {
        let neighbors = [];
        for (let edge of this.edges) {
            if (edge.p0 === nodeIndex) {
                neighbors.push(edge.p1);
            } else if (edge.p1 === nodeIndex) {
                neighbors.push(edge.p0);
            }
        }
        return neighbors;
    }

    FindPath(startPos, endPos) {
        let startX = Math.floor((startPos[0] + this.groundWidth / 2.0) / this.cellSize);
        let startZ = Math.floor((startPos[2] + this.groundHeight / 2.0) / this.cellSize);

        let endX = Math.floor((endPos[0] + this.groundWidth / 2.0) / this.cellSize);
        let endZ = Math.floor((endPos[2] + this.groundHeight / 2.0) / this.cellSize);

        let polygonStart = this.FindPolygonID(startX, startZ);
        let polygonEnd = this.FindPolygonID(endX, endZ);

        if (polygonStart == -1 || polygonEnd == -1) {
            return [];
        }

        let startNode = this.FindNearestPoint(startX, startZ);
        let endNode = this.FindNearestPoint(endX, endZ);

        // A* algorithm
        let openSet = [startNode];
        let cameFrom = {};
        let gScore = {};
        let fScore = {};

        // Initialize scores
        for (let i = 0; i < this.graphPoints.length; i++) {
            gScore[i] = Infinity;
            fScore[i] = Infinity;
        }

        gScore[startNode] = 0;
        fScore[startNode] = this.Heuristic(startNode, endNode);

        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                if (fScore[openSet[i]] < fScore[current]) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            if (current === endNode) {
                // Reconstruct path
                let path = [this.graphPoints[current]];
                while (cameFrom[current] !== undefined) {
                    current = cameFrom[current];
                    path.unshift(this.graphPoints[current]);
                }
                return path;
            }

            openSet.splice(currentIndex, 1);
            let neighbors = this.GetNeighbors(current);

            for (let neighbor of neighbors) {
                let tentativeGScore = gScore[current] + this.Distance(current, neighbor);

                if (tentativeGScore < gScore[neighbor]) {
                    cameFrom[neighbor] = current;
                    gScore[neighbor] = tentativeGScore;
                    fScore[neighbor] = gScore[neighbor] + this.Heuristic(neighbor, endNode);

                    if (!openSet.includes(neighbor)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return [];
    }

    GetEdgeFromPoints(p0, p1) {

    }

    FindShortestPath(startPos, endPos) {
        let graphPath = this.FindPath(startPos, endPos);
        let startX = Math.floor((startPos[0] + this.groundWidth / 2.0) / this.cellSize);
        let startZ = Math.floor((startPos[2] + this.groundHeight / 2.0) / this.cellSize);
        let endX = Math.floor((endPos[0] + this.groundWidth / 2.0) / this.cellSize);
        let endZ = Math.floor((endPos[2] + this.groundHeight / 2.0) / this.cellSize);

        let path = [];

        if (graphPath.length > 0) {
            path.push([startX, startZ]);
            for (let p of graphPath) {
                path.push(p);
            }
            path.push([endX, endZ]);

            // let polygonStart = this.FindPolygonID(startX, startZ);
            // let polygonEnd = this.FindPolygonID(endX, endZ);
            
            // // Simplify path
            // let totalEdges = path.length;

            // for (let i = 0; i < totalEdges; i++) {
            //     if (i == 0) {

            //     } else if (j == totalEdges - 1) {

            //     } else {

            //     }
            // }

            // console.log(path.length - 1);
        }

        let finalPath = [];
        if (path.length > 0) {
            // finalPath = [[startPos[0], -0.486, startPos[2]]];
            for (let gridPoint of path) {
                let worldX = gridPoint[0] * this.cellSize - this.groundWidth / 2.0;
                let worldZ = gridPoint[1] * this.cellSize - this.groundHeight / 2.0;
                finalPath.push([worldX, -0.496, worldZ]);
            }
            // finalPath.push([endPos[0], -0.486, endPos[2]]);
        }
        return finalPath;
    }

    // For rendering purpose
    GetPolygonsData() {
        let vertices = [];

        for (let poly of this.polygons) {
            let min = [poly.minX * this.cellSize + 0.01, poly.minZ * this.cellSize + 0.01];
            let max = [(poly.maxX + 1) * this.cellSize - 0.01, (poly.maxZ + 1) * this.cellSize - 0.01];

            vertices.push(min[0] - this.groundWidth / 2.0, -0.498, max[1] - this.groundHeight / 2.0);
            vertices.push(min[0] - this.groundWidth / 2.0, -0.498, min[1] - this.groundHeight / 2.0);
            vertices.push(max[0] - this.groundWidth / 2.0, -0.498, min[1] - this.groundHeight / 2.0);
            vertices.push(max[0] - this.groundWidth / 2.0, -0.498, max[1] - this.groundHeight / 2.0);
        }

        return new Float32Array(vertices);
    }

    GetGraphPointsAndEdges() {
        let points = [];
        let edges = [];

        for (let point of this.graphPoints) {
            points.push(point[0] * this.cellSize - this.groundWidth / 2.0, -0.496, point[1] * this.cellSize - this.groundHeight / 2.0); 
        }

        for (let edge of this.edges) {
            let g0 = this.graphPoints[edge.p0];
            let g1 = this.graphPoints[edge.p1];

            edges.push(g1[0] * this.cellSize - this.groundWidth / 2.0, -0.496, g1[1] * this.cellSize - this.groundHeight / 2.0);
            edges.push(g0[0] * this.cellSize - this.groundWidth / 2.0, -0.496, g0[1] * this.cellSize - this.groundHeight / 2.0);
        }

        return ({
            points: new Float32Array(points),
            edges: new Float32Array(edges)
        });
    }

    GetShortestPath() {

    }
}