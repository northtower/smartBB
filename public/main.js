
function CWBTaskManager() {
  var p_drawingList = [];
  var p_TaskList = [];
  var p_isPlay   = false;

  this.addDrawing = function (oDraw) {
    p_drawingList.push(oDraw);
  };

  this.getCounts = function () {
    return p_drawingList.length;
  };

  this.getTaskCounts = function () {
    return p_TaskList.length;
  };

  //添加行为对象
  this.startTask = function (oTime) {
    p_TaskList = new Array();
    
    var keyNote = 'DL:' + oTime;
    console.log('keyNote:' + keyNote);
    p_TaskList.push(keyNote);
  };

  this.addTask = function (taskItem) {
    p_TaskList.push(taskItem);
  };

  this.endTask = function () {
    p_drawingList.push(p_TaskList);    
  };

  this.getTaskList = function () {
    return p_TaskList;
  }

}

$(document).ready(function () {
  
  var $classRoomInput = $('#classRoomInput');
  var inClassroom = cleanInput($classRoomInput.val().trim());

  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  var socketed = io();
  $('#loadImage').on('click' , function () {
    var imageURL = "url(http://upload-images.jianshu.io/upload_images/238151-27bb5a7f6a249e67.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)";

    console.log('socketed.emit :' +inClassroom);
    socketed.emit('loadimage', {
      oURL:imageURL,
      oClassroom:inClassroom
    });
  });

   $('#clean').on('click' , function () {
    var imageURL = "";
    $('#drag').css("background-image",imageURL);

    socketed.emit('clean', {
      oClassroom:inClassroom
    });
  });

  $('#loadVideo').on('click' , function () {
    
  });

});

$(function() {


  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var TEXTCOLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('#usernameInput'); // Input for username
  var $classRoomInput = $('#classRoomInput');
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var classRoom;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $classRoomInput.focus();

  var socket = io();
  var canvas = document.getElementsByClassName('whiteboard')[0];
  var colors = document.getElementsByClassName('color');
  var context = canvas.getContext('2d');

  //事件起始时间戳
  var deadTime = null;

  //for taskList
  var gTaskManager = new CWBTaskManager();

  //for whiteboard
  var current = {
    color: 'white'
  };
  var drawing = false;

  canvas.addEventListener('mousedown', onMouseDown, false);
  canvas.addEventListener('mouseup', onMouseUp, false);
  canvas.addEventListener('mouseout', onMouseUp, false);
  canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

  for (var i = 0; i < colors.length; i++){
    colors[i].addEventListener('click', onColorUpdate, false);
  }

  socket.on('drawing', onDrawingEvent);

  window.addEventListener('resize', onResize, false);
  onResize();  

  function drawLine(x0, y0, x1, y1, color, emit){
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    if (!emit) { return; }
    var w = canvas.width;
    var h = canvas.height;

    var date = new Date();
    var yy = date.getYear();
    var MM = date.getMonth() + 1;
    var dd = date.getDay();
    var hh = date.getHours();
    var mm = date.getMinutes();
    var ss = date.getSeconds();
    var sss = date.getMilliseconds();
    var result = Date.UTC(yy, MM, dd, hh, mm, ss, sss); 
    
    if(deadTime != null){
      
      var spendTime = result - deadTime;
      console.log('spend time:'+ spendTime);

      var drawingTaskItem = new Array(x0 , y0 , x1 , y1 , color,spendTime);
      gTaskManager.addTask(drawingTaskItem);
      //console.log('drawLine gTaskManager:' + gTaskManager.getTaskCounts());

    }else{
      console.log('事件捕获错误，丢失起始时间！');
    }  
    
    ix0 = x0 / w;
    iy0 = y0 / h;
    ix1 = x1 / w;
    iy1 = y1 / h;

    socket.emit('drawing', {
      x0: ix0,
      y0: iy0,
      x1: ix1,
      y1: iy1,
      color: color
    });

  }


  function onMouseDown(e){
    drawing = true;
    current.x = e.clientX;
    current.y = e.clientY;
    
    //保存当前时间戳
    var date = new Date();
    var yy = date.getYear();
    var MM = date.getMonth() + 1;
    var dd = date.getDay();
    var hh = date.getHours();
    var mm = date.getMinutes();
    var ss = date.getSeconds();
    var sss = date.getMilliseconds();
    deadTime = Date.UTC(yy, MM, dd, hh, mm, ss, sss); 

    gTaskManager.startTask(deadTime);
  }

  function onMouseUp(e){
    if (!drawing) { return; }
    drawing = false;
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
    gTaskManager.endTask();
    console.log('onMouseUp gDrawingList:' + gTaskManager.getCounts()); 
    //将当前task保存到redis
    socket.emit('saveTask', gTaskManager.getTaskList());
    deadTime = null;
  }

  function onMouseMove(e){
    if (!drawing) { return; }
    drawLine(current.x, current.y, e.clientX, e.clientY, current.color, true);
    current.x = e.clientX;
    current.y = e.clientY;
  }

  function onColorUpdate(e){
    current.color = e.target.className.split(' ')[1];
  }

  // limit the number of events per second
  function throttle(callback, delay) {
    var previousCall = new Date().getTime();
    return function() {
      var time = new Date().getTime();

      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    };
  }

  function onDrawingEvent(data){
    //console.log('onDrawingEvent ' + gTaskManager.getCounts());
    var w = canvas.width;
    var h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  // make the canvas fill its parent
  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  //chat page
  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  //clone checkbox with name
  function cloneCheckboxWithName(itemName) {
     // $("#userItem").clone().insertAfter("userItem");
     //$("#userItem").append($("#userItem").clone(true));
     //$("body").append($("#userItem").clone(true));

  }

  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());
    classRoom = cleanInput($classRoomInput.val().trim());

    

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username , classRoom);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % TEXTCOLORS.length);
    return TEXTCOLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      //$currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to classroom " +data.oClassroom ;
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });
  

  socket.on('getTaskManager', function (taskList) {
      console.log("getTaskManager  count:" + taskList.length);

      //添加时间偏移量与时间锚点
      var oTimeNote    = 0;
      var oTimeAnchor  = 0;

      for (item in taskList)
      {
        var listIndex = taskList.length - item - 1;
        if(taskList[listIndex].indexOf('DL:') != -1) {
          
          //登录时进行事件还原，不要延迟。
          /*
          oCurrentTime = taskList[listIndex].substr(3,100);

          if(oTimeAnchor == 0){
            oTimeAnchor = oCurrentTime ;
          }
          oTimeNote = oCurrentTime - oTimeAnchor;
          console.log('oTimeNote:%d' ,oTimeNote);
          */

        }else{
          proItems = taskList[listIndex].split(",");
          if (proItems.length == 6) {
            //数据符合拆分要求            
            ix1 = Number(proItems[0]);
            iy1 = Number(proItems[1]);
            ix2 = Number(proItems[2]);
            iy2 = Number(proItems[3]);
            iC = proItems[4];
            //sTime = Number(proItems[5]) + oTimeNote;
            /*
            (function (fx1, fy1, fx2, fy2, fc, iTime) {
              setTimeout(function () {
                console.log("replay:%d:%d:%d:%d:%s:%d" , fx1 ,fy1 ,fx2 ,fy2,fc,iTime);
                drawLine(fx1, fy1, fx2, fy2, fc, false);
              }, iTime);
            })(ix1, iy1, ix2, iy2, iC, sTime);
            */
            drawLine(ix1, iy1, ix2, iy2, iC, false);

          }
        }
      }
  });

  socket.on('message', function(message, callback) {});

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
    cloneCheckboxWithName(data.username);

  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username , classRoom);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  }); 


  //loadImage

  socket.on('loadimage', onLoadImage);
  socket.on('clean', onCleanImage);

  function onLoadImage(oURL) {
    
    var imageURL = "url(http://upload-images.jianshu.io/upload_images/238151-27bb5a7f6a249e67.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)";
    $('#drag').css("background-image",imageURL);
  }

  function onCleanImage(oURL) {
    var imageURL = "";
    $('#drag').css("background-image",imageURL);
  }


  var dragging = false;
  var iX, iY;

  socket.on('drag', onDragEvent);

  function onDragEvent(data) {
    
    switch (data.step) {
      case 0:
        console.log('onDragEvent step:'+ data.step);
        iX = data.ix;
        iY = data.iy;
        dragging = data.idragging;
        if(this.setCapture)
          this.setCapture();
        return false;
        //break;
      case 1:
        if (dragging) {          
          var oX = data.ix;
          var oY = data.iy;
          console.log('onDragEvent step:'+ data.step + "[x:" +  oX +  "y:" +oY + "]");
          
          $("#drag").css({ "left": oX + "px", "top": oY + "px" });
          return false;
        }
        break;
      case 2:
        if (dragging) {
          console.log('onDragEvent step:'+ data.step);
          dragging = false;
          //$("#drag")[0].releaseCapture();
          if(this.releaseCapture)
            this.releaseCapture();
          //data.fade.cancelBubble = true;
        }

        break;
    }

  }

  $("#drag").mousedown(function(e) {
    //dragging = true;

    iX = e.clientX - this.offsetLeft;
    iY = e.clientY - this.offsetTop;

    socket.emit('drag', {
      step:0,
      ix: iX,
      iy: iY,
      idragging:true
    });

  });
  document.onmousemove = function (e) {

    var e = e || window.event;
    var oX = e.clientX - iX;
    var oY = e.clientY - iY;

    socket.emit('drag', {
      step:1,
      ix: oX,
      iy: oY,
      idragging:true
    });

  };
  $(document).mouseup(function (e) {
    
    socket.emit('drag', {
      step:2,
      ix: 0,
      iy: 0,
      idragging:false
    });
  });

  
});
