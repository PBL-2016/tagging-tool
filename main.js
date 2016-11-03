
const fs = require('fs')
const {app, dialog, Menu, BrowserWindow, ipcMain} = require('electron')

let cd = '.'
let dataLoaded = false
let forceQuit = false
let taggingWindow, imageWindow
// 現在位置に存在する画像一覧
let imageNameList = [];
// 現在開いている画像のインデックス(imageNameList)
let currentFile = 0

function createWindow () {
  taggingWindow = new BrowserWindow({width: 740, height: 970})
  imageWindow = new BrowserWindow({width: 300, height: 300, resizable: false})

  let menu = Menu.buildFromTemplate([{
      label: 'Sample',
      submenu: [
          {label: 'About App', selector: 'orderFrontStandardAboutPanel:'},
          {
              label: 'Quit and Save',
              accelerator: 'CmdOrCtrl+Q',
              click: onQuit
          }
      ]}]);
  Menu.setApplicationMenu(menu);

  taggingWindow.loadURL(`file://${__dirname}/index.html`)
  imageWindow.loadURL(`file://${__dirname}/view.html`)

  //taggingWindow.webContents.openDevTools()
  imageWindow.setMenu(null)
  //imageWindow.webContents.openDevTools()
  //imageWindow.setAlwaysOnTop(true)

  taggingWindow.on('close', onClose);
  imageWindow.on('close', onClose);

  taggingWindow.webContents.on('dom-ready', init);
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', function () {
  if (taggingWindow === null) {
    createWindow()
  }
})

function onClose(e) {
  if (!forceQuit && dataLoaded) {
    e.preventDefault();
    forceQuit = true;
    taggingWindow.webContents.send('quit-get-all-data');
  } else {
    app.quit();
  }
}

function onQuit(e) {
  if (!forceQuit && dataLoaded) {
    forceQuit = true;
    taggingWindow.webContents.send('quit-get-all-data');
  } else {
    app.quit();
  }
}

ipcMain.on('quit-return-all-data', (event, arg) => {
  console.log('saved');
  writeAllData(arg);
  app.quit();
});

// ウィンドウ生成後に呼び出される
// 画像一覧を取得しておく
function init() {
  dialog.showOpenDialog(taggingWindow, {
    title: '画像ディレクトリを選択してください',
    defaultPath: '.',
    properties: ['openDirectory']
  }, (directory) => {
    if (directory) {
      if(Array.isArray(directory)) {
        cd = directory[0];
      } else {
        cd = directory;
      }
      imageNameList = loadFileList(cd);
      if (imageNameList.length == 0) {
        console.log('There are no images.');
        app.quit();
      } else {
        let data = {};
        if (isExistFile(`${cd}/data.csv`)){
          let dataText = fs.readFileSync(`${cd}/data.csv`, 'utf-8');
          data = parseDataText(dataText);
        }
        dataLoaded = true;
        taggingWindow.webContents.send('init-data', [data, imageNameList[currentFile]]);
      }
    } else {
      app.quit();
    }
  });
}

function toHex(r, g, b){
  r = ('00'+parseInt(r).toString(16)).slice(-2);
  g = ('00'+parseInt(g).toString(16)).slice(-2);
  b = ('00'+parseInt(b).toString(16)).slice(-2);
  return '#' + r + g + b;
}

function parseDataText(text) {
  text = text.split('\n');
  let data = {};
  for (let i=0;i<text.length;i++) {
    let line = text[i].split('\t');
    for (let j=1;j<line.length;j++) {
      line[j] = parseInt(line[j]);
    }
    let otx = line.slice(11, 21).map((x) => {return x===1;});
    let itx = line.slice(27, 37).map((x) => {return x===1;});
    let btx = line.slice(43, 53).map((x) => {return x===1;});
    let name = line[0];
    data[name] = {
      rect: {sx: line[1], sy: line[2], ex: line[3], ey: line[4]},
      outerExist: line[5] === 1,
      outer: {
        glitz: line[6],
        _length: line[7],
        color: toHex(line[8], line[9], line[10]),
        texture: otx,
        pattern: line[21]
      },
      inner: {
        glitz: line[22],
        _length: line[23],
        color: toHex(line[24], line[25], line[26]),
        texture: itx,
        pattern: line[37]
      },
      bottom: {
        glitz: line[38],
        _length: line[39],
        color: toHex(line[40], line[41], line[42]),
        texture: btx,
        pattern: line[53]
      }
    }
  }
  return data;
}

function isExistFile(file) {
  try {
    fs.statSync(file);
    return true;
  } catch(err) {
    if(err.code === 'ENOENT') return false;
  }
}

// 指定位置の画像一覧を読み込んで返す関数
function loadFileList(root) {
  console.log(root);
  let fileList = fs.readdirSync(`${root}/`);
  fileList = fileList.filter((file) => {
    return fs.statSync(`${root}/${file}`).isFile() && /.*\.(png|jpg)$/.test(file); //絞り込み
  });
  return fileList;
}

function toRGB(code) {
  let r = parseInt(code.substr(1, 2), 16);
  let g = parseInt(code.substr(3, 2), 16);
  let b = parseInt(code.substr(5, 2), 16);
  return [r, g, b];
}

function formatAllData(data) {
  let out = "\
画像\t始点X\t始点Y\t終点X\t終点Y\to有無\t\
o地味派手\to丈\toR\toG\toB\to目詰\to目粗\to薄\t\
o厚\to軽\to重\to柔\to堅\toツル\toザラ\to模様\t\
i地味派手\ti丈\tiR\tiG\tiB\ti目詰\ti目粗\ti薄\t\
i厚\ti軽\ti重\ti柔\ti堅\tiツル\tiザラ\ti模様\t\
b地味派手\tb丈\tbR\tbG\tbB\tb目詰\tb目粗\tb薄\t\
b厚\tb軽\tb重\tb柔\tb堅\tbツル\tbザラ\tb模様\t\
";

  for (key in data) {
    let rect = `${data[key].rect.sx}\t${data[key].rect.sy}\t${data[key].rect.ex}\t${data[key].rect.ey}`;
    let oexist = data[key].outerExist?1:0;

    let outer = data[key].outer;
      let oclr = toRGB(outer.color).join('\t');
      let otx = outer.texture.map((b)=>{return b?1:0;}).join('\t');
      let odata = `${outer.glitz}\t${outer._length}\t${oclr}\t${otx}\t${outer.pattern}`;

    let inner = data[key].inner;
      let iclr = toRGB(outer.color).join('\t');
      let itx = inner.texture.map((b)=>{return b?1:0;}).join('\t');
      let idata = `${inner.glitz}\t${inner._length}\t${iclr}\t${itx}\t${inner.pattern}`;

    let bottom = data[key].bottom;
      let bclr = toRGB(bottom.color).join('\t');
      let btx = bottom.texture.map((b)=>{return b?1:0;}).join('\t');
      let bdata = `${bottom.glitz}\t${bottom._length}\t${bclr}\t${btx}\t${bottom.pattern}`;

    out += `\n${key}\t${rect}\t${oexist}\t${odata}\t${idata}\t${bdata}`;
  }
  return out;
}

function writeAllData(data) {
  let txt = formatAllData(data);
  fs.writeFileSync(`${cd}/data.csv`, txt);
}

ipcMain.on('save-data', (event, arg)=>{
  writeAllData(arg);
  event.returnValue = true;
});

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
  imageWindow.webContents.send('change-image', [arg[0], arg[1], cd])
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
