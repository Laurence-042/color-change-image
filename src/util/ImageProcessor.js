import ImageToolKit from "./ImageToolKit"

export default {
    getMinAvaliableAlpha(imageInData, row, col, referenceColr) {
        let res = 0;
        for (let color_channel = 0; color_channel < 3; color_channel++) {
            let tmp;
            if (

                ImageToolKit.getPixelChannel(imageInData, row, col, color_channel) >
                referenceColr[color_channel]
            ) {
                tmp =
                    ImageToolKit.getPixelChannel(imageInData, row, col, color_channel) -
                    referenceColr[color_channel];
                if (tmp != 0) {
                    // when encounter 0 / 0, to get min available Alpha, assume tmp is 0
                    tmp /= 255 - referenceColr[color_channel];
                }
            } else {
                tmp =
                    referenceColr[color_channel] -
                    ImageToolKit.getPixelChannel(imageInData, row, col, color_channel);
                if (tmp != 0) {
                    tmp /= referenceColr[color_channel];
                }
            }
            if (tmp > res) {
                res = tmp;
            }
        }
        return res;
    },
    processPixel(imageInData, imageOutData, row, col, referenceColr) {
        // get min available imageOutData.Alpha
        let imgFront_pixel_alpha = this.getMinAvaliableAlpha(imageInData, row, col, referenceColr);

        ImageToolKit.setPixelChannel(imageOutData, row, col, 3, imgFront_pixel_alpha * 255);

        if (imgFront_pixel_alpha == 0) {
            for (let color_channel = 0; color_channel < 3; color_channel++) {
                ImageToolKit.setPixelChannel(imageOutData, row, col, color_channel, 0);
            }
            return;
        }

        // now imgFront_pixel_alpha is the min available alpha
        for (let color_channel = 0; color_channel < 3; color_channel++) {
            if (
                ImageToolKit.getPixelChannel(imageInData, row, col, color_channel) >
                referenceColr[color_channel]
            ) {
                let frontPixel =
                    ImageToolKit.getPixelChannel(imageInData, row, col, color_channel) -
                    referenceColr[color_channel];
                frontPixel /= imgFront_pixel_alpha;
                frontPixel += referenceColr[color_channel];

                ImageToolKit.setPixelChannel(imageOutData, row, col, color_channel, frontPixel);
            } else {
                let frontPixel = referenceColr[color_channel];
                let tmp =
                    referenceColr[color_channel] -
                    ImageToolKit.getPixelChannel(imageInData, row, col, color_channel);
                tmp /= imgFront_pixel_alpha;
                frontPixel -= tmp;

                ImageToolKit.setPixelChannel(imageOutData, row, col, color_channel, frontPixel);
            }
        }
    }
}