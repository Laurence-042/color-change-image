import ImageToolKit from "./ImageToolKit"

export default class {
    constructor(maskCanvas) {
        this.canvas = maskCanvas;

        this.ctx = maskCanvas.getContext('2d');

        this.fillColor = { r: 0, g: 255, b: 0, a: 255 }

        this.marked = false;

        this.initMask()
        this.clear();
    }

    initMask() {
        this.mask = ImageToolKit.matrix(this.canvas.height, this.canvas.width, 0);
        this.marked = false;
    }

    setMask(mask) {
        this.mask = mask;
        this.rePaint();
    }

    rePaint() {
        this.clear();
        let width = this.canvas.width, height = this.canvas.height;
        let mask = this.mask;
        let imageData = this.ctx.getImageData(0, 0, width, height);
        console.log("重绘蒙版")
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                if (mask[row][col] != 0) {
                    ImageToolKit.setPixel(imageData, row, col, this.fillColor)
                }
            }
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    orMask(paramMask) {
        this.mergeMask(paramMask, (cell0, cell1) => { return (cell0 == 1 || cell1 == 1) ? 1 : 0 });
    }
    andMask(paramMask) {
        this.mergeMask(paramMask, (cell0, cell1) => { return (cell0 == 1 && cell1 == 1) ? 1 : 0 });
    }
    exceptMask(paramMask) {
        this.mergeMask(paramMask, (cell0, cell1) => { return (cell1 == 1) ? 0 : cell0 });
    }

    mergeMask(paramMask, mergeFunction) {
        let mask0 = this.mask;
        let mask1 = paramMask;
        if (mask0.length == 0 || mask1.length == 0) {
            console.error("用于合并的矩阵不应为空");
            return null;
        }
        if (mask0[0].length == 0 || mask1[0].length == 0) {
            console.error("用于合并的矩阵应该至少有一列");
            return null;
        }
        if (mask0[0].length != mask1[0].length || mask0.length != mask1.length) {
            console.error("用于合并的矩阵行列数应该完全相同");
            return null;
        }
        console.log("开始合并");
        this.marked = false;
        let height = mask0.length;
        let width = mask0[0].length;
        let res = ImageToolKit.matrix(height, width);
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                res[row][col] = mergeFunction(mask0[row][col], mask1[row][col]);
                if (!this.marked && res[row][col] != 0) {
                    this.marked = true;
                }
            }
        }
        return this.setMask(res);
    }

    isPointSelected(x, y) {
        let row = y;
        let col = x;
        return this.mask[row][col] != 0;
    }

    isMarked() {
        return this.marked;
    }
}