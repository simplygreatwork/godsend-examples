
var godsend = require('godsend');
var basic = require('godsend-basics');
var extras = require('godsend-extras');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function() {
		
		new basic.Server({
			learn : false
		}).start(function() {
			new basic.Authorizer().connect(function() {
				new Services().start();
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
		}.bind(this));
	}
});

Services = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('services').username,
				passphrase: basic.Credentials.get('services').passphrase,
			}
		});
		connection.install({
			service : new (require('godsend-extras/src/Logger'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Registrar'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/store/Memory'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Broadcaster'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Encoder'))({
				config : {
					'decode' : {
						weight : -150
					}
				}
			}),
		});
		connection.mount({
			id: 'inspect-encoded',
			weight : -175,
			on: function(request) {
				request.accept();
			}.bind(this),
			run: function(stream) {
				if (false) console.log('encoded: ' + JSON.stringify(stream.object));
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		connection.mount({
			id: 'inspect-decoded',
			weight : -125,
			on: function(request) {
				request.accept();
			}.bind(this),
			run: function(stream) {
				if (false) console.log('decoded: ' + JSON.stringify(stream.object));
				stream.push(stream.object);
				stream.next();
			}.bind(this)
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
		connection.install({
			service : new (require('godsend-extras/src/Taxer'))({}),
		});
		connection.install({
			service : new (require('godsend-extras/src/Logger'))({}),
		});
		connection.mount({
			id: 'store-put-broadcast-tasks',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put-broadcast',
					collection: 'tasks',
				});
			}.bind(this),
			run: function(stream) {
				console.log('The agent has been notified about a task put.');
				stream.push({
					notified : true
				});
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			}
		});
		connection.install({
			service : new (require('godsend-extras/src/Encoder'))({
				config : {
					'encode' : {
						route : 'outbound',
						weight : -1
					}
				}
			})
		});
		connection.mount({
			route : 'inbound',
			id: 'update-gui',
			on: function(request) {
				request.accept({
					topic: 'taxation',
					action: 'calculate'
				});
			}.bind(this),
			run: function(stream) {
				console.log('Now, you could update the GUI with the calculated sales tax.');
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection : 'tasks',
						encode : true
					},
					data : [{
						key : uuid.v4(),
						value : {
							label : 'Task One'
						}
					}, {
						key : uuid.v4(),
						value : {
							label : 'Task Two'
						}
					}, {
						key : uuid.v4(),
						value : {
							label : 'Task Three'
						}
					}],
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),

			function() {
				
				connection.send({
					pattern: {
						topic: 'taxation',
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
						topic: 'taxation',
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