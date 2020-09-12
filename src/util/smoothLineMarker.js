import ImageToolKit from "./ImageToolKit";

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export default class {
    constructor(markCanvas) {
        this.markCanvas = markCanvas;
        this.ctx = markCanvas.getContext('2d');
        this.displayGuideLines = true;
        this.displayPoints = true;
        this.displayPointNumbers = false;
        this.points = [];
        this.clearCanvas();
    }

    rePaint() {
        let points = this.points;

        this.clearCanvas();

        // 标记点
        if (this.displayPoints) {

            this.ctx.fillStyle = '#e88';
            for (let i = 0; i < points.length; ++i) {

                this.ctx.beginPath();
                this.ctx.arc(points[i].x, points[i].y, 2, 0, Math.PI * 2);
                this.ctx.fill();

                // 标记点序号
                if (this.displayPointNumbers) {

                    this.ctx.font = '7px Verdana';
                    this.ctx.fillText(i, points[i].x - this.ctx.measureText(i).width / 2, points[i].y + 18);
                }
            }
        }

        if (points.length < 1) {
            return;
        }
        // 依次途径标记点的引导线（折线）
        if (this.displayGuideLines) {

            this.ctx.beginPath();
            this.ctx.lineWidth = .6;
            this.ctx.strokeStyle = '#111';

            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; ++i)
                this.ctx.lineTo(points[i].x, points[i].y);
            this.ctx.closePath();

            this.ctx.stroke();
        }

        if (points.length < 2) {
            return;
        }
        // 平滑曲线
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#eee';
        let xControl = points[1].x,
            yControl = points[1].y;

        // 连接第一个点与前两个点的中点，并将中点作为曲线的起点
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        this.ctx.lineTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);

        // 总是以前一个点为控制点，以当前点与控制点的中间为终点
        for (let i = 2; i < points.length; ++i) {
            let x = points[i].x,
                y = points[i].y,

                xTarget = (xControl + x) / 2,
                yTarget = (yControl + y) / 2;

            this.ctx.quadraticCurveTo(xControl, yControl, xTarget, yTarget);

            xControl = x;
            yControl = y;

        }

        this.ctx.lineTo(xControl, yControl);
        this.ctx.closePath();

        this.ctx.stroke();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.markCanvas.width, this.markCanvas.height);
    }

    removeAllPoints() {
        this.points.length = 0;
        this.clearCanvas();
        this.rePaint();
    }

    addPoint(x, y) {
        this.points.push(new Point(x, y));
        this.rePaint();
    }

    popPoint() {
        if (this.points.length > 0) {
            this.points.pop();
            this.rePaint();
        } else this.clearCanvas();
    }

    shiftPoint() {
        if (this.points.length > 0) {
            this.points.shift();
            this.rePaint();
        } else this.clearCanvas();
    }

    isPointSelected(x, y) {
        return this.ctx.isPointInPath(x, y);
    }

    isMarked() {
        return this.points.length != 0;
    }

    collectMask() {
        let width = this.markCanvas.width;
        let height = this.markCanvas.height;
        let mask = ImageToolKit.matrix(height, width, 0);
        
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                mask[row][col] = this.isPointSelected(col, row) ? 1 : 0;
            }
        }
        return mask;
    }

    reset(){
        this.removeAllPoints();
    }
}