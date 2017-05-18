
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class;
var uuid = require('uuid');
var forge = require('node-forge');

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
			id: 'encryption-put-key',
			on: function(request) {
				request.accept({
					topic : 'encryption',
					action: 'put-key'
				});
			}.bind(this),
			run: function(stream) {
				stream.connection.crypto = stream.connection.crypto || {};
				stream.connection.crypto[stream.request.username] = {
					key : stream.object.key,
					iv : stream.object.iv,
				};
				stream.push({
					message : 'The encryption key has been put.'
				});
				stream.next();
			}.bind(this)
		});
		
		connection.mount({
			id: 'decrypt-object',
			weight : -10,
			on: function(request) {
				request.accept({
					encryptable : true
				});
			}.bind(this),
			run: function(stream) {
				console.log('Decrypting object.');
				if (stream.connection.crypto) {
					var crypto = stream.connection.crypto[stream.request.username];
					var decipher = forge.cipher.createDecipher('AES-CTR', crypto.key);
					decipher.start({
						iv : crypto.iv
					});
					decipher.update(forge.util.createBuffer(forge.util.hexToBytes(stream.object.encrypted)));
					decipher.finish();
					var object = JSON.parse(decipher.output.toString());
					stream.push(object);
					stream.next();
				} else {
					stream.err({
						message : 'The data could not be decrypted.'
					});
					stream.next();
				}
			}.bind(this)
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
		
		connection.crypto = {
			'sender' : {
				key : this.key,
				iv : this.iv
			}
		};
		
		connection.mount({
			id: 'encrypt-object',
			route : 'outbound',
			weight : -2,
			on: function(request) {
				request.accept({
					encryptable : true
				});
			}.bind(this),
			run: function(stream) {
				console.log('Encrypting object.');
				var crypto = stream.connection.crypto[stream.request.username];
				var cipher = forge.cipher.createCipher('AES-CTR', crypto.key);
				cipher.start({
					iv : crypto.iv
				});
				var string = JSON.stringify(stream.object);
				cipher.update(forge.util.createBuffer(string));
				cipher.finish();
				stream.push({
					encrypted : cipher.output.toHex()
				});
				stream.next();
			}.bind(this)
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						topic : 'encryption',
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