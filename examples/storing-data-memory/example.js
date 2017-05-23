
var godsend = require('godsend');
var basic = require('godsend-basics');
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
	
	initialize: function(properties) {

		Object.assign(this, properties);
		this.storage = {};
	},
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local(),
			credentials: {
				username: basic.Credentials.get('agent').username,
				passphrase: basic.Credentials.get('agent').passphrase,
			}
		});
		connection.install({
			service : new (require('godsend-extras/src/store/Memory'))({}),
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
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					write : function(stream) {
						for (var i = 0; i < 10; i++) {
							stream.write({
								key : this.key = uuid.v4(),
								value : {
									title : 'Task ' + Math.floor(Math.random() * 100),
									done : Math.random() > 0.5 ? true : false 
								}
							});
						}
						stream.end();
					}.bind(this),
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				if (this.key) {
					connection.send({
						pattern: {
							topic: 'store',
							action: 'get',
							collection: 'tasks',
							match : {
								id : this.key
							}
						},
						receive: function(result) {
							console.log('result: ' + JSON.stringify(result, null, 2));
							sequence.next();
						}.bind(this)
					});
				} else {
					sequence.next();
				}
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'get',
						collection: 'tasks',
						reduce : {
							offset : 0,
							limit : 5
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