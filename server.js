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
const nobles = [
	'Anne_of_Brittany', 'Catherine_de_Medici', 'Charles_V', 'Elisabeth_of_Austria', 'Francis_I_of_France', 'Henry_VIII', 'Isabella_I_of_Castille', 'Niccolo_Machiavelli', 'Suleiman_the_Magnificent'
];
const nobleSrc = './public/assets/nobles/';

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
const NUM_DISPLAY = 4;

io.on('connection', (socket) => {
	socket.on('new user', (name) => {
		socket.username = name;
		if (players.length === 4 || gameInProgress) {
			observers.push({
				id: socket.id,
				username: name
			});

			if (gameInProgress) {
				socket.emit('alert', 'Game is currently in progress. You may join if a spot opens up, or when the game ends if there are less than 4 players');
				socket.emit('disable new game button');
			} else {
				socket.emit('alert', 'Lobby is full. You may observe until a spot opens up.');
				socket.emit('disable new game button');
			}
		} else {
			players.push({
				id: socket.id,
				username: name
			});
		}
	});

	socket.on('disconnect', () => {
		players.splice(players.findIndex(player => player.id === socket.id), 1);
		if (observers.length > 0) {
			players.push(observers.shift());
		}

		if (players.length <= 1) {
			turns = 0;
			gameInProgress = false;

			io.emit('clear board');
			io.emit('enable new game button');
			for (let observer in observers) {
				io.sockets.socket(observer.id).emit('disable new game button');
			}

		} else if (gameInProgress) {
			whosTurn();
		}
	});

	socket.on('new game', () => {
		if (players.length === 1) {
			socket.emit('alert', "There aren't enough players!");
			return;
		}
		createDecks();
		var noblesToSend = chooseNobles();
		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck1', deck1[i]);
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck2', deck2[i]);
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck3', deck3[i]);
		}
		io.emit('generate nobles');
		whosTurn();
		gameInProgress = true;
		io.emit('disable new game button');
		io.emit('show board');
	});

	socket.on('buy card', (data) => {
		socket.emit('bought card', data);
		// io.emit('display card', data);
		turns++;
		whosTurn();
	});

	socket.on('validate', (data) => {
		if (isObserver(socket.id)) {
			socket.emit('alert', "You cannot do that; you are currently an observer.");
			return;
		}
		if (!isPlayerTurn(socket.id)) {
			socket.emit('alert', "It's not your turn!");
			return;
		}
		if (purchaseable(data, socket.id)) {
			socket.emit('validated', data);
		}
		// socket.emit('validated', data);

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

function chooseNobles() {
	var tempArray = nobles.slice();
	var returnArray = [];
	for (let i = 0; i < players.length + 1; i++) {
		let j = Math.floor(Math.random() * tempArray.length);
		let noble = tempArray[j];
		returnArray.push(noble);
		tempArray.splice(j, 1);
	}
	return returnArray;
}

function whosTurn() {
	var player = players[turns % players.length];
	// io.emit('message', player.username + "'s turn.");
	// io.emit('disable new game button');
	// io.emit('disable draw buttons');
	// io.emit('hide drawTotal button');
	// io.to(player.id).emit('enable draw buttons');
	io.to(player.id).emit('notify');
}

function isPlayerTurn(id) {
	return id === players[turns % players.length].id;
}

function isObserver(id) {
	return observers.find(observer => observer.id === id) !== undefined;
}

function purchaseable(data, id) {

}

var port = process.env.PORT || 3000; // runs on both Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
