<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app>
      <v-list nav>
        <!-- 切换主题（简单背景调整） -->
        <v-select
          v-model="useDarkTheme"
          :items="[{text:'浅色主题',value:false},{text:'深色主题',value:true}]"
          item-title="text"
          item-value="value"
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
              item-title="name"
              item-value="path"
              single-line
              class="full-width"
            ></v-select>
          </div>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app color="blue darken-3" dark>
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

            <!-- 输出图片img -->
            <img
              v-show="isImageProcessed"
              :src="imageOut"
              :style="[advanceBackground]"
              class="full-width center-background"
            />

            <!-- 操作区 -->
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

          <!-- 输出图片画布 -->
          <canvas v-show="false" class="full-width" id="outputCanvas"></canvas>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>


<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTheme } from 'vuetify'
import ImageProcessor from "./util/ImageProcessor"
import ImageToolKit from "./util/ImageToolKit"
import MaskManager from "./util/MaskManager"
import SmoothLineMarker from "./util/smoothLineMarker"
import SimilarColorMarker from "./util/similarColorMarker"

// ========== 背景图片加载 ==========
const backgroundImageModules = import.meta.glob('@/assets/backgrounds/*', { eager: true, import: 'default' })
const backgroundImages = {}
const buildInBackgroundImagesPaths = []

for (const path in backgroundImageModules) {
  const filename = path.split('/').pop()
  const name = filename.replace(/\.\w+$/, '')
  backgroundImages[filename] = backgroundImageModules[path]
  buildInBackgroundImagesPaths.push({ name, path: filename })
}

// ========== 主题 ==========
const theme = useTheme()

// ========== 响应式状态 ==========
const drawer = ref(null)
const isImageLoaded = ref(false)
const isImageProcessing = ref(false)
const isImageProcessed = ref(false)
const imageIn = ref(null)
const imageOut = ref(null)

const colorRGB = ref({ r: 122, g: 122, b: 122 })
const colorSelected = ref(false)
const estimatedTime = ref(0)

const useDarkTheme = ref(false)
const advanceChangeBackground = ref(false)
const backgroundModeOptions = ["选择纯色", "内置背景图片", "本机背景图片"]
const selectedBackgroundMode = ref("选择纯色")
const pickedBackgroundColor = ref({ r: 255, g: 255, b: 255 })
const selectedBackgroundImage = ref(null)
const selectedBuildInBackgroundImage = ref("")

const imageHeight = ref("0px")

// Canvas 元素引用
const inputArea = ref(null)
const inputCanvas = ref(null)
const maskCanvas = ref(null)
const markCanvas = ref(null)
const outputCanvas = ref(null)

// 工具类实例
const maskManager = ref(null)
const smoothLineMarker = ref(null)
const similarColorMarker = ref(null)

const markerTypes = ["similarColorMarker", "smoothLineMarker"]
const markerType = ref("similarColorMarker")
const similarColorMarkerThreshold = ref(300)

const scaleFactor = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const dragHelper = ref({
  lastX: 0,
  lastY: 0,
  mousedown: false,
  mouseButton: 0,
  mousedownTime: new Date(),
})

// ========== 计算属性 ==========
const colorHint = computed(() => formatColor(colorRGB.value))

const advanceBackground = computed(() => {
  if (!advanceChangeBackground.value) return {}
  
  switch (selectedBackgroundMode.value) {
    case "选择纯色":
      return { "background-color": formatColor(pickedBackgroundColor.value) }
    case "内置背景图片":
      return {
        "background-image": `url(${backgroundImages[selectedBuildInBackgroundImage.value]})`,
        "background-size": "cover",
      }
    case "本机背景图片":
      return {
        "background-image": `url(${selectedBackgroundImage.value})`,
        "background-size": "cover",
      }
    default:
      return {}
  }
})

const inputCanvasGroupTransformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scaleFactor.value})`
}))

const marker = computed(() => {
  return markerType.value === "smoothLineMarker" 
    ? smoothLineMarker.value 
    : similarColorMarker.value
})

// ========== 监听器 ==========
watch(useDarkTheme, (newVal) => {
  advanceChangeBackground.value = false
  theme.global.name.value = newVal ? 'dark' : 'light'
})

watch(similarColorMarkerThreshold, (newVal) => {
  if (similarColorMarker.value) {
    similarColorMarker.value.threshold = newVal
  }
})

// ========== 生命周期 ==========
onMounted(() => {
  inputArea.value = document.getElementById("inputArea")
  inputCanvas.value = document.getElementById("inputCanvas")
  maskCanvas.value = document.getElementById("maskCanvas")
  markCanvas.value = document.getElementById("markCanvas")
  outputCanvas.value = document.getElementById("outputCanvas")
  
  smoothLineMarker.value = new SmoothLineMarker(markCanvas.value)
  similarColorMarker.value = new SimilarColorMarker(markCanvas.value, inputCanvas.value)
  maskManager.value = new MaskManager(maskCanvas.value)
  
  if (buildInBackgroundImagesPaths.length > 0) {
    selectedBuildInBackgroundImage.value = buildInBackgroundImagesPaths[0].path
  }
})

// ========== 文件处理方法 ==========
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const selectImage = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return
  
  try {
    const image = await readFileAsDataURL(file)
    console.log("image loaded")
    scaleFactor.value = 1
    translateX.value = 0
    translateY.value = 0
    
    importImageToInputCanvas(image)
    imageIn.value = image
    isImageLoaded.value = true
  } catch (error) {
    console.error("Failed to read image:", error)
  }
}

const selectBackgroundImage = async (event) => {
  const file = event?.target?.files?.[0]
  if (!file) return
  
  try {
    selectedBackgroundImage.value = await readFileAsDataURL(file)
  } catch (error) {
    console.error("Failed to read background image:", error)
  }
}

const importImageToInputCanvas = (imageDataUrl) => {
  const canvas = inputCanvas.value
  const mask = maskCanvas.value
  const mark = markCanvas.value
  const ctx = canvas.getContext("2d")
  const img = new Image()
  
  img.onload = () => {
    console.log("image rendered")
    canvas.width = img.width
    canvas.height = img.height
    mask.width = img.width
    mask.height = img.height
    mark.width = img.width
    mark.height = img.height
    
    marker.value.removeAllPoints()
    maskManager.value.initMask()
    ctx.drawImage(img, 0, 0)
    
    const initialScale = inputArea.value.offsetWidth / canvas.width
    imageHeight.value = `${canvas.height * initialScale}px`
    estimateTime()
  }
  
  img.src = imageDataUrl
}

const estimateTime = () => {
  const pixels = inputCanvas.value.width * inputCanvas.value.height
  estimatedTime.value = Math.round((pixels * 7) / 9068000)
}

// ========== 颜色处理 ==========
const formatColor = (rawColor) => {
  const hex = ((1 << 24) + (rawColor.r << 16) + (rawColor.g << 8) + rawColor.b)
    .toString(16)
    .slice(1)
  return `#${hex}`
}

const pickColor = (e) => {
  const { x, y } = getRealPosition(e.offsetX, e.offsetY)
  const ctx = inputCanvas.value.getContext("2d")
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
  colorRGB.value = { r, g, b }
  colorSelected.value = true
}

// ========== 坐标转换 ==========
const getRealPosition = (offsetX, offsetY) => {
  const canvas = inputCanvas.value
  return {
    x: (offsetX * canvas.width) / canvas.offsetWidth,
    y: (offsetY * canvas.height) / canvas.offsetHeight
  }
}

// ========== 鼠标事件处理 ==========
const inputCanvasGroupMouseDownHandler = (e) => {
  dragHelper.value = {
    lastX: e.clientX,
    lastY: e.clientY,
    mousedown: true,
    mouseButton: e.button,
    mousedownTime: new Date()
  }
}

const inputCanvasGroupMouseUpHandler = (e) => {
  const timeDiff = new Date() - dragHelper.value.mousedownTime
  const sameButton = dragHelper.value.mouseButton === e.button
  
  if (timeDiff < 100 && sameButton) {
    if (e.button === 0) { // 左键
      colorSelected.value ? addWayPoint(e) : pickColor(e)
    } else if (e.button === 2) { // 右键
      popWayPoint()
    }
  }
  
  dragHelper.value.mousedown = false
}

const inputCanvasGroupMouseMoveHandler = (e) => {
  if (!dragHelper.value.mousedown) return
  
  const deltaX = e.clientX - dragHelper.value.lastX
  const deltaY = e.clientY - dragHelper.value.lastY
  moveInputCanvasGroup(deltaX, deltaY)
  
  dragHelper.value.lastX = e.clientX
  dragHelper.value.lastY = e.clientY
}

const inputCanvasGroupMouseWheelHandler = (e) => {
  const factor = e.deltaY < 0 ? 1.1 : 0.9
  scaleInputCanvasGroup(factor, e.offsetX, e.offsetY)
}

const inputCanvasGroupMouseLeaveHandler = () => {
  dragHelper.value.mousedown = false
}

// ========== 画布变换 ==========
const scaleInputCanvasGroup = (deltaFactor, offsetX, offsetY) => {
  if (scaleFactor.value * deltaFactor < 0.101) return
  
  const oldFactor = scaleFactor.value
  scaleFactor.value *= deltaFactor
  
  const deltaX = offsetX * (oldFactor - scaleFactor.value)
  const deltaY = offsetY * (oldFactor - scaleFactor.value)
  moveInputCanvasGroup(deltaX, deltaY)
}

const moveInputCanvasGroup = (deltaX, deltaY) => {
  const canvas = inputCanvas.value
  const newX = translateX.value + deltaX
  const newY = translateY.value + deltaY
  const scale = scaleFactor.value
  
  const inBounds = (
    newX > -canvas.offsetWidth * scale * 0.9 &&
    newX < canvas.offsetWidth * (1 - scale * 0.1) &&
    newY > -canvas.offsetHeight * scale * 0.9 &&
    newY < canvas.offsetHeight * (1 - scale * 0.1)
  )
  
  if (inBounds) {
    translateX.value = newX
    translateY.value = newY
  }
}

// ========== 标记点操作 ==========
const addWayPoint = (e) => {
  const { x, y } = getRealPosition(e.offsetX, e.offsetY)
  marker.value.addPoint(x, y)
}

const popWayPoint = () => {
  marker.value.popPoint()
}

const addMarkedAreaMask = () => {
  maskManager.value.orMask(marker.value.collectMask())
  marker.value.reset()
}

const intersectMarkedAreaMask = () => {
  maskManager.value.andMask(marker.value.collectMask())
  marker.value.reset()
}

const exceptMarkedAreaMask = () => {
  maskManager.value.exceptMask(marker.value.collectMask())
  marker.value.reset()
}

// ========== 图像处理 ==========
const processImageAsync = () => {
  setTimeout(() => {
    addMarkedAreaMask()
    if (maskManager.value.isMarked()) {
      processImageUnderMask()
    } else {
      processWholeImage()
    }
  }, 100)
  
  isImageProcessing.value = true
  nextTick()
}

const processWholeImage = () => {
  const inCanvas = inputCanvas.value
  const outCanvas = outputCanvas.value
  
  outCanvas.width = inCanvas.width
  outCanvas.height = inCanvas.height
  
  const inCtx = inCanvas.getContext("2d")
  const outCtx = outCanvas.getContext("2d")
  const imageInData = inCtx.getImageData(0, 0, inCanvas.width, inCanvas.height)
  const imageOutData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height)
  const backgroundColor = [colorRGB.value.r, colorRGB.value.g, colorRGB.value.b]
  
  for (let i = 0; i < imageInData.height; i++) {
    for (let j = 0; j < imageInData.width; j++) {
      ImageProcessor.processPixel(imageInData, imageOutData, i, j, backgroundColor)
    }
  }
  
  outCtx.putImageData(imageOutData, 0, 0)
  imageOut.value = outCanvas.toDataURL()
  isImageProcessing.value = false
  isImageProcessed.value = true
}

const processImageUnderMask = () => {
  const inCanvas = inputCanvas.value
  const outCanvas = outputCanvas.value
  
  outCanvas.width = inCanvas.width
  outCanvas.height = inCanvas.height
  
  const inCtx = inCanvas.getContext("2d")
  const outCtx = outCanvas.getContext("2d")
  const imageInData = inCtx.getImageData(0, 0, inCanvas.width, inCanvas.height)
  const imageOutData = outCtx.getImageData(0, 0, outCanvas.width, outCanvas.height)
  const backgroundColor = [colorRGB.value.r, colorRGB.value.g, colorRGB.value.b]
  
  for (let i = 0; i < imageInData.height; i++) {
    for (let j = 0; j < imageInData.width; j++) {
      if (maskManager.value.isPointSelected(j, i)) {
        ImageProcessor.processPixel(imageInData, imageOutData, i, j, backgroundColor)
      } else {
        ImageToolKit.copyPixel(imageInData, imageOutData, i, j)
      }
    }
  }
  
  outCtx.putImageData(imageOutData, 0, 0)
  imageOut.value = outCanvas.toDataURL()
  isImageProcessing.value = false
  isImageProcessed.value = true
}

const toggleAdvanceChangeBackground = () => {
  advanceChangeBackground.value = !advanceChangeBackground.value
}
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