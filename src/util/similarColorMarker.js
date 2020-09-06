class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

ImageData.prototype.getChannelOfPixel = function (row, col, channel) {
    return this.data[row * (this.width * 4) + col * 4 + channel];
};
ImageData.prototype.setChannelOfPixel = function (row, col, channel, value) {
    this.data[row * (this.width * 4) + col * 4 + channel] = value;
};

function RgbaToHEX(rgba) {
    return "#" + rgba.r.toString(16) + rgba.g.toString(16) + rgba.b.toString(16) + rgba.a.toString(16);
}

function GetRgbaDistance(rgba0, rgba1) {
    return (rgba0.r - rgba1.r) ** 2 + (rgba0.g - rgba1.g) ** 2 + (rgba0.b - rgba1.b) ** 2 + (rgba0.a - rgba1.a) ** 2;
}

function matrix(rows, cols, defaultValue) {
    var arr = [];
    // Creates all lines:
    for (var i = 0; i < rows; i++) {
        // Creates an empty line
        arr.push([]);
        // Adds cols to the empty line:
        arr[i].push(new Array(cols));
        for (var j = 0; j < cols; j++) {
            // Initializes:
            arr[i][j] = defaultValue;
        }
    }
    return arr;
}

export default class {
    constructor(markCanvas, inputCanvas) {
        this.markCanvas = markCanvas;
        this.inputCanvas = inputCanvas;

        this.markCtx = markCanvas.getContext('2d');
        this.inputCtx = inputCanvas.getContext('2d');

        this.markImageData = this.markCtx.getImageData(0, 0, this.markCanvas.width, this.markCanvas.height);
        this.inputImageData = this.inputCtx.getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);

        /**
         * 当前版本约定：fillColor的alpha通道必为255，boundaryColor的alpha通道必为0<br/>
         * 如果性能可接受，再尝试进行扩展使程序支持非完全透明的boundaryColor（只需修改isPointSelected的判定条件）
         */
        this.fillColor = { r: 0, g: 255, b: 0, a: 255 }
        this.boundaryColor = { r: 0, g: 0, b: 0, a: 0 }
        this.threshold = 300

        this.points = [];
        this.clearMarkCanvas();
    }

    refreshMarkImageData() {
        this.markImageData = this.markCtx.getImageData(0, 0, this.markCanvas.width, this.markCanvas.height);
    }

    refreshInputImageData() {
        this.inputImageData = this.inputCtx.getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
    }

    flushBackMarkImageData() {
        this.markCtx.putImageData(this.markImageData, 0, 0);
    }

    getInputCanvasPixelChannel(row, col, channel) {
        return this.inputImageData.data[row * (this.inputImageData.width * 4) + col * 4 + channel];
    }

    setMarkCanvasPixelChannel(row, col, channel, value) {
        this.markImageData.data[row * (this.markImageData.width * 4) + col * 4 + channel] = value;
    }

    getInputCanvasPixel(row, col) {
        return {
            r: this.getInputCanvasPixelChannel(row, col, 0),
            g: this.getInputCanvasPixelChannel(row, col, 1),
            b: this.getInputCanvasPixelChannel(row, col, 2),
            a: this.getInputCanvasPixelChannel(row, col, 3)
        }
    }

    setMarkCanvasPixel(row, col, rgba) {
        this.setMarkCanvasPixelChannel(row, col, 0, rgba.r);
        this.setMarkCanvasPixelChannel(row, col, 1, rgba.g);
        this.setMarkCanvasPixelChannel(row, col, 2, rgba.b);
        this.setMarkCanvasPixelChannel(row, col, 3, rgba.a);
    }

    seedFilling(x, y, fillColor) {
        let row = y;
        let col = x;
        let stack = [[row, col, this.getInputCanvasPixel(row, col)]];
        let fillHelper = matrix(this.inputCanvas.height, this.inputCanvas.width, 0);
        let count = 0;
        while (stack.length != 0) {
            let entry = stack.pop();
            row = entry[0];
            col = entry[1];
            let referrenceColor = entry[2];

            if (fillHelper[row][col] == 1) {
                continue;
            }

            let currentPixel = this.getInputCanvasPixel(row, col);
            let distance = GetRgbaDistance(currentPixel, referrenceColor);
            // console.log(RgbaToHEX(currentPixel), RgbaToHEX(referrenceColor), distance)
            if (distance < this.threshold) {
                this.setMarkCanvasPixel(row, col, fillColor);
                count++;

                if (row < this.inputCanvas.height - 1)
                    stack.push([row + 1, col, referrenceColor])
                if (row > 0)
                    stack.push([row - 1, col, referrenceColor])
                if (col < this.inputCanvas.width - 1)
                    stack.push([row, col + 1, referrenceColor])
                if (col > 0)
                    stack.push([row, col - 1, referrenceColor])
            }
            fillHelper[row][col] = 1;
        }
        console.log(count)

    }

    fillArea(x, y) {
        this.refreshInputImageData();
        this.refreshMarkImageData();
        this.seedFilling(x, y, this.fillColor);
        this.flushBackMarkImageData();
    }

    clearArea(x, y) {
        this.refreshInputImageData();
        this.refreshMarkImageData();
        this.seedFilling(x, y, this.boundaryColor);
        this.flushBackMarkImageData();
    }

    clearMarkCanvas() {
        this.markCtx.fillStyle = RgbaToHEX(this.boundaryColor);
        this.markCtx.clearRect(0, 0, this.markCanvas.width, this.markCanvas.height);
        this.markCtx.fillRect(0, 0, this.markCanvas.width, this.markCanvas.height);
    }

    removeAllPoints() {
        this.points.length = 0;
        this.clearMarkCanvas();
    }

    addPoint(x, y) {
        x = parseInt(x);
        y = parseInt(y);
        this.points.push(new Point(x, y));
        this.fillArea(x, y);
    }

    popPoint() {
        if (this.points.length > 0) {
            let point = this.points.pop();
            this.clearArea(point.x, point.y);
        } else this.clearMarkCanvas();
    }

    isPointSelected(x, y) {
        let row = y;
        let col = x;
        return this.markImageData.data[row * (this.markImageData.width * 4) + col * 4 + 3] == 255;
    }

    isMarked() {
        return this.points.length != 0;
    }
}