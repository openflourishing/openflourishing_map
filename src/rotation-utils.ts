/**
 * 3D rotation utilities for transforming node positions
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface RotationAngles {
  rotX: number;
  rotY: number;
  rotZ: number;
}

/**
 * Convert degrees to radians
 */
function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Apply rotation matrices around X, Y, and Z axes
 * Rotation order: Z -> Y -> X (same as many 3D graphics systems)
 */
export function rotate3D(point: Point3D, angles: RotationAngles): Point3D {
  const { rotX, rotY, rotZ } = angles;
  const radX = degToRad(rotX);
  const radY = degToRad(rotY);
  const radZ = degToRad(rotZ);

  let { x, y, z } = point;

  // Rotation around Z-axis
  if (rotZ !== 0) {
    const cosZ = Math.cos(radZ);
    const sinZ = Math.sin(radZ);
    const xNew = x * cosZ - y * sinZ;
    const yNew = x * sinZ + y * cosZ;
    x = xNew;
    y = yNew;
  }

  // Rotation around Y-axis
  if (rotY !== 0) {
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    const xNew = x * cosY + z * sinY;
    const zNew = -x * sinY + z * cosY;
    x = xNew;
    z = zNew;
  }

  // Rotation around X-axis
  if (rotX !== 0) {
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    const yNew = y * cosX - z * sinX;
    const zNew = y * sinX + z * cosX;
    y = yNew;
    z = zNew;
  }

  return { x, y, z };
}

/**
 * Project 3D point to 2D by taking x and y coordinates
 * Optionally apply perspective projection
 */
export function project2D(point: Point3D, usePerspective: boolean = false): { x: number; y: number } {
  if (usePerspective) {
    // Simple perspective projection (can be enhanced later)
    const focalLength = 500;
    const scale = focalLength / (focalLength + point.z);
    return {
      x: point.x * scale,
      y: point.y * scale,
    };
  }
  
  // Orthographic projection - just use x and y
  return { x: point.x, y: point.y };
}

/**
 * Calculate size scale factor based on z-depth
 * Closer objects (higher z after rotation) appear larger
 * 
 * @param z - The z-coordinate after rotation
 * @param minZ - Minimum z value in the dataset
 * @param maxZ - Maximum z value in the dataset
 * @param minScale - Minimum size multiplier (default 0.5 = 50%)
 * @param maxScale - Maximum size multiplier (default 1.5 = 150%)
 */
export function calculateDepthScale(
  z: number,
  minZ: number,
  maxZ: number,
  minScale: number = 0.5,
  maxScale: number = 1.5
): number {
  if (maxZ === minZ) return 1.0;
  
  // Normalize z to [0, 1] range
  const normalized = (z - minZ) / (maxZ - minZ);
  
  // Map to scale range - higher z = larger scale (closer to viewer)
  return minScale + normalized * (maxScale - minScale);
}
