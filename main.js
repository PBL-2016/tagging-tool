
const fs = require('fs')
const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain

let taggingWindow, imageWindow
// 現在位置に存在する画像一覧
let imageNameList = [];
// 現在開いている画像のインデックス(imageNameList)
let currentFile = 0

function createWindow () {
  taggingWindow = new BrowserWindow({width: 530, height: 800})
  imageWindow = new BrowserWindow({width: 300, height: 300, resizable: false})

  taggingWindow.loadURL(`file://${__dirname}/index.html`)
  imageWindow.loadURL(`file://${__dirname}/view.html`)

  taggingWindow.webContents.openDevTools()
  imageWindow.setMenu(null)
  imageWindow.webContents.openDevTools()
  imageWindow.setAlwaysOnTop(true)

  taggingWindow.on('closed', function () {
    app.quit()
  })
  imageWindow.on('closed', function () {
    app.quit()
  })

  init()
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (taggingWindow === null) {
    createWindow()
  }
})

// ウィンドウ生成後に呼び出される
// 画像一覧を取得しておく
function init() {
  imageNameList = loadFileList();
}

// 現在位置の画像一覧を読み込んで返す関数
function loadFileList() {
  let fileList = [];
  fs.readdir('.', function(err, files){
    if (err) throw err;
    files.filter(function(file){
        return fs.statSync(file).isFile() && /.*\.(png|jpg)$/.test(file); //絞り込み
    }).forEach(function (file) {
        fileList.push(file);
    });
    console.log(fileList);
  });
  return fileList;
}

// 前の画像を読み込むことが通達されたら発生
// 1つ前のインデックスの画像名を返す
ipcMain.on('load-prev', (event, arg)=>{
  currentFile--;
  if (currentFile < 0) currentFile = imageNameList.length-1;
  event.returnValue = imageNameList[currentFile];
});

// 次の画像を読み込むことが通達されたら発生
// 1つ後のインデックスの画像名を返す
ipcMain.on('load-next', (event, arg)=>{
  currentFile++;
  if (currentFile >= imageNameList.length) currentFile = 0;
  event.returnValue = imageNameList[currentFile];
});

// 画像変更が通達されたら発生
// タギングウィンドウから画像名と領域を通達される
// 画像ウィンドウへそのまま横流し
ipcMain.on('change-image', (event, arg) => {
  imageWindow.webContents.send('change-image', arg)
});

// 各スポイトイベントが通達されたら発生
// 画像ウィンドウへスポイトモードへ切り替えることを通達
ipcMain.on('spuit-outer', (event, arg) => {
  imageWindow.webContents.send('spuit-outer', arg)
})
ipcMain.on('spuit-inner', (event, arg) => {
  imageWindow.webContents.send('spuit-inner', arg)
})
ipcMain.on('spuit-bottom', (event, arg) => {
  imageWindow.webContents.send('spuit-bottom', arg)
})

// 各スポイトで取得した色が通達されたら発生
// タギングウィンドウへ色情報を横流し
ipcMain.on('outer-color', (event, arg) => {
  taggingWindow.webContents.send('outer-color', arg)
})
ipcMain.on('inner-color', (event, arg) => {
  taggingWindow.webContents.send('inner-color', arg)
})
ipcMain.on('bottom-color', (event, arg) => {
  taggingWindow.webContents.send('bottom-color', arg)
})

// 領域選択が通達されたら発生
// タギングウィンドウへ領域を横流し
ipcMain.on('region-selected', (event, arg) => {
  taggingWindow.webContents.send('region-rect', arg)
})
