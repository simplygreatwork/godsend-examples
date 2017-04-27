
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function(properties) {
		
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
			id: 'transform-object',
			on: function(request) {
				request.accept({
					action: 'transform-object'
				});
			}.bind(this),
			run: function(stream) {
				var object = stream.object;
				object.date = new Date();
				stream.push(object);
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
						action: 'transform-object'
					},
					write: function(stream) {
						var counter = 0;
						var id = setInterval(function() {
							stream.write({
								type: 'object'
							});
							counter++;
							if (counter > 4) {
								clearTimeout(id);
								stream.end();
							}
						}.bind(this), 10);
					}.bind(this),
					read: function(object) {
						console.log('transformed object: ' + JSON.stringify(object, null, 2));
					},
					error: function(error) {
						console.log('error: ' + JSON.stringify(error, null, 2));
					},
					receive : function(result) {
						sequence.next();
					}
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