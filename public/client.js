let messageToSend;

$(document).ready(function () {
  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();

	socket.emit('chat message', messageToSend);

	$('chat message').val('');
    return false; // prevent form submit from refreshing page
  });
});

/*global io*/
let socket = io();