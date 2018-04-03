// Handles server-side logic

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const diamondJSON = require('./public/assets/json/diamond.json');
const sapphireJSON = require('./public/assets/json/sapphire.json');
const emeraldJSON = require('./public/assets/json/emerald.json');
const rubyJSON = require('./public/assets/json/ruby.json');
const onyxJSON = require('./public/assets/json/onyx.json');
// console.log(diamondJSON.deck2);

// const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

// var xhr = new XMLHttpRequest();
// var method = "GET";
// var urls = [
// 	"https://api.myjson.com/bins/5yflb", 	// Diamonds
// 	"https://api.myjson.com/bins/q765r", 	// Sapphires
// 	"https://api.myjson.com/bins/1fst67", 	// Emeralds
// 	"https://api.myjson.com/bins/1530a7", 	// Rubies
// 	"https://api.myjson.com/bins/oh0i7" 	// Onyx
// ];

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

app.use(express.static('public'));
// app.use(express.static('assets'));

var deck1 = [];
var deck2 = [];
var deck3 = [];
var players = [];
var observers = [];
var turns = 0;
var gameInProgress = false;
createDecks();

io.on('connection', (socket) => {
	socket.on('new user', (name) => {
		socket.username = name;
		if (players.length === 4 || gameInProgress) {
			observers.push({
				id: socket.id,
				username: name
			});

			if (gameInProgress) {
				socket.emit('message', {
					message: 'Game is currently in progress. You may join if a spot opens up, or when the game ends if there are less than 4 players'
				});
			} else {
				socket.emit('message', {
					message: 'Lobby is full. You may observe until a spot opens up.'
				});
			}
		} else {
			players.push({
				id: socket.id,
				username: name
			});
		}

	});

	socket.on('new game', () => {
		createDecks();
	});

	socket.on('buy card', () => {

	});
});



function createDecks() {
	var card;

	// First Deck
	for (card in diamondJSON.deck1) {
		deck1.push(diamondJSON.deck1[card]);
	}
	for (card in sapphireJSON.deck1) {
		deck1.push(sapphireJSON.deck1[card]);
	}
	for (card in emeraldJSON.deck1) {
		deck1.push(emeraldJSON.deck1[card]);
	}
	for (card in rubyJSON.deck1) {
		deck1.push(rubyJSON.deck1[card]);
	}
	for (card in rubyJSON.deck1) {
		deck1.push(rubyJSON.deck1[card]);
	}

	// Second Deck
	for (card in diamondJSON.deck2) {
		deck2.push(diamondJSON.deck2[card]);
	}
	for (card in sapphireJSON.deck2) {
		deck2.push(sapphireJSON.deck2[card]);
	}
	for (card in emeraldJSON.deck2) {
		deck2.push(emeraldJSON.deck2[card]);
	}
	for (card in rubyJSON.deck2) {
		deck2.push(rubyJSON.deck2[card]);
	}
	for (card in rubyJSON.deck2) {
		deck2.push(rubyJSON.deck2[card]);
	}

	// Third Deck
	for (card in diamondJSON.deck3) {
		deck3.push(diamondJSON.deck3[card]);
	}
	for (card in sapphireJSON.deck3) {
		deck3.push(sapphireJSON.deck3[card]);
	}
	for (card in emeraldJSON.deck3) {
		deck3.push(emeraldJSON.deck3[card]);
	}
	for (card in rubyJSON.deck3) {
		deck3.push(rubyJSON.deck3[card]);
	}
	for (card in rubyJSON.deck3) {
		deck3.push(rubyJSON.deck3[card]);
	}
	shuffle();
}

// Shuffles decks in place
function shuffle() {
	for (let i = deck1.length; i; i--) {
		let j = Math.floor(Math.random() * i);
		[deck1[i - 1], deck1[j]] = [deck1[j], deck1[i - 1]];
	}

	for (let i = deck2.length; i; i--) {
		let j = Math.floor(Math.random() * i);
		[deck2[i - 1], deck2[j]] = [deck2[j], deck2[i - 1]];
	}

	for (let i = deck3.length; i; i--) {
		let j = Math.floor(Math.random() * i);
		[deck3[i - 1], deck3[j]] = [deck3[j], deck3[i - 1]];
	}
}

var port = process.env.PORT || 3000; // runs on both Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
