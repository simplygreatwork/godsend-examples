
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server().start(function() {
			new basic.Authorizer({
				users: this.users
			}).connect(function() {
				new Agent().connect(function() {
					new Sender().connect(function() {
						console.log('The example has started.');
					});
				}.bind(this));
			}.bind(this));
		}.bind(this));
	},
	
	users: {
		'agent': {
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					topic: 'post-message'
				}]
			}
		},
		'public': {
			credentials: {
				username: basic.Credentials.get('public').username,
				passphrase: basic.Credentials.get('public').passphrase,
			},
			patterns: {
				sendable: [{
					topic: 'authentication',
					action: 'sign-in'
				}],
				receivable: []
			}
		},
		'sender': {
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			},
			patterns: {
				sendable: [{
					topic: 'post-message'
				}],
				receivable: []
			}
		}
	}
});

Agent = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address: basic.Utility.local()
		}).connect({
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			initialized : function(connection) {
				this.process(connection);
			}.bind(this),
			connected: function(connection) {
				this.connection = connection;
				callback();
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback();
			}.bind(this)
		});
	},

	process: function(connection) {

		connection.process({
			id: 'post-message',
			on: function(request) {
				request.accept({
					topic: 'post-message'
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Received the secure message from the sender!'
				});
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new godsend.Bus({
			address: basic.Utility.local()
		}).connect({
			credentials: {
				username: basic.Credentials.get('public').username,
				passphrase: basic.Credentials.get('public').passphrase,
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
				callback();
			}.bind(this)
		});
	},
	
	start: function(connection) {
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'post-message'
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

				connection.send({
					pattern: {
						topic: 'authentication',
						action: 'sign-in'
					},
					data: {
						credentials: {
							username: basic.Credentials.get('sender').username,
							passphrase: basic.Credentials.get('sender').passphrase,
						},
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				connection.send({
					pattern: {
						topic: 'post-message'
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