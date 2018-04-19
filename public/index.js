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
	var resources = {
		diamonds: 0,
		sapphires: 0,
		emeralds: 0,
		rubies: 0,
		onyx: 0,
		gold: 0
	};
	var gems = {
		diamonds: 0,
		sapphires: 0,
		emeralds: 0,
		rubies: 0,
		onyx: 0,
		gold: 0,
		total: 0
	};
	var cards = {
		diamonds: 0,
		sapphires: 0,
		emeralds: 0,
		rubies: 0,
		onyx: 0
	};
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
	});

	socket.on('display card', (deck, card) => {
		var colDiv = $('<div>').addClass('col-md-3');
		var cardDiv = $('<div>').addClass(`playing-card ${card.type}`).data('json', JSON.stringify(card)).click({toValidate: 'card', deck: deck, card: card, resources: resources}, validateCard);
		var cardTop = $('<div>').addClass('top');
		var pointsSpan = $('<span>').addClass('points').text(card.points === 0 ? '' : card.points);
		var gemSpan = $('<span>').addClass('gem').append($(`<img src='/assets/gems/${card.type}.png'>`));
		var cardBottom = $('<div>').addClass('bottom');

		for (let gem in card.price) {
			if (card.price[gem] !== 0) {
				var priceDiv = $('<div>').addClass(`price price-${gem}`);
				var priceSpan = $('<span>');
				priceSpan.text(card.price[gem]);
				priceDiv.append(priceSpan);
				cardBottom.append(priceDiv);
			}
		}

		cardTop.append(pointsSpan, gemSpan);
		cardDiv.append(cardTop, cardBottom);
		colDiv.append(cardDiv);
		$(`#${deck}Cards`).append(colDiv);
	});

	socket.on('generate nobles', (src, nobles) => {
		for (let i = 0; i < nobles.length; i++) {
			let div = $('<div>').addClass('col text-center');
			let img = $(`<img src='${src}${nobles[i].name}.jpg' alt='${JSON.stringify(nobles[i].price)}'>`)
				.attr({width: '150px', height: '150px'})
				.click({toValidate: 'noble', price: nobles[i].price, resources: resources}, validateNoble);
			let span = $('<span>').text(nobles[i].name.replace(/[_]/g, " "));
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

	socket.on('get card', (card) => {

	});

	socket.on('alert', (msg) => {
		swal({
			type: 'error',
			text: msg
		});
	});

	socket.on('notify', function () {
		$('body').toggleClass('notify');
		setTimeout(function () { $('body').toggleClass('notify'); }, 1500);
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

	function validateCard(event) {
		socket.emit('validate', event.data);
	}

	function validateNoble(event) {
		socket.emit('validate', event.data);
	}

	function join(name) {
		username = name ? name : names[Math.floor(Math.random() * names.length)];
		userColor = colors[Math.floor(Math.random() * colors.length)];
		connected = true;
		// $('#yourUsername').text(`${username} (You)`).css('color', userColor);
		socket.emit('new user', username, userColor);
	}

	$newGame.click(() => {
		socket.emit('new game');
	});

	socket.on('clear board', () => {
		$('#cards').attr('hidden', true);
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

});