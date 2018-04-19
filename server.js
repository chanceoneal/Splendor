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
const nobleJSON = require('./public/assets/json/nobles.json');
const nobles = [
	'Anne_of_Brittany', 'Catherine_de_Medici', 'Charles_V', 'Elisabeth_of_Austria', 'Francis_I_of_France', 'Henry_VIII', 'Isabella_I_of_Castille', 'Niccolo_Machiavelli', 'Suleiman_the_Magnificent'
];
const nobleSrc = '/assets/nobles/';

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
var tokens = {
	diamonds: 7,
	sapphires: 7,
	emeralds: 7,
	rubies: 7,
	onyx: 7,
	gold: 5
};
var turns = 0;
var gameInProgress;
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
				socket.emit('show board');
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
		if (players.findIndex(player => player.id === socket.id) === -1 && observers.findIndex(observer => observer.id === socket.id) !== -1) {
			observers.splice(observers.findIndex(observer => observer.id === socket.id), 1);
		} else if (players.findIndex(player => player.id === socket.id) !== -1) {
			players.splice(players.findIndex(player => player.id === socket.id), 1);
		}
		
		if (observers.length > 0) {
			if (!gameInProgress) {
				io.to(observers[0].id).emit('enable new game button');
			}
			players.push(observers.shift());
		}

		if (players.length <= 1) {
			turns = 0;
			gameInProgress = false;

			io.emit('clear board');
			io.emit('enable new game button');
			io.emit('nobles button', true);

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
		checkTokens();
		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck1', deck1.pop());
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck2', deck2.pop());
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck3', deck3.pop());
		}

		var noblesToSend = chooseNobles();
		io.emit('generate nobles', nobleSrc, noblesToSend);

		whosTurn();
		gameInProgress = true;
		io.emit('disable new game button');
		io.emit('nobles button', false);
		io.emit('show board');
	});

	socket.on('get card', (data) => {
		socket.emit('get card', data);
		switch (data.deck) {
			case 'deck1':
				io.emit('display card', 'deck1', deck1.pop());
				break;
			case 'deck2':
				io.emit('display card', 'deck2', deck2.pop());
				break;
			case 'deck3':
				io.emit('display card', 'deck3', deck3.pop());
				break;
		}
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
		} else {
			socket.emit('alert', "You cannot afford this card.");
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

function checkTokens(reset) {
	if (reset) {
		tokens = {
			diamonds: 7,
			sapphires: 7,
			emeralds: 7,
			rubies: 7,
			onyx: 7,
			gold: 5
		};
		return;
	}
	if (players.length === 3) {
		for (let gem in tokens) {
			if (gem !== 'gold') {
				tokens[gem] -= 2;
			}
		}
	} else if (players.length === 2) {
		for (let gem in tokens) {
			if (gem !== 'gold') {
				tokens[gem] -= 3;
			}
		}
	}
}

function chooseNobles() {
	var tempArray = nobles.slice();
	var returnArray = [];
	for (let i = 0; i < players.length + 1; i++) {
		let j = Math.floor(Math.random() * tempArray.length);
		let noble = tempArray[j];
		returnArray.push({
			name: noble,
			price: nobleJSON[noble]
		});
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
	switch (data.toValidate){
		case 'card':
			for (let gem in data.card.price) {
				if (data.card.price[gem] > data.resources[gem]) {
					while (data.card.price[gem] > data.resources[gem] && data.resources.gold > 0) {
						data.resources[gem]++;
						data.resources.gold--;
					}
				}
			}

			return data.card.price.diamonds <= data.resources.diamonds && data.card.price.sapphires <= data.resources.sapphires && data.card.price.emeralds <= data.resources.emeralds && data.card.price.rubies <= data.resources.rubies && data.card.price.onyx <= data.resources.onyx;
		case 'noble':
			for (let gem in data.price) {
				if (data.price[gem] > data.resources[gem]) {
					while (data.price[gem] > data.resources[gem] && data.resources.gold > 0) {
						data.resources[gem]++;
						data.resources.gold--;
					}
				}
			}

			return data.price.diamonds <= data.resources.diamonds && data.price.sapphires <= data.resources.sapphires && data.price.emeralds <= data.resources.emeralds && data.price.rubies <= data.resources.rubies && data.price.onyx <= data.resources.onyx;
		default:
			socket.emit('alert', 'Something went wrong. Try again.');
			return;
	}
}

var port = process.env.PORT || 3000; // runs on both Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
