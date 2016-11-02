
const {ipcRenderer} = require('electron');

// アプリケーションで入力された全てのデータを格納
window.allData = [];
// アウター存在確認チェックボックス要素
window.outerExistChkbox = null;
// アウター入力フォーム
window.outerForm = null;
// インナー入力フォーム
window.innerForm = null;
// ボトム入力フォーム
window.bottomForm = null;
// 現在タグ付け中のデータ名(画像名)
let currentDataName = '';

// RGBを16進数表記(#ffffff)に変換
function toHex(r, g, b){
  r = ('00'+parseInt(r).toString(16)).slice(-2);
  g = ('00'+parseInt(g).toString(16)).slice(-2);
  b = ('00'+parseInt(b).toString(16)).slice(-2);
  return '#' + r + g + b;
}

// currentDataNameのgetter
window.getCurrentDataName = () => {
  return currentDataName;
}

// 次の画像ボタンが押されたら発生
function loadNext(){
  // メインプロセスに次の画像名をリクエスト
  var response = ipcRenderer.sendSync('load-next');
  currentDataName = response;
  // 該当データを入力フォームに適用
  loadData(response);
  // 画像名とその領域をメインプロセスへ通達->画像ウィンドウへ
  ipcRenderer.send('change-image', [response, allData[currentDataName].rect]);
}

// 前の画像ボタンが押されたら発生
function loadPrev(){
  // メインプロセスに前の画像名をリクエスト
  var response = ipcRenderer.sendSync('load-prev');
  currentDataName = response;
  // 該当データを入力フォームに反映
  loadData(response);
  // 画像名とその領域をメインプロセスへ通達->画像ウィンドウへ
  ipcRenderer.send('change-image', [response, allData[currentDataName].rect]);
}

// 指定された画像のデータを入力フォームに反映
// データが存在しなければここで新たに作る
function loadData(imageName){
  // console.log(allData[imageName]);
  if (!allData[imageName]) {
    allData[imageName] = {
      rect: {sx: 0, sy: 0, ex: 0, ey: 0},
      outerExist: true,
      outer:{
        glitz: 0,
        _length: 1,
        color: "#ffffff",
        texture: [false, false, false, false, false, false, false, false, false, false],
        pattern: 0
      },
      inner:{
        glitz: 0,
        _length: 1,
        color: "#ffffff",
        texture: [false, false, false, false, false, false, false, false, false, false],
        pattern: 0
      },
      bottom:{
        glitz: 0,
        _length: 1,
        color: "#ffffff",
        texture: [false, false, false, false, false, false, false, false, false, false],
        pattern: 0
      }
    }
  }
  initForm(allData[imageName]);
}

// データを入力フォームに反映する関数
function initForm(data){
  outerExistChkbox.checked = !data.outerExist;

  outerForm.glitz.value = data.outer.glitz;
  outerForm._length.value = data.outer._length;
  outerForm.color.value = data.outer.color;
  outerForm.pattern.value = data.outer.pattern;
  for (let i=0;i<outerForm.texture.length;i++) {
    outerForm.texture[i].checked = data.outer.texture[i];
  }

  innerForm.glitz.value = data.inner.glitz;
  innerForm._length.value = data.inner._length;
  innerForm.color.value = data.inner.color;
  innerForm.pattern.value = data.inner.pattern;
  for (let i=0;i<innerForm.texture.length;i++) {
    innerForm.texture[i].checked = data.inner.texture[i];
  }

  bottomForm.glitz.value = data.bottom.glitz;
  bottomForm._length.value = data.bottom._length;
  bottomForm.color.value = data.bottom.color;
  bottomForm.pattern.value = data.bottom.pattern;
  for (let i=0;i<bottomForm.texture.length;i++) {
    bottomForm.texture[i].checked = data.bottom.texture[i];
  }
}

// 各入力フォームのイベントハンドラを生成する関数
function genFormChangeHandler(dataPosition, form) {
  return new Function('event', `\
  let target = event.target;\
  console.log(target);\
  switch (target.name) {\
    case 'glitz':\
      allData[getCurrentDataName()].${dataPosition}.glitz = target.value;break;\
    case '_length':\
      allData[getCurrentDataName()].${dataPosition}._length = target.value;break;\
    case 'color':\
      allData[getCurrentDataName()].${dataPosition}.color = target.value;break;\
    case 'pattern':\
      allData[getCurrentDataName()].${dataPosition}.pattern = target.value;break;\
    case 'texture':\
      let tx = [];\
      for (let i=0;i<${form}.texture.length;i++) {\
        tx[i] = ${form}.texture[i].checked;\
      }\
      allData[getCurrentDataName()].${dataPosition}.texture = tx;break;\
  }`);
}

window.onload = () => {
  // 前の画像ボタンを捕捉
  let prevButton = document.getElementById('prev-image');
  // 次の画像ボタンを捕捉
  let nextButton = document.getElementById('next-image');

  // アウター存在確認チェックボックスを捕捉
  outerExistChkbox = document.getElementById('outer-exist');

  // 各入力フォームを捕捉
  outerForm = document.forms.outer;
  innerForm = document.forms.inner;
  bottomForm = document.forms.bottom;

  // アウター存在確認チェックボックスのイベントハンドラを設定
  outerExistChkbox.onchange = () => {
    allData[getCurrentDataName()].outerExist = !outerExistChkbox.checked;
  }
  // 各入力フォームのイベントハンドラを設定
  outerForm.onchange = genFormChangeHandler('outer', 'outerForm');
  innerForm.onchange = genFormChangeHandler('inner', 'innerForm');
  bottomForm.onchange = genFormChangeHandler('bottom', 'bottomForm');

  // 前・次の画像ボタンのイベントハンドラを設定
  prevButton.onclick = loadPrev;
  nextButton.onclick = loadNext;

  // 各スポイトボタンのイベントハンドラを設定
  outerForm.spuit.onclick = () => {
    ipcRenderer.send('spuit-outer');
  }
  innerForm.spuit.onclick = () => {
    ipcRenderer.send('spuit-inner');
  }
  bottomForm.spuit.onclick = () => {
    ipcRenderer.send('spuit-bottom');
  }

  // 各部分の色が通達されたら発生
  // 該当するフォームに色情報を16進数表記で反映
  ipcRenderer.on('outer-color', (event, arg) => {
    outerForm.color.value = toHex(arg[0], arg[1], arg[2]);
    allData[getCurrentDataName()].outer.color = outerForm.color.value;
  })
  ipcRenderer.on('inner-color', (event, arg) => {
    innerForm.color.value = toHex(arg[0], arg[1], arg[2]);
    allData[getCurrentDataName()].inner.color = innerForm.color.value;
  })
  ipcRenderer.on('bottom-color', (event, arg) => {
    bottomForm.color.value = toHex(arg[0], arg[1], arg[2]);
    allData[getCurrentDataName()].bottom.color = bottomForm.color.value;
  })
  // 領域選択が通達されたら発生
  // 領域情報をデータに格納
  ipcRenderer.on('region-rect', (event, arg) => {
    allData[getCurrentDataName()].rect = arg;
  })
}
