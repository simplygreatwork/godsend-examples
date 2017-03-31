
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
				}, {
					topic : 'presence',
					action: 'online'
				}, {
					topic : 'presence',
					action: 'offline'
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
					action: 'transform-object'
				}, {
					topic : 'authentication',
					action : 'sign-out'
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
			address: basic.Utility.address()
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
		
		connection.process({
			id: 'presence-online',
			on: function(request) {
				request.accept({
					topic : 'presence',
					action: 'online'
				});
			}.bind(this),
			run: function(stream) {
				console.log('The agent was notified that "' + stream.object.username + '" has come online.');
				stream.next();
			}.bind(this)
		});
		
		connection.process({
			id: 'presence-offline',
			on: function(request) {
				request.accept({
					topic : 'presence',
					action: 'offline'
				});
			}.bind(this),
			run: function(stream) {
				console.log('The agent was notified that "' + stream.object.username + '" has gone offline.');
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new Bus({
			address: basic.Utility.address()
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
						action: 'transform-object'
					},
					data : {
						type : 'object'
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result.objects));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						topic : 'authentication',
						action : 'sign-out'
					},
					data : {},
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