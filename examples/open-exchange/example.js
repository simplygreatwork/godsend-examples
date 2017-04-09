
var fs = require('fs');
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server({
			address : basic.Utility.local(),
			exchange : new godsend.Exchange.Open()
		}).start(function() {
			new Agent().connect(function() {
				new Sender().connect(function() {
					console.log('The example has started.');
				});
			}.bind(this));
		}.bind(this));
	}
});

Agent = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address : basic.Utility.local()
		}).connect({
			initialized : function(connection) {
				this.process(connection);
			}.bind(this),
			connected: function(connection) {
				this.connection = connection;
				callback();
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback(errors);
			}.bind(this)
		});
	},

	process: function(connection) {

		connection.process({
			id: 'post-message',
			on: function(request) {
				request.accept({
					action: 'post-message'
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Received message from the sender!'
				});
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address : basic.Utility.local()
		}).connect({
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			},
			initialized : function(connection) {
				this.connection = connection;
			}.bind(this),
			connected: function(connection) {
				this.start(connection);
				callback();
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback(errors);
			}.bind(this)
		});
	},
	
	start: function(connection) {
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						action: 'post-message'
					},
					data: {
						message: 'Message'
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),
			
			function() {
				
				console.log('The example has finished.');
				process.exit(0);
				
			}.bind(this)
		);
	}
});

new Example();
