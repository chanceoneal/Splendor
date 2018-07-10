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
	var resources = {
		diamonds: 0,
		sapphires: 0,
		emeralds: 0,
		rubies: 0,
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

	socket.on('show board', () => {
		$('#cards').attr('hidden', false);
		$('#tokens').attr('hidden', false);
		$('#deck1').click({
			deck: 'deck1'
		}, reserveCard);
		$('#deck2').click({
			deck: 'deck2'
		}, reserveCard);
		$('#deck3').click({
			deck: 'deck3'
		}, reserveCard);
	});

	socket.on('display card', (deck, card, reserve) => {
		var cardDiv = $('<div></div>').addClass(`playing-card ${card.type}`).click({
			toValidate: 'card',
			deck: deck,
			card: card,
			resources: resources,
			reserved: reserve
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

		if (!reserve) {
			var colDiv = $('<div></div>').addClass('col-md-3').attr('json', JSON.stringify(card));
			colDiv.append(cardDiv);
			$(`#${deck}Cards`).append(colDiv);
		} else {
			var colDiv = $('<div></div>').attr('json', JSON.stringify(card));
			colDiv.append(cardDiv)
				.css({
					"margin-top": `${cards.reserved * 50}px`,
					"margin-left": `${cards.reserved * 5}px`,
					"position": 'absolute'
				});
			cards.reserved += 1;
			$('#reserved').append(colDiv);
		}
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
			let img = $(`<img src='${src}${nobles[i].name}.jpg' alt='${JSON.stringify(nobles[i].price)}'>`)
				.attr({
					width: '150px',
					height: '150px'
				})
				.click({
					toValidate: 'noble',
					price: nobles[i].price,
					resources: resources
				}, validateNoble);
			let span = $('<span></span>').text(nobles[i].name.replace(/[_]/g, " "));
			div.append(img, span);
			$nobles.append(div);
		}
	});

	socket.on('validated', (data) => {
		switch (data.toValidate) {
			case 'card':
				socket.emit('get card', data);
				break;
			case 'noble':
				socket.emit('get noble', data);
				break;
		}
		// socket.emit('buy card', data);
	});

	socket.on('get card', (data) => {
		// Removes the click event handler from the purchased card
		$(`[json='${JSON.stringify(data.card)}']`)
			.children()
			.unbind("click");

		// Add the purchased card to the player's hand
		// Also remove the class to properly position the card
		$(`#${data.card.type}cih`)
			.append($(`[json='${JSON.stringify(data.card)}']`)
				.removeClass('col-md-3')
				.css({
					"margin-top": `${cards[data.card.type] * 50}px`,
					"margin-left": `${cards[data.card.type] * 5}px`,
					"position": 'absolute'
				}));
		cards[data.card.type] += 1;
		if (data.reserved) {
			cards.reserved -= 1;
		}
	});

	socket.on('get token', (token, double, lastGrab) => {
		addTokenToHand(token, double);

		if (tokens.total > 10 && lastGrab) {
			chooseTokensToRemove(tokens.total - 10);
		} else if (lastGrab) {
			socket.emit('next turn');
		}
	});

	socket.on('remove card', (data) => {
		$(`[json='${JSON.stringify(data.card)}']`).remove();
	});

	socket.on('remove token', (token, double) => {
		removeToken(token, double);
	});

	socket.on('add token to stack', (token, amount) => {
		for (let i = 0; i < amount; i++) {
			addTokenToStack(token);
		}
	});

	socket.on('deck is empty', (deck) => {
		$(`#${deck}`).children().removeClass('pcb').addClass('empty').children().text("EMPTY");
	});

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
	});

	socket.on('disable new game button', () => {
		$newGame.prop('disabled', true);
	});

	socket.on('enable new game button', () => {
		$newGame.prop('disabled', false);
	});

	socket.on('show nobles button', () => {
		$noblesButton.attr('hidden', false);
	});

	socket.on('hide nobles button', () => {
		$noblesButton.attr('hidden', true);
	});

	socket.on('nobles button', (hide) => {
		$noblesButton.attr('hidden', hide);
	});

	function validateCard(event) {
		socket.emit('validate', event.data);
	}

	function validateNoble(event) {
		socket.emit('validate', event.data);
	}

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
		let tokenDiv = $(`#${token}Tokens div:last-child`).css({
			'margin-left': `${tokens[token] * 5}px`
		});
		tokenDiv.children().unbind('click');
		$(`#${token}tih`).append(tokenDiv);

		if (double) {
			tokens[token]++;
			tokens.total++;
			tokenDiv = $(`#${token}Tokens div:last-child`).unbind('click').css({
				'margin-left': `${tokens[token] * 5}px`
			});
			$(`#${token}tih`).append(tokenDiv);
		}
	}

	function addTokenToStack(token) {
		let offset = parseInt($(`#${token}Tokens div:last-child`).css('margin-left'));
		console.log(offset);
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

	function removeTokensFromHand(tokens, amounts) {
		for (let i = 0; i < amounts.length; i++) {
			if (amounts[i] !== 0) {
				for (let j = 0; j < amounts[i]; j++) {
					$(`#${tokens[i]}tih div:last-child`).remove();
					addTokenToStack(tokens[i]);
				}
				socket.emit('add token to stack', tokens[i], amounts[i]);
			}
		}
		$('#tokensModal').modal('hide');
		socket.emit('next turn');
	}

	function removeToken(token, double) {
		$(`#${token}Tokens div:last-child`).remove();
		if (double) {
			$(`#${token}Tokens div:last-child`).remove();
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

	function join(name) {
		username = name ? name : names[Math.floor(Math.random() * names.length)];
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		score = 0;
		// $('#yourUsername').text(`${username} (You)`).css('color', userColor);
		socket.emit('new user', username, userColor);
	}

	function reserveCard(event) {
		if (cards.reserved < 3) {
			socket.emit('reserve card', event.data);
		} else {
			sweetAlert('error', 'You have already reserved 3 cards.');
		}
	}

	function sweetAlert(type, msg) {
		swal({
			type: type,
			text: msg
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
			removeTokensFromHand(tokenData, values);
		}
		console.log(total);
		console.log(values);
		console.log(tokenData);
	});

	$newGame.click(() => {
		socket.emit('new game');
	});
});