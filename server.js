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
	diamond: 7,
	sapphire: 7,
	emerald: 7,
	ruby: 7,
	onyx: 7,
	gold: 5,
};
var totalTokens = 35;
var turns = 0;
var gameInProgress;
const NUM_DISPLAY = 4;

io.on('connection', (socket) => {
	socket.on('new user', (name) => {
		socket.username = name;
		socket.hasTakenGem = false;
		socket.gemsTaken = [];
		if (players.length === 4 || gameInProgress) {
			observers.push({
				id: socket.id,
				username: name
			});

			if (gameInProgress) {
				socket.emit('alert', 'info', 'Game is currently in progress. You may join if a spot opens up, or when the game ends if there are less than 4 players');
				socket.emit('disable new game button');
				socket.emit('show board');
			} else {
				socket.emit('alert', 'error', 'Lobby is full. You may observe until a spot opens up.');
				socket.emit('disable new game button');
			}
		} else {
			players.push({
				id: socket.id,
				username: name,
			});
		}
	});

	socket.on('disconnect', () => {
		if (players.findIndex(player => player.id === socket.id) === -1 && observers.findIndex(observer => observer.id === socket.id) !== -1) {
			// Removes the disconnected player from the observers array if they were an observer.
			observers.splice(observers.findIndex(observer => observer.id === socket.id), 1);
		} else if (players.findIndex(player => player.id === socket.id) !== -1) {
			// Removes the disconnected player from the players array if they were a player.
			players.splice(players.findIndex(player => player.id === socket.id), 1);
		}

		// Places the most recent observer in the players array and enables the new game button if game is not in progress.
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
			checkTokens(true);

		} else if (gameInProgress) {
			whoseTurn();
		}
	});

	socket.on('new game', () => {
		if (isObserver(socket.id)) {
			socket.emit('alert', 'error', "You can't start a new game as an observer.");
			return;
		}
		if (players.length === 1) {
			socket.emit('alert', 'error', "There aren't enough players!");
			return;
		}
		createDecks();
		checkTokens();

		// Display cards
		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck1', deck1.pop());
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck2', deck2.pop());
		}

		for (let i = 0; i < NUM_DISPLAY; i++) {
			io.emit('display card', 'deck3', deck3.pop());
		}

		// Display tokens
		for (let token in tokens) {
			io.emit('display token', token, tokens[token]);
		}

		var noblesToSend = chooseNobles();
		io.emit('generate nobles', nobleSrc, noblesToSend);

		whoseTurn();
		gameInProgress = true;
		io.emit('disable new game button');
		io.emit('nobles button', false);
		io.emit('show board');
	});

	// Factor 'get card' and 'reserve card'
	socket.on('get card', (data) => {
		if (isObserver(socket.id)) {
			socket.emit('alert', 'error', "You cannot do that; you are currently an observer.");
			return;
		}
		if (!isPlayerTurn(socket.id)) {
			socket.emit('alert', 'error', "It's not your turn!");
			return;
		}

		if (socket.hasTakenGem) {
			socket.emit('alert', 'error', "You can't take a card after you've taken a token!");
			return;
		}

		socket.emit('get card', data);
		socket.broadcast.emit('remove card', data);
		switch (data.deck) {
			case 'deck1':
				if (!data.reserved) {
					io.emit('display card', 'deck1', deck1.pop());
				}
				break;
			case 'deck2':
				if (!data.reserved) {
					io.emit('display card', 'deck2', deck2.pop());
				}
				break;
			case 'deck3':
				if (!data.reserved) {
					io.emit('display card', 'deck3', deck3.pop());
				}
				break;
		}
		if (deckIsEmpty(data.deck)) {
			io.emit('deck is empty', data.deck);
		}
		// turns++;
		// whoseTurn();
	});

	// Factor 'get card' and 'reserve card'
	socket.on('reserve card', (data, src) => {
		if (isObserver(socket.id)) {
			socket.emit('alert', 'error', "You cannot do that; you are currently an observer.");
			return;
		}
		if (!isPlayerTurn(socket.id)) {
			socket.emit('alert', 'error', "It's not your turn!");
			return;
		}

		if (socket.hasTakenGem) {
			socket.emit('alert', 'error', "You can't reserve a card after you've taken a token!");
			return;
		}

		switch (data.src) {
			case 'deck':
				switch (data.deck) {
					case 'deck1':
						socket.emit('reserve card', deck1.pop(), data.src);
						break;
					case 'deck2':
						socket.emit('reserve card', deck2.pop(), data.src);
						break;
					case 'deck3':
						socket.emit('reserve card', deck3.pop(), data.src);
						break;
				}
				break;
			case 'card':
				socket.emit('reserve card', data.card, data.src);
				socket.broadcast.emit('remove card', data);
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
				break;
		}

		if (tokens.gold === 0) {
			socket.emit('alert', 'info', "You reserved a card, but the gold stack is currently empty so you don't get a gold token.");
		} else {
			tokens.gold--;
			totalTokens--;
			socket.emit('get token', 'gold');
			socket.broadcast.emit('remove token from stack', 'gold');
		}

		if (deckIsEmpty(data.deck)) {
			io.emit('deck is empty', data.deck);
		}

		turns++;
		whoseTurn();
	});

	socket.on('get token', (data, double) => {
		if (isObserver(socket.id)) { 
			// Checks if the player is in the game.
			socket.emit('alert', 'error', "You cannot do that; you are currently an observer.");
		} else if (!isPlayerTurn(socket.id)) { 
			// Checks if it's the players turn.
			socket.emit('alert', 'error', "It's not your turn!");
		} else if (data.token === 'gold') { 
			// Prevents player from taking tokens from the gold stack.
			socket.emit('alert', 'error', "You can't take from the gold stack.");
		} else if (tokens[data.token] === 0) { 
			// If the stack is empty, the player can't take from it (shouldn't ever be emitted).
			socket.emit('alert', 'info', 'This token stack is empty.');
		} else if ((tokens[data.token] < 4 && double) || (tokens[data.token] < 3 && socket.gemsTaken.length === 1 && socket.gemsTaken.includes(data.token))) { // Prevents the player from taking 2 tokens from a stack with <4 tokens.
			socket.emit('alert', 'error', "You can only take two tokens when there are at least 4 tokens in the stack.");
		} else if ((double && socket.hasTakenGem) || (socket.gemsTaken.length === 2 && socket.gemsTaken.includes(data.token))) {
			// Prevents the player from taking 2 tokens when they've already taken a token.
			socket.emit('alert', 'error', "You can't take two of the same token if you've already taken another token.");
		} else if (double) {
			// Allows the player to take two tokens.
			tokens[data.token] -= 2;
			totalTokens -= 2;
			socket.hasTakenGem = false;
			socket.gemsTaken.length = 0;
			socket.emit('get token', data.token, double, true);
			socket.broadcast.emit('remove token from stack', data.token, double);
		} else if (socket.gemsTaken.length === 1 && socket.gemsTaken[0] === data.token && tokens[data.token] >= 3) {
			// Allows the player to take the same token twice in a row if it's the only token they've taken.
			tokens[data.token]--;
			totalTokens--;
			socket.hasTakenGem = false;
			socket.gemsTaken.length = 0;
			socket.emit('get token', data.token, false, true);
			socket.broadcast.emit('remove token from stack', data.token);
		} else { 
			// Allows the player to take a token and determines if the player's turn is over.
			tokens[data.token]--;
			totalTokens--;
			socket.gemsTaken.push(data.token);
			socket.hasTakenGem = socket.gemsTaken.length !== 3;
			socket.emit('get token', data.token, false, socket.gemsTaken.length === 3);
			socket.broadcast.emit('remove token from stack', data.token);
			socket.gemsTaken.length = socket.gemsTaken.length === 3 ? 0 : socket.gemsTaken.length;
		}

		if (totalTokens === 0) {
			socket.hasTakenGem = false;
			socket.gemsTaken.length = 0;
			turns++;
			whoseTurn();
		}
	});

	socket.on('add token to stack', (token, number) => {
		tokens[token] += number;
		totalTokens += number;
		socket.broadcast.emit('add token to stack', token, number);
	});

	socket.on('validate', (data) => {
		if (isObserver(socket.id)) {
			socket.emit('alert', 'error', "You cannot do that; you are currently an observer.");
			return;
		}
		if (!isPlayerTurn(socket.id)) {
			socket.emit('alert', 'error', "It's not your turn!");
			return;
		}
		if (purchaseable(data)) {
			socket.emit('validated', data);
		} else {
			socket.emit('alert', 'error', "You cannot afford this card. To reserve the card, hold the SHIFT key while selecting it.");
		}
	});

	socket.on('next turn', () => {
		turns++;
		whoseTurn();
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
	for (card in onyxJSON.deck1) {
		deck1.push(onyxJSON.deck1[card]);
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
	for (card in onyxJSON.deck2) {
		deck2.push(onyxJSON.deck2[card]);
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
	for (card in onyxJSON.deck3) {
		deck3.push(onyxJSON.deck3[card]);
	}
	shuffle();
}

function deckIsEmpty(deck) {
	switch (deck) {
		case 'deck1':
			return deck1.length === 0;
		case 'deck2':
			return deck2.length === 0;
		case 'deck3':
			return deck3.length === 0;
	}
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
			diamond: 7,
			sapphire: 7,
			emerald: 7,
			ruby: 7,
			onyx: 7,
			gold: 5
		};
		totalTokens = 35;
		return;
	}
	if (players.length === 3) {
		for (let gem in tokens) {
			if (gem !== 'gold') {
				tokens[gem] -= 2;
				totalTokens -= 2;
			}
		}
	} else if (players.length === 2) {
		for (let gem in tokens) {
			if (gem !== 'gold') {
				tokens[gem] -= 3;
				totalTokens -= 3;
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

function whoseTurn() {
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

function purchaseable(data) {
	for (let gem in data.card.price) {
		if (data.card.price[gem] > data.resources[gem]) {
			let diff = data.card.price[gem] - data.resources[gem];
			if (data.resources.gold >= diff) {
				data.resources.gold -= diff;
				data.resources[gem] += diff;
			} else {
				return false;
			}
		}
	}
	return true;

	// switch (data.toValidate) {
	// 	case 'card':
	// 		for (let gem in data.card.price) {
	// 			if (data.card.price[gem] > data.resources[gem]) {
	// 				let diff = data.card.price[gem] - data.resources[gem];
	// 				if (data.resources.gold >= diff) {
	// 					data.resources.gold -= diff;
	// 					data.resources[gem] += diff;
	// 				} else {
	// 					return false;
	// 				}
	// 			}
	// 		}
	// 		return true;
	// 	case 'noble':
	// 		for (let gem in data.price) {
	// 			if (data.price[gem] > data.resources[gem]) {
	// 				let diff = data.price[gem] - data.resources[gem];
	// 				if (data.resources.gold >= diff) {
	// 					data.resources.gold -= diff;
	// 					data.resources[gem] += diff;
	// 				} else {
	// 					return false;
	// 				}
	// 			}
	// 		}
	// 		return true;
	// }
}

var port = process.env.PORT || 3000; // runs on both Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});
