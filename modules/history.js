export class History {
  constructor(limit = 20) { this.limit = limit; this.undoStack = []; this.redoStack = []; }
  push(imageData) {
    this.undoStack.push(cloneImageData(imageData));
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(current) {
    if (!this.undoStack.length) return null;
    this.redoStack.push(cloneImageData(current));
    return this.undoStack.pop();
  }
  redo(current) {
    if (!this.redoStack.length) return null;
    this.undoStack.push(cloneImageData(current));
    return this.redoStack.pop();
  }
  clear() { this.undoStack = []; this.redoStack = []; }
}
export function cloneImageData(im) { return new ImageData(new Uint8ClampedArray(im.data), im.width, im.height); }
