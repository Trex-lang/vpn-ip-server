const Client = require('bitcoin-core');
const logger = require('./logger');

class BitcoinService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.isTestMode = false;
  }

  async initialize() {
    try {
      // Check if Bitcoin Core credentials are provided
      if (!process.env.BITCOIN_RPC_USER || !process.env.BITCOIN_RPC_PASSWORD) {
        logger.warn('Bitcoin Core credentials not provided, running in test mode');
        this.isTestMode = true;
        this.isInitialized = true;
        return;
      }

      this.client = new Client({
        network: process.env.BITCOIN_NETWORK || 'testnet',
        username: process.env.BITCOIN_RPC_USER,
        password: process.env.BITCOIN_RPC_PASSWORD,
        port: process.env.BITCOIN_RPC_PORT || 8332,
        host: process.env.BITCOIN_RPC_HOST || 'localhost'
      });

      // Test connection
      await this.client.getBlockchainInfo();
      this.isInitialized = true;
      logger.info('Bitcoin service initialized successfully');
    } catch (error) {
      logger.warn('Bitcoin Core connection failed, running in test mode:', error.message);
      this.isTestMode = true;
      this.isInitialized = true;
    }
  }

  async generateNewAddress() {
    try {
      if (this.isTestMode) {
        // Generate a test address
        const testAddress = `tb1${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        logger.info(`Generated test Bitcoin address: ${testAddress}`);
        return testAddress;
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const address = await this.client.getNewAddress();
      logger.info(`Generated new Bitcoin address: ${address}`);
      return address;
    } catch (error) {
      logger.error('Error generating new Bitcoin address:', error);
      throw error;
    }
  }

  async getAddressBalance(address) {
    try {
      if (this.isTestMode) {
        // Return a random balance for testing
        return Math.random() * 0.01;
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const balance = await this.client.getReceivedByAddress(address);
      return balance;
    } catch (error) {
      logger.error(`Error getting balance for address ${address}:`, error);
      throw error;
    }
  }

  async getTransaction(txid) {
    try {
      if (this.isTestMode) {
        // Return mock transaction data
        return {
          txid: txid,
          amount: 0.001,
          confirmations: 6,
          blockhash: 'mock_block_hash',
          blockindex: 0,
          blocktime: Date.now() / 1000,
          time: Date.now() / 1000,
          timereceived: Date.now() / 1000,
          details: []
        };
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const transaction = await this.client.getTransaction(txid);
      return transaction;
    } catch (error) {
      logger.error(`Error getting transaction ${txid}:`, error);
      throw error;
    }
  }

  async getTransactionDetails(txid) {
    try {
      if (this.isTestMode) {
        return {
          txid: txid,
          amount: 0.001,
          confirmations: 6,
          blockhash: 'mock_block_hash',
          blockindex: 0,
          blocktime: Date.now() / 1000,
          time: Date.now() / 1000,
          timereceived: Date.now() / 1000,
          details: []
        };
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const details = await this.client.getTransaction(txid);
      return {
        txid: details.txid,
        amount: details.amount,
        confirmations: details.confirmations,
        blockhash: details.blockhash,
        blockindex: details.blockindex,
        blocktime: details.blocktime,
        time: details.time,
        timereceived: details.timereceived,
        details: details.details
      };
    } catch (error) {
      logger.error(`Error getting transaction details for ${txid}:`, error);
      throw error;
    }
  }

  async isTransactionConfirmed(txid, requiredConfirmations = 6) {
    try {
      if (this.isTestMode) {
        return true; // Always return true in test mode
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const transaction = await this.client.getTransaction(txid);
      return transaction.confirmations >= requiredConfirmations;
    } catch (error) {
      logger.error(`Error checking confirmation for transaction ${txid}:`, error);
      throw error;
    }
  }

  async getAddressTransactions(address, count = 100) {
    try {
      if (this.isTestMode) {
        return [`mock_txid_${Date.now()}`];
      }

      if (!this.isInitialized) {
        throw new Error('Bitcoin service not initialized');
      }

      const transactions = await this.client.listReceivedByAddress(0, true, true);
      const addressTransactions = transactions.find(tx => tx.address === address);
      
      if (addressTransactions) {
        return addressTransactions.txids.slice(0, count);
      }
      
      return [];
    } catch (error) {
      logger.error(`Error getting transactions for address ${address}:`, error);
      throw error;
    }
  }

  async getCurrentPrice() {
    try {
      // This would typically call an external API like CoinGecko
      // For now, we'll return a placeholder
      // In production, you'd want to integrate with a price API
      return {
        btc_usd: 45000, // Placeholder price
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting current Bitcoin price:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'not_initialized', error: 'Bitcoin service not initialized' };
      }

      if (this.isTestMode) {
        return {
          status: 'test_mode',
          message: 'Running in test mode - Bitcoin Core not available',
          timestamp: new Date().toISOString()
        };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Bitcoin service health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new BitcoinService(); 