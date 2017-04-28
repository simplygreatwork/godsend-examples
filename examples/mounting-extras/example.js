
var godsend = require('godsend');
var basic = require('godsend-basics');
var extras = require('godsend-extras');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
		new basic.Server({
			learn : true
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
		connection.mount({
			service : new (require('godsend-extras/src/Logger'))({}),
		});
		connection.mount({
			service : new (require('godsend-extras/src/Encoder'))({}),
		});
		connection.remount({
			id : 'store-put-encode',
			weight : -6
		});
		connection.mount({
			service : new (require('godsend-extras/src/Decoder'))({}),
		});
		connection.remount({
			id : 'store-put-decode',
			weight : -5
		});
		connection.mount({
			service : new (require('godsend-extras/src/Transcriber'))({}),
		});
		connection.mount({
			service : new (require('godsend-extras/src/store/Memory'))({}),
		});
		connection.mount({
			service : new (require('godsend-extras/src/Broadcaster'))({}),
		});
		connection.mount({
			id: 'inspector',
			after : 'store-put-encode',
			before : 'store-put-decode',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				if (false) console.log('stream.object: ' + JSON.stringify(stream.object));
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
		connection.mount({
			service : new (require('godsend-extras/src/Taxer'))({}),
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
				stream.push(stream.object);
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
		if (false) connection.mount({
			route : 'outbound',
			service : new (require('godsend-extras/src/Encoder'))({}),
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection : 'tasks'
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