const electron = require('electron');
const url = require('url');
const path = require('path');

const { app, BrowserWindow } = electron;

let window;

function createWindow() {
    window = new BrowserWindow({
        nodeIntegration: true,
        contextIsolation: false,
        width: 1280,
        height: 720,
        icon: path.join(__dirname, 'icon.ico'),
    });
    window.loadFile('App/index.html');
    window.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
