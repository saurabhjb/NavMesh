This code is created using Raw WebGL APIs.

Approach used for Nav Mesh Generation

1. Convert the ground into grid based system based on bounds.
2. Mark the areas with cubes. (Created walkable map, which stores 'true' for denoting walkable cell and 'false' for occupied)
3. Used Walkable grid to generate rectangles
   1. Start with (0, 0) position on grid.
   2. Scan horizontally until you reach the end (width of grid) or find occupied cell. This gives you min max for horizontal axis.
   3. Then from the max horizontal point, start scanning vertically.
   4. For each vertical, scan horizontally from min to max value you got from step 2.\
      If you encounter occupied cell or already process cell break. This gives you min and max on vertical axis.
   6. Add this rectangle entry, and mark the cells as processed.
   7. Repeat this to go through the grid
4. Based on rectangles get all the unique points and generate portals (using these uniqe points).\
   These are the unique nodes on the grid. This will be used to find the path.
5. Next step is to generate edges which are connecting the unique points to form portals.\
   Also, for each edge store the portals it is sharing.
   1. For every portal identify the edges. (For 1st iteration push the 4 edges with portal id 0)
   2. Check each edge with the edges pushed in the last iteration\
      3 possibilities
      1. Edge is unique -> Add new edge to the list with the new portal id.
      2. Edge falls on the same axis but doesn't overlap -> Add new edge to the list with the new portal id.
      3. Edge overlaps with existing edge\
         9 possible ways of how edge can intersect on single axis (refer to GeneratePortalEdges function in NavMeshManager)

             1. new_edge_point_0 - existing_edge_point_0 - new_edge_point_1 - existing_edge_point_1\
                                   |- Overlap ----------------------------|
             2. existing_edge_point_0 - new_edge_point_0 - existing_edge_point_1 - new_edge_point_1\
                                        |- Overlap ----------------------------|
             3. existing_edge_point_0 - new_edge_point_0 - new_edge_point_1 - existing_edge_point_1\
                                        |- Overlap ------------------------|
             4. new_edge_point_0 - existing_edge_point_0 - existing_edge_point_1 - new_edge_point_1\
                                   |- Overlap ---------------------------------|
             5. new_edge_point_0/existing_edge_point_0 - existing_edge_point_1 - new_edge_point_1\
                |- Overlap ---------------------------------------------------|
             6. new_edge_point_0 - existing_edge_point_0 - existing_edge_point_1/new_edge_point_1\
                                   |- Overlap --------------------------------------------------|
             7. existing_edge_point_0 - new_edge_point_0/existing_edge_point_1 - new_edge_point_1\
                                        |- Overlap ---------------------------------------------|
             8. existing_edge_point_0 - new_edge_point_0 - existing_edge_point_1/new_edge_point_1\
                                        |- Overlap ---------------------------------------------|
             9. existind_edge_point0/new_edge_point_0 - existing_edge_point_1/new_edge_point_1\
                |- Overlap ------------------------------------------------------------------|

         In these cases, we should add 2 portal entries to the edges with overlap marked.
   3. Repeat this for every portal and you'll get a list of all the edges and which portals they belong to.
<br><br><br>


Approach used for Path Finding

1. Used A* algorithm
2. From agentPosition and target endpoint, got the grid position
3. From grid positon figured out the portal they are in
4. To find out the startNode and endNode for A* algorithm, find the nearest node in the portal.\
   Nearest nodes of the portal will be the startNode and endNode.\
<br><br><br>


Strategy for Path Simplification

1. Get the path from above step
2. Iterate throught the Edges. If edges are having the same portal element the middle edge until you find an edge with differet portal.
3. Then repeat step 2 for the next portal until you reach destination.
4. This will eliminate edges that are part of same portal.
5. Now we'll have edges which connect different portals.
6. Here check 2 edges\
   Take Edge 1 start point and Edge 2 end point\
   Line passing from this two points will either intersect the edge which has one point as Edge 1 end point or Edge 2 start point (both are same).\
   If the line passing intersect the edge, then we can eliminate the middle point.\
   If it doesn't intersect, that means we founf the most optimized path for going to next portal.\
   Repeat this till the end.\

   This should generate shortest path and eliminate few edges from final path.\
<br><br><br>
  
  
Strategy for NavMesh Reconstruction

1. Store list of objects and position used to create prvious NavMesh
2. Modify the scene layout
3. Based off of new layout identify the moved pieces
4. In the processed and walkable grid map mark the region as walkable and not processed
5. Mark new areas based on changes as not walkable. If these area overlap other area/portal, invalidate that area/portal too.
6. Generate new rectanges/portals using the invalidated region
7. Then run a pass to check which rectangles can be merged with one another \
   Run this again and again until there is no merge operation in the loop.
8. Then again run Portal creation and Edge Identification functions.
            
