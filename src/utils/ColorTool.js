let getMaxChannel = (rgb, withIndex = false) => {
    let indexOfMax = 0;

    rgb = rgb.slice(0, 3);

    let max = rgb.reduce((acc, current, i) =>
      current > acc ? ((indexOfMax = i), current) : acc
    );
    return withIndex ? [indexOfMax, max] : max;
  };

  let getMinChannel = (rgb, withIndex = false) => {
    let indexOfMin = 0;

    rgb = rgb.slice(0, 3);

    let min = rgb.reduce((acc, current, i) =>
      current < acc ? ((indexOfMin = i), current) : acc
    );
    return withIndex ? [indexOfMin, min] : min;
  };

  let calcReferenceColorWithoutShadow = (rgb) => {
    // rgb(105,140,224)=>rgb(120,159,255)
    // 105*255/224 = 120
    // 140*255/224 = 159
    // 224*255/224 = 255
    let res = [0, 0, 0];

    let maxChannelValue = getMaxChannel(rgb);
    for (let i = 0; i < 3; i++) {
      res[i] = Math.round((rgb[i] * 255) / maxChannelValue);
    }
    return res;
  };

  let calcReferenceColorWithoutHighlight = (rgb) => {
    // rgb(105,140,224)=>rgb(0,66,224)
    // 224-105=119
    // 224-140=84
    // 224-119/119*224=0
    // 224-84/119*224=66
    let res = [0, 0, 0];

    let minChannelValue = getMinChannel(rgb);
    let maxChannelValue = getMaxChannel(rgb);
    let tmp = maxChannelValue - minChannelValue;
    for (let i = 0; i < 3; i++) {
      res[i] = Math.round(
        maxChannelValue -
          ((maxChannelValue - rgb[i]) * maxChannelValue) / tmp
      );
    }
    return res;
  };

  let calcBrightness = (rgb) => {
    return rgb[0] ** 2 + rgb[1] ** 2 + rgb[2] ** 2;
  };

  let calcDistance = (rgb0, rgb1) => {
    return (
      (rgb0[0] - rgb1[0]) ** 2 +
      (rgb0[1] - rgb1[1]) ** 2 +
      (rgb0[2] - rgb1[2]) ** 2
    );
  };

  let validateIfDoChange = (
    backgroundRgbWithoutShadow,
    backgroundRgbWithoutHighlight,
    inputRgbWithoutShadow,
    inputRgbWithoutHighlight
  ) => {
    let withoutShadowDistance = calcDistance(
      backgroundRgbWithoutShadow,
      inputRgbWithoutShadow
    );
    let withoutHighlightDistance = calcDistance(
      backgroundRgbWithoutHighlight,
      inputRgbWithoutHighlight
    );
    // console.log(withoutShadowDistance+", "+withoutHighlightDistance)
    return withoutShadowDistance < 6000 && withoutHighlightDistance < 3000;
  };

  export default({
    getMaxChannel:getMaxChannel,
    getMinChannel:getMinChannel,
    calcReferenceColorWithoutShadow:calcReferenceColorWithoutShadow,
    calcReferenceColorWithoutHighlight:calcReferenceColorWithoutHighlight,
    calcBrightness:calcBrightness,
    calcDistance:calcDistance,
    validateIfDoChange:validateIfDoChange
  })