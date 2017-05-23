
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function() {
		
		new basic.Server({
			learn : false
		}).start(function() {
			new basic.Authorizer().connect(function() {
				new Delegate({id : 1}).start();
				new Delegate({id : 2}).start();
				new Delegate({id : 3}).start();
				new Delegate({id : 4}).start();
				new Delegate({id : 5}).start();
				new Agent().start();
				new Sender().start();
				console.log('The example has started.');
			}.bind(this));
		}.bind(this));
	}
});

Delegate = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('delegate-' + this.id).username,
				passphrase: basic.Credentials.get('delegate-' + this.id).passphrase,
			}
		});
		
		connection.mount({
			id: 'send-message-delegate',
			on: function(request) {
				request.accept({
					action: 'send-message-delegate',
					delegate : this.id
				});
			}.bind(this),
			run: function(stream) {
				stream.object.response  = 'Delegate "' + this.id + '" handled the request.';
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
			id: 'send-message',
			on: function(request) {
				request.accept({
					action: 'send-message'
				});
			}.bind(this),
			run: function(stream) {
				if (! stream.request.restream) {
					connection.send({
						pattern : {
							action : 'send-message-delegate',
							delegate : Math.floor(Math.random() * 5) + 1
						},
						write : function(restream) {
							stream.request.restream = restream;
							stream.request.restream.write(stream.object);
						},
						read : function(object) {
							stream.push(object);
							stream.next();
						}
					});
				} else {
					stream.request.restream.write(stream.object);
				}
			}.bind(this),
			ending : function(stream) {
				stream.request.restream.end();
				stream.next();
			}
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
				
				for (var i = 0; i < 3; i++) {
					connection.send({
						pattern: {
							action: 'send-message'
						},
						write : function(stream) {
							var counter = 0;
							var id = setInterval(function() {
								if (counter < 3) {
									stream.write({
										message : 'message-' + counter
									});
								} else {
									setTimeout(function() {
										stream.end();
									}, 1000);
									clearTimeout(id);
								}
								counter++;
							}.bind(this), 1);
						},
						receive: function(result) {
							console.log('result: ' + JSON.stringify(result, null, 2));
							sequence.next();
						}.bind(this)
					});
				}
				
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