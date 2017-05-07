
var godsend = require('godsend');
var basic = require('godsend-basics');
var extras = require('godsend-extras');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
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
		connection.mount({
			service : new (require('godsend-extras/src/Decoder'))({}),
		});
		connection.remount({
			id : 'store-put-decode',
			weight : -5
		});
		connection.mount({
			id: 'displayer',
			on: function(request) {
				request.accept({
					topic: 'store',
					action: 'put'
				});
			}.bind(this),
			run: function(stream) {
				stream.object.value.date = new Date();
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
		connection.mount({
			route : 'outbound',
			service : new (require('godsend-extras/src/Encoder'))({}),
		});
		connection.remount({
			route : 'outbound',
			id : 'store-put-encode',
			weight : -1
		});
		connection.mount({
			route : 'outbound',
			id: 'credentials-filter',
			weight : -2,
			on: function(request) {
				request.accept();
			}.bind(this),
			run: function(stream) {
				if (stream.object.credentials) {
					console.warn('Detected and deleting credentials in an outbound request.');
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
						topic: 'store',
						action: 'put',
						collection : 'tasks'
					},
					data : {
						key : uuid.v4(),
						value : {
							label : 'Task Four'
						},
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