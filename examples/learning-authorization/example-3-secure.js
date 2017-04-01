var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class;
var uuid = require('uuid');

Example = Class.extend({

	initialize: function(properties) {
		
		new basic.Server({
			exchange: new godsend.Exchange.Secure({
				users: this.users
			})
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
		"broker" : {
			"credentials" : {
				"username" : "broker",
				"passphrase" : "passphrase-to-hash"
			},
			"patterns" : {
				"sendable" : [{
					"topic" : "authentication",
					"action" : "get-user"
				}, {
					"topic" : "presence",
					"action" : "online"
				}, {
					"topic" : "presence",
					"action" : "offline"
				}],
				"receivable" : [{
					"topic" : "authentication",
					"action" : "sign-in"
				}, {
					"topic" : "authentication",
					"action" : "sign-out"
				}]
			}
		},
		"authenticator" : {
			"credentials" : {
				"username" : "authenticator",
				"passphrase" : "passphrase-to-hash"
			},
			"patterns" : {
				"sendable" : [],
				"receivable" : [{
					"topic" : "authentication",
					"action" : "get-user"
				}, {
					"topic" : "authentication",
					"action" : "put-user"
				}]
			}
		},
		"agent" : {
			"credentials" : {
				"username" : "agent",
				"passphrase" : "passphrase-to-hash"
			},
			"patterns" : {
				"sendable" : [],
				"receivable" : []
			}
		},
		"sender" : {
			"credentials" : {
				"username" : "sender",
				"passphrase" : "passphrase-to-hash"
			},
			"patterns" : {
				"sendable" : [],
				"receivable" : []
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
				})
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Received a secure message from the client: ' + JSON.stringify(stream.object)
				});
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	connect: function(callback) {
		
		new Bus({
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
						message: 'Can you hear me now?'
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result.objects));
					}.bind(this)
				});

			}.bind(this)

		);
	}
});

new Example();
