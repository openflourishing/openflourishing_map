import { FC } from "react";
import { RotationAngles } from "../rotation-utils";

interface Rotation3DPanelProps {
  rotationAngles: RotationAngles;
  onRotationChange: (angles: RotationAngles) => void;
}

const Rotation3DPanel: FC<Rotation3DPanelProps> = ({ rotationAngles, onRotationChange }) => {
  const handleRotationChange = (axis: 'rotX' | 'rotY' | 'rotZ', value: number) => {
    onRotationChange({
      ...rotationAngles,
      [axis]: value,
    });
  };

  const handleReset = () => {
    onRotationChange({ rotX: 0, rotY: 0, rotZ: 0 });
  };

  return (
    <div className="rotation-3d-panel">
      <div className="rotation-control">
        <label htmlFor="rotation-x-slider" title="Rotate around X axis (pitch)">
          X-axis: {rotationAngles.rotX}°
        </label>
        <input
          id="rotation-x-slider"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotationAngles.rotX}
          onChange={(e) => handleRotationChange('rotX', parseInt(e.target.value, 10))}
        />
      </div>
      <div className="rotation-control">
        <label htmlFor="rotation-y-slider" title="Rotate around Y axis (yaw)">
          Y-axis: {rotationAngles.rotY}°
        </label>
        <input
          id="rotation-y-slider"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotationAngles.rotY}
          onChange={(e) => handleRotationChange('rotY', parseInt(e.target.value, 10))}
        />
      </div>
      <div className="rotation-control">
        <label htmlFor="rotation-z-slider" title="Rotate around Z axis (roll)">
          Z-axis: {rotationAngles.rotZ}°
        </label>
        <input
          id="rotation-z-slider"
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotationAngles.rotZ}
          onChange={(e) => handleRotationChange('rotZ', parseInt(e.target.value, 10))}
        />
      </div>
      <button 
        type="button" 
        className="reset-rotation-btn"
        onClick={handleReset}
        title="Reset all rotations to 0°"
      >
        Reset Rotation
      </button>
    </div>
  );
};

export default Rotation3DPanel;
