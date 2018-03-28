const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);


app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static('public'));
// app.use(express.static('assets'));

var users = [];

io.on('connection', (socket) => {

	socket.on('new user', (name, color) => {
		io.emit('chat message', {
			username: name,
			message: 'has connected',
			color: color
		});
		socket.username = name;
		socket.color = color;
		users.push({
			id: socket.id,
			name: name,
			color: color
		});
		io.to(socket.id).emit("request id", { id: socket.id });
		io.emit('online user', {
			users: users,
			connected: true,
			onlineUsers: users.length
		});
	});

	socket.on('disconnect', () => {
		io.emit('chat message', {
			username: socket.username,
			message: 'has disconnected',
			color: socket.color
		});
		users.splice(users.findIndex(user => user.id === socket.id), 1);
		io.emit('online user', {
			user: socket.id,
			connected: false,
			onlineUsers: users.length
		});
	});

	socket.on('chat message', (msg) => {
		socket.broadcast.emit('chat message', {
			username: socket.username,
			message: msg,
			color: socket.color
		});
	});

	socket.on('direct message', (data) => {
		io.to(data.recipient.id).emit('direct message', data);
	});

	// when the client emits 'typing', we broadcast it to others
	socket.on('typing', function () {
		socket.broadcast.emit('typing', {
			username: socket.username,
			color: socket.color
		});
	});

	// when the client emits 'stop typing', we broadcast it to others
	socket.on('stop typing', function () {
		socket.broadcast.emit('stop typing', {
			username: socket.username,
			color: socket.color
		});
	});
});

var port = process.env.PORT || 3000; // runs both on Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
