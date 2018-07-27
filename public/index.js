// Main file
// Handles client-side logic

// Splendor JSON Files
// Diamond
// 		https://api.myjson.com/bins/5yflb
// Sapphire
// 		https://api.myjson.com/bins/q765r
// Emerald
// 		https://api.myjson.com/bins/1fst67
// Ruby
// 		https://api.myjson.com/bins/1530a7
// Onyx
// 		https://api.myjson.com/bins/oh0i7


$(() => {
	var DECKS = 3;

	var names = [
		"Doc", "Grumpy", "Happy", "Sleepy", "Dopey", "Bashful", "Sneezy", "Bobby", "Gambino",
		"Dwight", "Egbert", "Eustace", "Cora", "Teddy", "Ursala"
	];
	var colors = [
		"#39362E", "#C57819", "#DC9028", "#A6C3D7", "#6B8395", "#131011", "#673249", "#DC153F",
		"#F694B3", "#DD399E", "#6D5837", "#9D794D", "#B18C5F", "#C2A68B", "#77748A", "#1A1C1A",
		"#737A1D", "#4A5D4E", "#BEB8B5", "#85896D", "#84651B", "#DD620A", "#E09938", "#C8AE9B",
		"#7C9060", "#5F5054", "#442825", "#B13E34", "#C3C7D5", "#A5A759", "#675956", "#373037",
		"#4C9ABD", "#AFBABE", "#7B6D70", "#301F21", "#675855", "#4A373D", "#B2C4CB", "#65798E",
		"#3A7F17", "#5FBE32", "#53C602", "#94D941", "#EC6D49", "#DB0000", "#00BD4F", "#F7882F",
		"#4B3434", "#F222FF", "#8C1EFF"
	];

	var socket = io();
	var $newGame = $('#newGame');
	var $nobles = $('#nobles');
	var $noblesButton = $('#showNobles');
	var $tokensToRemove = $('#tokensToRemove');
	var $removeTokens = $('#removeTokens');

	// Replace all instances of the resources, tokens, cards, score,
	// connected, and username variables with the Player fields.
	var Player = {
		username: "",
		connected: false,
		score: 0,
		resources: {
			diamond: 0,
			sapphire: 0,
			emerald: 0,
			ruby: 0,
			onyx: 0,
			gold: 0
		},
		tokens: {
			diamond: 0,
			sapphire: 0,
			emerald: 0,
			ruby: 0,
			onyx: 0,
			gold: 0,
			total: 0
		},
		cards: {
			diamond: 0,
			sapphire: 0,
			emerald: 0,
			ruby: 0,
			onyx: 0,
			reserved: 0
		}
	};
	var resources = {
		diamond: 0,
		sapphire: 0,
		emerald: 0,
		ruby: 0,
		onyx: 0,
		gold: 0
	};
	var tokens = {
		diamond: 0,
		sapphire: 0,
		emerald: 0,
		ruby: 0,
		onyx: 0,
		gold: 0,
		total: 0
	};
	var cards = {
		diamond: 0,
		sapphire: 0,
		emerald: 0,
		ruby: 0,
		onyx: 0,
		reserved: 0
	};
	var score;
	var connected = false;
	var username, userColor;

	/******************************** GENERAL GAME STUFF ********************************/
	swal({
		title: 'What is your name?',
		input: 'text',
		inputPlaceholder: 'Enter your name or nickname',
		showCancelButton: false,
		allowOutsideClick: false,
		inputValidator: function (value) {
			return new Promise(function (resolve, reject) {
				if (value) {
					resolve();
				} else {
					reject('You need to write something!');
				}
			});
		}
	}).then(function (name) {
		join(name);
	}, function (dismiss) {
		join();
	});

	$newGame.click(() => {
		socket.emit('new game');
	});

	socket.on('disable new game button', () => {
		$newGame.prop('disabled', true);
	});

	socket.on('show board', () => {
		$('#cards').attr('hidden', false);
		$('#tokens').attr('hidden', false);
		$('#deck1 .playing-card').click({
			src: 'deck',
			deck: 'deck1'
		}, reserveCard);
		$('#deck2 .playing-card').click({
			src: 'deck',
			deck: 'deck2'
		}, reserveCard);
		$('#deck3 .playing-card').click({
			src: 'deck',
			deck: 'deck3'
		}, reserveCard);
		$('#tokensInHand').children('.col').each(function () {
			let id = $(this).prop('id').slice(0, -3) + 's';
			if (id === 'rubys') {
				id = 'rubies';
			} else if (id === 'onyxs') {
				id = 'onyx';
			} else if (id === 'golds') {
				id = 'gold';
			}
			$(this).append($("<p></p>").text(`${id}`));
		});
		$('#cardsInHand').children('.col').each(function () {
			let id = $(this).prop('id').slice(0, -3) + 's';
			if (id === 'rubys') {
				id = 'rubies';
			} else if (id === 'onyxs') {
				id = 'onyx';
			} else if (id === 'reserveds') {
				id = 'reserved';
			}
			$(this).append($("<p></p>").text(`${id}`));
		});
	});

	socket.on('display token', (token, number) => {
		var tokenDiv = $(`#${token}Tokens`);
		for (let i = 0; i < number; i++) {
			let imgDiv = $('<div></div>').css({
				'position': 'absolute',
				'margin-left': `${i * 5}px`
			}).append($(`<img src='/assets/gems/${token}.png' width='100' height='100'>`)
				.addClass(`token ${token}-token`)
				.click({
					token: token
				}, getToken));
			tokenDiv.append(imgDiv);
		}
	});

	socket.on('generate nobles', (src, nobles) => {
		for (let i = 0; i < nobles.length; i++) {
			let div = $('<div></div>').addClass('col text-center');
			let img = $(`<img src='${src}${nobles[i].name}.jpg' alt='${JSON.stringify(nobles[i].price)}' name='${nobles[i].name}'>`)
				.attr({
					width: '150px',
					height: '150px'
				});
			let span = $('<span></span>').text(nobles[i].name.replace(/[_]/g, " "));
			div.append(img, span);
			$nobles.append(div);
		}
	});

	socket.on('clear nobles', () => {
		$nobles.empty();
	});

	socket.on('clear board', () => {
		for (let i = 1; i <= 3; i++) {
			$(`#deck${i}Cards`).empty();
		}
		$('#cards').attr('hidden', true);
		for (let token in tokens) {
			if (token !== 'total') {
				$(`#${token}Tokens`).empty();
			}
		}
		$('#tokens').attr('hidden', true);
		$('#tokensInHand').children('.col').each(function () {
			$(this).empty();
		});
		$('#cardsInHand').children('.col').each(function () {
			$(this).empty();
		});
	});

	socket.on('enable new game button', () => {
		$newGame.prop('disabled', false);
	});

	socket.on('nobles button', (hide) => {
		$noblesButton.attr('hidden', hide);
	});

	function join(name) {
		username = name ? name : names[Math.floor(Math.random() * names.length)];
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		score = 0;
		// $('#yourUsername').text(`${username} (You)`).css('color', userColor);
		socket.emit('new user', username, userColor);
	}

	/******************************** CARD STUFF ********************************/
	socket.on('display card', (deck, card) => {
		displayCard(deck, card);
	});

	socket.on('get card', (data) => {
		// Removes the tokens needed to purchase the card
		purchaseCard(data.card.price);

		// Removes the click event handler from the purchased card
		$(`[json='${JSON.stringify(data.card)}']`)
			.children()
			.unbind("click");

		// Add the purchased card to the player's hand
		// Also remove the class to properly position the card
		getCard(data.card);
		cards[data.card.type] += 1;
		if (data.reserved) {
			cards.reserved -= 1;
		}
		resources[data.card.type]++;
		score += data.card.points;
		socket.emit('check nobles', cards);
	});

	socket.on('reserve card', (card, src) => {
		switch (src) {
			case 'deck':
				displayCard(null, card, true);
				break;
			case 'card':
				getCard(card, true);
				cards.reserved++;
		}
	});

	socket.on('validated', (data) => {
		socket.emit('get card', data);
		// socket.emit('buy card', data);
	});

	// Removes card from the board (so nobody else can purchase it)
	socket.on('remove card', (data) => {
		$(`[json='${JSON.stringify(data.card)}']`).remove();
	});

	// Displays the empty deck
	socket.on('deck is empty', (deck) => {
		$(`#${deck}`).children().removeClass('pcb').addClass('empty').children().text("EMPTY");
	});

	function purchaseCard(price) {
		let tokensToRemove = [];
		let amounts = [];
		let goldToRemove = 0;
		for (let token in price) {
			if (cards[token] < price[token]) {
				let diff = price[token] - cards[token];
				let amount = tokens[token];
				if (tokens[token] < diff) {
					goldToRemove += diff - tokens[token];
				}
				tokensToRemove.push(token);
				amounts.push(amount);
			}
		}
		if (goldToRemove > 0) {
			tokensToRemove.push('gold');
			amounts.push(goldToRemove);
		}
		removeTokensFromHand(tokensToRemove, amounts);
	}

	// Add the purchased/reserved card to the player's hand
	// Also remove the class to properly position the card
	function getCard(card, reserved) {
		let id = reserved ? '#reservedcih' : `#${card.type}cih`;
		let margins = reserved ? cards.reserved : cards[card.type];
		$(id)
			.append($(`[json='${JSON.stringify(card)}']`)
				.removeClass('col-md-3')
				.css({
					"margin-top": `${margins * 50}px`,
					"margin-left": `${margins * 5}px`,
					"position": 'absolute'
				}).mouseenter(bringToFront).mouseleave(sendToBack));

		if (reserved) {
			$(`[json='${JSON.stringify(card)}']`).children().unbind("click").click({
				src: 'card',
				card: card,
				resources: resources,
				reserved: reserved
			}, validateCard);
		}
	}

	function reserveCard(event) {
		if (cards.reserved < 3) {
			socket.emit('reserve card', event.data);
		} else {
			sweetAlert('error', 'You have already reserved 3 cards.');
		}
	}

	// Displays cards from the deck to the public board, or to
	// a player's hand if they reserve from the deck.
	function displayCard(deck, card, reserved) {
		var cardDiv = $('<div></div>').addClass(`playing-card ${card.type}`).click({
			src: 'card',
			card: card,
			deck: deck,
			resources: resources
		}, validateCard);
		var cardTop = $('<div></div>').addClass('top');
		var pointsSpan = $('<span></span>').addClass('points').text(card.points === 0 ? '' : card.points);
		var gemSpan = $('<span></span>').addClass('gem').append($(`<img src='/assets/gems/${card.type}.png'>`));
		var cardBottom = $('<div></div>').addClass('bottom');

		for (let gem in card.price) {
			if (card.price[gem] !== 0) {
				var priceDiv = $('<div></div>').addClass(`price price-${gem}`);
				var priceSpan = $('<span></span>');
				priceSpan.text(card.price[gem]);
				priceDiv.append(priceSpan);
				cardBottom.append(priceDiv);
			}
		}

		cardTop.append(pointsSpan, gemSpan);
		cardDiv.append(cardTop, cardBottom);

		// var colDiv = $('<div></div>').addClass('col-md-3').attr('json', JSON.stringify(card));
		// colDiv.append(cardDiv);
		// $(`#${deck}Cards`).append(colDiv);

		var colDiv;
		if (!reserved) {
			colDiv = $('<div></div>').addClass('col-md-3').attr('json', JSON.stringify(card));
			colDiv.append(cardDiv);
			$(`#${deck}Cards`).append(colDiv);
		} else {
			colDiv = $('<div></div>').attr('json', JSON.stringify(card));
			colDiv.append(cardDiv)
				.css({
					"margin-top": `${cards.reserved * 50}px`,
					"margin-left": `${cards.reserved * 5}px`,
					"position": 'absolute'
				});
			cards.reserved += 1;
			$('#reserved').append(colDiv);
		}
	}

	/**
	 * Validates 
	 * @param {object} event - Object representing the card to be validated.
	 */
	function validateCard(event) {
		if (event.shiftKey && !event.data.reserved) {
			reserveCard(event);
			// socket.emit('reserve card', event.data);
		} else {
			socket.emit('validate', event.data);
		}
	}

	function bringToFront() {
		$(this).css('z-index', '1');
	}

	function sendToBack() {
		$(this).css('z-index', '0');
	}

	/******************************** TOKEN STUFF ********************************/
	// Allows the user to add the token to their hand
	socket.on('get token', (token, double, lastGrab) => {
		addTokenToHand(token, double);

		if ((tokens.total > 10 && token === 'gold') || (tokens.total > 10 && lastGrab)) {
			chooseTokensToRemove(tokens.total - 10);
		} else if (lastGrab || token === 'gold') {
			socket.emit('next turn');
		}
	});

	function getToken(event) {
		if (event.shiftKey) {
			socket.emit('get token', event.data, true);
		} else {
			socket.emit('get token', event.data);
		}
	}

	function addTokenToHand(token, double) {
		tokens[token]++;
		tokens.total++;
		resources[token]++;
		let tokenDiv = $(`#${token}Tokens div:last-child`).css({
			'margin-left': `${tokens[token] * 5}px`
		});
		tokenDiv.children().unbind('click');
		$(`#${token}tih`).append(tokenDiv);

		if (double) {
			tokens[token]++;
			tokens.total++;
			resources[token]++;
			tokenDiv = $(`#${token}Tokens div:last-child`).unbind('click').css({
				'margin-left': `${tokens[token] * 5}px`
			});
			$(`#${token}tih`).append(tokenDiv);
		}
	}

	// Removes token(s) from the board (so nobody else can take it)
	socket.on('remove token from stack', (token, double) => {
		removeTokenFromStack(token, double);
	});

	function removeTokenFromStack(token, double) {
		$(`#${token}Tokens div:last-child`).remove();
		if (double) {
			$(`#${token}Tokens div:last-child`).remove();
		}
	}

	// Replaces the token(s)
	socket.on('add token to stack', (token, amount) => {
		for (let i = 0; i < amount; i++) {
			addTokenToStack(token);
		}
	});

	function addTokenToStack(token) {
		let offset = parseInt($(`#${token}Tokens div:last-child`).css('margin-left'));
		let tokenDiv = $(`#${token}Tokens`);
		let imgDiv = $('<div></div>').css({
			'position': 'absolute',
			'margin-left': `${offset + 5}px`
		}).append($(`<img src='/assets/gems/${token}.png' width='100' height='100'>`)
			.addClass(`token ${token}-token`)
			.click({
				token: token
			}, getToken));
		tokenDiv.append(imgDiv);
	}

	function removeTokensFromHand(tokensToRemove, amounts) {
		for (let i = 0; i < amounts.length; i++) {
			if (amounts[i] !== 0) {
				for (let j = 0; j < amounts[i]; j++) {
					$(`#${tokensToRemove[i]}tih div:last-child`).remove();
					addTokenToStack(tokensToRemove[i]);
					resources[tokensToRemove[i]]--;
					// Player.tokens[tokensToRemove[i]]--;
					tokens[tokensToRemove[i]]--;
					tokens.total--;
				}
				socket.emit('add token to stack', tokensToRemove[i], amounts[i]);
			}
		}

		if ($('#tokensModal').hasClass('show')) {
			$('#tokensModal').modal('hide');
			socket.emit('next turn');
		}

	}

	function chooseTokensToRemove(number) {
		for (let token in tokens) {
			if (token !== 'total' && tokens[token] > 0) {
				let div = $('<div></div>').addClass('col text-center');
				let imgDiv = $('<div></div>').append($(`<img src='/assets/gems/${token}.png' width='100' height='100'>`)
					.addClass(`token ${token}-token`));
				let min = Math.min(number, tokens[token]);
				let numInput = $(`<input type='number' min='0' max='${min}' placeholder='Max of ${min}' class='number-removed'>`).css('width', '100px').data('token', token);
				div.append(imgDiv, numInput);
				$tokensToRemove.append(div);
			}
		}

		$('#tokensModal').modal({
			show: true,
			keyboard: false,
			backdrop: "static"
		});
	}

	$removeTokens.click(() => {
		let values = [];
		let tokenData = [];
		let total = 0;
		$('.number-removed').each(function () {
			let tempVal = $(this).val() === '' ? 0 : parseInt($(this).val());
			values.push(tempVal);
			tokenData.push($(this).data('token'));
			total += tempVal;
		});
		if (total !== tokens.total - 10) {
			sweetAlert('info', `Please choose only ${tokens.total - 10} ${tokens.total - 10 === 1 ? 'token' : 'tokens'}.`);
		} else {
			$tokensToRemove.empty();
			removeTokensFromHand(tokenData, values);
		}
	});

	/******************************** MISC STUFF ********************************/
	socket.on('next turn', () => {
		socket.emit('next turn');
	});

	socket.on('get noble', (noble) => {
		$(`img[name='${noble.name}']`).parent().append($(`<h6>Taken by ${username}</h6>`));
		score += 3;
	});

	socket.on('assign noble', (noble) => {
		$(`img[name='${noble.name}']`).parent().append($(`<h6>Taken by ${username}</h6>`));
	});

	// Alerts the player(s)
	socket.on('alert', (type, msg) => {
		sweetAlert(type, msg);
	});

	socket.on('notify', function () {
		$('body').toggleClass('notify');
		setTimeout(function () {
			$('body').toggleClass('notify');
		}, 1500);
		// $.titleAlert("Your Turn!", {
		// 	requireBlur: true,
		// 	stopOnFocus: true,
		// 	interval: 600
		// });
		// if (soundEnabled) {
		// 	var ding = new Audio(getDing());
		// 	ding.play();
		// }
	});

	function sweetAlert(type, msg) {
		swal({
			type: type,
			text: msg
		});
	}
});