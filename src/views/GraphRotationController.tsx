import { useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { RotationAngles, rotate3D, calculateDepthScale } from "../rotation-utils";

interface GraphRotationControllerProps {
  rotationAngles: RotationAngles;
  originalPositions: Map<string, { x: number; y: number; z: number; size: number }>;
  dataReady: boolean;
}

const LERP_FACTOR = 0.15;
const SNAP_THRESHOLD = 0.1; // degrees

function lerpAngle(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

const GraphRotationController: FC<PropsWithChildren<GraphRotationControllerProps>> = ({ 
  rotationAngles, 
  originalPositions,
  dataReady,
  children 
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const displayedAngles = useRef<RotationAngles>({ rotX: 0, rotY: 0, rotZ: 0 });
  const targetAngles = useRef<RotationAngles>({ rotX: 0, rotY: 0, rotZ: 0 });
  const animFrameId = useRef<number | null>(null);
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

  // Apply rotation with smooth animation loop
  useEffect(() => {
    if (!dataReady) return;

    // Update the target angles
    targetAngles.current = { ...rotationAngles };

    // If an animation loop is already running, it will pick up the new target
    if (animFrameId.current !== null) return;

    const animate = () => {
      const displayed = displayedAngles.current;
      const target = targetAngles.current;

      // Lerp each axis toward the target
      const newAngles: RotationAngles = {
        rotX: lerpAngle(displayed.rotX, target.rotX, LERP_FACTOR),
        rotY: lerpAngle(displayed.rotY, target.rotY, LERP_FACTOR),
        rotZ: lerpAngle(displayed.rotZ, target.rotZ, LERP_FACTOR),
      };

      // Check if we're close enough to snap
      const dX = Math.abs(newAngles.rotX - target.rotX);
      const dY = Math.abs(newAngles.rotY - target.rotY);
      const dZ = Math.abs(newAngles.rotZ - target.rotZ);
      const atTarget = dX < SNAP_THRESHOLD && dY < SNAP_THRESHOLD && dZ < SNAP_THRESHOLD;

      if (atTarget) {
        newAngles.rotX = target.rotX;
        newAngles.rotY = target.rotY;
        newAngles.rotZ = target.rotZ;
      }

      displayedAngles.current = newAngles;

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
        
        const rotated = rotate3D(translated, newAngles);
        
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

      if (atTarget) {
        animFrameId.current = null;
      } else {
        animFrameId.current = requestAnimationFrame(animate);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);
    
    return () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [rotationAngles, dataReady, graph, sigma, originalPositions]);

  return <>{children}</>;
};

export default GraphRotationController;
