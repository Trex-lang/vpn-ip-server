class BitcoinService {
  constructor() {
    this.client = null;
    this.isTestMode = true;
  }

  async initialize() {
    try {
      console.log('Bitcoin service initialized in test mode');
      this.isTestMode = true;
    } catch (error) {
      console.log('Bitcoin service initialization failed:', error.message);
      this.isTestMode = true;
    }
  }

  async generateNewAddress() {
    if (this.isTestMode) {
      // Generate a test address
      const testAddress = `tb1${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      console.log(`Generated test Bitcoin address: ${testAddress}`);
      return testAddress;
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async getAddressBalance(address) {
    if (this.isTestMode) {
      // Return a random balance for testing
      return Math.random() * 0.001;
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async getTransaction(txid) {
    if (this.isTestMode) {
      // Return mock transaction data
      return {
        txid: txid,
        confirmations: Math.floor(Math.random() * 6),
        amount: Math.random() * 0.001
      };
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async getTransactionDetails(txid) {
    if (this.isTestMode) {
      return {
        txid: txid,
        confirmations: Math.floor(Math.random() * 6),
        amount: Math.random() * 0.001,
        time: Date.now(),
        blocktime: Date.now() - 600000
      };
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async isTransactionConfirmed(txid, requiredConfirmations = 1) {
    if (this.isTestMode) {
      // Simulate confirmation after 30 seconds
      return Math.random() > 0.5;
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async getAddressTransactions(address) {
    if (this.isTestMode) {
      return [];
    }
    
    throw new Error('Bitcoin Core not configured');
  }

  async getCurrentPrice() {
    try {
      // In production, you would fetch from an API
      return {
        usd: 45000 + (Math.random() * 10000),
        btc: 1
      };
    } catch (error) {
      console.error('Error getting current Bitcoin price:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      return {
        status: 'healthy',
        mode: this.isTestMode ? 'test' : 'production',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Bitcoin service health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new BitcoinService(); 