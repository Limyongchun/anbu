export type MotionState = "moving" | "stationary" | "unknown";

export interface ParentLocation {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
  motionState: MotionState;
  parentName: string;
}

export interface MapStatusText {
  motion: string;
  freshness: string;
}
