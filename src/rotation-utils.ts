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

// --- Quaternion utilities for gimbal-lock-free rotation composition ---

export type Quaternion = [number, number, number, number]; // [w, x, y, z]

function quatFromAxisAngle(ax: number, ay: number, az: number, angleDeg: number): Quaternion {
  const half = degToRad(angleDeg) / 2;
  const s = Math.sin(half);
  return [Math.cos(half), ax * s, ay * s, az * s];
}

function quatMultiply(a: Quaternion, b: Quaternion): Quaternion {
  return [
    a[0]*b[0] - a[1]*b[1] - a[2]*b[2] - a[3]*b[3],
    a[0]*b[1] + a[1]*b[0] + a[2]*b[3] - a[3]*b[2],
    a[0]*b[2] - a[1]*b[3] + a[2]*b[0] + a[3]*b[1],
    a[0]*b[3] + a[1]*b[2] - a[2]*b[1] + a[3]*b[0],
  ];
}

function quatNormalize(q: Quaternion): Quaternion {
  const len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
  if (len === 0) return [1, 0, 0, 0];
  return [q[0]/len, q[1]/len, q[2]/len, q[3]/len];
}

/** Convert Euler angles (degrees) to quaternion using Z→Y→X order */
export function eulerToQuat(angles: RotationAngles): Quaternion {
  const qx = quatFromAxisAngle(1, 0, 0, angles.rotX);
  const qy = quatFromAxisAngle(0, 1, 0, angles.rotY);
  const qz = quatFromAxisAngle(0, 0, 1, angles.rotZ);
  // Z→Y→X order: qx * qy * qz
  return quatNormalize(quatMultiply(quatMultiply(qx, qy), qz));
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/** Convert quaternion back to Euler angles (degrees) in Z→Y→X order */
export function quatToEuler(q: Quaternion): RotationAngles {
  const [w, x, y, z] = q;

  // rotY (Y-axis) — asin clamp to avoid NaN near ±1
  const sinY = -2 * (x * z - w * y);
  const clampedSinY = Math.max(-1, Math.min(1, sinY));
  const rotY = radToDeg(Math.asin(clampedSinY));

  let rotX: number;
  let rotZ: number;

  if (Math.abs(clampedSinY) > 0.9999) {
    // Gimbal lock — assign all remaining rotation to rotX, set rotZ = 0
    rotX = radToDeg(Math.atan2(-2 * (y * z - w * x), 1 - 2 * (x * x + z * z)));
    rotZ = 0;
  } else {
    rotX = radToDeg(Math.atan2(2 * (y * z + w * x), 1 - 2 * (x * x + y * y)));
    rotZ = radToDeg(Math.atan2(2 * (x * y + w * z), 1 - 2 * (y * y + z * z)));
  }

  return { rotX, rotY, rotZ };
}

/**
 * Apply an incremental screen-space rotation (dx→Y axis, dy→X axis) to
 * existing Euler angles without gimbal lock, by composing via quaternions.
 */
export function composeOrbitRotation(
  current: RotationAngles,
  dxDeg: number,
  dyDeg: number,
): RotationAngles {
  const qCurrent = eulerToQuat(current);
  // Incremental rotation: first around world-Y (horizontal drag), then world-X (vertical drag)
  const qDeltaY = quatFromAxisAngle(0, 1, 0, dxDeg);
  const qDeltaX = quatFromAxisAngle(1, 0, 0, dyDeg);
  // Apply incremental rotations: delta * current (pre-multiply for world-space axes)
  const qNew = quatNormalize(quatMultiply(quatMultiply(qDeltaX, qDeltaY), qCurrent));
  return quatToEuler(qNew);
}
