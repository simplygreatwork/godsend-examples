
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class;
var uuid = require('uuid');
var forge = require('node-forge');

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
		
		connection.install({
			service : new (require('godsend-extras/src/crypto/Crypto'))({}),
		});
		
		connection.mount({
			id: 'send-message',
			on: function(request) {
				request.accept({
					action: 'send-message'
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
	
	initialize : function() {
		
		this.key = forge.random.getBytesSync(16);
		this.iv = forge.random.getBytesSync(16);
	},
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('sender').username,
				passphrase: basic.Credentials.get('sender').passphrase,
			}
		});
		
		connection.install({
			service : new (require('godsend-extras/src/crypto/Crypto'))({
				config : {
					'encrypt-object' : {
						route : 'outbound'
					},
					'decrypt-object' : {
						route : 'inbound'
					}
				},
				crypto : {
					key : this.key,
					iv : this.iv
				}
			})
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic : 'crypto',
						action: 'put-key'
					},
					data : {							// additionally: use a public asymmetric key to encrypt this symmetric key
						key : this.key,
						iv : this.iv
					},
					receive : function(result) {
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						action: 'send-message',
						encryptable : true
					},
					data : {
						message : 'Message'
					},
					receive : function(result) {
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