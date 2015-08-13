'use strict';

var previousDate,
    binaryClient = new BinaryClient('ws://localhost:9000'),
    currentDate = new Date(),
    //imageData,
    xmlhttp = new XMLHttpRequest(),
    logit = document.getElementById('logit'),
    snapit = document.getElementById('snapit'),
    cancel = document.getElementById('cancel'),
    upload = document.getElementById('upload'),
    endlog = document.getElementById('endlog'),
    picker = document.getElementById('picker'),
    preview = document.getElementById('preview'),
    newtimelog = document.getElementById('newtimelog'),
    newlogmodal = document.getElementById('newlogmodal'),
    timeloglist = document.getElementById('timeloglist'),
    video = document.querySelector('#webc'),
    senderEl = document.getElementById('sender'),
    list = document.createElement('li'),
    localStream,
    gifSupport = gifshot.isWebCamGIFSupported(),
    logitem = '<div class="time">{{time}}</div><hr>' +
        '<div class="selfie"><img id="img" class="camera" src="{{url}}"></div>',
    monthNames = ['January', 'February', 'March',
        'April', 'May', 'June', 'July',
        'August', 'September', 'October',
        'November', 'December'],

audioContext = window.AudioContext || window.webkitAudioContext, webcam = {},
    context = new audioContext(), sampleRate, volume, audioInput, recorder, recordingLength = 0,recording,
    audioStack = [], nextTime = 0, recorded = false, leftchannel = [], rightchannel = [], init = 0,
    receiverEl = document.createElement('canvas'),
     receiverContext = receiverEl.getContext('2d'),
     receiverDataLength = 200 * 160 * 4,
     receiverPos = 0,
     imageFrame = receiverContext.getImageData(0, 0, 200, 160);

navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia;

logit.onclick = logIt;
snapit.onclick = snapIt;
cancel.onclick = cancelIt;
newtimelog.onclick = newTimeLog;

xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        var logs = JSON.parse(xmlhttp.responseText), l;
        if (logs.length > 0) {
            logs.reverse();
            for (l = 0; l < logs.length; l++) {
                addLog(logs[l].timelog, logs[l].url);
            }
            endlog.innerText = 'end of log';
        } else {
            endlog.innerText = 'no logs';
        }
    }
};

function getLogDate() {
    var selectedDate = new Date(picker.value);
    return selectedDate.getFullYear() +
        '.' + selectedDate.getMonth() +
        '.' + selectedDate.getDate();
}

function addLog(time, url) {
    var newitem = document.createElement('li');
    newitem.innerHTML = logitem.replace('{{time}}', time).replace('{{url}}', url);
    timeloglist.appendChild(newitem);
    timeloglist.insertBefore(newitem, timeloglist.firstChild);
}

function listLogs() {
    endlog.innerText = '';
    timeloglist.innerHTML = '';
    xmlhttp.open('GET', '/selfie/logs?datelog=' + getLogDate(), true);
    xmlhttp.send();
}

function logIt() {
    logit.style.display = 'none';
    cancel.style.display = 'none';
    upload.innerText = 'Uploading...';
    Webcam.snap(function (dataUri) {
        if (gifSupport) {
            dataUri = preview.src;
        }
        Webcam.upload(dataUri, '/selfie/upload', function (code, text) {
            var response = JSON.parse(text);
            if (response.success) {
                newlogmodal.style.display = 'none';
                endlog.innerText = 'end of log';
                Webcam.reset();
                addLog(response.timelog, response.url);
            } else {
                upload.innerText = 'Upload error';
                cancel.style.display = 'inline-block';
                logit.style.display = 'inline-block';
            }
        });
    });
}

function snapIt() {
    snapit.style.display = 'none';
    if (gifSupport) {
        gifshot.createGIF({
            gifWidth: 320,
            gifHeight: 240,
            video: document.querySelector('video').src,
            keepCameraOn: true,
            interval: 0.1,
            numFrames: 15,
            progressCallback: function (progress) {
                upload.innerText = 'Recording ' + Math.round(progress * 100) + '%';
            }
        }, function (obj) {
            if (obj.error) {
                upload.innerText = 'Recording failed';
                snapit.style.display = 'inline-block';
            } else {
                upload.innerText = '';
                logit.style.display = 'inline-block';
                preview.style.visibility = 'visible';
                preview.src = obj.image;
            }
        });
    } else {
        Webcam.freeze();
    }
    console.log(document.querySelector('video'));
}

function cancelIt() {

    if (snapit.style.display === 'inline-block') {
        newlogmodal.style.display = 'none';
        video.pause();
        localStream.stop();
        recording = false;
        binaryClient.send('', JSON.stringify({action: "disconnect"}));
    } else {
        preview.style.visibility = 'hidden';
        snapit.style.display = 'inline-block';
        logit.style.display = 'none';
    }
    upload.innerText = '';
}

function playByteArray(arrayBuffer) {
    context.decodeAudioData(arrayBuffer, function(buffer) {
        audioStack.push(buffer);
        if((init != 0 || (audioStack.length > 10))) {
            init++;
            scheduleBuffers();
        }
    });
}

function scheduleBuffers() {
    while (audioStack.length) {
        //console.log("scheduling...");
        var buffer = audioStack.shift();
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        if (nextTime == 0 || (nextTime + source.buffer.duration) < context.currentTime)
            nextTime = context.currentTime + 0.05;  /// add 50ms latency to work well across systems - tune this if you like
        source.start(nextTime);
        nextTime += source.buffer.duration; // Make the next buffer wait the length of the last buffer before being played
    };
}

function newTimeLog() {

    preview.style.visibility = 'hidden';
    snapit.style.display = 'inline-block';
    logit.style.display = 'none';
    upload.innerText = '';
    cancel.style.display = 'inline-block';
    newlogmodal.style.display = 'table-cell';

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true, video: true}, success,onVideoFail);
    }
    else {
        alert ('failed');
    }
}

function grabLoop(){

    var senderContext = senderEl.getContext('2d');
    try {
        senderContext.drawImage(video, 0, 0, 200, 160);
    } catch (e) {}

     var imageData = senderContext.getImageData(0, 0, 200, 160);
    if (typeof stream !== 'undefined') {
        stream.write(imageData.data);
    }
    setTimeout(grabLoop, 50);
    binaryClient.send(imageData.data, JSON.stringify({action: "sendVideo"}));
}

function onVideoFail(e) {
    console.log('webcam fail!', e);
};

function success(stream) {
    //var video = document.createElement('video');
    //video.class = 'camera';
    //video.style.cssText = 'width: 640px; height: 480px; transform-origin: 0px 0px 0px; transform: scaleX(0.5) scaleY(0.5);';
    webcam['stream'] = stream;
    webcam['video'] = document.querySelector("#webcam").appendChild(video);
    video.src =  window.URL.createObjectURL(stream) || window.webkitURL.createObjectURL(stream);
    localStream = stream;
    video.muted = true;
    //video.play();

    sampleRate = context.sampleRate;
    volume = context.createGain();
    audioInput = context.createMediaStreamSource(stream);
    audioInput.connect(volume);
    var bufferSize = 2048;
    recorder = context.createScriptProcessor(bufferSize, 2, 2);
    recording = true;
    recorder.onaudioprocess = function(stream){
        //if (recording) {
        var left = stream.inputBuffer.getChannelData(0);
        var right = stream.inputBuffer.getChannelData(1);
        leftchannel.push(new Float32Array(left));
        rightchannel.push(new Float32Array(right));
        recordingLength += bufferSize;
        decodeToPlay();
        leftchannel.length = rightchannel.length = 0;
        recordingLength = 0;
        //}
    }
    volume.connect (recorder);
    recorder.connect (context.destination);
    setTimeout(grabLoop(), 50);


}

function decodeToPlay() {
    var leftBuffer = mergeBuffers ( leftchannel, recordingLength );
    var rightBuffer = mergeBuffers ( rightchannel, recordingLength );
    var interleaved = interleave ( leftBuffer, rightBuffer );
    var buffer = new ArrayBuffer(44 + interleaved.length * 2);
    var view = new DataView(buffer);
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 44 + interleaved.length * 2, true);
    writeUTFBytes(view, 8, 'WAVE');
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, interleaved.length * 2, true);
    var lng = interleaved.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < lng; i++){
        view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
        index += 2;
    }
    //var uint8Array  = new Uint8Array([view, imageData.data]);
    //var arrayBuffer = uint8Array.buffer;
    //var blob        = new Blob([arrayBuffer]);

    var blob = new Blob ( [ view ], { type : 'audio/wav' });
    binaryClient.send(blob, JSON.stringify({action: "sendAudio"}));
}

function writeUTFBytes(view, offset, string){
    var lng = string.length;
    for (var i = 0; i < lng; i++){
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function mergeBuffers(channelBuffer, recordingLength){
    var result = new Float32Array(recordingLength);
    var offset = 0;
    var lng = channelBuffer.length;
    for (var i = 0; i < lng; i++){
        var buffer = channelBuffer[i];
        result.set(buffer, offset);
        offset += buffer.length;
    }
    return result;
}


function interleave(leftChannel, rightChannel){
    var length = leftChannel.length + rightChannel.length;
    var result = new Float32Array(length);
    var inputIndex = 0;
    for (var index = 0; index < length; ){
        result[index++] = leftChannel[inputIndex];
        result[index++] = rightChannel[inputIndex];
        inputIndex++;
    }
    return result;
}


window.onload = function () {
    picker.value = monthNames[currentDate.getMonth()] +
        ' ' + currentDate.getDate() +
        ', ' + currentDate.getFullYear();
    previousDate = picker.value;
};

window.onsubmit = function () {
    return false;
};

picker.onblur = function () {
    if (picker.value !== previousDate) {
        previousDate = picker.value;
        listLogs();
    }
};

datepickr(picker);

function listImage(dataArr) {

        for (var i = 0, len = dataArr.length; i < len; i++) {
            imageFrame.data[receiverPos] = dataArr[i];
            receiverPos++;
            if (receiverPos % receiverDataLength === 0) {
                receiverPos = 0;
                receiverContext.putImageData(imageFrame, 0, 0);
                imageFrame.data[receiverPos] = dataArr[i]
            }
        }
        //document.body.appendChild(receiverEl);
        //list.innerHTML = '<div class="time">Live</div><hr><div class="selfie">' + document.body.appendChild(receiverEl) + '</div>';
        timeloglist.appendChild(receiverEl);
        timeloglist.insertBefore(receiverEl, timeloglist.firstChild);
    //list.innerHTML = logitem.replace
    //receiverEl.style.cssText = 'position:absolute;top:0; left:0;width:100px; height:100px;';

}

binaryClient.on('open', function (s) {
    binaryClient.send("New connection", JSON.stringify({action: "connect"}));
});

binaryClient.on('stream', function (stream, meta) {
    console.log(meta);
    var received = JSON.parse(meta);
    stream.on('data', function(data) {
        if(received.action) {
            if(received.action === 'connect') {
                if(received.id) {
                    console.log("Client " + received.id + " connected.");
                    var dataArr = new Uint8Array(data);
                }
            } else if(received.action === 'disconnect') {
                if(received.id) {
                    console.log("Client " + received.id + " disconnected.");
                    document.location.reload(true);
                }
            } else if(received.action === 'sendAudio') {
                var dataArr = new Uint8Array(data);
                if(received.id) {
                    if (!recorded) {
                        console.log("Client " + received.id + " is recording.");
                        recorded = true;
                    }
                    playByteArray(data);
                }
            } else if(received.action === 'sendVideo') {
                var dataArr = new Uint8Array(data);
                listImage(dataArr);

            }
        }
    });
});
