export default {
    copyPixel(imageInData, imageOutData, row, col) {
        let originPixel =this.getPixel(imageInData,row,col);
        this.setPixel(imageOutData,row,col,originPixel);
    },
    RgbaToHEX(rgba) {
        return "#" + rgba.r.toString(16) + rgba.g.toString(16) + rgba.b.toString(16) + rgba.a.toString(16);
    },

    GetRgbaDistance(rgba0, rgba1) {
        return (rgba0.r - rgba1.r) ** 2 + (rgba0.g - rgba1.g) ** 2 + (rgba0.b - rgba1.b) ** 2 + (rgba0.a - rgba1.a) ** 2;
    },

    getPixelChannel(imageData, row, col, channel) {
        return imageData.data[row * (imageData.width * 4) + col * 4 + channel];
    },

    setPixelChannel(imageData, row, col, channel, value) {
        imageData.data[row * (imageData.width * 4) + col * 4 + channel] = value;
    },

    getPixel(imageData, row, col) {
        return {
            r: this.getPixelChannel(imageData, row, col, 0),
            g: this.getPixelChannel(imageData, row, col, 1),
            b: this.getPixelChannel(imageData, row, col, 2),
            a: this.getPixelChannel(imageData, row, col, 3)
        }
    },

    setPixel(imageData, row, col, rgba) {
        this.setPixelChannel(imageData, row, col, 0, rgba.r);
        this.setPixelChannel(imageData, row, col, 1, rgba.g);
        this.setPixelChannel(imageData, row, col, 2, rgba.b);
        this.setPixelChannel(imageData, row, col, 3, rgba.a);
    },

    matrix(rows, cols, defaultValue) {
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
}