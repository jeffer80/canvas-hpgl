import {
  identity,
  rotate,
  scale,
  translate,
  fromObject,
  compose,
  applyToPoint
} from "transformation-matrix";

const round = Math.round;
const ln = ";\n";

export default class CanvasHpgl {
  constructor({ penColors } = {}) {
    this.penColors = penColors || {};
    this.beginPath();
    this.resetTransform();

    // store the strokeStyle for reference, this will be a pain when adding save/restore
    this._strokeStyle = "#000000";
  }

  set strokeStyle(color) {
    const pen = this.penColors[color];
    this._cmd("SP", pen || 1);
    this._strokeStyle = color;
  }

  get strokeStyle() {
    return this._strokeStyle;
  }

  stroke() {
    // just for API compatability
  }
  strokeRect() {
    // just for API compatability
  }

  rotate(a, cx, cy) {
    this._matrix = compose(
      this._matrix,
      rotate(a, cx, cy)
    );
  }
  scale(sx, sy) {
    this._matrix = compose(
      this._matrix,
      scale(sx, sy)
    );
  }
  translate(tx, ty) {
    this._matrix = compose(
      this._matrix,
      translate(tx, ty)
    );
  }
  transform(a, b, c, d, e, f) {
    this._matrix = compose(
      this._matrix,
      fromObject({ a, b, c, d, e, f })
    );
  }
  resetTransform() {
    this._transformStack = [];
    this._matrix = identity();
  }
  save() {
    this._transformStack.push(toString(this._matrix));
  }
  restore() {
    if (this._transformStack.length) {
      this._matrix = fromString(this._transformStack.pop());
    }
  }

  beginPath() {
    this._ = [];
    this._x0 = this._y0 = null; // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
  }

  moveTo(x, y) {
    y *= -1;
    ({ x, y } = applyToPoint(this._matrix, { x, y }));
    this._cmd(
      "PU",
      round((this._x0 = this._x1 = +x)),
      round((this._y0 = this._y1 = +y))
    );
  }
  lineTo(x, y) {
    y *= -1;
    ({ x, y } = applyToPoint(this._matrix, { x, y }));
    this._cmd("PD", round((this._x1 = +x)), round((this._y1 = +y)));
  }
  toString() {
    if (!this._.length) return "";
    return this._.map(d => d.join(" ")).join(ln) + ln;
  }

  _cmd(cmd, ...params) {
    params = params.join(" ");
    if (this._.length) {
      const prevCmd = this._[this._.length - 1];

      // Replace previous move commands with the new one
      // to remove long lists of pointless consecutive moves
      if (cmd === "PU" && prevCmd[0] === "PU") {
        this._.pop();
        this._.push([cmd, params]);
        return;
      }
      
      // Don't move/draw to the same point if we're already there
      if (prevCmd[1] === params) {
        return;
      }
    }
    this._.push([cmd, params]);
  }
}
