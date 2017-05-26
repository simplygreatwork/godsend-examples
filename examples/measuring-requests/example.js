
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

// A simple baseline for measuring future optimization techniques.
// Not a practical test because the exchange, sender, and receiver are running on the same device.

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
		
		connection.mount({
			id: 'message',
			on: function(request) {
				request.accept({
					action: 'message'
				});
			}.bind(this),
			run: function(stream) {
				stream.push({
					responding : true
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
				
				var time = {
					start : (new Date()).getTime()
				};
				var counter = 0;
				var id = setInterval(function() {
					connection.send({
						pattern: {
							action: 'message'
						},
						write: function(stream) {
							stream.write({
								type: 'object'
							});
							stream.end();
						}.bind(this),
						receive : function(result) {
							counter++;
							if (counter % 500 == 0) {
								time.now = (new Date()).getTime();
								var rps = Math.floor((counter / (time.now - time.start)) * 1000);
								console.log('average requests per second: ' + rps);
							}
						}
					});
				}.bind(this), 0);
				
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