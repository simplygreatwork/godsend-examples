var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class;
var uuid = require('uuid');

Example = Class.extend({

	initialize: function(properties) {
		
		new basic.Server({
			exchange: new godsend.Exchange.Learning({
				users: this.users
			})
		}).start(function() {
			new basic.Authorizer({
				users: this.users,
				dirname : __dirname
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
				}],
				"receivable" : [{
					"topic" : "authentication",
					"action" : "sign-in"
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
				"receivable" : [{
					"topic" : "post-message"
				}]
			}
		},
		"sender" : {
			"credentials" : {
				"username" : "sender",
				"passphrase" : "passphrase-to-hash"
			},
			"patterns" : {
				"sendable" : [{
					"topic" : "post-message"
				}],
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
			id: 'post-message',
			on: function(request, response) {
				request.accept({
					topic: 'post-message'
				})
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Learned a message from the client: ' + JSON.stringify(stream.object)
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
