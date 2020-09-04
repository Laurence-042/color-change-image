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
      <!-- 主布局 -->
      <div class="d-flex flex-column align-center" style="min-height:100%; width:80%; margin:auto">
        <!-- 输入区 -->
        <div class="d-flex flex-column justify-center align-center full-width">
          <!-- 输入图层组遮罩 -->
          <div class="full-width canvas-group-wrapper" :style="{height:imageHeight}">
            <!-- 输入图层组 -->
            <div style="transform-origin: 0 0;" :style="inputCanvasGroupTransformStyle">
              <!-- 输入图片，位于下方图层，不应修改此图片 -->
              <canvas
                v-show="isImageLoaded"
                class="full-width"
                style="position: absolute; left: 0; top: 0; z-index: 0;"
                id="inputCanvas"
              ></canvas>
              <!-- 标记路径，使用标记方式指定区域进行加工时，标记显示在本图层，位于上方图层 -->
              <canvas
                v-show="isImageLoaded"
                class="full-width"
                style="position: absolute; left: 0; top: 0; z-index: 1;"
                id="markCanvas"
                @mousedown="inputCanvasGroupMouseDownHandler"
                @mouseup="inputCanvasGroupMouseUpHandler"
                @mousemove="inputCanvasGroupMouseMoveHandler"
                @mouseleave="inputCanvasGroupMouseLeaveHandler"
                @mousewheel.prevent="inputCanvasGroupMouseWheelHandler"
                @contextmenu.prevent
              ></canvas>
            </div>
          </div>

          <p
            v-if="colorSelected"
            class="text-center text-h6"
            :style="{background:colorHint}"
            @click="colorSelected=false"
          >已选择{{colorHint}}，现在处于标记模式，点击此处以重新选择颜色，重新选择颜色不会清空现有标记</p>
          <p v-else class="text-center text-h6">请先在图中点击选择参考色</p>

          <v-btn v-show="isImageLoaded" @click="processImageAsync">开始加工</v-btn>

          <p v-if="isImageLoaded" class="text-center">加工过程预计需要大约{{estimatedTime}}秒</p>

          <v-dialog
            v-if="isImageLoaded"
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

        <!-- 操作提示 -->
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

        <!-- 简单背景调整 -->
        <v-btn @click="changeBackground">切换亮色/暗色主题</v-btn>
        <v-btn @click="toggleAdvanceChangeBackground">自定义背景</v-btn>
        <!-- 高级背景调整 -->
        <div v-show="advanceChangeBackground" class="d-flex flex-column align-center full-width">
          <v-select
            v-show="advanceChangeBackground"
            v-model="selectedBackgroundMode"
            :items="backgroundModeOptions"
            single-line
          ></v-select>

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
          <v-select
            v-show="advanceChangeBackground&&selectedBackgroundMode=='内置背景图片'"
            v-model="selectedBuildInBackgroundImage"
            :items="buildInBackgroundImagesPaths"
            :default="buildInBackgroundImagesPaths[0]"
            item-text="name"
            item-value="path"
            single-line
          ></v-select>
          <!-- <select
            v-show="advanceChangeBackground&&selectedBackgroundMode=='内置背景图片'"
            v-model="selectedBuildInBackgroundImage"
          >
            <option :value="'assets/logo.png'" selected>默认</option>
            <option
              v-for="(buildInBackgroundImagePath,buildInBackgroundImageName) in buildInBackgroundImagesPaths"
              :key="buildInBackgroundImageName"
              :value="buildInBackgroundImagePath"
            >{{buildInBackgroundImageName}}</option>
          </select>-->
        </div>

        <!-- 输出图片 -->
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
import ImageProcessor from "./util/ImageProcessor";
import SmoothLineMarker from "./util/smoothLineMarker";
/* TODO 使用套索（比和路径）对部分内容进行处理
- 在输入canvas上覆盖一个路径canvas用于展示绘制的路径，
- 使canvas可以缩放与拖动
- 绘制闭合路径，并在路径闭合后对路径内的像素进行处理。
- 保留一键对整图进行处理的功能。
- 参考
  - 缩放拖动 https://juejin.im/post/6844904095904432135
  - 平滑路径 https://wow.techbrood.com/fiddle/11802
  - API https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/isPointInPath
*/
export default {
  name: "App",
  data: () => ({
    /**待处理图片是否已加载 */
    isImageLoaded: false,
    /**待处理图片是否正在处理 */
    isImageProcessing: false,
    /**待处理图片是否已处理完成 */
    isImageProcessed: false,
    /**待处理图片 */
    imageIn: null,
    /**处理后图片 */
    imageOut: null,

    /**选中的参考颜色 */
    colorRGB: { r: 122, g: 122, b: 122 },
    colorSelected: false,
    estimatedTime: 0,

    useDarkTheme: false,

    advanceChangeBackground: false,
    backgroundModeOptions: ["选择纯色", "内置背景图片", "本机背景图片"],
    selectedBackgroundMode: "选择纯色",
    pickedBackgroundColor: { r: 255, g: 255, b: 255 },
    selectedBackgroundImage: "assets/logo.png",
    buildInBackgroundImagesPaths: [{ name: "logo", path: "assets/logo.png" }],
    selectedBuildInBackgroundImage: "assets/logo.png",

    imageHeight: "200px",

    /**输入画布 */
    inputCanvas: null,
    /**标记画布 */
    markCanvas: null,
    /**输出画布 */
    outputCanvas: null,

    /**标记器 */
    marker: null,

    /**缩放比例 */
    scaleFactor: 1,
    /**X轴平移 */
    translateX: 0,
    /**Y轴平移 */
    translateY: 0,
    /**拖动辅助数据，存储拖动状态 */
    dragHelper: {
      lastX: 0,
      lastY: 0,
      mousedown: false,
      mouseButton: 0,
      mousedownTime: new Date(),
    },
  }),
  mounted() {
    this.inputCanvas = document.getElementById("inputCanvas");
    this.outputCanvas = document.getElementById("outputCanvas");
    this.markCanvas = document.getElementById("markCanvas");
    this.marker = new SmoothLineMarker(this.markCanvas);
  },
  watch: {},
  computed: {
    /**返回当前选中的颜色格式化的结果 */
    colorHint() {
      return this.formatColor(this.colorRGB);
    },
    /**使用非默认主题时返回相应的输出画布背景 */
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
              "url(" +
              require("@/" + this.selectedBuildInBackgroundImage) +
              ")",
            "background-size": "cover",
          };
        case "本机背景图片":
          return {
            "background-image": "url(" + this.selectedBackgroundImage + ")",
            "background-size": "cover",
          };
      }
      return {};
    },
    inputCanvasGroupTransformStyle() {
      return {
        transform:
          "translate(" +
          this.translateX +
          "px," +
          this.translateY +
          "px) scale(" +
          this.scaleFactor +
          ")",
      };
    },
  },
  methods: {
    /**选取本机图片作为输入 */
    selectImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        let image = e.target.result;

        this.importImageToInputCanvas(image);

        this.imageIn = image;
        this.isImageLoaded = true;
        this.scaleFactor = 1;
        this.translateX = 0;
        this.translateY = 0;
      };
    },
    /**选取本机图片作为输出图片的背景 */
    selectBackgroundImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        this.selectedBackgroundImage = e.target.result;
      };
    },
    /**将图像绘制在指定canvas上，设置canvas尺寸，设置包裹canvas的父元素div的高度，估计 */
    importImageToInputCanvas(imageDataUrl) {
      let inputCanvas = this.inputCanvas;
      let markCanvas = this.markCanvas;
      let ctx = inputCanvas.getContext("2d");
      let img = new Image();
      img.onload = () => {
        inputCanvas.width = img.width;
        inputCanvas.height = img.height;
        markCanvas.width = img.width;
        markCanvas.height = img.height;

        this.marker.removeAllPoints();

        ctx.drawImage(img, 0, 0);
        this.imageHeight = inputCanvas.offsetHeight + "px";
        this.estimateTime();
      };
      img.src = imageDataUrl;
    },
    estimateTime() {
      this.estimatedTime =
        (this.inputCanvas.width * this.inputCanvas.height * 7) / 9068000;
    },
    getRealPosition(offsetX, offsetY) {
      let realX =
        (offsetX * this.inputCanvas.width) / this.inputCanvas.offsetWidth;
      let realY =
        (offsetY * this.inputCanvas.height) / this.inputCanvas.offsetHeight;
      // console.log({ x: offsetX, y: offsetY });
      // console.log({ realX: realX, realY: realY });
      // console.log({
      //   offsetWidth: this.inputCanvas.offsetWidth,
      //   offsetWidthHeight: this.inputCanvas.offsetHeight,
      // });
      // console.log({
      //   width: this.inputCanvas.width,
      //   height: this.inputCanvas.height,
      // });
      return { x: realX, y: realY };
    },
    /**处理输入图层组的MouseDown事件 */
    inputCanvasGroupMouseDownHandler(e) {
      this.dragHelper.lastX = e.clientX;
      this.dragHelper.lastY = e.clientY;
      this.dragHelper.mousedown = true;
      this.dragHelper.mouseButton = e.button;
      this.dragHelper.mousedownTime = new Date();
    },
    /**处理输入图层组的MouseUp事件 */
    inputCanvasGroupMouseUpHandler(e) {
      if (
        new Date() - this.dragHelper.mousedownTime < 100 &&
        this.dragHelper.mouseButton == e.button
      ) {
        // left click
        if (this.dragHelper.mouseButton == 0) {
          this.colorSelected ? this.addWayPoint(e) : this.pickColor(e);
        }
        // right click
        if (this.dragHelper.mouseButton == 2) {
          this.popWayPoint();
        }
      }

      this.dragHelper.mousedown = false;
    },
    /**处理输入图层组的MouseMove事件 */
    inputCanvasGroupMouseMoveHandler(e) {
      if (!this.dragHelper.mousedown) {
        return;
      }

      this.moveInputCanvasGroup(
        e.clientX - this.dragHelper.lastX,
        e.clientY - this.dragHelper.lastY
      );
      this.dragHelper.lastX = e.clientX;
      this.dragHelper.lastY = e.clientY;
    },
    inputCanvasGroupMouseWheelHandler(e) {
      if (e.deltaY < 0) {
        this.scaleInputCanvasGroup(1.1, e.offsetX, e.offsetY);
      } else {
        this.scaleInputCanvasGroup(0.9, e.offsetX, e.offsetY);
      }
    },
    inputCanvasGroupMouseLeaveHandler() {
      this.dragHelper.mousedown = false;
    },
    scaleInputCanvasGroup(deltaFactor, offsetX, offsetY) {
      if (this.scaleFactor * deltaFactor < 0.101) {
        return;
      }

      let oldFactor = this.scaleFactor;
      this.scaleFactor *= deltaFactor;

      this.moveInputCanvasGroup(
        offsetX * (oldFactor - this.scaleFactor),
        offsetY * (oldFactor - this.scaleFactor)
      );
    },
    moveInputCanvasGroup(deltaX, deltaY) {
      // 左侧画面外的部分不能超过当前图片大小的90%
      let inLeftBound =
        this.translateX + deltaX >
        -this.inputCanvas.offsetWidth * this.scaleFactor * 0.9;
      // 右侧画面外的部分不能超过当前图片大小的90%
      let inRightBound =
        this.translateX + deltaX <
        this.inputCanvas.offsetWidth -
          this.inputCanvas.offsetWidth * this.scaleFactor * 0.1;
            // 上侧画面外的部分不能超过当前图片大小的90%
      let inUpBound =
        this.translateY + deltaY >
        -this.inputCanvas.offsetHeight * this.scaleFactor * 0.9;
      // 下侧画面外的部分不能超过当前图片大小的90%
      let inDownBound =
        this.translateY + deltaY <
        this.inputCanvas.offsetHeight -
          this.inputCanvas.offsetHeight * this.scaleFactor * 0.1;

      if (inLeftBound && inRightBound&&inUpBound&&inDownBound) {
        this.translateX += deltaX;
        this.translateY += deltaY;
      }
    },
    /**选取颜色作为透明区域参考色 */
    pickColor(e) {
      let { x, y } = this.getRealPosition(e.offsetX, e.offsetY);
      console.log(
        "pick color(" +
          x +
          "," +
          y +
          ") from (" +
          this.inputCanvas.width +
          "," +
          this.inputCanvas.height +
          ")"
      );
      let raw_colorRGB = this.inputCanvas
        .getContext("2d")
        .getImageData(x, y, 1, 1).data;
      this.colorRGB = {
        r: raw_colorRGB[0],
        g: raw_colorRGB[1],
        b: raw_colorRGB[2],
      };
      this.colorSelected = true;
    },
    /**格式化颜色，用于显示被选取的透明区域参考色，以及被选取的背景色 */
    formatColor(raw_color) {
      return (
        "#" +
        ((1 << 24) + (raw_color.r << 16) + (raw_color.g << 8) + raw_color.b)
          .toString(16)
          .substr(1)
      );
    },
    /**切换主题 */
    changeBackground() {
      this.advanceChangeBackground = false;
      this.useDarkTheme = !this.useDarkTheme;
      this.$vuetify.theme.isDark = this.useDarkTheme;
    },
    /**切换使用高级背景 */
    toggleAdvanceChangeBackground() {
      this.advanceChangeBackground = !this.advanceChangeBackground;
    },
    /**添加处理区域标记点 */
    addWayPoint(e) {
      let { x, y } = this.getRealPosition(e.offsetX, e.offsetY);
      console.log("add point(" + x + "," + y + ")");
      this.marker.addPoint(x, y);
    },
    /**弹出最后添加的处理区域标记点 */
    popWayPoint() {
      console.log("pop point");
      this.marker.popPoint();
    },
    /**异步处理 */
    processImageAsync() {
      setTimeout(() => {
        if (this.marker.isMarked()) {
          this.processMarkedImage();
        } else {
          this.processWholeImage();
        }
      }, 100);
      this.isImageProcessing = true;
      this.$nextTick();
      console.log("async");
    },
    processWholeImage() {
      this.outputCanvas.width = this.inputCanvas.width;
      this.outputCanvas.height = this.inputCanvas.height;

      let imageInData = this.inputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
      let imageOutData = this.outputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
      let backgroundColor = [this.colorRGB.r, this.colorRGB.g, this.colorRGB.b];

      console.log(imageOutData.width + " " + imageOutData.height);

      for (let i = 0; i < imageInData.height; i++) {
        for (let j = 0; j < imageInData.width; j++) {
          ImageProcessor.processPixel(
            imageInData,
            imageOutData,
            i,
            j,
            backgroundColor
          );
        }
        console.log(i + "/" + imageInData.height);
      }
      this.outputCanvas.getContext("2d").putImageData(imageOutData, 0, 0);
      this.imageOut = this.outputCanvas.toDataURL();
      this.isImageProcessing = false;
      this.isImageProcessed = true;
    },

    processMarkedImage() {
      this.outputCanvas.width = this.inputCanvas.width;
      this.outputCanvas.height = this.inputCanvas.height;

      let imageInData = this.inputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.inputCanvas.width, this.inputCanvas.height);
      let imageOutData = this.outputCanvas
        .getContext("2d")
        .getImageData(0, 0, this.outputCanvas.width, this.outputCanvas.height);
      let backgroundColor = [this.colorRGB.r, this.colorRGB.g, this.colorRGB.b];

      console.log(imageOutData.width + " " + imageOutData.height);

      for (let i = 0; i < imageInData.height; i++) {
        for (let j = 0; j < imageInData.width; j++) {
          // 坐标的x是列序号，y是行序号，因此这里需要倒过来
          if (this.marker.isPointInPath(j, i)) {
            ImageProcessor.processPixel(
              imageInData,
              imageOutData,
              i,
              j,
              backgroundColor
            );
          } else {
            ImageProcessor.copyPixel(imageInData, imageOutData, i, j);
          }
        }
        console.log(i + "/" + imageInData.height);
      }
      this.outputCanvas.getContext("2d").putImageData(imageOutData, 0, 0);
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
.canvas-group-wrapper {
  position: relative;
  overflow: hidden;
}
</style>