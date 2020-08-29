class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export default class {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.displayGuideLines = true;
        this.displayPoints = true;
        this.displayPointNumbers = true;
        this.points = [];
        this.clearCanvas();
    }

    rePaint() {
        let points = this.points;

        this.clearCanvas();
        if (points.length == 0) {
            return;
        }

        // 标记点
        if (this.displayPoints) {

            this.ctx.fillStyle = '#e88';
            for (let i = 0; i < points.length; ++i) {

                this.ctx.beginPath();
                this.ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
                this.ctx.fill();

                // 标记点序号
                if (this.displayPointNumbers) {

                    this.ctx.font = '14px Verdana';
                    this.ctx.fillText(i, points[i].x - this.ctx.measureText(i).width / 2, points[i].y + 18);
                }
            }
        }

        // 依次途径标记点的引导线（折线）
        if (this.displayGuideLines) {

            this.ctx.beginPath();
            this.ctx.lineWidth = .6;
            this.ctx.strokeStyle = '#111';

            this.ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < points.length; ++i)
                this.ctx.lineTo(points[i].x, points[i].y);

            this.ctx.stroke();
        }

        // 平滑曲线
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#eee';
        let x = points[0].x,
            y = points[0].y;

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);

        for (let i = 0; i < points.length; ++i) {

            let x2 = points[i].x,
                y2 = points[i].y,

                mx = (x + x2) / 2,
                my = (y + y2) / 2;

            this.ctx.quadraticCurveTo(x, y, mx, my);

            x = x2;
            y = y2;

        }

        this.ctx.lineTo(x, y);
        this.ctx.closePath();

        this.ctx.stroke();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    removeAllPoints() {
        this.points.length=0;
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

    isPointInPath(x, y) {
        return this.ctx.isPointInPath(x, y);
    }

    isMarked() {
        return this.points.length != 0;
    }
}