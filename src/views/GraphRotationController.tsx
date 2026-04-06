import { useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect, useRef } from "react";
import { RotationAngles, rotate3D, calculateDepthScale } from "../rotation-utils";

interface GraphRotationControllerProps {
  rotationAngles: RotationAngles;
  onRotationChange: (angles: RotationAngles) => void;
  originalPositions: Map<string, { x: number; y: number; z: number; size: number }>;
  positions2D: Map<string, { x: number; y: number; z: number }>;
  positions3D: Map<string, { x: number; y: number; z: number }>;
  is3DMode: boolean;
  dataReady: boolean;
}

const LERP_FACTOR = 0.15;
const SNAP_THRESHOLD = 0.1; // degrees
const POSITION_LERP_FACTOR = 0.05; // ~1 second total transition (60fps × 0.05 ≈ converges in ~60 frames)
const POSITION_SNAP_THRESHOLD = 0.01; // snap when positions are very close

function lerpAngle(current: number, target: number, factor: number): number {
  // Take the shortest path around the circle
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return current + diff * factor;
}

function lerpValue(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

const ORBIT_SENSITIVITY = 0.4; // degrees per pixel of mouse movement

const GraphRotationController: FC<PropsWithChildren<GraphRotationControllerProps>> = ({ 
  rotationAngles,
  onRotationChange,
  originalPositions,
  positions2D,
  positions3D,
  is3DMode,
  dataReady,
  children 
}) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const displayedAngles = useRef<RotationAngles>({ rotX: 0, rotY: 0, rotZ: 0 });
  const targetAngles = useRef<RotationAngles>({ rotX: 0, rotY: 0, rotZ: 0 });
  const animFrameId = useRef<number | null>(null);
  const bboxLocked = useRef(false);
  const transitioning = useRef(false);
  const is3DModeRef = useRef(is3DMode);
  is3DModeRef.current = is3DMode;
  const onRotationChangeRef = useRef(onRotationChange);
  onRotationChangeRef.current = onRotationChange;
  const rotationAnglesRef = useRef(rotationAngles);
  rotationAnglesRef.current = rotationAngles;

  // Mouse orbit: CTRL+left-drag or right-drag to rotate in 3D mode
  useEffect(() => {
    if (!dataReady) return;

    const container = sigma.getContainer();
    const mouseLayer = container.querySelector(".sigma-mouse") as HTMLElement | null;
    if (!mouseLayer) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (!is3DModeRef.current) return;
      if (e.button !== 2) return;

      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;

      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const current = rotationAnglesRef.current;
      const newRotX = Math.max(-89, Math.min(89, current.rotX + dy * ORBIT_SENSITIVITY));
      let newRotY = current.rotY + dx * ORBIT_SENSITIVITY;
      // Wrap rotY to [-180, 180]
      if (newRotY > 180) newRotY -= 360;
      if (newRotY < -180) newRotY += 360;
      onRotationChangeRef.current({
        rotX: Math.round(newRotX),
        rotY: Math.round(newRotY),
        rotZ: current.rotZ,
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      isDragging = false;
      e.stopPropagation();
      e.preventDefault();
    };

    const onContextMenu = (e: MouseEvent) => {
      if (is3DModeRef.current) {
        e.preventDefault();
      }
    };

    // Use capture phase to intercept before sigma's handlers
    mouseLayer.addEventListener("mousedown", onMouseDown, { capture: true });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    mouseLayer.addEventListener("contextmenu", onContextMenu);

    return () => {
      mouseLayer.removeEventListener("mousedown", onMouseDown, { capture: true });
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      mouseLayer.removeEventListener("contextmenu", onContextMenu);
    };
  }, [dataReady, sigma]);

  // On first render after data is ready, lock the bounding box so sigma never
  // recalculates it when node positions change.
  useEffect(() => {
    if (!dataReady || bboxLocked.current) return;

    // Compute the maximum possible extent across both 2D and 3D position sets
    // to ensure the bbox can contain all positions during transitions.
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const allPositionSets = [positions2D, positions3D];
    for (const posSet of allPositionSets) {
      posSet.forEach((pos) => {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      });
    }

    // Also account for 3D rotation: the max radius from centroid of 3D positions
    let centroidX = 0, centroidY = 0, centroidZ = 0, count = 0;
    positions3D.forEach((pos) => {
      centroidX += pos.x;
      centroidY += pos.y;
      centroidZ += pos.z;
      count++;
    });
    if (count > 0) {
      centroidX /= count;
      centroidY /= count;
      centroidZ /= count;

      let maxRadius = 0;
      positions3D.forEach((pos) => {
        const dx = pos.x - centroidX;
        const dy = pos.y - centroidY;
        const dz = pos.z - centroidZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        maxRadius = Math.max(maxRadius, dist);
      });

      minX = Math.min(minX, centroidX - maxRadius);
      maxX = Math.max(maxX, centroidX + maxRadius);
      minY = Math.min(minY, centroidY - maxRadius);
      maxY = Math.max(maxY, centroidY + maxRadius);
    }

    const padX = (maxX - minX) * 0.05;
    const padY = (maxY - minY) * 0.05;

    sigma.setCustomBBox({
      x: [minX - padX, maxX + padX] as [number, number],
      y: [minY - padY, maxY + padY] as [number, number],
    });

    bboxLocked.current = true;
  }, [dataReady, sigma, positions2D, positions3D]);

  // Handle mode transition: restart animation to pick up new target positions
  useEffect(() => {
    if (!dataReady) return;

    transitioning.current = true;
    targetAngles.current = { ...rotationAngles };

    // Cancel any running animation and restart so the loop uses the new mode
    if (animFrameId.current !== null) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    startAnimationLoop();
  }, [is3DMode, dataReady]);

  // Apply rotation with smooth animation loop
  useEffect(() => {
    if (!dataReady) return;

    // Update the target angles
    targetAngles.current = { ...rotationAngles };

    // If an animation loop is already running, it will pick up the new target
    if (animFrameId.current !== null) return;

    startAnimationLoop();
    
    return () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [rotationAngles, dataReady]);

  function startAnimationLoop() {
    const animate = () => {
      const displayed = displayedAngles.current;
      const target = targetAngles.current;
      const targetPositions = is3DModeRef.current ? positions3D : positions2D;

      // Lerp each rotation angle toward the target
      const newAngles: RotationAngles = {
        rotX: lerpAngle(displayed.rotX, target.rotX, LERP_FACTOR),
        rotY: lerpAngle(displayed.rotY, target.rotY, LERP_FACTOR),
        rotZ: lerpAngle(displayed.rotZ, target.rotZ, LERP_FACTOR),
      };

      // Check if rotation is close enough to snap
      const dX = Math.abs(newAngles.rotX - target.rotX);
      const dY = Math.abs(newAngles.rotY - target.rotY);
      const dZ = Math.abs(newAngles.rotZ - target.rotZ);
      const rotationAtTarget = dX < SNAP_THRESHOLD && dY < SNAP_THRESHOLD && dZ < SNAP_THRESHOLD;

      if (rotationAtTarget) {
        newAngles.rotX = target.rotX;
        newAngles.rotY = target.rotY;
        newAngles.rotZ = target.rotZ;
      }

      displayedAngles.current = newAngles;

      // Lerp original positions toward their target (2D or 3D) for smooth transition
      let positionAtTarget = true;
      originalPositions.forEach((pos, node) => {
        const tgt = targetPositions.get(node);
        if (!tgt) return;

        const newX = lerpValue(pos.x, tgt.x, POSITION_LERP_FACTOR);
        const newY = lerpValue(pos.y, tgt.y, POSITION_LERP_FACTOR);
        const newZ = lerpValue(pos.z, tgt.z, POSITION_LERP_FACTOR);

        if (Math.abs(newX - tgt.x) > POSITION_SNAP_THRESHOLD ||
            Math.abs(newY - tgt.y) > POSITION_SNAP_THRESHOLD ||
            Math.abs(newZ - tgt.z) > POSITION_SNAP_THRESHOLD) {
          positionAtTarget = false;
        }

        pos.x = positionAtTarget && Math.abs(newX - tgt.x) <= POSITION_SNAP_THRESHOLD ? tgt.x : newX;
        pos.y = positionAtTarget && Math.abs(newY - tgt.y) <= POSITION_SNAP_THRESHOLD ? tgt.y : newY;
        pos.z = positionAtTarget && Math.abs(newZ - tgt.z) <= POSITION_SNAP_THRESHOLD ? tgt.z : newZ;
      });

      // Re-check after potential snapping
      if (positionAtTarget) {
        originalPositions.forEach((pos, node) => {
          const tgt = targetPositions.get(node);
          if (!tgt) return;
          pos.x = tgt.x;
          pos.y = tgt.y;
          pos.z = tgt.z;
        });
        transitioning.current = false;
      }

      // Calculate centroid of current original positions to rotate around
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

      // Compute max 3D radius from centroid — this is the maximum possible
      // depth extent for any rotation angle, used as a fixed reference range
      // so that depth scaling is proportional to the overall 3D spread.
      let maxRadius = 0;
      originalPositions.forEach((pos) => {
        const dx = pos.x - centroidX;
        const dy = pos.y - centroidY;
        const dz = pos.z - centroidZ;
        maxRadius = Math.max(maxRadius, Math.sqrt(dx * dx + dy * dy + dz * dz));
      });
      
      // First pass: apply rotation around centroid
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
      });

      // Use fixed depth range based on max 3D radius so that depth scaling
      // is proportional regardless of viewing angle
      const depthMinZ = centroidZ - maxRadius;
      const depthMaxZ = centroidZ + maxRadius;
      
      // Batch update all node attributes
      graph.updateEachNodeAttributes((node, attr) => {
        const rotated = rotatedPositions.get(node);
        const original = originalPositions.get(node);
        if (!rotated || !original) return attr;
        
        const depthScale = is3DModeRef.current ? calculateDepthScale(rotated.z, depthMinZ, depthMaxZ, 0.35, 1.75) : 1.0;
        
        return {
          ...attr,
          x: rotated.x,
          y: rotated.y,
          size: original.size * depthScale,
        };
      });

      const allAtTarget = rotationAtTarget && positionAtTarget && !transitioning.current;

      if (allAtTarget) {
        animFrameId.current = null;
      } else {
        animFrameId.current = requestAnimationFrame(animate);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);
  }

  return <>{children}</>;
};

export default GraphRotationController;
