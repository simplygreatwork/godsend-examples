
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
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
		}.bind(this));
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
			service : new (require('godsend-extras/src/Encoder'))({}),
		});
		connection.mount({
			id: 'transformer',
			weight : 0,
			on: function(request) {
				request.accept({
					action: 'transform'
				});
			}.bind(this),
			run: function(stream) {
				stream.object.status = 'This object was encoded, sent, decoded, transformed, encoded, returned, and decoded.';
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
		connection.install({
			service : new (require('godsend-extras/src/Encoder'))({
				config : {
					'encode' : {
						route : 'outbound'
					},
					'decode' : {
						route : 'inbound'
					}
				}
			}),
		});
		connection.mount({
			route : 'outbound',
			id: 'strip-credentials',
			weight : -100,
			on: function(request) {
				request.accept();
			}.bind(this),
			run: function(stream) {
				if (stream.object.credentials) {
					console.warn('Detected and deleted credentials in an outbound request.');
					delete stream.object.credentials;
				}
				stream.push(stream.object);
				stream.next();
			}.bind(this)
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						action: 'transform',
						encodable : true
					},
					data : {
						message : 'This is an object to transform.',
						credentials : {
							username : 'username',
							passphrase : 'passphrase'
						}
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