
Client = Class.extend({
	
	initialize: function(properties) {
		
		new Sender().start();
		console.log('The example has started.');
	}
});

Sender = Class.extend({
	
	start : function() {
		
		var connection = godsend.connect({
			address: window.location.host,
			credentials: {
				username: Credentials.get('client').username,
				passphrase: Credentials.get('client').passphrase,
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

				connection.send({
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

				connection.send({
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

				connection.send({
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

				connection.send({
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