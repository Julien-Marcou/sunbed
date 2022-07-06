import { Blueprint, BlueprintInterface } from './blueprint';

export class StraightLintel extends Blueprint implements BlueprintInterface {

  private readonly horizontalPadding = 80;
  private readonly verticalPadding = 40;
  private readonly labelOffset = 60;

  constructor(
    private readonly label: string,
    context: CanvasRenderingContext2D,
    private readonly lintelWidth: number,
    private readonly lintelHeight: number,
  ) {
    super(context);
  }

  public render(): void {
    const labelY = this.verticalPadding + this.fontSize / 2;
    const lintelLeftX = this.horizontalPadding;
    const lintelRightX = lintelLeftX + this.lintelWidth;
    const lintelTopY = labelY + this.labelOffset;
    const lintelBottomY = lintelTopY + this.lintelHeight;

    // Lintel
    this.context.save();
    this.context.fillStyle = '#000';
    this.context.strokeStyle = '#000';
    this.context.strokeRect(lintelLeftX, lintelTopY, this.lintelWidth, this.lintelHeight);

    // Label
    this.context.font = `${this.fontSize}px Arial`;
    this.context.textBaseline = 'middle';
    this.context.fillText(this.label, lintelLeftX, labelY);
    this.context.restore();

    // Measures
    const widthMeasure = this.drawMeasure(
      `${this.lintelWidth}mm`,
      {x: lintelLeftX, y: lintelBottomY},
      {x: lintelRightX, y: lintelBottomY},
    );
    const heightMeasure = this.drawMeasure(
      `${this.lintelHeight}mm`,
      {x: lintelRightX, y: lintelBottomY},
      {x: lintelRightX, y: lintelTopY},
    );

    // Size
    this.height = lintelBottomY + widthMeasure.height + this.verticalPadding;
    this.width = lintelRightX + heightMeasure.width + this.horizontalPadding;

    // Bounding box debug
    // this.context.save();
    // this.context.fillStyle = '#f002';
    // this.context.fillRect(0, 0, this.width, this.height);
    // this.context.fillRect(this.horizontalPadding, this.verticalPadding, this.width - this.horizontalPadding * 2, this.height - this.verticalPadding * 2);
    // this.context.restore();
  }

}
