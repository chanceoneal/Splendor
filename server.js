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
var noblesInGame = [];
var turns = 0;
var gameInProgress;
var lastTurn;
var currentWinnerID;
var currentWinnerUsername;
var highestScore;
var leastCards;
const NUM_DISPLAY = 4;

io.on('connection', (socket) => {
	/******************************** GENERAL GAME STUFF ********************************/
	socket.on('new user', (name) => {
		socket.username = name;
		socket.hasTakenGem = false;
		socket.gemsTaken = [];
		socket.points = 0;
		socket.cards = 0;
		if (players.length === 4 || gameInProgress) {
			observers.push({
				id: socket.id,
				username: name
			});

			if (gameInProgress) {
				socket.emit('alert', 'info', 'Game is currently in progress. You may join if a spot opens up, or when the game ends if there are less than 4 players');
				// socket.emit('show board');
			} else {
				socket.emit('alert', 'error', 'Lobby is full. You may observe until a spot opens up.');
			}

			socket.emit('disable new game button');
			socket.broadcast.emit('new online observer', name, socket.id);
			io.emit('chat message', `${socket.username} has joined as an observer.`);
		} else {
			players.push({
				id: socket.id,
				username: name,
			});

			socket.broadcast.emit('new online player', name, socket.id);
			io.emit('chat message', `${socket.username} has joined as a player.`);
		}

		socket.emit('all online', players, observers);
	});

	socket.on('disconnect', () => {
		if (observers.findIndex(observer => observer.id === socket.id) !== -1) {
			// Removes the disconnected player from the observers array if they were an observer.
			observers.splice(observers.findIndex(observer => observer.id === socket.id), 1);
			io.emit('disconnected observer', socket.id);
			io.emit('chat message', `${socket.username} (observer) has disconnected.`);
		} else if (players.findIndex(player => player.id === socket.id) !== -1) {
			// Removes the disconnected player from the players array if they were a player.
			players.splice(players.findIndex(player => player.id === socket.id), 1);
			io.emit('disconnected player', socket.id);
			io.emit('chat message', `${socket.username} (player) has disconnected.`);
			if (observers.length > 0) {
				io.to(observers[0].id).emit('enable new game button');
				io.emit('disconnected observer', observers[0].id);
				io.emit('chat message', `${observers[0].username} is now a player.`);
				players.push(observers.shift());
				io.emit('new online player', players[players.length].username, players[players.length].id);
			}
			gameOver();
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

		noblesInGame = chooseNobles();
		io.emit('generate nobles', nobleSrc, noblesInGame);

		gameInProgress = true;
		lastTurn = false;
		currentWinnerID = null;
		currentWinnerUsername = null;
		highestScore = 0;
		leastCards = 0;
		io.emit('disable new game button');
		io.emit('nobles button', false);
		for (let i = 0; i < players.length; i++) {
			io.to(players[i].id).emit('show board');
		}
		io.emit('chat message', `A new game has begun!`);
		whoseTurn();
	});

	/************************************ CARD STUFF ************************************/
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

		socket.points += data.card.points;
		socket.cards++;
		socket.emit('get card', data);
		socket.broadcast.emit('remove card', data);
		io.emit('chat message', `${socket.username} (${socket.points}) purchased ${RegExp(/^[aeiouAEIOU]/).test(data.card.type) ? 'an' : 'a'} ${data.card.type} card worth ${data.card.points} points.`);
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
		if (deckIsEmpty(data.deck)) {
			io.emit('deck is empty', data.deck);
		}
	});

	// Factor 'get card' and 'reserve card'
	socket.on('reserve card', (data) => {
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

		io.emit('chat message', `${socket.username} (${socket.points}) reserved a card.`);
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

	/*********************************** TOKEN  STUFF ***********************************/
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
			io.emit('chat message', `${socket.username} (${socket.points}) took two ${data.token} tokens.`);
		} else if (socket.gemsTaken.length === 1 && socket.gemsTaken[0] === data.token && tokens[data.token] >= 3) {
			// Allows the player to take the same token twice in a row if it's the only token they've taken.
			tokens[data.token]--;
			totalTokens--;
			socket.hasTakenGem = false;
			socket.gemsTaken.length = 0;
			socket.emit('get token', data.token, false, true);
			socket.broadcast.emit('remove token from stack', data.token);
			io.emit('chat message', `${socket.username} (${socket.points}) took two ${data.token} tokens.`);
		} else {
			// Allows the player to take a token and determines if the player's turn is over.
			tokens[data.token]--;
			totalTokens--;
			
			socket.gemsTaken.push(data.token);
			socket.hasTakenGem = socket.gemsTaken.length < 3;
			socket.emit('get token', data.token, false, (socket.gemsTaken.length >= 3) || (totalTokens === 0));
			socket.broadcast.emit('remove token from stack', data.token);
			if (totalTokens === 0 || socket.gemsTaken.length >= 3) {
				io.emit('chat message', `${socket.username} (${socket.points}) took these tokens: ${socket.gemsTaken.join(', ')}`);
				socket.gemsTaken.length = 0;
				socket.hasTakenGem = false;
			}
		}
	});

	socket.on('add token to stack', (token, number) => {
		tokens[token] += number;
		totalTokens += number;
		socket.broadcast.emit('add token to stack', token, number);
	});

	/************************************ CHAT STUFF ************************************/
	socket.on('chat message', (msg) => {
		io.emit('chat message', `${socket.username} (${socket.points}): ${msg}`);
	});

	/************************************ MISC STUFF ************************************/
	socket.on('check nobles', (cards) => {
		let qualifiedNobles = checkNobles(cards);
		if (qualifiedNobles.length !== 0) {
			socket.points += 3;
			io.emit('chat message', `${socket.username} (${socket.points}) has received a visit from a noble!`);
			socket.emit('get noble', qualifiedNobles[0]);
			socket.broadcast.emit('assign noble', qualifiedNobles[0]);
			noblesInGame.splice(noblesInGame.indexOf(qualifiedNobles[0]), 1);
		}
		socket.emit('next turn');
	});

	socket.on('next turn', () => {
		turns++;
		if (!lastTurn) {
			if (socket.points >= 15) {
				lastTurn = true;
				currentWinnerID = socket.id;
				currentWinnerUsername = socket.username;
				highestScore = socket.points;
				leastCards = socket.cards;

				if (turns % players.length === 0) {
					socket.emit('alert', 'success', 'Congratulations! You won!');
					socket.broadcast.emit('alert', 'error', `You lost... ${socket.username} won! Better luck next time.`);
					gameOver();
				} else {
					socket.emit('alert', 'info', `You are currently in the lead with ${socket.points} points. Other players may be able to overtake you, so don't get your hopes up!`);
					socket.broadcast.emit('alert', 'warning', `${socket.username} has ${socket.points} points. You may or may not get a chance to catch up, depending on where you are in the turn queue.`);
					whoseTurn();
				}
			} else {
				whoseTurn();
			}
		} else if (turns % players.length > 0) {
			if (socket.points > highestScore) {
				currentWinnerID = socket.id;
				currentWinnerUsername = socket.username;
				highestScore = socket.points;
				leastCards = socket.cards;
				socket.emit('alert', 'info', `You are currently in the lead with ${socket.points} points. Other players may be able to overtake you, so don't get your hopes up!`);
				socket.broadcast.emit('alert', 'warning', `${socket.username} has taken the lead with ${socket.points} points. You may or may not get a chance to catch up, depending on where you are in the turn queue.`);
			} else if (socket.points === highestScore) {
				if (socket.cards > leastCards) {
					socket.emit('alert', 'warning', 'You have more cards than the other player with the same amount of points. Therefore you are not in the lead.');
				} else if (socket.cards < leastCards) {
					socket.emit('alert', 'info', `You have taken over the lead with ${socket.points} points and ${leastCards - socket.cards} fewer cards than the previous leader. Other players may be able to overtake you, so don't get your hopes up!`);
					socket.broadcast.emit('alert', 'warning', `${socket.username} has taken the lead with ${socket.points} points and ${leastCards - socket.cards} fewer cards than the previous leader.`);
					currentWinnerID = socket.id;
					currentWinnerUsername = socket.username;
					leastCards = socket.cards;
				} else {
					socket.emit('alert', 'warning', `Although you have the same number of points and cards as the leader, they hit the lead before you so they are still in the lead.`);
				}
			}
			whoseTurn();
		} else if (turns % players.length === 0) {
			io.to(currentWinnerID).emit('alert', 'success', 'Congratulations! You won!');
			for (let i = 0; i < players.length; i++) {
				if (players[i].id !== currentWinnerID) {
					io.to(players[i].id).emit('alert', 'error', `You lost... ${currentWinnerUsername} won! Better luck next time.`);
				}
			}
			gameOver();
		}
	});
});


/******************************* FUNCTIONS OUTSIDE SOCKET.IO *******************************/

/************************************ GENERAL GAME STUFF ***********************************/
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
	io.to(player.id).emit('notify');
	io.emit('chat message', `It is ${player.username}'s turn.`);
}

function isPlayerTurn(id) {
	return id === players[turns % players.length].id;
}

function isObserver(id) {
	return observers.find(observer => observer.id === id) !== undefined;
}

function gameOver() {
	turns = 0;
	gameInProgress = false;
	checkTokens(true);
	io.emit('clear board');
	io.emit('enable new game button');
	io.emit('nobles button', true);
	io.emit('clear nobles');
	for (let i = 0; i < observers.length; i++) {
		io.to(observers[i].id).emit('disable new game button');
	}
}

/**************************************** CARD STUFF ***************************************/
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

function checkNobles(cards) {
	let qualifiedNobles = [];
	for (let i = 0; i < noblesInGame.length; i++) {
		ADD: {
			for (let price in noblesInGame[i].price) {
				if (cards[price] < noblesInGame[i].price[price]) {
					break ADD;
				}
			}
			qualifiedNobles.push(noblesInGame[i]);
		}
	}
	return qualifiedNobles;
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

/*************************************** TOKEN  STUFF **************************************/
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

/*******************************************************************************************/

var port = process.env.PORT || 3000; // runs on both Azure or local
http.listen(port, () => {
	console.log(`listening on *:${port}`);
});