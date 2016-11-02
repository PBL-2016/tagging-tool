
const {ipcRenderer} = require('electron')

// キャンバスとコンテキスト
let viewCanvas, ctx
// 画像が読み込まれたかどうか
let loaded = false
// 領域選択中の矩形
let rect = {sx: 0, sy: 0, ex: 0, ey: 0}
// 最後に選択された矩形
let lastRect = {sx: 0, sy: 0, ex: 0, ey: 0}
// 現在の画像
let image
// 領域選択中、マウスが押されているかどうか
let isMouseDown = false
// スポイトで取得した色を返す場所(inner-color, outer-color, bottom-color)
let returnInstruction = null

window.onload = () => {
  // キャンバスとコンテキストの捕捉
  viewCanvas = document.getElementById('view')
  ctx = viewCanvas.getContext('2d')

  // 領域選択モードに切り替える
  changeRegionSelectMove()
}

// 画像再描画関数
function redrawImage() {
  ctx.clearRect(0, 0, viewCanvas.width, viewCanvas.height)
  ctx.drawImage(image, 0, 0)
}

// 画像変更イベントが通達された時に発生
// 渡された画像名から画像を生成してキャンバスに描画
// 最後に選択された領域も描画
ipcRenderer.on('change-image', (event, arg) => {
  image = new Image()
  image.src = arg[0]
  image.onload = () => {
    viewCanvas.width = image.width
    viewCanvas.height = image.height
    window.resizeTo(viewCanvas.width+8, viewCanvas.height+8)
    redrawImage()
    lastRect = arg[1]
    drawRegion(lastRect)
    loaded = true
  }
})

// 色を返す場所を指定し、スポイトモードへ移行
ipcRenderer.on('spuit-outer', (event, arg) => {
  returnInstruction = 'outer-color'
  changeSpuitMode()
})
ipcRenderer.on('spuit-inner', (event, arg) => {
  returnInstruction = 'inner-color'
  changeSpuitMode()
})
ipcRenderer.on('spuit-bottom', (event, arg) => {
  returnInstruction = 'bottom-color'
  changeSpuitMode()
})

// スポイトモード時にクリックされたら発生
function spuitPick(event) {
  // マウス座標のピクセル色を取得
  data = ctx.getImageData(event.clientX, event.clientY, 1, 1).data
  // 色を返す場所が指定されている場合はメインプロセスに通達
  if (returnInstruction) {
    ipcRenderer.send(returnInstruction, [data[0], data[1], data[2]])
    returnInstruction = null
  } else {
    // 色を返す場所が指定されていない場合はエラー
    // 起こらないはずなので、これが表示されるのはバグ
    alert("error: returnInstruction is null")
  }
  // 領域選択モードに戻す
  changeRegionSelectMove()
}

// スポイトモード時にマウスが移動されたら発生
function spuitMove(event) {
  // マウス座標のピクセル色を取得
  data = ctx.getImageData(event.clientX, event.clientY, 1, 1).data
  // 現在の色のプレビューをキャンバス枠に表示
  viewCanvas.style.borderColor = `rgb(${data[0]}, ${data[1]}, ${data[2]})`
}

// 領域選択モード時にクリックされたら発生
// 始点を格納・描画する
function regionSelectStart(event) {
  isMouseDown = true
  redrawImage()
  rect.sx = event.clientX
  rect.sy = event.clientY
  ctx.fillStyle = 'rgb(200, 0, 200)'
  ctx.fillRect(rect.sx, rect.sy, 8, 8)
}

// 領域選択モード時にマウスが移動されたら発生
// マウスがクリックされた状態でのみ動作
// 領域選択プレビューを描画
function regionSelectMove(event) {
  if (isMouseDown) {
    redrawImage()
    rect.ex = event.clientX
    rect.ey = event.clientY
    w = rect.ex - rect.sx
    h = rect.ey - rect.sy
    ctx.strokeStyle = 'rgb(200, 0, 200)'
    ctx.strokeRect(rect.sx, rect.sy, w, h)
  }
}

// 領域選択モード時にマウスが離されたら発生
// 領域サイズを判定し、OKならば格納・描画を行う
function regionSelectEnd(event) {
  if (isMouseDown) {
    isMouseDown = false
    redrawImage()
    rect.ex = event.clientX
    rect.ey = event.clientY
    w = rect.ex - rect.sx
    h = rect.ey - rect.sy
    ctx.strokeStyle = 'rgb(0, 200, 0)'
    // 領域幅・高さが16px未満だったら適用しない
    if (Math.abs(w) < 16 || Math.abs(h) < 16) {
      ctx.strokeRect(lastRect.sx, lastRect.sy, lastRect.ex - lastRect.sx, lastRect.ey - lastRect.sy)
    } else {
      ctx.strokeRect(rect.sx, rect.sy, w, h)
      // sx < ex, sy < ey となるようにスワップ
      if (rect.sx > rect.ex) rect.sx = [rect.ex, rect.ex = rect.sx][0]
      if (rect.sy > rect.ey) rect.sy = [rect.ey, rect.ey = rect.sy][0]
      // 最後に適用された領域を保存
      lastRect = rect;
      // メインプロセスに領域が選択されたことを通達
      ipcRenderer.send('region-selected', lastRect);
    }
  }
}

// 領域サイズが16px以上であれば描画する関数
function drawRegion(rect) {
  w = rect.ex - rect.sx
  h = rect.ey - rect.sy
  ctx.strokeStyle = 'rgb(0, 200, 0)'
  if (Math.abs(w) >= 16 || Math.abs(h) >= 16) {
    ctx.strokeRect(rect.sx, rect.sy, rect.ex - rect.sx, rect.ey - rect.sy)
  }
}

// スポイトモードへ移行する関数
function changeSpuitMode() {
  window.onmousedown = spuitPick
  window.onmousemove = spuitMove
  document.title = "スポイトモード"
}

// 領域選択モードへ移行する関数
function changeRegionSelectMove() {
  window.onmousedown = regionSelectStart
  window.onmousemove = regionSelectMove
  window.onmouseup = regionSelectEnd
  document.title = "領域選択モード"
}
