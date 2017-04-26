
var fs = require('fs');
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');
var address = basic.Utility.local({
	secure : true
});

Example = Class.extend({
	
	initialize: function(properties) {
		
		console.warn('Edit the paths to key and cert with your own private TLS key and certificate.');
		
		new basic.Server({
			address : address,
         key: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/privkey.pem'),
         cert: fs.readFileSync('/etc/letsencrypt/live/fullterm.io/fullchain.pem'),
		}).start(function() {
			new basic.Authorizer({
				address: address
			}).connect(function() {
				new Agent().start()
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
		}.bind(this));
	}
});

Agent = Class.extend({
	
	start: function(callback) {
		
		var connection = godsend.connect({
			address: address,
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
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					message: 'Received the secure message from the sender!'
				});
				stream.next();
			}.bind(this)
		});
	}
});

Sender = Class.extend({
	
	start: function(callback) {
		
		var connection = godsend.connect({
			address: address,
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
						message: 'Message'
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