import ImageToolKit from "./ImageToolKit";

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
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
         * 当前版本约定：fillColor的alpha通道必为正数，boundaryColor的alpha通道必为0
         */
        this.fillColor = { r: 0, g: 255, b: 0, a: 127 }
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

    getInputCanvasPixel(row, col) {
        return ImageToolKit.getPixel(this.inputImageData,row,col);
    }

    setMarkCanvasPixel(row, col, rgba) {
        ImageToolKit.setPixel(this.markImageData,row,col,rgba);
    }

    seedFilling(x, y, fillColor) {
        let row = y;
        let col = x;
        let stack = [[row, col, this.getInputCanvasPixel(row, col)]];
        let fillHelper = ImageToolKit.matrix(this.inputCanvas.height, this.inputCanvas.width, 0);
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
            let distance = ImageToolKit.GetRgbaDistance(currentPixel, referrenceColor);
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
        // console.log(this.inputImageData)
        // console.log(y * (this.inputImageData.width * 4) + x * 4)
        this.seedFilling(x, y, this.fillColor);
        // console.log(this.markImageData)
        this.flushBackMarkImageData();
    }

    clearArea(x, y) {
        this.refreshInputImageData();
        this.refreshMarkImageData();
        this.seedFilling(x, y, this.boundaryColor);
        this.flushBackMarkImageData();
    }

    clearMarkCanvas() {
        this.markCtx.fillStyle = ImageToolKit.RgbaToHEX(this.boundaryColor);
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
        return this.markImageData.data[row * (this.markImageData.width * 4) + col * 4 + 3] != 0;
    }

    isMarked() {
        return this.points.length != 0;
    }

    collectMask(){
        let mask = ImageToolKit.matrix(this.markCanvas.height, this.markCanvas.width, 0);
        let width = this.markCanvas.width;
        let height = this.markCanvas.height;

        for(let row=0;row<height;row++){
            for(let col=0;col<width;col++){
                mask[row][col]=this.isPointSelected(col,row)?1:0;
            }

        }
        return mask;
    }

    reset(){
        this.removeAllPoints();
    }
}