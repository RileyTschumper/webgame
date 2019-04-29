class Cell {
  constructor(i, j, size) {
    this.i = i;
    this.j = j;
    this.x = i * size;
    this.y = j * size;
    this.size = size;
    this.neighbors = 0;
    this.mine = false;
    this.flag = false;
    this.shown = true;
  }

  draw(stage) {
    var rect = new createjs.Shape();
    rect.graphics.beginFill("white");
    rect.graphics.beginStroke("black");
    rect.graphics.drawRect(this.x, this.y, this.size, this.size);
    //rect.graphics.endFill();

    stage.addChild(rect);
    if (this.shown) {
      if (this.mine) {
        var circle = new createjs.Shape();
        circle.graphics.beginFill("gray");
        circle.graphics.beginStroke("black");
        circle.graphics.drawCircle(
          this.x + this.size / 2,
          this.y + this.size / 2,
          this.size / 3
        );
        stage.addChild(circle);
      } else {
        rect = new createjs.Shape();
        rect.graphics.beginFill("gray");
        rect.graphics.beginStroke("black");
        rect.graphics.drawRect(this.x, this.y, this.size, this.size);

        if (this.neighbors != 0) {
          var text = new createjs.Text(this.neighbors, "10px Arial", "black");
          text.x = this.x + this.size / 2;
          text.y = this.y + this.size / 2;
          stage.addChild(text);
        }
        stage.addChildAt(rect, 0);
      }
    }
  }

  show() {
    this.shown = true;
  }

  countNeighbors(grid, x, y) {
    var total = 0;
    if (this.mine) {
      this.neighbors = undefined;
      return;
    } else {
      for (var i = -1; i <= 1; ++i) {
        for (var j = -1; j <= 1; ++j) {
          if (i == 0 && j == 0) {
            continue;
          }
          if (
            i + x >= 0 &&
            i + x < grid.length &&
            j + y >= 0 &&
            j + y < grid[0].length
          ) {
            console.log("I: " + i);
            console.log("J: " + j);
            if (grid[i + x][j + y].mine) {
              total++;
            }
          }
        }
      }
    }

    this.neighbors = total;
  }
}
