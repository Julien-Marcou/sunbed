import { FULL_CIRCLE, HALF_CIRCLE, RADIAN_TO_DEGREE } from '../constants/circle.constants';
import { Blueprint, BlueprintInterface } from './blueprint';
import { Geometry } from './geometry';

export class ArcLintel extends Blueprint implements BlueprintInterface {

  private readonly horizontalPadding = 80;
  private readonly verticalPadding = 40;
  private readonly labelOffset = 60;
  private readonly verticalMeasureOffset = 100;

  constructor(
    private readonly label: string,
    context: CanvasRenderingContext2D,
    private readonly radius: number,
    private readonly angle: number,
    private readonly lintelHeight: number,
    private readonly isInnerRadius?: boolean,
  ) {
    super(context);
  }

  public render(): void {
    const labelY = this.verticalPadding + this.fontSize / 2;
    const halfRmainingAngle = (HALF_CIRCLE - this.angle) / 2;
    const startAngle = HALF_CIRCLE + halfRmainingAngle;
    const endAngle = FULL_CIRCLE - halfRmainingAngle;

    // Outer arc constants
    const outerRadius = this.isInnerRadius ? this.radius + this.lintelHeight : this.radius;
    const outerChordLength = Geometry.getArcChordLength(outerRadius, this.angle);
    const isOuterMeasure = this.isOuterMeasurement(outerChordLength);
    const outerChordTopY = labelY + this.measureOffset + (isOuterMeasure ? this.fontSize : 0) + this.fontSize / 2 + this.labelOffset;
    const outerChordBottomY = outerChordTopY + Geometry.getArcHeight(outerRadius, this.angle);
    const centerX = this.horizontalPadding + outerChordLength / 2;
    const outerChordLeftX = centerX - outerChordLength / 2;
    const outerChordRightX = centerX + outerChordLength / 2;

    // Inner arc constants
    const innerRadius = this.isInnerRadius ? this.radius : this.radius - this.lintelHeight;
    const innerChordLength = Geometry.getArcChordLength(innerRadius, this.angle);
    const innerChordTopY = outerChordTopY + this.lintelHeight;
    const innerChordBottomY = innerChordTopY + Geometry.getArcHeight(innerRadius, this.angle);
    const centerY = (this.isInnerRadius ? innerChordTopY : outerChordTopY) + this.radius;
    const innerChordLeftX = centerX - innerChordLength / 2;
    const innerChordRightX = centerX + innerChordLength / 2;
    const boundingBoxWidth = outerChordLength;
    const boundingBoxHeight = innerChordBottomY - outerChordTopY;

    this.context.save();
    this.context.fillStyle = '#000';
    this.context.strokeStyle = '#000';
    this.context.font = `${this.fontSize}px Arial`;
    this.context.textBaseline = 'middle';

    // Angle
    this.context.save();
    this.context.strokeStyle = '#aaa';
    this.context.setLineDash([10, 8]);
    this.context.beginPath();
    this.context.moveTo(innerChordLeftX, innerChordBottomY);
    this.context.lineTo(centerX, centerY);
    this.context.lineTo(innerChordRightX, innerChordBottomY);
    this.context.stroke();

    // Bounding box
    this.context.strokeRect(outerChordLeftX, outerChordTopY, boundingBoxWidth, boundingBoxHeight);
    this.context.restore();

    // Inner & outer arc
    this.context.beginPath();
    this.context.arc(centerX, centerY, innerRadius, startAngle, endAngle);
    this.context.arc(centerX, centerY, outerRadius, endAngle, startAngle, true);
    this.context.closePath();
    this.context.stroke();

    // Radius measures
    const outerRadiusMeasure = this.drawMeasure(
      `${outerRadius}mm`,
      {x: centerX, y: centerY},
      {x: outerChordRightX, y: outerChordBottomY},
    );
    this.drawMeasure(
      `${innerRadius}mm`,
      {x: innerChordLeftX, y: innerChordBottomY},
      {x: centerX, y: centerY},
    );

    // Bounding box measures
    this.drawMeasure(
      `${Math.round(boundingBoxWidth)}mm`,
      {x: outerChordRightX, y: outerChordTopY},
      {x: outerChordLeftX, y: outerChordTopY},
    );
    const boundingBoxHeightMeasure = this.drawMeasure(
      `${Math.round(boundingBoxHeight)}mm`,
      {x: outerChordRightX, y: innerChordBottomY},
      {x: outerChordRightX, y: outerChordTopY},
      this.verticalMeasureOffset,
    );

    // Label
    this.context.fillText(this.label, outerChordLeftX, labelY);

    // Angle label
    const angleLabel = `${Math.round(this.angle * RADIAN_TO_DEGREE)}`;
    const angleLabelSize = this.context.measureText(angleLabel);
    this.context.fillText(angleLabel + '°', centerX - angleLabelSize.width / 2, innerChordBottomY + this.fontSize);

    this.context.restore();

    // Size
    this.width = boundingBoxHeightMeasure.x + boundingBoxHeightMeasure.width + this.horizontalPadding;
    this.height = outerRadiusMeasure.y + outerRadiusMeasure.height + this.verticalPadding;

    // Bounding box debug
    // this.context.save();
    // this.context.fillStyle = '#f002';
    // this.context.fillRect(0, 0, this.width, this.height);
    // this.context.fillRect(this.horizontalPadding, this.verticalPadding, this.width - this.horizontalPadding * 2, this.height - this.verticalPadding * 2);
    // this.context.restore();
  }

  private isOuterMeasurement(length: number): boolean {
    this.context.save();
    this.context.font = `${this.fontSize}px Arial`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    const labelWidth = this.context.measureText(`${Math.round(length)}mm`).width;
    const arrowLength = (length - (labelWidth + this.measureLabelMargin * 2)) / 2;
    this.context.restore();
    return arrowLength < this.arrowSize * 2;
  }

}
