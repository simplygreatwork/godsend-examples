
var fs = require('fs');
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		console.log('Edit key and cert with the paths to your own private key and certificate.');
		
		new basic.Server({
         key: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/privkey.pem'),
         cert: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/fullchain.pem'),
		}).start(function() {
			new basic.Authorizer({
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
			address: 'http://127.0.0.1:8080/'
		}).connect({
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			responded: function(result) {
				this.process(result.connection);
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
		
		new Bus({
			address: 'http://127.0.0.1:8080'
		}).connect({
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			},
			responded: function(result) {
				this.start(result.connection);
				callback();
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