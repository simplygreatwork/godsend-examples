
var fs = require('fs');
var godsend = require('godsend');
var basic = require('godsend-basics');
var Class = godsend.Class; 
var uuid = require('uuid');

Example = Class.extend({
	
	initialize: function() {
		
		new basic.Server({
			address : basic.Utility.local(),
			exchange : new godsend.Exchange.Open()
		}).start(function() {
			new Agent.One().start();
			new Agent.Two().start();
			new Sender().start();
			console.log('The example has started.');
		}.bind(this));
	}
});

Agent = {
	
	One : Class.extend({
		
		start: function() {
			
			var connection = godsend.connect({
				address: basic.Utility.local()
			});
			
			connection.mount({
				id: 'send-message',
				on: function(request) {
					request.accept({
						action: 'send-message'
					});
				}.bind(this),
				run: function(stream) {
					stream.push({
						message: 'Received a message from the sender!'
					});
					stream.next();
				}.bind(this)
			});
		}
	}),
	
	Two : Class.extend({
		
		start: function() {
			
			var connection = godsend.connect({
				address: basic.Utility.local()
			});
		}
	})
};

Sender = Class.extend({
	
	start: function() {
		
		var connection = godsend.connect({
			address: basic.Utility.local()
		});
		
		var sequence = basic.Sequence.start(
			
			function() {
				
				connection.send({
					pattern: {
						action: 'send-message'
					},
					data: {
						message: 'Message'
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
