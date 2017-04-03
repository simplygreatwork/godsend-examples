
Client = Class.extend({
	
	initialize: function(properties) {
		
		new Sender().connect(function(sender) {
			sender.start();
			console.log('The example has started.');
		});
	}
});

Sender = Class.extend({
	
	connect : function(callback) {
		
		new godsend.Bus({
			address: window.location.host
		}).connect({
			credentials: {
				username: Credentials.get('client').username,
				passphrase: Credentials.get('client').passphrase,
			},
			initialized : function(connection) {
				this.connection = connection;
			}.bind(this),
			connected: function(connection) {
				this.connection = connection;
				callback(this);
			}.bind(this),
			errored : function(errors) {
				console.error('connection errors: ' + errors);
				callback(this);
			}.bind(this)
		});
	},
	
	start: function() {
		
		var sequence = basic.Sequence.start(

			function() {
				
				this.connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					data: {
						key: godsend.uuid(),
						value: {
							number: 1
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				this.connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					data: {
						key: godsend.uuid(),
						value: {
							title: 'New Task'
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				this.connection.send({
					pattern: {
						topic: 'store',
						action: 'put',
						collection: 'tasks'
					},
					data: {
						key: godsend.uuid(),
						value: {
							title: 'Another New Task'
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),

			function() {

				this.connection.send({
					pattern: {
						topic: 'store',
						action: 'all',
						collection: 'tasks'
					},
					data: {
						limit: 10,
						fields: {
							id: true,
							title: true,
							created: true
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});

			}.bind(this),
			
			function() {

				this.connection.send({
					pattern: {
						topic: 'store',
						action: 'all',
						collection: 'tasks'
					},
					data: {
						limit: 10,
						fields: {
							id: true,
							title: true,
							created: true,
							modified: true
						}
					},
					receive: function(result) {
						console.log('Result: ' + JSON.stringify(result, null, 2));
						sequence.next();
					}.bind(this)
				});
				
			}.bind(this),
			
			function() {
				
				console.log('The example has finished.');
				
			}.bind(this)
			
		);
	}
});

new Client({});