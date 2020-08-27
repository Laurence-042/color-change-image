ImageData.prototype.getChannelOfPixel = function (row, col, channel) {
    return this.data[row * (this.width * 4) + col * 4 + channel];
};
ImageData.prototype.setChannelOfPixel = function (row, col, channel, value) {
    this.data[row * (this.width * 4) + col * 4 + channel] = value;
};

export default {
    processPixel(imageInData,imageOutData, row, col, referenceColr) {
        // get min available imageOutData.Alpha
        let imgFront_pixel_alpha = 0;
        for (let color_channel = 0; color_channel < 3; color_channel++) {
            let tmp;
            if (
                imageInData.getChannelOfPixel(row, col, color_channel) >
                referenceColr[color_channel]
            ) {
                tmp =
                    imageInData.getChannelOfPixel(row, col, color_channel) -
                    referenceColr[color_channel];
                if (tmp != 0) {
                    // when encounter 0 / 0, to get min available Alpha, assume tmp is 0
                    tmp /= 255 - referenceColr[color_channel];
                }
            } else {
                tmp =
                    referenceColr[color_channel] -
                    imageInData.getChannelOfPixel(row, col, color_channel);
                if (tmp != 0) {
                    tmp /= referenceColr[color_channel];
                }
            }
            if (tmp > imgFront_pixel_alpha) {
                imgFront_pixel_alpha = tmp;
            }
        }

        imageOutData.setChannelOfPixel(row, col, 3, imgFront_pixel_alpha * 255);

        if (imgFront_pixel_alpha == 0) {
            for (let color_channel = 0; color_channel < 3; color_channel++) {
                imageOutData.setChannelOfPixel(row, col, color_channel, 0);
            }
            return;
        }

        // now imgFront_pixel_alpha is the min available alpha
        for (let color_channel = 0; color_channel < 3; color_channel++) {
            if (
                imageInData.getChannelOfPixel(row, col, color_channel) >
                referenceColr[color_channel]
            ) {
                let frontPixel =
                    imageInData.getChannelOfPixel(row, col, color_channel) -
                    referenceColr[color_channel];
                frontPixel /= imgFront_pixel_alpha;
                frontPixel += referenceColr[color_channel];

                imageOutData.setChannelOfPixel(row, col, color_channel, frontPixel);
            } else {
                let frontPixel = referenceColr[color_channel];
                let tmp =
                    referenceColr[color_channel] -
                    imageInData.getChannelOfPixel(row, col, color_channel);
                tmp /= imgFront_pixel_alpha;
                frontPixel -= tmp;

                imageOutData.setChannelOfPixel(row, col, color_channel, frontPixel);
            }
        }
    }
}