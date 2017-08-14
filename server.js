// Setup basic express server
var express = require('express');
var logger = require('morgan');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

app.use(logger('dev'));

//for redis
var redis = require('redis');
// redis配置参数  
var redis_config = {  
   "host": "192.168.10.29",  
    // "host": "127.0.0.1",  
    "port": 6379  
};  

//listname

var redisClient = redis.createClient(redis_config);
// redis 链接错误
redisClient.on("error", function(error) {
    console.log("redisClient Err:" + error);
});

redisClient.on('ready',function(res){
    console.log('redis ready!');    
});

// redis 验证 (reids.conf未开启验证，此项可不需要)
//redisClient.auth("foobared");

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;


io.on('connection', function (socket) {
  var addedUser = false;

  var userUrl = socket.request.headers.referer;
  console.log('connection userURL:' , userUrl);
  
  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  //redis事件
  socket.on('saveTask', function (taskList) {

    //zt 0724
    console.log('socket.on(saveTask):' + socket.classroom);
    redisClient.lpush(socket.classroom , taskList);
  });

  //发送画笔事件
//  socket.on('drawing', (data) => socket.broadcast.to(socket.classroom).emit('drawing', data));
  socket.on('drawing', (data) => io.sockets.in(socket.classroom).emit('drawing', data));

  //loadimage
  socket.on('loadimage', function(data) {

    console.log('loadImage socket.on:' + data.oClassroom);
    io.sockets.in(data.oClassroom).emit('loadimage', data);
  });
  socket.on('clean',     (data) => io.sockets.in(data.oClassroom).emit('clean', data.oURL));

  //for videoJS
  socket.on('videoPlay',  (data) => io.sockets.in(data.oClassroom).emit('videoPlay', data.oURL));
  socket.on('videoChangeTime',  (data) => io.sockets.in(data.oClassroom).emit('videoChangeTime', data.oURL));

  socket.on('videoEvent', function(data) {

    console.log('videoEvent changeTime:' + data.oCurrentTime);
    var oClassKey = data.oClassroom +  '_resourceID';

    redisClient.set(oClassKey, data.oCurrentTime, function (err, response) {
      if (err) {
        console.log("err:", err);
      } else {
        console.log(response);
        redisClient.get(oClassKey, function (err, res) {
          if (err) {
            console.log("err:", err);
          } else {
            console.log(res);
    //        redisClient.end();
          }
        });
      }
    });
 //   io.sockets.in(data.oClassroom).emit('loadimage', data);
 //   io.sockets.in(data.oClassroom).emit('videoPlay', data.oURL);
  });

  //item Vector事件
  //socket.on('drag', (data) => socket.broadcast.emit('drag', data));
  socket.on('drag', function (data) {

//    io.sockets.emit('drag', data);
//    socket.broadcast.to(socket.classroom).emit('drag', data);
    io.sockets.in(socket.classroom).emit('drag', data);
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username, oclassroom) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    socket.classroom = oclassroom;
    addedUser = true;
    ++numUsers;
        
    socket.join(oclassroom);
    console.log('add user in classID:' , oclassroom);
    
    // socket.leave(oclassroom);


    socket.emit('login', {
      numUsers: numUsers,
      oClassroom:oclassroom
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(oclassroom).emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
    
    //get redis taskLIst
    redisClient.lrange(oclassroom, 0, -1, function (error, res) {
      if (error) {
        console.log("lrangeError:" + error);
      } else {
        //console.log(res);
        socket.emit("getTaskManager", res);
      }
    });

    //get videoPlayer 
    redisClient.get("01_resourceID", function (err, res) {
          if (err) {
            console.log("err:", err);
          } else {
            console.log("login video:" ,res);
            socket.emit("initVideoPlayer", res);
            
          }
    });

  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;
  
      socket.leave(socket.classroom);

      // echo globally that this client has left
      socket.broadcast.to(socket.classroom).emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
  
  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.classroom).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.classroom).emit('stop typing', {
      username: socket.username
    });
  });

  //for together event
  socket.on('app.draw', function (oData) {

    //获取用户名和班级名，在测试阶段，唯一标示以班级ID
    var oName = socket.username;
    var oRoom = socket.classroom;

    console.log("catch app.draw");
   // socket.emit("app.draw", oData);
    socket.broadcast.to(oRoom).emit("app.draw", oData);
//    socket.broadcast.emit("app.draw", oData);
    
    //存储与分发

  });


});

//var oRooms = io.sockets.manager.rooms();