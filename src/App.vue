<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-file-input class="full-width" accept="image/*" label="选择待加工图片" @change="selectImage"></v-file-input>

      <v-spacer></v-spacer>

      <v-btn href="https://github.com/Laurence-042/color-change-image" target="_blank" text>
        <span>View it on github</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <div class="d-flex flex-column align-center" style="min-height:100%; width:80%; margin:auto">
        <div class="d-flex flex-column justify-center align-center full-width">
          <canvas v-show="isImageLoaded" class="full-width" id="inputCanvas" @mousedown="pickColor"></canvas>
          <p
            v-show="isImageLoaded"
            class="text-center text-h6"
            :style="{background:colorHint}"
          >{{colorHint}}</p>
          <v-btn v-show="isImageLoaded" @click="processImageAsync">开始加工</v-btn>

          <p v-show="isImageLoaded" class="text-center">加工过程预计需要大约{{estimatedTime}}秒</p>

          <v-dialog
            v-show="isImageLoaded"
            v-model="isImageProcessing"
            hide-overlay
            persistent
            width="300"
          >
            <v-card color="primary" dark>
              <v-card-text>
                <p>请稍等大约{{estimatedTime}}秒</p>
                <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
              </v-card-text>
            </v-card>
          </v-dialog>
        </div>
        <div v-show="!isImageLoaded">
          <p class="text-center text-h6">请先在顶栏处选取图片</p>
          <p class="text-center">使用方法：</p>
          <ol>
            <li>点击顶栏上传图片</li>
            <li>通过点击在图片中选中将要成为变色图变色部分的颜色</li>
            <li>点“开始加工”按钮</li>
            <li>耐心等待加工完成，然后使用切换主题或者自定义背景色按钮来调整背景颜色预览变色图效果</li>
            <li>提示：替换对比度较低且不过亮过暗的颜色效果会比较好</li>
          </ol>
        </div>

        <v-btn @click="changeBackground">切换亮色/暗色主题</v-btn>
        <v-btn @click="toggleAdvanceChangeBackground">自定义背景</v-btn>
        <div v-show="advanceChangeBackground" class="d-flex flex-column align-center">
          <select v-show="advanceChangeBackground" v-model="selectedBackgroundMode">
            <option
              v-for="(backgroundModeOption,index) in backgroundModeOptions"
              :key="index"
              :value="backgroundModeOption"
            >{{backgroundModeOption}}</option>
          </select>

          <v-color-picker
            v-show="advanceChangeBackground&&selectedBackgroundMode=='选择纯色'"
            class="margin-auto"
            v-model="pickedBackgroundColor"
          ></v-color-picker>
          <v-file-input
            v-show="advanceChangeBackground&&selectedBackgroundMode=='本机背景图片'"
            accept="image/*"
            label="选择背景图片图片"
            @change="selectBackgroundImage"
          ></v-file-input>
          <select
            v-show="advanceChangeBackground&&selectedBackgroundMode=='内置背景图片'"
            v-model="selectedBuildInBackgroundImage"
          >
            <option :value="'assets/logo.png'" selected>默认</option>
            <option
              v-for="(buildInBackgroundImagePath,buildInBackgroundImageName) in buildInBackgroundImagesPaths"
              :key="buildInBackgroundImageName"
              :value="buildInBackgroundImagePath"
            >{{buildInBackgroundImageName}}</option>
          </select>
        </div>

        <canvas v-show="false" class="full-width" id="outputCanvas"></canvas>
        <img
          v-show="isImageProcessed"
          :src="imageOut"
          :style="advanceBackground"
          class="full-width"
          style="background-position-x:center;background-position-y:center;background-size:cover;"
        />
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
    backgroundModeOptions: ["选择纯色", "内置背景图片", "本机背景图片"],
    selectedBackgroundMode: "选择纯色",
    pickedBackgroundColor: { r: 255, g: 255, b: 255 },
    selectedBackgroundImage: "assets/logo.png",
    buildInBackgroundImagesPaths: { logo: "assets/logo.png" },
    selectedBuildInBackgroundImage: "assets/logo.png",
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
    advanceBackground() {
      if (!this.advanceChangeBackground) {
        return {};
      }
      switch (this.selectedBackgroundMode) {
        case "选择纯色":
          return {
            "background-color": this.formatColor(this.pickedBackgroundColor),
          };
        case "内置背景图片":
          return {
            "background-image":
              "url(" + require("@/" + this.selectedBuildInBackgroundImage) + ")",
              "background-size":"cover",
          };
        case "本机背景图片":
          return {
            "background-image": "url(" + this.selectedBackgroundImage + ")",
            "background-size":"cover",
          };
      }
      return {};
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
    selectBackgroundImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        this.selectedBackgroundImage = e.target.result;
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