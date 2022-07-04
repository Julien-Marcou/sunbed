import { Component, OnInit } from '@angular/core';

/* eslint-disable @typescript-eslint/no-unused-vars */
const SIXTEENTH_CIRCLE = Math.PI / 8;
const EIGHTH_CIRCLE = Math.PI / 4;
const QUARTER_CIRCLE = Math.PI / 2;
const HALF_CIRCLE = Math.PI;
const FULL_CIRCLE = Math.PI * 2;
const RADIAN_TO_DEGREE = 180 / Math.PI;
/* eslint-enable @typescript-eslint/no-unused-vars */

type Point = {
  x: number;
  y: number;
};

type Vector = {
  dx: number;
  dy: number;
};

type Segment = {
  p1: Point;
  p2: Point;
};

type Drag<T> = {
  element: T;
  elementOrigin: Point;
  dragOrigin: Point;
};

type Resize<T> = {
  element: T;
  elementSize: number;
};

type Circle = Point & {
  radius: number;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  private readonly scale = 3.5; // 1 pixel = 3.5 millimeters
  private readonly silhouetteScale = 3.2; // So that the silhouette is 178cm tall
  private readonly width = 2200;
  private readonly height = 1800;
  private readonly handleRadius = 40;
  private readonly lineDash = [8 * this.scale, 10 * this.scale];

  protected lathWidth = 55;
  protected lathGap = 18;
  protected lathCount = 0;
  protected legAngle = 0;
  protected backAngle = 0;
  protected legTangentLength = 0;
  protected middleTangentLength = 0;
  protected backTangentLength = 0;
  protected legArcLength = 0;
  protected legArcChordLength = 0;
  protected backArcLength = 0;
  protected backArcChordLength = 0;
  protected legArcThickness = 0;
  protected backArcThickness = 0;
  protected remainingLength = 0;
  protected displayConstructionLines = true;
  protected displayConstructionHandles = true;
  protected displayLaths = true;
  protected displaySilhouette = true;

  protected readonly legCircle: Circle;
  protected readonly backCircle: Circle;
  protected readonly footPoint: Point;
  protected readonly headPoint: Point;

  private readonly handles: Array<Point>;
  private readonly circles: Array<Circle>;

  private silhouette!: ImageBitmap;
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private canvasOffset!: Point;
  private hoveredHandle?: Point;
  private hoveredCircle?: Circle;
  private drag?: Drag<Point>;
  private resize?: Resize<Circle>;

  constructor() {
    this.legCircle = {x: 0, y: 0, radius: 0};
    this.backCircle = {x: 0, y: 0, radius: 0};
    this.footPoint = {x: 0, y: 0};
    this.headPoint = {x: 0, y: 0};
    this.handles = [this.footPoint, this.legCircle, this.backCircle, this.headPoint];
    this.circles = [this.legCircle, this.backCircle];
  }

  public async ngOnInit(): Promise<void> {
    this.silhouette = await this.loadFromUrl('/assets/silhouette.png');
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.canvas.width = this.width / this.scale;
    this.canvas.height = this.height / this.scale;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to retrieve 2D context');
    }
    this.context =  context;
    this.context.scale(1 / this.scale, 1 / this.scale);
    this.canvasOffset = {
      x: this.canvas.offsetLeft + (this.canvas.offsetWidth - this.canvas.clientWidth) / 2,
      y: this.canvas.offsetTop + (this.canvas.offsetHeight - this.canvas.clientHeight) / 2,
    };
    this.initEvents();
    this.setDefaultConfig();
  }

  protected setDefaultConfig(): void {
    this.legCircle.x = 805;
    this.legCircle.y = 1360;
    this.legCircle.radius = 300;

    this.backCircle.x = 1200;
    this.backCircle.y = 850;
    this.backCircle.radius = 320;

    this.footPoint.x = 200;
    this.footPoint.y = 1325;

    this.headPoint.x = 1950;
    this.headPoint.y = 705;

    this.draw();
  }

  protected setSeatConfig(): void {
    this.legCircle.x = 805;
    this.legCircle.y = 1277;
    this.legCircle.radius = 215;

    this.backCircle.x = 1176;
    this.backCircle.y = 578;
    this.backCircle.radius = 535;

    this.footPoint.x = 262;
    this.footPoint.y = 1393;

    this.headPoint.x = 1847;
    this.headPoint.y = 514;

    this.draw();
  }

  protected setBedConfig(): void {
    this.legCircle.x = 805;
    this.legCircle.y = 1365;
    this.legCircle.radius = 300;

    this.backCircle.x = 1207;
    this.backCircle.y = 108;
    this.backCircle.radius = 1000;

    this.footPoint.x = 185;
    this.footPoint.y = 1253;

    this.headPoint.x = 2110;
    this.headPoint.y = 945;

    this.draw();
  }

  private initEvents(): void {
    this.canvas.addEventListener('pointerdown', (event) => {
      this.pointerDown(event);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      this.pointerMove(event);
    });
    this.canvas.addEventListener('pointerup', (event) => {
      this.pointerUp(event);
    });
    this.canvas.addEventListener('pointerout', () => {
      this.pointerOut();
    });
  }

  protected draw(): void {
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.strokeStyle = this.displayConstructionLines ? '#000' : '#bbb';
    this.context.fillStyle = '#fff';
    this.context.lineWidth = 1 * this.scale;
    this.context.fillRect(0, 0, this.width, this.height);

    // Silhouette
    if (this.displaySilhouette) {
      this.context.drawImage(this.silhouette, 130, 470, this.silhouette.width * this.silhouetteScale, this.silhouette.height * this.silhouetteScale);
    }

    // Handles
    if (this.displayConstructionHandles) {
      this.context.save();
      this.context.strokeStyle = '#000';
      this.context.fillStyle = '#ccc';
      this.handles.forEach((circle) => {
        const handle = {
          ...circle,
          radius: this.handleRadius,
        };
        this.drawCircle(handle, true);
      });
      this.context.restore();
    }

    // Circles
    if (this.displayConstructionLines) {
      this.context.save();
      this.context.strokeStyle = '#ccc';
      this.context.fillStyle = '#fff0';
      this.context.setLineDash(this.lineDash);
      this.circles.forEach((circle) => {
        this.drawCircle(circle);
      });
      this.context.restore();
    }

    // Circle tangents
    const legTangent = this.getTangent({...this.footPoint, radius: 0}, this.legCircle, true);
    const middleTangent = this.getTangent(this.legCircle, this.backCircle);
    const backTangent = this.getTangent(this.backCircle, {...this.headPoint, radius: 0}, true);
    if (!backTangent || !middleTangent || !legTangent) {
      return;
    }
    this.drawSegment(legTangent.p1, legTangent.p2);
    this.drawSegment(middleTangent.p1, middleTangent.p2);
    this.drawSegment(backTangent.p1, backTangent.p2);
    this.legTangentLength = Math.round(this.getDistance(legTangent.p1, legTangent.p2));
    this.middleTangentLength = Math.round(this.getDistance(middleTangent.p1, middleTangent.p2));
    this.backTangentLength = Math.round(this.getDistance(backTangent.p1, backTangent.p2));

    // Circle arcs
    const legStartAngle = this.getAngle(this.legCircle, middleTangent.p1);
    const legEndAngle = this.getAngle(this.legCircle, legTangent.p2);
    this.drawArc(this.legCircle, legStartAngle, legEndAngle, true);
    this.legArcLength = Math.round(this.getArcLength(this.legCircle, legStartAngle, legEndAngle));
    const legAngle = Math.abs(legEndAngle - legStartAngle);
    this.legAngle = Math.round(legAngle * RADIAN_TO_DEGREE);
    this.legArcChordLength = Math.round(this.legCircle.radius *  Math.sin(legAngle / 2) * 2);
    this.legArcThickness = Math.round(this.legCircle.radius - (this.legCircle.radius *  Math.cos(legAngle / 2)));

    const backStartAngle = this.getAngle(this.backCircle, backTangent.p1);
    const backEndAngle = this.getAngle(this.backCircle, middleTangent.p2);
    this.drawArc(this.backCircle, backStartAngle, backEndAngle);
    this.backArcLength = Math.round(this.getArcLength(this.backCircle, backStartAngle, backEndAngle));
    const backAngle = Math.abs(backEndAngle - backStartAngle);
    this.backAngle = Math.round(backAngle * RADIAN_TO_DEGREE);
    this.backArcChordLength = Math.round(this.backCircle.radius *  Math.sin(backAngle / 2) * 2);
    this.backArcThickness = Math.round(this.backCircle.radius - (this.backCircle.radius *  Math.cos(backAngle / 2)));

    // Circles angles
    if (this.displayConstructionLines) {
      this.context.save();
      this.drawAngle(this.legCircle, legTangent.p2, middleTangent.p1);
      this.drawAngle(this.backCircle, middleTangent.p2, backTangent.p1);
      this.context.restore();
    }

    // Laths
    if (this.displayLaths) {
      this.lathCount = 0;
      this.context.save();
      this.context.strokeStyle = '#f00';
      const remainingHeadGapToFill = this.drawLathAlongSegment(backTangent);
      const remainingBackCircleGapToFill = this.drawLathAlongArc(this.backCircle, backStartAngle, backEndAngle, -remainingHeadGapToFill);
      const remainingMiddleToFill = this.drawLathAlongSegment(middleTangent, -remainingBackCircleGapToFill);
      const remainingLegCircleGapToFill = this.drawLathAlongArc(this.legCircle, legStartAngle, legEndAngle, -remainingMiddleToFill, true);
      const remaingGap = this.drawLathAlongSegment(legTangent, -remainingLegCircleGapToFill);
      this.remainingLength = Math.round(remaingGap + this.lathGap);
      this.context.restore();
    }
  }

  private drawSegment(point1: Point, point2: Point): void {
    this.context.beginPath();
    this.context.moveTo(point1.x, point1.y);
    this.context.lineTo(point2.x, point2.y);
    this.context.stroke();
  }

  private drawCircle(circle: Circle, fill?: boolean): void {
    this.context.beginPath();
    this.context.arc(circle.x, circle.y, circle.radius, 0, FULL_CIRCLE);
    this.context.closePath();
    if (fill) {
      this.context.fill();
    }
    this.context.stroke();
  }

  private drawArc(circle: Circle, startAngle: number, endAngle: number, counterClockwise?: boolean): void {
    this.context.beginPath();
    this.context.arc(circle.x, circle.y, circle.radius, startAngle, endAngle, counterClockwise);
    this.context.stroke();
  }

  private drawAngle(circle: Circle, point1: Point, point2: Point): void {
    this.context.save();
    this.context.strokeStyle = '#ccc';
    this.context.setLineDash(this.lineDash);
    this.context.beginPath();
    this.context.moveTo(circle.x, circle.y);
    this.context.lineTo(point1.x, point1.y);
    this.context.stroke();
    this.context.beginPath();
    this.context.moveTo(circle.x, circle.y);
    this.context.lineTo(point2.x, point2.y);
    this.context.stroke();
    this.context.restore();
  }

  private drawLathAlongSegment(segment: Segment, offset = 0): number {
    const segmentLength = this.getDistance(segment.p1, segment.p2);
    const segmentAngle = this.getAngle(segment.p1, segment.p2);
    const lathAndGapWidth = this.lathWidth + this.lathGap;
    const lathCount = Math.floor((segmentLength - offset + this.lathGap) / lathAndGapWidth);
    this.lathCount += lathCount;
    const remainingGapToFill = segmentLength - (lathCount * lathAndGapWidth) - offset;
    const cosAngle = Math.cos(segmentAngle);
    const sinAngle = Math.sin(segmentAngle);
    for (let lathIndex = 0; lathIndex < lathCount; lathIndex++) {
      const start = lathAndGapWidth * lathIndex + offset;
      const end = start + this.lathWidth;
      const xStart = start * cosAngle;
      const yStart = start * sinAngle;
      const xEnd = end * cosAngle;
      const yEnd = end * sinAngle;
      this.context.beginPath();
      this.context.moveTo(
        segment.p2.x - xStart,
        segment.p2.y - yStart,
      );
      this.context.lineTo(
        segment.p2.x - xEnd,
        segment.p2.y - yEnd,
      );
      this.context.stroke();
    }
    return remainingGapToFill;
  }

  private drawLathAlongArc(circle: Circle, startAngle: number, endAngle: number, offset: number, counterClockwise?: boolean): number {
    const direction = counterClockwise ? -1 : 1;
    const offsetAngle = Math.asin(offset / circle.radius) * direction;
    const arcStartAngle = startAngle + offsetAngle;
    const arcEndAngle = endAngle + offsetAngle;
    const arcAngle = arcEndAngle - arcStartAngle;
    const lathAngle = Math.asin(this.lathWidth / circle.radius) * direction;
    const gapAngle = Math.asin(this.lathGap / circle.radius) * direction;
    const lathAndGapAngle = lathAngle + gapAngle;
    const lathCount = Math.abs(Math.trunc((arcAngle + gapAngle) / lathAndGapAngle));
    this.lathCount += lathCount;
    const remainingAngleToFill = (arcAngle - (lathCount * lathAndGapAngle) - offsetAngle) * direction;
    const remainingGapToFill = circle.radius * Math.sin(remainingAngleToFill / 2) * 2;
    for (let lathIndex = 0; lathIndex < lathCount; lathIndex++) {
      const lathStartAngle = arcStartAngle + lathAndGapAngle * lathIndex;
      const lathEndAngle = lathStartAngle + lathAngle;
      const xStart = circle.radius * Math.cos(lathStartAngle);
      const yStart = circle.radius * Math.sin(lathStartAngle);
      const xEnd = circle.radius * Math.cos(lathEndAngle);
      const yEnd = circle.radius * Math.sin(lathEndAngle);
      this.context.beginPath();
      this.context.moveTo(
        circle.x + xStart,
        circle.y + yStart,
      );
      this.context.lineTo(
        circle.x + xEnd,
        circle.y + yEnd,
      );
      this.context.stroke();
    }
    return remainingGapToFill;
  }

  private pointerDown(event: PointerEvent): void {
    this.canvas.setPointerCapture(event.pointerId);
    if (this.hoveredHandle) {
      const pointerPosition = this.getPointerPositionAt(event);
      this.drag = {
        element: this.hoveredHandle,
        elementOrigin: {
          x: this.hoveredHandle.x,
          y: this.hoveredHandle.y,
        },
        dragOrigin: pointerPosition,
      };
      this.hoveredHandle = undefined;
      this.canvas.style.setProperty('--cursor', 'grabbing');
    }
    else if (this.hoveredCircle) {
      this.resize = {
        element: this.hoveredCircle,
        elementSize: this.hoveredCircle.radius,
      };
      this.hoveredCircle = undefined;
    }
  }

  private pointerMove(event: PointerEvent): void {
    const pointerPosition = this.getPointerPositionAt(event);
    if (this.drag) {
      const dragVector: Vector = {
        dx: pointerPosition.x - this.drag.dragOrigin.x,
        dy: pointerPosition.y - this.drag.dragOrigin.y,
      };
      this.drag.element.x = this.clampX(this.drag.elementOrigin.x + dragVector.dx);
      this.drag.element.y = this.clampY(this.drag.elementOrigin.y + dragVector.dy);
      this.draw();
    }
    else if (this.resize) {
      const distance = this.getDistance(pointerPosition, this.resize.element);
      this.resize.element.radius = Math.round(this.clampRadius(distance));
      this.draw();
      this.canvas.style.setProperty('--cursor', `${this.getDirection(this.resize.element, pointerPosition)}-resize`);
    }
    else {
      this.hoveredHandle = undefined;
      this.hoveredCircle = undefined;

      this.hoveredHandle = this.getHandleAt(pointerPosition);
      if (this.hoveredHandle) {
        this.canvas.style.setProperty('--cursor', 'grab');
        return;
      }
      this.hoveredCircle = this.getCircleAt(pointerPosition);
      if (this.hoveredCircle) {
        this.canvas.style.setProperty('--cursor', `${this.getDirection(this.hoveredCircle, pointerPosition)}-resize`);
        return;
      }

      this.canvas.style.setProperty('--cursor', 'default');
    }
  }

  private pointerUp(event: PointerEvent): void {
    this.canvas.releasePointerCapture(event.pointerId);
    this.drag = undefined;
    this.resize = undefined;
    this.canvas.style.setProperty('--cursor', 'default');
  }

  private pointerOut(): void {
    if (this.hoveredHandle) {
      this.hoveredHandle = undefined;
      this.canvas.style.setProperty('--cursor', 'default');
    }
  }

  private getHandleAt(point: Point): Point | undefined {
    if (!this.displayConstructionHandles) {
      return;
    }
    return this.handles.find((handle) => {
      const distance = this.getDistance(point, handle);
      return distance <= this.handleRadius;
    });
  }

  private getCircleAt(point: Point): Circle | undefined {
    if (!this.displayConstructionLines) {
      return;
    }
    const margin = 10 * this.scale;
    return this.circles.find((circle) => {
      const distance = this.getDistance(point, circle);
      return Math.abs(distance - circle.radius) <= margin;
    });
  }

  private getDistance(point1: Point, point2: Point): number {
    return Math.hypot(point1.x - point2.x, point1.y - point2.y);
  }

  private getArcLength(circle: Circle, startAngle: number, endAngle: number): number {
    const angle = Math.abs(endAngle - startAngle);
    return angle * circle.radius;
  }

  private getDirection(point1: Point, point2: Point): 'ns' | 'ew' | 'nesw' | 'nwse' {
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

  private getAngle(point1: Point, point2: Point): number {
    return Math.atan2((point2.y - point1.y), (point2.x - point1.x));
  }

  private getPointerPositionAt(event: PointerEvent): Point {
    return {
      x: (event.pageX - this.canvasOffset.x) * this.scale,
      y: (event.pageY - this.canvasOffset.y) * this.scale,
    };
  }

  private getTangent(circle1: Circle, circle2: Circle, invert?: boolean): Segment | undefined {
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

  private clampX(value: number): number {
    return Math.min(Math.max(0, value), this.width);
  }

  private clampY(value: number): number {
    return Math.min(Math.max(0, value), this.height);
  }

  private clampRadius(value: number): number {
    return Math.min(Math.max(100, value), 1000);
  }

  private async loadFromUrl(src: string): Promise<ImageBitmap> {
    const response = await fetch(src);
    if (response.status !== 200) {
      throw new Error(`Image fetching ended with HTTP error code ${response.status}`);
    }
    const blob = await response.blob();
    return await createImageBitmap(blob);
  }

}
