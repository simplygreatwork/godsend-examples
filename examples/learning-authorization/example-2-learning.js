var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class;
var uuid = require('uuid');

Example = Class.extend({

	initialize: function() {
		
		new basic.Server({
			learn : true
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
	
	start: function() {
		
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
