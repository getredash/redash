// This file provides fixes for issues in the @types/leaflet package
import * as L from 'leaflet';

declare module 'leaflet' {
  // Fix for the Control class that's causing TypeScript errors
  interface ControlOptions {
    position?: L.ControlPosition;
  }

  // Redefine the Control class to fix the syntax errors
  class Control {
    static extend<T>(props: any): any;
    constructor(options?: ControlOptions);
    getPosition(): L.ControlPosition;
    setPosition(position: L.ControlPosition): this;
    getContainer(): HTMLElement | undefined;
    addTo(map: L.Map): this;
    remove(): this;
    
    // Extension methods
    onAdd?(map: L.Map): HTMLElement;
    onRemove?(map: L.Map): void;
    
    options: ControlOptions;
  }
}
