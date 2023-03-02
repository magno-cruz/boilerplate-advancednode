let messageToSend;

$(document).ready(function () {
  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();

    
	$('chat message').val('');
	socket.emit('chat message', messageToSend);
    return false; // prevent form submit from refreshing page
  });
});

/*global io*/
let socket = io();