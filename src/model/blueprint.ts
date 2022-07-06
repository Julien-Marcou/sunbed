import { EIGHTH_CIRCLE, HALF_CIRCLE, QUARTER_CIRCLE } from '../constants/circle.constants';
import { Geometry } from './geometry';
import type { BoundingBox, Point } from './geometry';

export interface BlueprintInterface {
  render(): void;
  getWidth(): number;
  getHeight(): number;
}

export abstract class Blueprint {

  protected width = 0;
  protected height = 0;
  protected readonly measureOffset = 60;
  protected readonly measureLabelMargin = 20;
  protected readonly arrowSize = 25;
  protected readonly arrowAngle = EIGHTH_CIRCLE;
  protected readonly fontSize = 30;

  constructor(protected readonly context: CanvasRenderingContext2D) {}

  protected drawMeasure(label: string, point1: Point, point2: Point, offset?: number): BoundingBox {
    this.context.save();
    this.context.strokeStyle = '#000';
    this.context.fillStyle = '#000';
    this.context.font = `${this.fontSize}px Arial`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    const measureOffset = offset ?? this.measureOffset;
    const measureAngle = Geometry.getAngle(point1, point2);
    const isNegativeMeasureAngle = measureAngle < 0 || measureAngle >= HALF_CIRCLE;
    const measureOffsetAngle = measureAngle + QUARTER_CIRCLE;
    const upperArrowAngle = measureAngle - this.arrowAngle;
    const lowerArrowAngle = measureAngle + this.arrowAngle;
    const measureOffsetX = Geometry.getAdjacentLength(measureOffset, measureOffsetAngle);
    const measureOffsetY = Geometry.getOppositeLength(measureOffset, measureOffsetAngle);
    const upperArrowOffsetX = Geometry.getAdjacentLength(this.arrowSize, upperArrowAngle);
    const upperArrowOffsetY = Geometry.getOppositeLength(this.arrowSize, upperArrowAngle);
    const lowerArrowOffsetX = Geometry.getAdjacentLength(this.arrowSize, lowerArrowAngle);
    const lowerArrowOffsetY = Geometry.getOppositeLength(this.arrowSize, lowerArrowAngle);
    const measureStartX = point1.x + measureOffsetX;
    const measureStartY = point1.y + measureOffsetY;
    const measureEndX = point2.x + measureOffsetX;
    const measureEndY = point2.y + measureOffsetY;
    const measureCenterX = (measureStartX + measureEndX) / 2;
    const measureCenterY = (measureStartY + measureEndY) / 2;
    const labelSize = this.context.measureText(label);
    const labelWidth = labelSize.width + this.measureLabelMargin * 2;
    const labelHeight = this.fontSize + this.measureLabelMargin * 2;
    const labelAngle = Math.atan(labelHeight / labelWidth);
    const isMeasureConstrainedByLabelWidth = Math.abs(measureAngle) % HALF_CIRCLE - labelAngle < 0;
    const arrowStartOffsetX = (isNegativeMeasureAngle ? -1 : 1) * (isMeasureConstrainedByLabelWidth ? labelWidth / 2 : labelHeight / 2 / Math.tan(measureAngle));
    const arrowStartOffsetY = (isNegativeMeasureAngle ? -1 : 1) * (isMeasureConstrainedByLabelWidth ? labelWidth / 2 * Math.tan(measureAngle) : labelHeight / 2);
    const arrowLength = Geometry.getDistance(
      {x: measureStartX, y: measureStartY},
      {x: measureCenterX - arrowStartOffsetX, y: measureCenterY - arrowStartOffsetY},
    );
    const isOuterMeasure = arrowLength < this.arrowSize * 2;

    // Measure offset lines
    this.context.save();
    this.context.strokeStyle = '#bbb';
    this.context.setLineDash([10, 8]);
    this.context.beginPath();
    this.context.moveTo(point1.x, point1.y);
    this.context.lineTo(measureStartX, measureStartY);
    this.context.stroke();
    this.context.beginPath();
    this.context.moveTo(point2.x, point2.y);
    this.context.lineTo(measureEndX, measureEndY);
    this.context.stroke();
    this.context.restore();

    // Measure arrow line
    this.context.save();
    this.context.strokeStyle = '#666';
    if (isOuterMeasure) {
      this.context.beginPath();
      this.context.moveTo(measureStartX, measureStartY);
      this.context.lineTo(measureEndX, measureEndY);
      this.context.stroke();
    }
    else {
      this.context.beginPath();
      this.context.moveTo(measureStartX, measureStartY);
      this.context.lineTo(measureCenterX - arrowStartOffsetX, measureCenterY - arrowStartOffsetY);
      this.context.stroke();
      this.context.beginPath();
      this.context.moveTo(measureEndX, measureEndY);
      this.context.lineTo(measureCenterX + arrowStartOffsetX, measureCenterY + arrowStartOffsetY);
      this.context.stroke();
    }

    const arrowDirection = isOuterMeasure ? -1 : 1;
    // Measure left arrow
    this.context.beginPath();
    this.context.moveTo(measureStartX + upperArrowOffsetX * arrowDirection, measureStartY + upperArrowOffsetY * arrowDirection);
    this.context.lineTo(measureStartX, measureStartY);
    this.context.lineTo(measureStartX + lowerArrowOffsetX * arrowDirection, measureStartY + lowerArrowOffsetY * arrowDirection);
    this.context.stroke();

    // Measure right arrow
    this.context.beginPath();
    this.context.moveTo(measureEndX - upperArrowOffsetX * arrowDirection, measureEndY - upperArrowOffsetY * arrowDirection);
    this.context.lineTo(measureEndX, measureEndY);
    this.context.lineTo(measureEndX - lowerArrowOffsetX * arrowDirection, measureEndY - lowerArrowOffsetY * arrowDirection);
    this.context.stroke();
    this.context.restore();

    // Measure label
    let labelOffsetX = 0;
    let labelOffsetY = 0;
    if (isOuterMeasure) {
      labelOffsetX = isMeasureConstrainedByLabelWidth ? 0 : labelWidth / 2;
      labelOffsetY = isMeasureConstrainedByLabelWidth ? labelHeight / 2 : 0;
      if (isNegativeMeasureAngle) {
        labelOffsetY *= -1;
      }
    }
    const labelX = measureCenterX + labelOffsetX;
    const labelY = measureCenterY + labelOffsetY;
    this.context.fillText(label, labelX, labelY);
    this.context.restore();

    const xCoordinates = [
      point1.x, point2.x, measureStartX, measureEndX, labelX - labelSize.width / 2, labelX + labelSize.width / 2,
      measureStartX + lowerArrowOffsetX * arrowDirection, measureEndX - lowerArrowOffsetX * arrowDirection,
    ];
    const yCoordinates = [
      point1.y, point2.y, measureStartY, measureEndY, labelY - this.fontSize / 2, labelY + this.fontSize / 2,
      measureStartY + upperArrowOffsetY * arrowDirection, measureEndY - lowerArrowOffsetY * arrowDirection,
    ];
    const minX = Math.min(...xCoordinates);
    const maxX = Math.max(...xCoordinates);
    const minY = Math.min(...yCoordinates);
    const maxY = Math.max(...yCoordinates);

    // Bounding box debug
    // this.context.save();
    // this.context.fillStyle = '#f002';
    // this.context.fillRect(
    //   minX,
    //   minY,
    //   maxX - minX,
    //   maxY - minY,
    // );
    // this.context.restore();

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

}
