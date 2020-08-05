<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-file-input
        class="full-width"
        accept="image/*"
        label="Select image to process"
        @change="selectImage"
      ></v-file-input>

      <v-spacer></v-spacer>

      <v-btn href="https://github.com/Laurence-042/color-change-image" target="_blank" text>
        <span>View it on github</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <div
        class="d-flex flex-column align-center"
        :style="{'background-color':advanceBackgroundColor, 'min-height': '100%','width':'80%','margin':'auto'}"
      >
        <div class="d-flex flex-column justify-center align-center full-width">
          <canvas v-show="isImageLoaded" class="full-width" id="inputCanvas" @mousedown="pickColor"></canvas>
          <p
            v-show="isImageLoaded"
            class="text-center text-h6"
            :style="{background:colorHint}"
          >{{colorHint}}</p>
          <v-btn v-show="isImageLoaded" @click="processImageAsync">Process</v-btn>

          <p
            v-show="isImageLoaded"
          >It will take about {{estimatedTime}}s to finish processing, click button above to start</p>

          <v-dialog
            v-show="isImageLoaded"
            v-model="isImageProcessing"
            hide-overlay
            persistent
            width="300"
          >
            <v-card color="primary" dark>
              <v-card-text>
                <p>Please wait for about {{estimatedTime}}s</p>
                <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-dialog>
        </div>
        <div v-show="!isImageLoaded">
          <p class="text-center text-h6">Select an image first</p>
        </div>

        <v-btn @click="changeBackground">Change Theme</v-btn>
        <v-btn @click="toggleAdvanceChangeBackground">Customize background color</v-btn>
        <v-color-picker
          v-show="advanceChangeBackground"
          class="margin-auto"
          v-model="pickedBackgroundColor"
        ></v-color-picker>

        <canvas v-show="false" class="full-width" id="outputCanvas"></canvas>
        <img v-show="isImageProcessed" :src="imageOut" class="full-width" />
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
    isImageProcessing: false,
    isImageProcessed: false,
    imageIn: null,
    imageOut: null,
    colorRGB: { r: 122, g: 122, b: 122 },
    processStatus: [0, 100],
    useDarkTheme: false,
    estimatedTime: 0,
    advanceChangeBackground: false,
    pickedBackgroundColor: { r: 255, g: 255, b: 255 },
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
      return this.formatColor(this.colorRGB);
    },
    advanceBackgroundColor() {
      return this.advanceChangeBackground
        ? this.formatColor(this.pickedBackgroundColor)
        : "";
    },
  },
  methods: {
    selectImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        let image = e.target.result;

        this.drawImageOnCanvas(this.inputCanvas, image);
        this.imageIn = image;
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
      let raw_colorRGB = this.inputCanvas
        .getContext("2d")
        .getImageData(x, y, 1, 1).data;
      this.colorRGB = {
        r: raw_colorRGB[0],
        g: raw_colorRGB[1],
        b: raw_colorRGB[2],
      };
    },
    formatColor(raw_color) {
      return (
        "#" +
        ((1 << 24) + (raw_color.r << 16) + (raw_color.g << 8) + raw_color.b)
          .toString(16)
          .substr(1)
      );
    },
    changeBackground() {
      this.advanceChangeBackground = false;
      this.useDarkTheme = !this.useDarkTheme;
      this.$vuetify.theme.isDark = this.useDarkTheme;
    },
    toggleAdvanceChangeBackground() {
      this.advanceChangeBackground = !this.advanceChangeBackground;
    },
    processImageAsync() {
      setTimeout(() => {
        this.processImage();
      }, 100);
      this.isImageProcessing = true;
      this.$nextTick();
      console.log("async");
    },
    processImage() {
      this.processStatus = [0, this.inputCanvas.height];
      this.$nextTick();

      this.outputCanvas.width = this.inputCanvas.width;
      this.outputCanvas.height = this.inputCanvas.height;

      let imageInData = this.inputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
      let imageFrontData = this.outputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
      let backgroundColor = [this.colorRGB.r, this.colorRGB.g, this.colorRGB.b];

      console.log(imageFrontData.width + " " + imageFrontData.height);

      for (let i = 0; i < imageInData.height; i++) {
        for (let j = 0; j < imageInData.width; j++) {
          // get min available imageFrontData.Alpha
          let imgFront_pixel_alpha = 0;
          for (let color_channel = 0; color_channel < 3; color_channel++) {
            let tmp;
            if (
              imageInData.getChannelOfPixel(i, j, color_channel) >
              backgroundColor[color_channel]
            ) {
              tmp =
                imageInData.getChannelOfPixel(i, j, color_channel) -
                backgroundColor[color_channel];
              if (tmp != 0) {
                // when encounter 0 / 0, to get min available Alpha, assume tmp is 0
                tmp /= 255 - backgroundColor[color_channel];
              }
            } else {
              tmp =
                backgroundColor[color_channel] -
                imageInData.getChannelOfPixel(i, j, color_channel);
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
              imageInData.getChannelOfPixel(i, j, color_channel) >
              backgroundColor[color_channel]
            ) {
              let frontPixel =
                imageInData.getChannelOfPixel(i, j, color_channel) -
                backgroundColor[color_channel];
              frontPixel /= imgFront_pixel_alpha;
              frontPixel += backgroundColor[color_channel];

              imageFrontData.setChannelOfPixel(i, j, color_channel, frontPixel);
            } else {
              let frontPixel = backgroundColor[color_channel];
              let tmp =
                backgroundColor[color_channel] -
                imageInData.getChannelOfPixel(i, j, color_channel);
              tmp /= imgFront_pixel_alpha;
              frontPixel -= tmp;

              imageFrontData.setChannelOfPixel(i, j, color_channel, frontPixel);
            }
          }
        }
        this.processStatus[0] = i;
        this.$nextTick();
        console.log(i + "/" + imageInData.height);
      }
      this.outputCanvas.getContext("2d").putImageData(imageFrontData, 0, 0);
      this.imageOut = this.outputCanvas.toDataURL();
      this.isImageProcessing = false;
      this.isImageProcessed = true;
    },
  },
};
</script>

<style>
.full-width {
  width: 100%;
}
.margin-auto {
  margin: auto;
}
/* .dark{
  background: ;
} */
</style>