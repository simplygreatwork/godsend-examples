
var godsend = require('godsend');
var basic = require('godsend-basics');
var extras = require('godsend-extras');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server().start(function() {
			new basic.Authorizer({
				users: this.users
			}).connect(function() {
				new Services({
					users: this.users
				}).start();
				new Agent().start();
				new Sender().start();
			}.bind(this));
		}.bind(this));
	},
	
	users: {
		'services': {
			credentials: {
				username: basic.Credentials.get('services').username,
				passphrase: basic.Credentials.get('services').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					topic: 'taxer',
					action: 'calculate'
				}]
			}
		},
		'agent': {
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			},
			patterns: {
				sendable: [],
				receivable: [{
					action: 'send-message'
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
					action: 'send-message'
				}, {
					topic: 'taxer',
					action: 'calculate'
				}],
				receivable: []
			}
		}
	}
});

Services = Class.extend({
	
	start: function() {
		
		if (false) {
			var connection = godsend.connect({
				address: basic.Utility.local(),
				credentials: {
					username: basic.Credentials.get('authenticator').username,
					passphrase: basic.Credentials.get('authenticator').passphrase,
				}
			});
			godsend.mount({
				service : require('godsend-extras').Authorizer,
				options : {
					users : this.users
				},
				connection : connection
			});
		} 
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('services').username,
				passphrase: basic.Credentials.get('services').passphrase,
			}
		});
		godsend.mount({
			service : require('godsend-extras').store.Memory,
			options : {},
			connection : connection
		});
		godsend.mount({
			service : require('godsend-extras').Transformer,
			options : {},
			connection : connection
		});
		godsend.mount({
			service : require('godsend-extras').Notifier,
			options : {},
			connection : connection
		});
		godsend.mount({
			service : require('godsend-extras/src/Taxer'),
			connection : connection
		});
	}
});

Agent = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		
		connection.process({
			id: 'send-message-authorization',
			before : 'send-message',
			on: function(request) {
				request.accept({
					action: 'send-message'
				});
			}.bind(this),
			run: function(stream) {
				var allow = true;
				if (Math.random() > 0.5) {
					allow = false;
				}
				if (allow) {
					stream.push(stream.object);
					stream.next();
				} else {
					stream.err({
						message: 'Randomly not permitted. Run the example again.'
					});
					stream.next();
				}
			}.bind(this)
		});
		
		connection.process({
			id: 'send-message',
			on: function(request) {
				request.accept({
					action: 'send-message'
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					reply : 'You said: ' + stream.object.message
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
						action: 'send-message'
					},
					data : {
						message : 'hello'
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
						topic: 'taxer',
						action: 'calculate',
						state : 'texas'
					},
					data : {
						balance : 1.00
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
						topic: 'taxer',
						action: 'calculate',
						state : 'texas',
						city : 'austin'
					},
					data : {
						balance : 1.00
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