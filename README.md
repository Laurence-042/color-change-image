# color-change-image

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).

## 在线版
https://laurence-042.github.io/color-change-image/

这个应用已更新到可以正式使用的程度，进行恰当标记后处理得到的图片中，被标记区域的颜色将随背景颜色变化而变化，而且会一定程度上地保留变色区域的阴影高光与花纹。具体保留效果取决于原图相应区域的颜色，颜色越接近平和的灰色效果越好。

这个应用的功能包括：
- 使用二次贝塞尔曲线标记选区，可调阈值的相似颜色标记选区。
- 将选区作为加工范围，或者使用选区操作蒙版后将蒙版作为加工范围。
- 使用RGB色域修改输出图片的背景色，作为变色图效果的预览。
- 使用内置的几个背景图片作为输出图片的预览背景。
- 使用本机上传图片作输出图片的预览背景。 

个人感觉现在唯一的更新点差不多就是“将输出图片png和背景一起导出为jpg”，但由于几种背景的显示逻辑不同，这个功能做起来挺麻烦的，所以短期内不准备继续更新这个应用了。除此之外，一开始我只准备让这个应用可以处理整张图就行，后来的加工区域标记功能全是半路加上的，所以这个项目的代码结构非常糟糕，我不想再被自己的代码恶心了（这个是不更新主要原因）

## 如果你对这个玩具的灵感来源与原理感兴趣
### 灵感来源
实际上，这个项目的灵感来源是半年前QQ群里刷屏的几张图，其特点是图片中的元素（比如丝袜，衣服之类的）的颜色会随着聊天气泡的颜色（也就是背景色）变化。比如说那张丝袜图，如果聊天气泡是黑色的，丝袜就是黑色的；聊天气泡是白色的，丝袜就是白色的。

关键是，变色部分的阴影是被完美地保留了的，这不是简单的抠图所能做出来的。我猜想可能是画师在画图时预先设定了一个背景色，然后将阴影之类的上完色之后去除背景色，并以png格式导出的方式做出来的。

但我觉得我们可以自己动手试着做一个工具出来，使其可以自动将正常的jpg加工成那种变色图。就这样，这个纯属娱乐的项目就开工了。

### 思路
如果纯色底图A加上带透明通道的图B可以得到很和谐的图C，那么可不可以把现有的无透明通道的图C拆成纯色底图A与透明通道图B？

如果已知一个图片的长宽，那么就能把图片转成一维点阵向量的形式（就像二维数组在内存中的真实存放方式是按行拼接在一起的一维数组一样），那么就是向量分析了。A为元素为三维向量（RGB）的N维向量（N为长宽乘积），B为元素为四维向量（RGBA）的N维向量，C为元素为三维向量的N维向量。为了方便起见，我们将三维向量RGB当作Alpha值为1的RGBA，这样ABC的形式都一样了。

假设abc为ABC中位置相同的三个元素，下标的RGBA分辨代表红绿蓝透明通道，根据叠加的原理，我们可以得到

<img src="http://latex.codecogs.com/gif.latex?c_A=1-(1-a_A)(1-b_A), c_R=a_Ra_A(1-b_A)+b_Rb_A" />

<img src="http://latex.codecogs.com/gif.latex?c_G" />与<img src="http://latex.codecogs.com/gif.latex?c_B" />的计算方式同<img src="http://latex.codecogs.com/gif.latex?c_R" />

将<img src="http://latex.codecogs.com/gif.latex?a_A=c_A=1" />带入上式可以得到
<img src="http://latex.codecogs.com/gif.latex?c_R=a_R(1-b_A)+b_Rb_A" />
显然叠加是毫无悬念了，但如果我们要拆分，信息是否足够？

这个式子中的已知量有目标颜色<img src="http://latex.codecogs.com/gif.latex?c_R" />，希望拆出的颜色<img src="http://latex.codecogs.com/gif.latex?a_R" />，但<img src="http://latex.codecogs.com/gif.latex?b_A, b_R" />都是未知量，它绝对没有一个唯一解。

这似乎很令人沮丧，这表示我们没有唯一的拆分方案。但是如果我们给它加一点限制呢？

把R通道的公式变一下形

<img src="http://latex.codecogs.com/gif.latex?\begin{aligned}c_R=a_R(1-b_A)+b_Rb_A&=>c_R=a_R-a_Rb_A+b_Rb_A\\&=>c_R-a_R=b_A(b_R-a_R)\\&=>\frac{c_R-a_R}{b_R-a_R}=b_A\\&=>\frac{c_R-a_R}{b_A}+a_R=b_R\\&=>\frac{a_R-c_R}{a_R-b_R}=b_A\\&=>a_R-\frac{a_R-c_R}{b_A}=b_R\end{aligned}" />

显然，b的色彩约浓烈，其Alpha值越小，透明度越高。所以如果我们总是要求b的透明度尽可能高，那么就应该使<img src="http://latex.codecogs.com/gif.latex?b_R" />尽可能大，比如当c的通道大于a的时直接设为255，否则设为0，来试一下？

于是这个项目就这么被写出来了。不过当它把某个通道值非常极端（比如0或255这样的）的颜色当作A图的颜色进行处理时，效果很不理想，几乎纯黑也不咋样，只有对非常适中的颜色效果才比较好。

举例来说的话，p站id为59851275的那个作品的整体构图和衣服颜色就很适合进行处理，而69740563这样稍显复杂且衣服颜色过渡很柔和的就无法得到预期的效果了。

## 附言
顺便一提，我按照Python3，C++，Java，JavaScript的顺序用同样的算法实现了四版的程序。

处理同一张图片的用时如下：
- Python3：40+分钟
- C++：Debug版29秒，Release版2秒
- Java：28秒
- JavaScript：7秒

说实话，我以前一直以为Python3和JS速度差不多，而且都远低于Java来着……不过也可能是因为其他三版用的都是OpenCV，而JS用的是Canvas的ImageData的缘故？下次我试图写点计算量不小的玩具时也许会优先考虑JS了。