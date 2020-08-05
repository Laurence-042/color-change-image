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

## 如果你对这个玩具的灵感来源与原理感兴趣
### 灵感来源
实际上，这个项目的灵感来源是半年前QQ群里刷屏的几张图，其特点是图片中的元素（比如丝袜，衣服之类的）的颜色会随着聊天气泡的颜色（也就是背景色）变化。比如说那张丝袜图，如果聊天气泡是黑色的，丝袜就是黑色的；聊天气泡是白色的，丝袜就是白色的。

关键是，变色部分的阴影是被完美地保留了的，这不是简单的抠图所能做出来的。我猜想可能是画师在画图时预先设定了一个背景色，然后将阴影之类的上完色之后去除背景色，并以png格式导出的方式做出来的。

但我觉得我们可以自己动手试着做一个工具出来，使其可以自动将正常的jpg加工成那种变色图。就这样，这个纯属娱乐的项目就开工了。

### 思路
如果纯色底图A加上带透明通道的图B可以得到很和谐的图C，那么可不可以把现有的无透明通道的图C拆成纯色底图A与透明通道图B？

如果已知一个图片的长宽，那么就能把图片转成一维点阵向量的形式（就像二维数组在内存中的真实存放方式是按行拼接在一起的一维数组一样），那么就是向量分析了。A为元素为三维向量（RGB）的N维向量（N为长宽乘积），B为元素为四维向量（RGBA）的N维向量，C为元素为三维向量的N维向量。为了方便起见，我们将三维向量RGB当作Alpha值为1的RGBA，这样ABC的形式都一样了。（为了方便，这里在讨论时将RGB的值域认为是[0,255]，而Alpha的值域认为是[0,1]）

假设abc为ABC中位置相同的三个元素，下标的RGBA分辨代表红绿蓝透明通道，根据叠加的原理，我们可以得到

<img src="http://latex.codecogs.com/gif.latex?c_A=1-(1-a_A)(1-b_A), c_R=a_Ra_A(1-b_A)+b_Rb_A" />

<img src="http://latex.codecogs.com/gif.latex?c_G" />与<img src="http://latex.codecogs.com/gif.latex?c_B" />的计算方式同<img src="http://latex.codecogs.com/gif.latex?c_R" />

将<img src="http://latex.codecogs.com/gif.latex?a_A=c_A=1" />带入上式可以得到
<img src="http://latex.codecogs.com/gif.latex?c_R=a_R(1-b_A)+b_Rb_A" />
显然叠加是毫无悬念了，但如果我们要拆分，信息是否足够？

这个式子中的已知量有目标颜色<img src="http://latex.codecogs.com/gif.latex?c_R" />，希望拆出的颜色<img src="http://latex.codecogs.com/gif.latex?a_R" />，但<img src="http://latex.codecogs.com/gif.latex?b_A, b_R" />都是未知量，它绝对没有一个唯一解。

这似乎很令人沮丧，这表示我们没有唯一的拆分方案。但是如果我们给它加一点限制呢？

#### 第一版思路

把R通道的公式变一下形

<img src="http://latex.codecogs.com/gif.latex?\begin{aligned}c_R=a_R(1-b_A)+b_Rb_A&=>c_R=a_R-a_Rb_A+b_Rb_A\\&=>c_R-a_R=b_A(b_R-a_R)\\&=>\frac{c_R-a_R}{b_R-a_R}=b_A\\&=>\frac{c_R-a_R}{b_A}+a_R=b_R\\&=>\frac{a_R-c_R}{a_R-b_R}=b_A\\&=>a_R-\frac{a_R-c_R}{b_A}=b_R\end{aligned}" />

显然，当c的某通道的值大于a的值时，b的相应通道的值越大，其Alpha值越小，透明度越高。所以如果我们总是要求b的透明度尽可能高，那么此时就应该使<img src="http://latex.codecogs.com/gif.latex?b_R" />尽可能大，比如直接设为255。当c的某通道的值小于a的值时同理，将其设为0，来试一下？

于是这个项目就这么被写出来了。不过当它把某个通道值非常极端（比如0,255这样的）的颜色当作A图的颜色进行处理时，效果很不理想，几乎纯黑也不咋样。目前看起来它只对布局画面结构简单的极端赛璐璐风格展现出相对良好的处理效果。

举例来说的话，p站id为59851275的作品的整体构图简单，阴影的边缘锐利，衣服颜色与皮肤颜色差异极大，所以就很适合进行处理，而69740563这样稍显复杂且衣服颜色过渡很柔和的就无法得到预期的效果了。

#### 第二版思路

让我们换一种思路，抛开这些公式，直观地想一下这个问题。对一个简单的变色图来说，一个简单的衣服（C图）可以由底色（A图）加阴影/高光（B图）构成。那么我们只需要从衣服区域（C图像素）里选一个不是很亮也不是很暗的中性区域的颜色当作底色（A图像素），然后将其亮度和其他区域的颜色比较，并根据比较结果将相应的区域设置为阴影/高光（B图像素）就可以了。

那么问题就又变成了“如何根据作为底色的a像素和比a亮/暗一些的c像素算出b像素的灰度与亮度”。对于灰度图，其阴影/高光的计算方式可以参考之前的色彩叠加公式$c_R=a_R(1-b_A)+b_Rb_A$，我们再次可以简单地将其RGB通道统一设为极端的0或255（取值取决于待处理像素颜色是否比底色暗/亮）然后根据公式计算出代表其强度的Alpha通道值。那么只要我们能搞明白需要把那些部分当作阴影/高光，哪些部分不应该修改就可以了！

当一个底色以某两个通道为主体时，添加阴影后的通道中这两个通道的值变化最大。另外，简单想一下，如果有一个#66ccff的颜色，将其调暗过程中，蓝>绿>红始终成立。

进一步的，我们可以把底色和C图颜色的HSB明度调到最高，得到“无阴影参考色”（相当于顺着Photoshop HSB取色器相应色相的颜色图向上到头），也可以把底色和C图颜色的HSB对比度调到最高，得到“无高光参考色”（相当于顺着Photoshop HSB取色器相应色相的颜色图向右到头）。之后只需要将“无阴影参考色距离”，“无高光参考色距离”当作距离指标，差别过大则认为待处理像素颜色不是底色加阴影后的结果，将其排除在处理范围之外即可。

根据这个规律，我们就有希望可以精准地替换红衣服的颜色而不会把人物的脸的颜色也替换掉了！

我不认为它的效果会比上一个好，但也许更不易误伤不需要变色的部分。



## 附言

顺便一提，我按照Python3，C++，Java，JavaScript的顺序用同样的算法实现了四版的程序。

处理同一张图片的用时如下：
- Python3：40+分钟
- C++：Debug版29秒，Release版2秒
- Java：28秒
- JavaScript：7秒

说实话，我以前一直以为Python3和JS速度差不多，而且都远低于Java来着……不过也可能是因为其他三版用的都是OpenCV，而JS用的是Canvas的ImageData的缘故？下次我试图写点计算量不小的玩具时也许会优先考虑JS了。