<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :clipped="$vuetify.breakpoint.lgAndUp" app>
      <v-list nav>
        <!-- 切换主题（简单背景调整） -->
        <v-select
          v-model="useDarkTheme"
          :items="[{text:'浅色主题',value:false},{text:'深色主题',value:true}]"
          single-line
          class="full-width"
        ></v-select>

        <v-select v-model="markerType" :items="markerTypes" single-line class="full-width"></v-select>

        <v-slider
          v-model="similarColorMarkerThreshold"
          v-show="markerType=='similarColorMarker'"
          value="300"
          max="10000"
          label="阈值"
        ></v-slider>

        <!-- 高级背景调整 -->
        <v-list-item @click="toggleAdvanceChangeBackground">自定义背景</v-list-item>
        <v-list-item>
          <div v-show="advanceChangeBackground" class="d-flex flex-column align-center full-width">
            <v-select
              v-show="advanceChangeBackground"
              v-model="selectedBackgroundMode"
              :items="backgroundModeOptions"
              single-line
              class="full-width"
            ></v-select>

            <v-color-picker
              v-show="advanceChangeBackground&&selectedBackgroundMode=='选择纯色'"
              v-model="pickedBackgroundColor"
              class="margin-auto full-width"
            ></v-color-picker>
            <v-file-input
              v-show="advanceChangeBackground&&selectedBackgroundMode=='本机背景图片'"
              accept="image/*"
              label="选择背景图片图片"
              @change="selectBackgroundImage"
              class="full-width"
            ></v-file-input>
            <v-select
              v-show="advanceChangeBackground&&selectedBackgroundMode=='内置背景图片'"
              v-model="selectedBuildInBackgroundImage"
              :items="buildInBackgroundImagesPaths"
              :default="buildInBackgroundImagesPaths[0]"
              item-text="name"
              item-value="path"
              single-line
              class="full-width"
            ></v-select>
          </div>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app :clipped-left="$vuetify.breakpoint.lgAndUp" color="blue darken-3" dark>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>

      <v-file-input class="full-width" accept="image/*" label="选择待加工图片" @change="selectImage"></v-file-input>

      <v-spacer></v-spacer>

      <v-btn href="https://github.com/Laurence-042/color-change-image" target="_blank" text>
        <span>在Github查看代码</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <!-- 操作提示 -->
          <div v-show="!isImageLoaded">
            <p class="text-center text-h6">请先在顶栏处选取图片</p>
            <p class="text-center">使用方法：</p>
            <ol>
              <li>点击顶栏上传图片</li>
              <li>通过点击在图片中选中将要成为变色图变色部分的颜色</li>
              <li>
                在侧边栏中选择标记器（marker）进行标记，使用左键点击设置标记点，右键点击移除标记点（可选）
                <ol>
                  <li>
                    相似颜色标记器：选中与标记点相连通的，颜色差异小于阈值的区域
                  </li>
                  <li>
                    曲线标记器：利用标记点圈出待处理区域的路径
                  </li>
                </ol>
              </li>
              <li>使用标记区操作蒙版（mask），进行加工时会将当前标记区加入蒙版后，将蒙版区域当作待加工区域（可选）</li>
              <li>点“开始加工”按钮</li>
              <li>耐心等待加工完成，然后使用切换主题或者自定义背景色按钮来调整背景颜色预览变色图效果</li>
              <li>提示：替换对比度较低且不过亮过暗的颜色效果会比较好</li>
              <li>提示：按住左键可以拖动图片，滚轮可以缩放图片</li>
            </ol>
          </div>

          <!-- 输入区 -->
          <div
            id="inputArea"
            class="d-flex flex-column justify-center align-center full-width"
            :style="isImageLoaded?{}:{display:'none !important'}"
          >
            <!-- 输入图层组遮罩 -->
            <div
              v-show="!isImageProcessed"
              class="full-width canvas-group-wrapper center-background"
              :style="[{height:imageHeight},advanceBackground]"
            >
              <!-- 输入图层组 -->
              <div style="transform-origin: 0 0;" :style="inputCanvasGroupTransformStyle">
                <!-- 输入图片，不应修改此图片 -->
                <canvas
                  class="full-width"
                  style="position: absolute; left: 0; top: 0; z-index: 0;"
                  id="inputCanvas"
                ></canvas>
                <!-- 蒙版图层 -->
                <canvas
                  class="full-width"
                  style="position: absolute; left: 0; top: 0; z-index: 1;"
                  id="maskCanvas"
                ></canvas>
                <!-- 标记路径，使用标记方式指定区域进行加工时，标记显示在本图层-->
                <canvas
                  class="full-width"
                  style="position: absolute; left: 0; top: 0; z-index: 2;"
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

            <img
              v-show="isImageProcessed"
              :src="imageOut"
              :style="[advanceBackground]"
              class="full-width center-background"
            />

            <v-card v-if="!isImageProcessed" class="fixed-right-bottom" dark>
              <v-card-title
                v-if="colorSelected"
                :style="{background:colorHint}"
                @click="colorSelected=false"
              >已选择{{colorHint}}，点击此处以重新选色</v-card-title>
              <v-card-title v-else>请先在图中点击选择参考色</v-card-title>
              <v-card-text>加工过程预计需要大约{{estimatedTime}}秒</v-card-text>

              <v-card-actions>
                <v-btn @click="processImageAsync">开始加工</v-btn>
                <v-btn @click="addMarkedAreaMask">将选区加入蒙版</v-btn>
                <v-btn @click="exceptMarkedAreaMask">从蒙版中减去选区</v-btn>
                <v-btn @click="intersectMarkedAreaMask">将蒙版与选区相交</v-btn>
              </v-card-actions>

              <v-dialog v-model="isImageProcessing" hide-overlay persistent width="300">
                <v-card color="primary" dark>
                  <v-card-text>
                    <p>请稍等大约{{estimatedTime}}秒</p>
                    <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
                  </v-card-text>
                </v-card>
              </v-dialog>
            </v-card>

            <v-card v-else class="fixed-right-bottom" dark>
              <v-card-title>加工完成，标记模式已退出</v-card-title>
              <v-card-text>
                使用右键点击图片另存为，
                <br />或者点击下方按钮撤销加工重新进入标记模式
              </v-card-text>

              <v-card-actions>
                <v-btn @click="isImageProcessed=false">标记模式</v-btn>
              </v-card-actions>
            </v-card>
          </div>

          <!-- 输出图片 -->
          <canvas v-show="false" class="full-width" id="outputCanvas"></canvas>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>


<script>
import ImageProcessor from "./util/ImageProcessor";
import ImageToolKit from "./util/ImageToolKit";
import MaskManager from "./util/MaskManager";
import SmoothLineMarker from "./util/smoothLineMarker";
import SimilarColorMarker from "./util/similarColorMarker";

export default {
  name: "App",
  data: () => ({
    /**导航抽屉 */
    drawer: null,

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
    selectedBackgroundImage: null,
    buildInBackgroundImagesPaths: [
      { name: "logo", path: "logo.png" },
      { name: "粉蓝渐变", path: "粉蓝渐变.jpeg" },
      { name: "红渐变", path: "红渐变.jpeg" },
      { name: "黄渐变", path: "黄渐变.jpeg" },
      { name: "绿渐变", path: "绿渐变.jpeg" },
      { name: "晶格", path: "晶格.jpg" },
    ],
    selectedBuildInBackgroundImage: "logo.png",

    imageHeight: "0px",

    /**输入区 */
    inputArea: null,
    /**输入画布 */
    inputCanvas: null,
    /**蒙版画布 */
    maskCanvas: null,
    /**标记画布 */
    markCanvas: null,
    /**输出画布 */
    outputCanvas: null,

    /**蒙版管理器 */
    maskManager: null,

    /**标记器 */
    markerTypes: ["similarColorMarker", "smoothLineMarker"],
    markerType: "similarColorMarker",
    smoothLineMarker: null,
    similarColorMarker: null,
    similarColorMarkerThreshold: 300,

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
    this.inputArea = document.getElementById("inputArea");
    this.inputCanvas = document.getElementById("inputCanvas");
    this.maskCanvas = document.getElementById("maskCanvas");
    this.markCanvas = document.getElementById("markCanvas");
    this.outputCanvas = document.getElementById("outputCanvas");
    this.smoothLineMarker = new SmoothLineMarker(this.markCanvas);
    this.similarColorMarker = new SimilarColorMarker(
      this.markCanvas,
      this.inputCanvas
    );
    this.maskManager = new MaskManager(this.maskCanvas);
  },
  watch: {
    /**切换主题 */
    useDarkTheme() {
      this.advanceChangeBackground = false;
      this.$vuetify.theme.isDark = this.useDarkTheme;
    },
    similarColorMarkerThreshold(newVal) {
      this.similarColorMarker.threshold = newVal;
    },
  },
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
              require("@/assets/" + this.selectedBuildInBackgroundImage) +
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
    marker() {
      switch (this.markerType) {
        case "smoothLineMarker":
          return this.smoothLineMarker;
        case "similarColorMarker":
          return this.similarColorMarker;
      }
      return null;
    },
  },
  methods: {
    /**选取本机图片作为输入 */
    selectImage(file) {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        let image = e.target.result;
        console.log("image readed");
        this.scaleFactor = 1;
        this.translateX = 0;
        this.translateY = 0;

        this.importImageToInputCanvas(image);

        this.imageIn = image;
        this.isImageLoaded = true;
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
      let maskCanvas = this.maskCanvas;
      let markCanvas = this.markCanvas;

      let ctx = inputCanvas.getContext("2d");
      let img = new Image();
      img.onload = () => {
        console.log("image loaded");
        inputCanvas.width = img.width;
        inputCanvas.height = img.height;
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        markCanvas.width = img.width;
        markCanvas.height = img.height;

        this.marker.removeAllPoints();
        this.maskManager.initMask();

        ctx.drawImage(img, 0, 0);

        let initialScale = this.inputArea.offsetWidth / inputCanvas.width;
        this.imageHeight = inputCanvas.height * initialScale + "px";
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

      if (inLeftBound && inRightBound && inUpBound && inDownBound) {
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
    addMarkedAreaMask() {
      this.maskManager.orMask(this.marker.collectMask());
      this.marker.reset();
    },
    intersectMarkedAreaMask() {
      this.maskManager.andMask(this.marker.collectMask());
      this.marker.reset();
    },
    exceptMarkedAreaMask() {
      this.maskManager.exceptMask(this.marker.collectMask());
      this.marker.reset();
    },
    /**异步处理 */
    processImageAsync() {
      setTimeout(() => {
        this.addMarkedAreaMask();
        if (this.maskManager.isMarked()) {
          this.processImageUnderMask();
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

    processImageUnderMask() {
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
          if (this.maskManager.isPointSelected(j, i)) {
            ImageProcessor.processPixel(
              imageInData,
              imageOutData,
              i,
              j,
              backgroundColor
            );
          } else {
            ImageToolKit.copyPixel(imageInData, imageOutData, i, j);
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
  /* background-image: linear-gradient(to bottom, #66ccff, #ee82ee); */
}
.center-background {
  background-position-x: center;
  background-position-y: center;
  background-size: cover;
}
.fixed-right-bottom {
  position: fixed !important;
  bottom: 1em;
  right: 1em;
}
</style>