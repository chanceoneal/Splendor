$(() => {
	// const TYPING_TIMER = 500; // milliseconds
	// var names = [
	// 	"Doc", "Grumpy", "Happy", "Sleepy", "Dopey", "Bashful", "Sneezy", "Bobby", "Gambino",
	// 	"Dwight", "Egbert", "Eustace", "Cora", "Teddy", "Ursala"
	// ];
	// var colors = [
	// 	"#39362E", "#C57819", "#DC9028", "#A6C3D7", "#6B8395", "#131011", "#673249", "#DC153F",
	// 	"#F694B3", "#DD399E", "#6D5837", "#9D794D", "#B18C5F", "#C2A68B", "#77748A", "#1A1C1A",
	// 	"#737A1D", "#4A5D4E", "#BEB8B5", "#85896D", "#84651B", "#DD620A", "#E09938", "#C8AE9B",
	// 	"#7C9060", "#5F5054", "#442825", "#B13E34", "#C3C7D5", "#A5A759", "#675956", "#373037",
	// 	"#4C9ABD", "#AFBABE", "#7B6D70", "#301F21", "#675855", "#4A373D", "#B2C4CB", "#65798E",
	// 	"#3A7F17", "#5FBE32", "#53C602", "#94D941", "#EC6D49", "#DB0000", "#00BD4F", "#F7882F",
	// 	"#4B3434", "#F222FF", "#8C1EFF"
	// ];

	// var socket = io(),
	// 	connected = false,
	// 	typing = false,
	// 	totalUsers = 0,
	// 	id, lastTypingTime, username, timer, userColor;

	// swal({
	// 	title: 'What is your name?',
	// 	input: 'text',
	// 	inputPlaceholder: 'Enter your name or nickname',
	// 	showCancelButton: false,
	// 	allowOutsideClick: false,
	// 	inputValidator: function (value) {
	// 		return new Promise(function (resolve, reject) {
	// 			if (value) {
	// 				resolve();
	// 			} else {
	// 				reject('You need to write something!');
	// 			}
	// 		});
	// 	}
	// }).then(function (name) {
	// 	join(name);
	// }, function (dismiss) {
	// 	join();
	// });

	// function join(name) {
	// 	username = name ? name : names[Math.floor(Math.random() * names.length)];
	// 	userColor = colors[Math.floor(Math.random() * colors.length)];
	// 	connected = true;
	// 	// $('#yourUsername').text(`${username} (You)`).css('color', userColor);
	// 	socket.emit('new user', username, userColor);
	// }

});