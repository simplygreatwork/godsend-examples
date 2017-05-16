
- Begin by deleting any file named "users.json" inside this directory.
- If you run the secure server first, the message "post-message", will not be authorized for the sender not the receiver.
- If you run the learning server next, the message "post-message" will be authorized for both the sender and the receiver.
- When you run the secure server again, the message "post-message" will be authorized for both the sender and the receiver.
- This is to be able to develop freely. When you are ready to deploy, verify all authorization patterns and run a secure server.
- Very important: Processors of a request must modify a sent object (stream.push) for the receivable pattern to be recognized and learned.
- If no processor modifies any object as a response to a sender, the receivable pattern will not be learned.