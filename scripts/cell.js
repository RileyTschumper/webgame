class Cell {
  constructor(i, j, size) {
    this.i = i;
    this.j = j;
    this.x = i * size;
    this.y = j * size;
    this.size = size;
  }

  draw(stage) {
    var rect = new createjs.Shape();
    rect.graphics.beginFill("white");
    rect.graphics.beginStroke("black");
    rect.graphics.drawRect(this.x, this.y, this.size, this.size);
    rect.graphics.endFill();

    stage.addChild(rect);
  }
}
