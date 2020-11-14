var express = require('express')
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var cookie = require("cookie");
var cookieParser = require('cookie-parser');
var randomWords = require('random-words');

app.use(cookieParser())

// global arrays
users = [];
messageHistory = [];

// Change port here
server.listen(3000);
console.log('Server running');

// make public folder static
app.use(express.static('public'));

// random username generation
function generateUsername() {
  let string = '';
  words = randomWords(3)
  words.forEach(word => {
    string += word.replace(word[0], word[0].toUpperCase());
  });
  return string;
}

// main connection event
io.sockets.on('connection', socket => {

  // check if cookie is set and if so try and set their username
  if (socket.handshake.headers.cookie) {
    var cookief = socket.handshake.headers.cookie; 
    var cookies = cookie.parse(cookief);
    if (!cookies.username) {
      socket.username = generateUsername()
      socket.emit('cookie', 'username=' + socket.username + '; max-age=300');
    } else {
      socket.username = users.includes(cookies.username) ? generateUsername() : cookies.username;
    }
  } else {
    socket.username = generateUsername()
    socket.emit('cookie', 'username=' + socket.username + '; max-age=300');
  }

  // handle nick changing
  console.log("Chosen nick: %s", socket.username);
  socket.color = "#7b7a7f";
  users.push(socket.username);
  updateUsernames();
  socket.emit('set username', socket.username);
  socket.emit('update history', messageHistory);
  socket.emit('system message', 'green', "You are now known as <b>" + socket.username + "</b>");

  // handle disconnect
  socket.on('disconnect', data => {
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
  });

  socket.on('send message', data => {

    if (!data) return;

    // process command
    if (data.startsWith("/")) {
      
      // get command arguments
      args = data.substring(1).split(" ");
      switch (args[0]) {
        // handle changing color
        case 'color':
          if (args.length != 2) {
            socket.emit('system message', 'green', "Usage: <b>/color RRGGBB</b>")
          } else {
            color = args[1];
            if (color.length != 6) {
              socket.emit('system message', 'red', "Invalid color entered: <b>" + color + "</b>")
            } else {
              socket.color = "#" + color;
              updateColors(socket.username, color);
              io.sockets.emit('update history', messageHistory);
              socket.emit('system message', 'green', `Updated color to: <b style="color: #${color};">` + color.toUpperCase() + "</b>")
            }
          }
          return;
        // handle changing nickname
        case 'name':
          if (args.length != 2) {
            socket.emit('system message', 'green', "Usage: <b>/name (new name)</b>")
          } else {
            newName = args[1];
            if (users.includes(newName)) {
              socket.emit('system message', 'red', "Nickname <b>" + newName + "</b> already taken")
            } else {
              users.splice(users.indexOf(socket.username), 1);
              users.push(newName);
              socket.username = newName;
              updateUsernames();
              socket.emit('set username', socket.username);
              socket.emit('cookie', 'username=' + socket.username + '; max-age=300');
              socket.emit('system message', 'green', "Updated nickname to <b>" + newName + "</b>")
            }
          }
          return;
        default:
          socket.emit('system message', 'red', "Unknown command: <b>" + data + "</b>");
          return;
      }
    }

    // handle emojis
    data = data.replace(/\:\)/gi, "😁")
    data = data.replace(/\:\(/gi, "🙁")
    data = data.replace(/\:\o/gi, "😲")

    // construct message object and push event
    messageObject = {
      msg: data,
      user: socket.username,
      color: socket.color,
      time: Date.now()
    };
    console.log(messageObject);
    messageHistory.push(messageObject);
    io.sockets.emit('new message', messageObject);
    console.log(users);

  });

})

// rewrite color for all messages sent by this username
function updateColors(username, color) {
  for (let i = 0; i < messageHistory.length; i++) {
    if (messageHistory[i].user == username) {
      messageHistory[i].color = color;
    }
  }
}

// refresh user list for all sockets
function updateUsernames() {
  io.sockets.emit('get users', users);
}