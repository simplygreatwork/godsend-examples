
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
		godsend.mount({
			service : require('godsend-extras').store.Memory,
			options : {},
			connection : connection
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
					data: {
						key : uuid.v4(),
						value : {
							label : 'Task One'
						}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),

			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					data: {
						key : uuid.v4(),
						value : {
							label : 'Task Two'
						}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				connection.send({
					pattern: {
						topic: 'store',
						action: 'find',
						collection: 'tasks'
					},
					data: {
						limit: 100,
						fields: {}
					},
					receive: function(result) {
						console.log('result: ' + JSON.stringify(result, null, 2));
						if (result.objects.length > 0) {
							this.key = result.objects[0].key;
						}
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
							collection: 'tasks'
						},
						data: {
							key : this.key
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