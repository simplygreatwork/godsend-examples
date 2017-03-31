
var fs = require('fs');
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		console.log('Edit key and cert with the paths to your own private key and certificate.');
		
		new basic.Server({
			address : basic.Utility.address(),
         key: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/privkey.pem'),
         cert: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/fullchain.pem'),
		}).start(function() {
			new basic.Authorizer({
				address: basic.Utility.address(),
				users: this.users
			}).connect(function() {
				new Agent().connect(function() {
					new Sender().connect(function() {
						console.log('Everything has been started.');
					});
				}.bind(this));
			});
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

	initialize: function(properties) {

		Object.assign(this, properties);
		this.storage = {};
	},

	connect: function(callback) {
		
		new godsend.Bus({
			address : basic.Utility.address(),
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
				console.error('Connection errors: ' + errors);
				callback(errors);
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
		
		new Bus({
			address : basic.Utility.address(),
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
				console.error('Connection errors: ' + errors);
				callback(errors);
			}.bind(this)
		});
	},
	
	start: function(connection) {
		
		var sequence = godsend.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'post-message'
					},
					data: {
						message: 'Message'
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result.objects));
						sequence.next();
					}.bind(this)
				});

			}.bind(this)
		);
	}
});

new Example();