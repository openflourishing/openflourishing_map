import { FC, useRef, useCallback, useEffect } from "react";
import { RotationAngles } from "../rotation-utils";

interface RotaryKnobProps {
  value: number; // -180 to 180
  onChange: (value: number) => void;
  label: string;
  title: string;
}

const RotaryKnob: FC<RotaryKnobProps> = ({ value, onChange, label, title }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const getAngleFromMouse = useCallback((clientX: number, clientY: number) => {
    const knob = knobRef.current;
    if (!knob) return 0;
    const rect = knob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 gives angle in radians, convert to degrees
    // Offset so that top (12 o'clock) = 0°
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    // Wrap to [-180, 180]
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    return Math.round(angle);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const angle = getAngleFromMouse(e.clientX, e.clientY);
    onChange(angle);
  }, [onChange, getAngleFromMouse]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const angle = getAngleFromMouse(e.clientX, e.clientY);
      onChange(angle);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onChange, getAngleFromMouse]);

  // The indicator line rotates with the value
  const indicatorRotation = value;

  return (
    <div className="rotation-control" title={title}>
      <label>{label}: {value}°</label>
      <div
        ref={knobRef}
        className="rotary-knob"
        onMouseDown={handleMouseDown}
      >
        <div className="rotary-knob-track" />
        <div
          className="rotary-knob-indicator"
          style={{ transform: `rotate(${indicatorRotation}deg)` }}
        >
          <div className="rotary-knob-tick" />
        </div>
        <div className="rotary-knob-center" />
      </div>
    </div>
  );
};

interface Rotation3DPanelProps {
  rotationAngles: RotationAngles;
  onRotationChange: (angles: RotationAngles) => void;
  is3DMode: boolean;
  onToggle3DMode: (enabled: boolean) => void;
}

const Rotation3DPanel: FC<Rotation3DPanelProps> = ({ rotationAngles, onRotationChange, is3DMode, onToggle3DMode }) => {
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
      <div className="mode-toggle-control">
        <label className="mode-toggle-label">
          <input
            type="checkbox"
            checked={is3DMode}
            onChange={(e) => onToggle3DMode(e.target.checked)}
          />
          3D Mode
        </label>
      </div>
      {is3DMode && (
        <>
          <div className="rotation-knobs-row">
            <RotaryKnob
              value={rotationAngles.rotX}
              onChange={(v) => handleRotationChange('rotX', v)}
              label="X"
              title="Rotate around X axis (pitch)"
            />
            <RotaryKnob
              value={rotationAngles.rotY}
              onChange={(v) => handleRotationChange('rotY', v)}
              label="Y"
              title="Rotate around Y axis (yaw)"
            />
            <RotaryKnob
              value={rotationAngles.rotZ}
              onChange={(v) => handleRotationChange('rotZ', v)}
              label="Z"
              title="Rotate around Z axis (roll)"
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
        </>
      )}
    </div>
  );
};

export default Rotation3DPanel;
