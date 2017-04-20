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
				users: this.users
			}).connect(function() {
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
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
	
	start: function(callback) {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.process({
			id: 'post-message',
			on: function(request) {
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
	
	start: function(callback) {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			}
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'post-message'
					},
					data: {
						message: 'Can you hear me now?'
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),
			
			function() {
				
				setTimeout(function() {
					console.log('The example has finished.');
					process.exit(0);
				}.bind(this), 500);
				
			}.bind(this)

		);
	}
});

new Example();
