/**
 * Instrument Panel design system: tactile speed control with a precision rotary dial,
 * pointer-drag physics, wheel stepping, and an accessible range fallback.
 */
import { Minus, Plus } from "lucide-react";
import { useRef } from "react";
import type { PointerEvent, WheelEvent } from "react";

type WpmDialProps = {
  wpm: number;
  onChange: (value: number) => void;
};

const MIN_WPM = 100;
const MAX_WPM = 2500;
const STEP_WPM = 25;
const clamp = (value: number) => Math.min(MAX_WPM, Math.max(MIN_WPM, value));

export default function WpmDial({ wpm, onChange }: WpmDialProps) {
  const dialProgress = ((wpm - MIN_WPM) / (MAX_WPM - MIN_WPM)) * 270;
  const dragOrigin = useRef<{ coordinate: number; wpm: number } | null>(null);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    onChange(clamp(wpm + (event.deltaY > 0 ? -STEP_WPM : STEP_WPM)));
  };

  const getCoordinate = (event: PointerEvent<HTMLDivElement>) => {
    const horizontalMovement = Math.abs(event.movementX) > Math.abs(event.movementY);
    return horizontalMovement ? event.clientX : event.clientY;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { coordinate: getCoordinate(event), wpm };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    const coordinate = getCoordinate(event);
    const delta = dragOrigin.current.coordinate - coordinate;
    const steps = Math.trunc(delta / 8);
    if (steps !== 0) onChange(clamp(dragOrigin.current.wpm + steps * STEP_WPM));
  };

  const clearPointerDrag = () => {
    dragOrigin.current = null;
  };

  return (
    <section className="control-bay pacing-bay" aria-label="Reading pace controls">
      <div className="bay-label">Pacing / speed dial</div>
      <div className="pacing-layout">
        <div
          className="wpm-dial"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={clearPointerDrag}
          onPointerCancel={clearPointerDrag}
          role="slider"
          tabIndex={0}
          aria-label="Words per minute speed dial"
          aria-valuemin={MIN_WPM}
          aria-valuemax={MAX_WPM}
          aria-valuenow={wpm}
          aria-valuetext={`${wpm} words per minute`}
          style={{ "--dial-fill": `${dialProgress}deg` } as React.CSSProperties}
        >
          <div className="dial-core"><span /></div>
          <div className="dial-tick" />
          <span className="dial-min">{MIN_WPM}</span>
          <span className="dial-max">{MAX_WPM}</span>
        </div>
        <div className="wpm-readout" aria-live="polite">
          <div className="wpm-number">{wpm}</div>
          <div className="wpm-unit">WPM</div>
          <div className="wpm-stepper" aria-label="Fine tune reading pace">
            <button onClick={() => onChange(clamp(wpm - STEP_WPM))} aria-label="Decrease words per minute"><Minus size={13} /></button>
            <button onClick={() => onChange(clamp(wpm + STEP_WPM))} aria-label="Increase words per minute"><Plus size={13} /></button>
          </div>
        </div>
      </div>
      <input
        className="visually-hidden"
        type="range"
        min={MIN_WPM}
        max={MAX_WPM}
        step={STEP_WPM}
        value={wpm}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="WPM range input"
      />
      <p className="bay-hint">Drag, scroll, or use arrow keys · 100–2500 WPM</p>
    </section>
  );
}
