
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
					action: 'transform-object'
				}]
			}
		},
		'sender': {
			credentials: {
				username: Credentials.get('sender').username,
				passphrase: Credentials.get('sender').passphrase,
			},
			patterns: {
				sendable: [{
					action: 'transform-object'
				}],
				receivable: []
			}
		}
	}
});

Agent = Class.extend({

	initialize: function(properties) {
		
		Object.assign(this, properties);
	},
	
	connect: function(callback) {
		
		new godsend.Bus({
			address: 'http://127.0.0.1:8080/'
		}).connect({
			credentials: {
				username: Credentials.get('agent').username,
				passphrase: Credentials.get('agent').passphrase,
			},
			responded: function(result) {
				this.process(result.connection);
				callback();
			}.bind(this)
		});
	},
	
	process: function(connection) {
		
		connection.process({
			id: 'transform-object',
			on: function(request) {
				request.accept({
					action: 'transform-object'
				});
			}.bind(this),
			run: function(stream) {
				var object = stream.object;
				object.date = new Date();
				stream.push(object);
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
				username: Credentials.get('sender').username,
				passphrase: Credentials.get('sender').passphrase,
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
						action: 'transform-object'
					},
					write: function(stream) {
						setInterval(function() {
							stream.write({
								type: 'object'
							});
						}.bind(this), 1000);
					}.bind(this),
					read: function(object) {
						console.log('Transformed object: ' + JSON.stringify(object, null, 2));
					},
					error: function(error) {
						console.log('error: ' + JSON.stringify(error, null, 2));
					}
				});
				
			}.bind(this)
			
		);
	}
});

new Example();