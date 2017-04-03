
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
					action: 'transform-object'
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
		
		new godsend.Bus({
			address: basic.Utility.local()
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
				callback();
			}.bind(this)
		});
	},

	start: function(connection) {
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						action: 'transform-object'
					},
					write: function(stream) {
						var counter = 0;
						var id = setInterval(function() {
							stream.write({
								type: 'object'
							});
							counter++;
							if (counter > 4) {
								clearTimeout(id);
								stream.end();
							}
						}.bind(this), 10);
					}.bind(this),
					read: function(object) {
						console.log('transformed object: ' + JSON.stringify(object, null, 2));
					},
					receive : function(result) {
						sequence.next();
					},
					error: function(error) {
						console.log('error: ' + JSON.stringify(error, null, 2));
					}
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