import { useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { RotationAngles, rotate3D, calculateDepthScale } from "../rotation-utils";

interface GraphRotationControllerProps {
  rotationAngles: RotationAngles;
  originalPositions: Map<string, { x: number; y: number; z: number; size: number }>;
  dataReady: boolean;
}

const GraphRotationController: FC<PropsWithChildren<GraphRotationControllerProps>> = ({ 
  rotationAngles, 
  originalPositions,
  dataReady,
  children 
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const rotationThrottleTimer = useRef<number | null>(null);
  const bboxLocked = useRef(false);

  // On first render after data is ready, lock the bounding box so sigma never
  // recalculates it when node positions change.
  useEffect(() => {
    if (!dataReady || bboxLocked.current) return;

    // Compute the maximum possible extent: for any rotation, the furthest a
    // point can move from the centroid is its 3D distance from the centroid.
    // We set a bounding box that can contain the full sphere of rotation.
    let centroidX = 0, centroidY = 0, centroidZ = 0, count = 0;
    originalPositions.forEach((pos) => {
      centroidX += pos.x;
      centroidY += pos.y;
      centroidZ += pos.z;
      count++;
    });
    if (count === 0) return;
    centroidX /= count;
    centroidY /= count;
    centroidZ /= count;

    let maxRadius = 0;
    originalPositions.forEach((pos) => {
      const dx = pos.x - centroidX;
      const dy = pos.y - centroidY;
      const dz = pos.z - centroidZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      maxRadius = Math.max(maxRadius, dist);
    });

    // Add a small padding factor
    const padding = maxRadius * 0.05;
    const r = maxRadius + padding;

    sigma.setCustomBBox({
      x: [centroidX - r, centroidX + r] as [number, number],
      y: [centroidY - r, centroidY + r] as [number, number],
    });

    bboxLocked.current = true;
  }, [dataReady, sigma, originalPositions]);

  // Apply 3D rotation with throttling
  useEffect(() => {
    if (!dataReady) return;
    
    if (rotationThrottleTimer.current !== null) {
      window.clearTimeout(rotationThrottleTimer.current);
    }
    
    rotationThrottleTimer.current = window.setTimeout(() => {
      // Calculate centroid of original positions to rotate around
      let centroidX = 0, centroidY = 0, centroidZ = 0, count = 0;
      originalPositions.forEach((pos) => {
        centroidX += pos.x;
        centroidY += pos.y;
        centroidZ += pos.z;
        count++;
      });
      centroidX /= count;
      centroidY /= count;
      centroidZ /= count;
      
      let minZ = Infinity;
      let maxZ = -Infinity;
      
      // First pass: apply rotation around centroid and find min/max Z
      const rotatedPositions = new Map<string, { x: number; y: number; z: number }>();
      
      graph.forEachNode((node) => {
        const original = originalPositions.get(node);
        if (!original) return;
        
        const translated = {
          x: original.x - centroidX,
          y: original.y - centroidY,
          z: original.z - centroidZ,
        };
        
        const rotated = rotate3D(translated, rotationAngles);
        
        const finalPosition = {
          x: rotated.x + centroidX,
          y: rotated.y + centroidY,
          z: rotated.z + centroidZ,
        };
        
        rotatedPositions.set(node, finalPosition);
        minZ = Math.min(minZ, finalPosition.z);
        maxZ = Math.max(maxZ, finalPosition.z);
      });
      
      // Batch update all node attributes
      graph.updateEachNodeAttributes((node, attr) => {
        const rotated = rotatedPositions.get(node);
        const original = originalPositions.get(node);
        if (!rotated || !original) return attr;
        
        const depthScale = calculateDepthScale(rotated.z, minZ, maxZ, 0.5, 1.5);
        
        return {
          ...attr,
          x: rotated.x,
          y: rotated.y,
          size: original.size * depthScale,
        };
      });
      
      rotationThrottleTimer.current = null;
    }, 50);
    
    return () => {
      if (rotationThrottleTimer.current !== null) {
        window.clearTimeout(rotationThrottleTimer.current);
      }
    };
  }, [rotationAngles, dataReady, graph, sigma, originalPositions]);

  return <>{children}</>;
};

export default GraphRotationController;
