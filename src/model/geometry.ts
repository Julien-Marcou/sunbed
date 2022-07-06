import { HALF_CIRCLE, QUARTER_CIRCLE, SIXTEENTH_CIRCLE } from '../constants/circle.constants';

export type Point = {
  x: number;
  y: number;
};

export type Vector = {
  dx: number;
  dy: number;
};

export type Segment = {
  p1: Point;
  p2: Point;
};

export type Size = {
  width: number;
  height: number;
};

export type BoundingBox = Point & Size;

export type Circle = Point & {
  radius: number;
};

export class Geometry {

  public static getDistance(point1: Point, point2: Point): number {
    return Math.hypot(point1.x - point2.x, point1.y - point2.y);
  }

  public static getArcLength(radius: number, startAngle: number, endAngle: number): number {
    const angle = Math.abs(endAngle - startAngle);
    return angle * radius;
  }

  public static getArcChordLength(radius: number, angle: number): number {
    return Math.round(radius *  Math.sin(angle / 2) * 2);
  }

  public static getArcHeight(radius: number, angle: number): number {
    return radius - Math.round(radius *  Math.cos(angle / 2));
  }

  public static getDirection(point1: Point, point2: Point): 'ns' | 'ew' | 'nesw' | 'nwse' {
    let angle = this.getAngle(point1, point2);
    const sign = Math.sign(angle);
    angle = Math.abs(angle);
    if (angle >= SIXTEENTH_CIRCLE && angle < QUARTER_CIRCLE - SIXTEENTH_CIRCLE) {
      return sign < 0 ? 'nesw' : 'nwse';
    }
    if (angle >= QUARTER_CIRCLE - SIXTEENTH_CIRCLE && angle < QUARTER_CIRCLE + SIXTEENTH_CIRCLE) {
      return 'ns';
    }
    if (angle >= QUARTER_CIRCLE + SIXTEENTH_CIRCLE && angle < HALF_CIRCLE - SIXTEENTH_CIRCLE) {
      return sign < 0 ? 'nwse' : 'nesw';
    }
    return 'ew';
  }

  public static getAngle(point1: Point, point2: Point): number {
    return Math.atan2((point2.y - point1.y), (point2.x - point1.x));
  }

  public static getTangent(circle1: Circle, circle2: Circle, invert?: boolean): Segment | undefined {
    const distanceX = circle2.x - circle1.x;
    const distanceY = circle2.y - circle1.y;
    const hypotenuse = Math.hypot(distanceX, distanceY);
    if (hypotenuse <= circle1.radius + circle2.radius) {
      return undefined;
    }
    const shortSide = circle1.radius + circle2.radius;
    const angle = Math.atan2(distanceY, distanceX) + (invert ? -1 : 1) * Math.asin(shortSide / hypotenuse) + (invert ? 1 : -1) * QUARTER_CIRCLE;
    const oppositeAngle = angle + HALF_CIRCLE;
    return {
      p1: {
        x: circle1.x + circle1.radius * Math.cos(angle),
        y: circle1.y + circle1.radius * Math.sin(angle),
      },
      p2: {
        x: circle2.x + circle2.radius * Math.cos(oppositeAngle),
        y: circle2.y + circle2.radius * Math.sin(oppositeAngle),
      },
    };
  }

  public static getOppositeLength(hypotenuse: number, angle: number): number {
    return Math.sin(angle) * hypotenuse;
  }

  public static getAdjacentLength(hypotenuse: number, angle: number): number {
    return Math.cos(angle) * hypotenuse;
  }

}
