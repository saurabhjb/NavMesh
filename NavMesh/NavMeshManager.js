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

            let min = [position[0] - l2 + this.groundWidth / 2.0 - scene.agent.diameter / 2.0, position[2] - l2 + this.groundHeight / 2.0  - scene.agent.diameter / 2.0]; 
            let max = [position[0] + l2 + this.groundWidth / 2.0 + scene.agent.diameter / 2.0, position[2] + l2 + this.groundHeight / 2.0 + scene.agent.diameter / 2.0];

            // get grid number
            let gridMinX = Math.floor(min[0] / cellSize);
            let gridMinZ = Math.floor(min[1] / cellSize);
            let gridMaxX = Math.ceil(max[0] / cellSize);
            let gridMaxZ = Math.ceil(max[1] / cellSize);

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

        this.graphPoints = [];
        this.edges = [];
        this.portals = [];

        // Generate portals
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

        // Generate graphs and edges
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

                            // if (count == 3) {
                            //     console.log(eData);
                            //     console.log(existingEdge, newEdge);
                            //     console.log(eg0, eg1, ng0, ng1);
                            // }

                            if (startOverlap < endOverlap) {
                                // Split
                                if (eg0[0] < ng0[0]) {
                                    if (eg1[0] < ng1[0]) {
                                        // eg0 - ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[0]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[0]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[0]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, existingEdge.portalIndices[0]));

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
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, existingEdge.portalIndices[1]));

                                    } else if (eg1[1] > ng1[1]) {
                                        // eg0 - ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[1]));
                                    } else { // if they are same
                                        // eg0 - ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p0, existingEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);
                                    }
                                } else if (eg0[1] > ng0[1]) {
                                    if (ng1[1] < eg1[1]) {
                                        // ng0 - eg0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, existingEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);

                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[1]));
                                    } else if (eg1[1] > ng1[1]) {
                                        // ng0 - eg0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);

                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[1]));
                                    } else { // if they are same
                                        // ng0 - eg0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p0, newEdge.portalIndices[1]));
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);
                                    }
                                } else { // if they are same
                                    if (eg1[1] < ng1[1]) {
                                        // eg0/ng0 - eg1 - ng1
                                        edgesToAdd.push(new Edge(newEdge.p0, existingEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);
                                        
                                        edgesToAdd.push(new Edge(existingEdge.p1, newEdge.p1, newEdge.portalIndices[1]));
                                    } else if (eg1[1] > ng1[1]) {
                                        // eg0/ng0 - ng1 - eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);
                                        
                                        edgesToAdd.push(new Edge(newEdge.p1, existingEdge.p1, existingEdge.portalIndices[1]));
                                    } else { // if they are same
                                        // eg0/ng0 - ng1/eg1
                                        edgesToAdd.push(new Edge(newEdge.p0, newEdge.p1, existingEdge.portalIndices[1]));
                                        edgesToAdd[edgesToAdd.length - 1].portalIndices.push(newEdge.portalIndices[1]);
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
            count = count + 1;
            // if (count == 4)
                // break;
        }
        
        console.log(this.edges);

        this.GetPolygonsData();
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
}