import createSubscription from "cable";

let subscription;

class GamesChannel {
  constructor() {
    this.connection = subscription;
  }

  subscribe(subscriber, connectedCallback, receivedCallback, disconnectedCallback) {
    subscription = createSubscription(subscriber, "GamesChannel", {
      connected(params) {
        if (connectedCallback) connectedCallback.call(null, params);
      },
      received(params) {
        if (receivedCallback) receivedCallback.call(null, params);
      },
      disconnected(params) {
        if (disconnectedCallback) disconnectedCallback.call(null, params);
      }
    });
    return subscription;
  }

  perform(action, data) {
    subscription.perform(action, data);
  }
}

export default GamesChannel;
