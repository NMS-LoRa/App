const { remote, ipcRenderer } = require('electron');
const fs = require('fs');
const Menu = require('./renderer/menu').createMenu(remote, ipcRenderer);
const plot = require('./renderer/plot');

document.querySelector('#btnSend').addEventListener('click', onClick);
document.querySelector('#euiList').addEventListener('change', onChange);

line = null;
hist = null;
var isSending = false;
var logger;

init();

function init() {
	line = plot.create('line');
	div = document.createElement('div');
	div.classList.add('chart-container');
	div.appendChild(line.canvas);
	document.querySelector('.container').appendChild(div);

	hist = plot.create('hist');
	canvas = document.createElement('canvas');
	div = document.createElement('div');
	div.classList.add('chart-container');
	div.appendChild(hist.canvas);
	document.querySelector('.container').appendChild(div);
	
	ipcRenderer.send('eui', 'request');
}

// ipc handler
ipcRenderer.on('eui', (event, eui) => {
	select = document.querySelector('#euiList');
	item = document.createElement('option');
	item.setAttribute('value', eui);
	item.appendChild(document.createTextNode(eui));
	select.appendChild(item);
	onChange();
})

ipcRenderer.on('status', (event, status) => {
	label = document.getElementById('status');
	val = (status == 'true') ? "연결됨" : "연결안됨";
	label.innerHTML = val;
})

ipcRenderer.on('gsr', (event, transcript) => {
	log(transcript);
	if(transcript == '전송') document.querySelector('#btnSend').click();
})

ipcRenderer.on('txdone', () => {
	line.rssi.ns += 1;
	document.getElementById('st_recv1').innerHTML = `(${line.rssi.nr} / ${line.rssi.ns})`;
	if(isSending == false) {
		document.getElementById('count').val = 100;
		return;	
	}
	count = document.getElementById('count');
	count.value = count.value - 1;
	if(count.value > 0) {
		ipcRenderer.send('message', 'send');
		return;
	}
	isSending = false;
	document.getElementById('count').val = 100;
	document.querySelector('#btnSend').innerHTML = "전송";
	logger.write('\n');
	logger.close();
	ipcRenderer.send('done', hist.rssi);
})

ipcRenderer.on('rssi', (event, rssi) => {
	document.getElementById('pdr').innerHTML = (line.rssi.nr/line.rssi.ns).toFixed(2);
	
	logger.write(`${rssi}\t`);

	line.add('', rssi);
	hist.add('', rssi);

	document.getElementById('st_mean1').innerHTML = line.rssi.mean.toFixed(2);
	document.getElementById('st_std1').innerHTML = line.rssi.std.toFixed(2);
	document.getElementById('st_max1').innerHTML = line.rssi.max.toFixed(2);
	document.getElementById('st_min1').innerHTML = line.rssi.min.toFixed(2);

	document.getElementById('st_mean2').innerHTML = hist.rssi.mean.toFixed(2);
	document.getElementById('st_std2').innerHTML = hist.rssi.std.toFixed(2);
	document.getElementById('st_max2').innerHTML = hist.rssi.max.toFixed(2);
	document.getElementById('st_min2').innerHTML = hist.rssi.min.toFixed(2);	
})

function ipcSend(str) {
	ipcRenderer.send('message', str); 
}

// html components event handler
function onClick() {
	var x = document.getElementById('count').value;
	if(x <= 0) return 0;
	if(isSending == false) {
		logger = fs.createWriteStream(`rssi.csv`, {flags: 'a'});
		logger.write(`${new Date().getTime()}\t`);
		setTimeout(ipcSend, 0, `power=${document.getElementById('power').value}`);
		setTimeout(ipcSend, 150, `datarate=${document.getElementById('datarate').value}`);
		setTimeout(ipcSend, 300, `length=${document.getElementById('length').value}`);
		setTimeout(ipcSend, 450, 'send');	
		isSending = true;
		document.getElementById('count');
		document.querySelector('#btnSend').innerHTML = "정지";
	} else {
		isSending = false;
		document.getElementById('count').value = 100;
		document.querySelector('#btnSend').innerHTML = "전송";
	}
}

function onChange() {
	select = document.querySelector('#euiList');
	ipcRenderer.send('topic', select.value);
}
function log(str) {
	ipcRenderer.send('debug', str);
}

