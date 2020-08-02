<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-file-input
        class="full-width"
        accept="image/*"
        label="Select image to process"
        @change="selectImage"
      ></v-file-input>
      <!-- <div class="d-flex align-center">
        <h1>Test</h1>
      </div>-->

      <v-spacer></v-spacer>

      <v-btn href="#" target="_blank" text>
        <span>View it on github</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <div class="d-flex flex-column align-center">
        <div v-show="isImageLoaded">
          <div class="d-flex flex-column justify-center">
            <canvas class="full-width" id="inputCanvas" @mousedown="pickColor"></canvas>
            <div class="d-flex flex-row justify-center">
              <p class="text-center text-h6" :style="{background:colorHint}">{{colorHint}}</p>
              <v-btn @click="processImageAsync">Process</v-btn>
            </div>

            <p>It will take about {{estimatedTime}}s to finish processing, click button above to start</p>
          </div>
        </div>
        <div v-show="!isImageLoaded">
          <p class="text-center text-h6">Select an image first</p>
        </div>

        <v-btn @click="changeBackground">Change Theme</v-btn>

        <div v-show="imageProcessing">
          <!-- <p>{{processStatus[0]}}/{{processStatus[1]}}</p> -->
          <canvas class="full-width" id="outputCanvas"></canvas>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script>
ImageData.prototype.getChannelOfPixel = function (row, col, channel) {
  return this.data[row * (this.width * 4) + col * 4 + channel];
};
ImageData.prototype.setChannelOfPixel = function (row, col, channel, value) {
  this.data[row * (this.width * 4) + col * 4 + channel] = value;
};
export default {
  name: "App",
  data: () => ({
    isImageLoaded: false,
    imageOrigin: null,
    colorRGBA: [255, 255, 255, 255],
    imageProcessing: false,
    processStatus: [0, 100],
    useDarkTheme: false,
    estimatedTime: 0,
  }),
  mounted() {},
  watch: {},
  computed: {
    inputCanvas() {
      return document.getElementById("inputCanvas");
    },
    outputCanvas() {
      return document.getElementById("outputCanvas");
    },
    colorHint() {
      return (
        "rgba(" +
        this.colorRGBA[0] +
        "," +
        this.colorRGBA[1] +
        "," +
        this.colorRGBA[2] +
        "," +
        this.colorRGBA[3] +
        ")"
      );
    },
  },
  methods: {
    selectImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        let image = e.target.result;

        this.drawImageOnCanvas(this.inputCanvas, image);
        this.imageOrigin = image;
        this.isImageLoaded = true;
      };
    },
    drawImageOnCanvas(canvas, imageDataUrl) {
      let ctx = canvas.getContext("2d");
      let img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        this.estimateTime(img.width, img.height);
      };
      img.src = imageDataUrl;
    },
    estimateTime(width, height) {
      this.estimatedTime = (width * height * 7) / 9068000;
    },
    pickColor(e) {
      let x =
        (e.layerX * this.inputCanvas.width) / this.inputCanvas.offsetWidth;
      let y =
        (e.layerY * this.inputCanvas.height) / this.inputCanvas.offsetHeight;
      this.colorRGBA = this.inputCanvas
        .getContext("2d")
        .getImageData(x, y, 1, 1).data;
    },
    changeBackground() {
      this.useDarkTheme = !this.useDarkTheme;
      this.$vuetify.theme.isDark = this.useDarkTheme;
    },
    processImageAsync() {
      setTimeout(() => {
        this.processImage();
      }, 0);
      this.imageProcessing = true;
      console.log("async");
    },
    processImage() {
      this.imageProcessing = true;
      this.processStatus = [0, this.inputCanvas.height];
      this.$nextTick();

      this.outputCanvas.width = this.inputCanvas.width;
      this.outputCanvas.height = this.inputCanvas.height;

      let imageOriginData = this.inputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
      let imageFrontData = this.outputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
      let backgroundColor = this.colorRGBA;

      console.log(imageFrontData.width + " " + imageFrontData.height);

      for (let i = 0; i < imageOriginData.height; i++) {
        for (let j = 0; j < imageOriginData.width; j++) {
          // get min available imageFrontData.Alpha
          let imgFront_pixel_alpha = 0;
          for (let color_channel = 0; color_channel < 3; color_channel++) {
            let tmp;
            if (
              imageOriginData.getChannelOfPixel(i, j, color_channel) >
              backgroundColor[color_channel]
            ) {
              tmp =
                imageOriginData.getChannelOfPixel(i, j, color_channel) -
                backgroundColor[color_channel];
              if (tmp != 0) {
                // when encounter 0 / 0, to get min available Alpha, assume tmp is 0
                tmp /= 255 - backgroundColor[color_channel];
              }
            } else {
              tmp =
                backgroundColor[color_channel] -
                imageOriginData.getChannelOfPixel(i, j, color_channel);
              if (tmp != 0) {
                tmp /= backgroundColor[color_channel];
              }
            }
            if (tmp > imgFront_pixel_alpha) {
              imgFront_pixel_alpha = tmp;
            }
          }

          imageFrontData.setChannelOfPixel(i, j, 3, imgFront_pixel_alpha * 255);

          if (imgFront_pixel_alpha == 0) {
            for (let color_channel = 0; color_channel < 3; color_channel++) {
              imageFrontData.setChannelOfPixel(i, j, color_channel, 0);
            }
            continue;
          }

          // now imgFront_pixel_alpha is the min available alpha
          for (let color_channel = 0; color_channel < 3; color_channel++) {
            if (
              imageOriginData.getChannelOfPixel(i, j, color_channel) >
              backgroundColor[color_channel]
            ) {
              let frontPixel =
                imageOriginData.getChannelOfPixel(i, j, color_channel) -
                backgroundColor[color_channel];
              frontPixel /= imgFront_pixel_alpha;
              frontPixel += backgroundColor[color_channel];

              imageFrontData.setChannelOfPixel(i, j, color_channel, frontPixel);
            } else {
              let frontPixel = backgroundColor[color_channel];
              let tmp =
                backgroundColor[color_channel] -
                imageOriginData.getChannelOfPixel(i, j, color_channel);
              tmp /= imgFront_pixel_alpha;
              frontPixel -= tmp;

              imageFrontData.setChannelOfPixel(i, j, color_channel, frontPixel);
            }
          }
        }
        this.processStatus[0] = i;
        this.$nextTick();
        console.log(i + "/" + imageOriginData.height);
      }
      this.outputCanvas.getContext("2d").putImageData(imageFrontData, 0, 0);
      this.drawImageOnCanvas(this.outputCanvas, this.outputCanvas.toDataURL());
    },
  },
};
</script>

<style>
.full-width {
  width: 100%;
}

/* .dark{
  background: ;
} */
</style>