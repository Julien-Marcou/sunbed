import { Component, OnInit } from '@angular/core';
import { FULL_CIRCLE, HALF_CIRCLE } from '../constants/circle.constants';
import { ArcLintel } from '../model/arc-lintel';
import { Geometry } from '../model/geometry';
import { StraightLintel } from '../model/straight-lintel';
import type { Circle, Point, Segment, Vector } from '../model/geometry';

type Drag<T> = {
  element: T;
  elementOrigin: Point;
  dragOrigin: Point;
};

type Resize<T> = {
  element: T;
  elementSize: number;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {

  private readonly sketchScale = 3.5; // 1 pixel = 3.5 millimeters
  private readonly sketchWidth = 2200;
  private readonly sketchHeight = 1800;

  private blueprintScale = 2; // 1 pixel = 2 millimeters
  private blueprintWidth = 1200;
  private blueprintHeight = 2200;

  private readonly silhouetteScale = 3.2; // So that the silhouette is 178cm tall
  private readonly handleRadius = 40;
  private readonly lineDash = [8 * this.sketchScale, 10 * this.sketchScale];

  protected lathWidth = 55;
  protected lathGap = 18;
  protected lathCount = 0;
  protected legTangentLength = 0;
  protected middleTangentLength = 0;
  protected backTangentLength = 0;
  protected legArcLength = 0;
  protected backArcLength = 0;
  protected remainingLength = 0;
  protected lintelHeight = 40;
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
  private sketchCanvas!: HTMLCanvasElement;
  private sketchContext!: CanvasRenderingContext2D;
  private blueprintCanvas!: HTMLCanvasElement;
  private blueprintContext!: CanvasRenderingContext2D;
  private sketchCanvasOffset!: Point;
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

    this.sketchCanvas = document.getElementById('sketch-canvas') as HTMLCanvasElement;
    this.sketchCanvas.width = this.sketchWidth / this.sketchScale;
    this.sketchCanvas.height = this.sketchHeight / this.sketchScale;
    this.sketchContext = this.get2DContext(this.sketchCanvas);
    this.sketchContext.scale(1 / this.sketchScale, 1 / this.sketchScale);

    this.blueprintCanvas = document.getElementById('blueprint-canvas') as HTMLCanvasElement;
    this.blueprintCanvas.width = this.blueprintWidth / this.blueprintScale;
    this.blueprintCanvas.height = this.blueprintHeight / this.blueprintScale;
    this.blueprintContext = this.get2DContext(this.blueprintCanvas);
    this.blueprintContext.scale(1 / this.blueprintScale, 1 / this.blueprintScale);


    const updateCanvasOffset = (): void => {
      if (!this.sketchCanvasOffset) {
        this.initEvents();
      }
      this.sketchCanvasOffset = {
        x: this.sketchCanvas.offsetLeft + (this.sketchCanvas.offsetWidth - this.sketchCanvas.clientWidth) / 2,
        y: this.sketchCanvas.offsetTop + (this.sketchCanvas.offsetHeight - this.sketchCanvas.clientHeight) / 2,
      };
    };
    const resizeObserver = new ResizeObserver(updateCanvasOffset);
    resizeObserver.observe(document.documentElement);
    resizeObserver.observe(this.sketchCanvas);

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
    this.sketchCanvas.addEventListener('pointerdown', (event) => {
      this.pointerDown(event);
    });
    this.sketchCanvas.addEventListener('pointermove', (event) => {
      this.pointerMove(event);
    });
    this.sketchCanvas.addEventListener('pointerup', (event) => {
      this.pointerUp(event);
    });
    this.sketchCanvas.addEventListener('pointerout', () => {
      this.pointerOut();
    });
  }

  protected draw(): void {
    this.clear(this.sketchContext, this.sketchWidth, this.sketchHeight);
    this.sketchContext.strokeStyle = this.displayConstructionLines ? '#000' : '#bbb';
    this.sketchContext.lineWidth = 1 * this.sketchScale;

    // Silhouette
    if (this.displaySilhouette) {
      this.sketchContext.drawImage(this.silhouette, 130, 470, this.silhouette.width * this.silhouetteScale, this.silhouette.height * this.silhouetteScale);
    }

    // Handles
    if (this.displayConstructionHandles) {
      this.sketchContext.save();
      this.sketchContext.strokeStyle = '#000';
      this.sketchContext.fillStyle = '#ccc';
      this.handles.forEach((circle) => {
        const handle = {
          ...circle,
          radius: this.handleRadius,
        };
        this.drawCircle(handle, true);
      });
      this.sketchContext.restore();
    }

    // Circles
    if (this.displayConstructionLines) {
      this.sketchContext.save();
      this.sketchContext.strokeStyle = '#ccc';
      this.sketchContext.fillStyle = '#fff0';
      this.sketchContext.setLineDash(this.lineDash);
      this.circles.forEach((circle) => {
        this.drawCircle(circle);
      });
      this.sketchContext.restore();
    }

    // Circle constants
    const legTangent = Geometry.getTangent({...this.footPoint, radius: 0}, this.legCircle, true);
    const middleTangent = Geometry.getTangent(this.legCircle, this.backCircle);
    const backTangent = Geometry.getTangent(this.backCircle, {...this.headPoint, radius: 0}, true);
    if (!backTangent || !middleTangent || !legTangent) {
      return;
    }
    const legStartAngle = Geometry.getAngle(this.legCircle, middleTangent.p1);
    const legEndAngle = Geometry.getAngle(this.legCircle, legTangent.p2);
    const legAngle = Math.abs(legEndAngle - legStartAngle);
    const backStartAngle = Geometry.getAngle(this.backCircle, backTangent.p1);
    const backEndAngle = Geometry.getAngle(this.backCircle, middleTangent.p2);
    const backAngle = Math.abs(backEndAngle - backStartAngle);
    if (backAngle > HALF_CIRCLE || backStartAngle > backEndAngle || backStartAngle < 0 || legAngle > HALF_CIRCLE || legEndAngle > legStartAngle || legEndAngle > 0) {
      return;
    }

    // Circle tangents
    this.drawSegment(legTangent.p1, legTangent.p2);
    this.drawSegment(middleTangent.p1, middleTangent.p2);
    this.drawSegment(backTangent.p1, backTangent.p2);
    this.legTangentLength = Math.round(Geometry.getDistance(legTangent.p1, legTangent.p2));
    this.middleTangentLength = Math.round(Geometry.getDistance(middleTangent.p1, middleTangent.p2));
    this.backTangentLength = Math.round(Geometry.getDistance(backTangent.p1, backTangent.p2));

    // Circle arcs
    this.drawArc(this.legCircle, legStartAngle, legEndAngle, true);
    this.drawArc(this.backCircle, backStartAngle, backEndAngle);

    // Circles angles
    if (this.displayConstructionLines) {
      this.sketchContext.save();
      this.drawAngle(this.legCircle, legTangent.p2, middleTangent.p1);
      this.drawAngle(this.backCircle, middleTangent.p2, backTangent.p1);
      this.sketchContext.restore();
    }

    // Laths
    if (this.displayLaths) {
      this.lathCount = 0;
      this.sketchContext.save();
      this.sketchContext.strokeStyle = '#f00';
      const remainingHeadGapToFill = this.drawLathAlongSegment(backTangent);
      const remainingBackCircleGapToFill = this.drawLathAlongArc(this.backCircle, backStartAngle, backEndAngle, -remainingHeadGapToFill);
      const remainingMiddleToFill = this.drawLathAlongSegment(middleTangent, -remainingBackCircleGapToFill);
      const remainingLegCircleGapToFill = this.drawLathAlongArc(this.legCircle, legStartAngle, legEndAngle, -remainingMiddleToFill, true);
      const remaingGap = this.drawLathAlongSegment(legTangent, -remainingLegCircleGapToFill);
      this.remainingLength = Math.round(remaingGap + this.lathGap);
      this.sketchContext.restore();
    }

    // Straight lintel blueprints
    const legLintel = new StraightLintel('Linteau jambe', this.blueprintContext, this.legTangentLength, this.lintelHeight);
    legLintel.render();
    const middleLintel = new StraightLintel('Linteau milieu', this.blueprintContext, this.middleTangentLength, this.lintelHeight);
    middleLintel.render();
    const backLintel = new StraightLintel('Linteau dos', this.blueprintContext, this.backTangentLength, this.lintelHeight);
    backLintel.render();

    // Arc lintel blueprints
    const legArc = new ArcLintel('Arc jambe', this.blueprintContext, this.legCircle.radius, legAngle, this.lintelHeight, false);
    legArc.render();
    const backArc = new ArcLintel('Arc dos', this.blueprintContext, this.backCircle.radius, backAngle, this.lintelHeight, true);
    backArc.render();

    // Update blueprint canvas size
    const padding = 40;
    const margin = 40;
    this.blueprintWidth = Math.max(
      legLintel.getWidth(),
      middleLintel.getWidth(),
      backLintel.getWidth(),
      legArc.getWidth(),
      backArc.getWidth(),
    ) + padding * 2;
    this.blueprintHeight = (
      legLintel.getHeight() +
      middleLintel.getHeight() +
      backLintel.getHeight() +
      legArc.getHeight() +
      backArc.getHeight()
    ) + margin * 4 + padding * 2;
    this.blueprintScale = this.blueprintWidth / (this.sketchWidth / this.sketchScale);
    this.blueprintCanvas.width = this.blueprintWidth / this.blueprintScale;
    this.blueprintCanvas.height = this.blueprintHeight / this.blueprintScale;
    this.blueprintContext.scale(1 / this.blueprintScale, 1 / this.blueprintScale);

    // Repaint it as resizing a canvas clears it
    this.clear(this.blueprintContext, this.blueprintWidth, this.blueprintHeight);
    this.blueprintContext.lineWidth = 1 * this.blueprintScale;
    this.blueprintContext.save();
    this.blueprintContext.translate(padding, padding);
    legLintel.render();
    this.blueprintContext.translate(0, legLintel.getHeight() + margin);
    middleLintel.render();
    this.blueprintContext.translate(0, middleLintel.getHeight() + margin);
    backLintel.render();
    this.blueprintContext.translate(0, backLintel.getHeight() + margin);
    legArc.render();
    this.blueprintContext.translate(0, legArc.getHeight() + margin);
    backArc.render();
    this.blueprintContext.restore();
  }

  private clear(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.clearRect(0, 0, width, height);
    context.save();
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  private drawSegment(point1: Point, point2: Point): void {
    this.sketchContext.beginPath();
    this.sketchContext.moveTo(point1.x, point1.y);
    this.sketchContext.lineTo(point2.x, point2.y);
    this.sketchContext.stroke();
  }

  private drawCircle(circle: Circle, fill?: boolean): void {
    this.sketchContext.beginPath();
    this.sketchContext.arc(circle.x, circle.y, circle.radius, 0, FULL_CIRCLE);
    this.sketchContext.closePath();
    if (fill) {
      this.sketchContext.fill();
    }
    this.sketchContext.stroke();
  }

  private drawArc(circle: Circle, startAngle: number, endAngle: number, counterClockwise?: boolean): void {
    this.sketchContext.beginPath();
    this.sketchContext.arc(circle.x, circle.y, circle.radius, startAngle, endAngle, counterClockwise);
    this.sketchContext.stroke();
  }

  private drawAngle(circle: Circle, point1: Point, point2: Point): void {
    this.sketchContext.save();
    this.sketchContext.strokeStyle = '#ccc';
    this.sketchContext.setLineDash(this.lineDash);
    this.sketchContext.beginPath();
    this.sketchContext.moveTo(circle.x, circle.y);
    this.sketchContext.lineTo(point1.x, point1.y);
    this.sketchContext.stroke();
    this.sketchContext.beginPath();
    this.sketchContext.moveTo(circle.x, circle.y);
    this.sketchContext.lineTo(point2.x, point2.y);
    this.sketchContext.stroke();
    this.sketchContext.restore();
  }

  private drawLathAlongSegment(segment: Segment, offset = 0): number {
    const segmentLength = Geometry.getDistance(segment.p1, segment.p2);
    const segmentAngle = Geometry.getAngle(segment.p1, segment.p2);
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
      this.sketchContext.beginPath();
      this.sketchContext.moveTo(
        segment.p2.x - xStart,
        segment.p2.y - yStart,
      );
      this.sketchContext.lineTo(
        segment.p2.x - xEnd,
        segment.p2.y - yEnd,
      );
      this.sketchContext.stroke();
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
      this.sketchContext.beginPath();
      this.sketchContext.moveTo(
        circle.x + xStart,
        circle.y + yStart,
      );
      this.sketchContext.lineTo(
        circle.x + xEnd,
        circle.y + yEnd,
      );
      this.sketchContext.stroke();
    }
    return remainingGapToFill;
  }

  private pointerDown(event: PointerEvent): void {
    this.sketchCanvas.setPointerCapture(event.pointerId);
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
      this.sketchCanvas.style.setProperty('--cursor', 'grabbing');
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
      const distance = Geometry.getDistance(pointerPosition, this.resize.element);
      this.resize.element.radius = Math.round(this.clampRadius(distance));
      this.draw();
      this.sketchCanvas.style.setProperty('--cursor', `${Geometry.getDirection(this.resize.element, pointerPosition)}-resize`);
    }
    else {
      this.hoveredHandle = undefined;
      this.hoveredCircle = undefined;

      this.hoveredHandle = this.getHandleAt(pointerPosition);
      if (this.hoveredHandle) {
        this.sketchCanvas.style.setProperty('--cursor', 'grab');
        return;
      }
      this.hoveredCircle = this.getCircleAt(pointerPosition);
      if (this.hoveredCircle) {
        this.sketchCanvas.style.setProperty('--cursor', `${Geometry.getDirection(this.hoveredCircle, pointerPosition)}-resize`);
        return;
      }

      this.sketchCanvas.style.setProperty('--cursor', 'default');
    }
  }

  private pointerUp(event: PointerEvent): void {
    this.sketchCanvas.releasePointerCapture(event.pointerId);
    this.drag = undefined;
    this.resize = undefined;
    this.sketchCanvas.style.setProperty('--cursor', 'default');
  }

  private pointerOut(): void {
    if (this.hoveredHandle) {
      this.hoveredHandle = undefined;
      this.sketchCanvas.style.setProperty('--cursor', 'default');
    }
  }

  private getHandleAt(point: Point): Point | undefined {
    if (!this.displayConstructionHandles) {
      return;
    }
    return this.handles.find((handle) => {
      const distance = Geometry.getDistance(point, handle);
      return distance <= this.handleRadius;
    });
  }

  private getCircleAt(point: Point): Circle | undefined {
    if (!this.displayConstructionLines) {
      return;
    }
    const margin = 10 * this.sketchScale;
    return this.circles.find((circle) => {
      const distance = Geometry.getDistance(point, circle);
      return Math.abs(distance - circle.radius) <= margin;
    });
  }

  private getPointerPositionAt(event: PointerEvent): Point {
    return {
      x: (event.pageX - this.sketchCanvasOffset.x) * this.sketchScale,
      y: (event.pageY - this.sketchCanvasOffset.y) * this.sketchScale,
    };
  }

  private clampX(value: number): number {
    return Math.min(Math.max(0, value), this.sketchWidth);
  }

  private clampY(value: number): number {
    return Math.min(Math.max(0, value), this.sketchHeight);
  }

  private clampRadius(value: number): number {
    return Math.min(Math.max(100, value), 1000);
  }

  private get2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to retrieve 2D context');
    }
    return context;
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
