var socket = io.connect();
var messageForm = $('#messageForm');
var message = $('#message');
var chat = $('#chat');
var users = $('#users');

// local username
var chosenUsername;

// handle new message submitted via form
messageForm.submit(function(e) {
    e.preventDefault();
    msg = message.val();
    socket.emit('send message', msg);
    message.val('');
});

// on message receive
socket.on('new message', (data) => {
    appendMessage(data);
});

// handle appending new message, if we are the sender then we re-style the element, otherwise we handle as normal
function appendMessage(data) {
    humanTime = convertTime(data.time);
    if (data.user == chosenUsername) {
        formattedColor = data.color != "#7b7a7f" ? data.color : "#fff"
        var string = `<div class="flex justify-end">
                <div class="bg-blue-400 text-white p-4 mt-4 w-3/4 rounded-xl border-2 border-blue-500 shadow-lg">
                    <p class="font-bold pr-1" style="color: ${formattedColor};">${chosenUsername}</p>
                    <div class="flex justify-between items-end">
                        <p>${data.msg}</p>
                        <p class="font-thin text-right text-white">${humanTime}</p>
                    </div>
                </div>
            </div>`
    } else {
        var string = `
        <div class="bg-white text-gray-700 p-4 mt-4 w-3/4 rounded-xl border-2 shadow-lg">
            <p class="font-bold pr-1" style="color: ${data.color};">${data.user}</p>
            <div class="flex justify-between">
                <p>${data.msg}</p>
                <p class="font-thin text-right text-gray-500">${humanTime}</p>
            </div>
        </div>`
    }
    chat.append(string); // add this message to the chat div
    chat.scrollTop($('#chat')[0].scrollHeight); // scroll to bottom
}

// update member list
socket.on('get users', function(data){
    var html = '';
    data.forEach(member => {
        html += `<p class="text-white opacity-50 text-sm">${member}</p>`
    });
    users.html(html);
});

// tell the client to update his cookie if this event is fired
socket.on('cookie', function(cookie) {
    document.cookie = cookie;
});

// tell this client to update his local username if this event is fired
socket.on('set username', (username) => {
    chosenUsername = username;
});

// handle incoming system messages
socket.on('system message', (msg) => {
    var string = `<div class="flex">
                <div class="bg-green-400 text-white p-4 mt-4 w-3/4 rounded-xl border-2 border-green-500 shadow-lg">
                    <p class="font-bold pr-1">System</p>
                    <div class="flex justify-between items-end">
                        <p>${msg}</p>
                    </div>
                </div>
            </div>`
    chat.append(string);
    chat.scrollTop($('#chat')[0].scrollHeight);
});

// this event will be fired on new connect
socket.on('update history', function(data) {
    chat.empty();
    data.forEach(msg => {
        appendMessage(msg);
    });
});

// for converting unix timestamp to human readable time
// credit: https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
function convertTime(timestamp) {
    var date = new Date(timestamp);
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    return hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}