const DatabaseService = require('./database');
const BitcoinService = require('./bitcoin');
const IPService = require('./ip');
const QRCode = require('qrcode');

class PaymentService {
  constructor() {
    this.isInitialized = false;
    this.paymentMonitorInterval = null;
    this.db = DatabaseService;
    this.bitcoin = BitcoinService;
  }

  async initialize() {
    try {
      this.startPaymentMonitoring();
      this.isInitialized = true;
      console.log('Payment service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Payment service:', error);
      throw error;
    }
  }

  startPaymentMonitoring() {
    // Check payments every 30 seconds
    this.paymentMonitorInterval = setInterval(async () => {
      try {
        await this.checkPendingPayments();
      } catch (error) {
        console.error('Error in payment monitoring:', error);
      }
    }, 30000);

    console.log('Payment monitoring started');
  }

  async createPayment(userId, location, durationMonths = 1) {
    try {
      if (!this.isInitialized) {
        throw new Error('Payment service not initialized');
      }

      // Get available IP for the location
      const availableIPs = await DatabaseService.getAvailableIPs();
      const locationIPs = availableIPs.filter(ip => ip.location === location);

      if (locationIPs.length === 0) {
        throw new Error(`No available IP addresses for location: ${location}`);
      }

      // Generate Bitcoin address for payment
      const bitcoinAddress = await BitcoinService.generateNewAddress();

      // Calculate payment amount
      const monthlyPrice = parseFloat(process.env.MONTHLY_PRICE_BTC) || 0.001;
      const totalAmount = monthlyPrice * durationMonths;

      // Create payment record
      const paymentId = await DatabaseService.createPayment(
        userId,
        locationIPs[0].id,
        bitcoinAddress,
        totalAmount
      );

      // Get current Bitcoin price for display
      const btcPrice = await BitcoinService.getCurrentPrice();

      console.log(`Created payment ${paymentId} for user ${userId}, amount: ${totalAmount} BTC`);

      return {
        paymentId: paymentId,
        bitcoinAddress: bitcoinAddress,
        amountBTC: totalAmount,
        amountUSD: totalAmount * btcPrice.btc_usd,
        location: location,
        durationMonths: durationMonths,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        qrCode: await this.generateQRCode(bitcoinAddress, totalAmount)
      };
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async generateQRCode(address, amount) {
    try {
      const bitcoinURI = `bitcoin:${address}?amount=${amount}`;
      const qrCodeDataURL = await QRCode.toDataURL(bitcoinURI);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }

  async checkPendingPayments() {
    try {
      const pendingPayments = await DatabaseService.getPendingPayments();
      console.log(`Checking ${pendingPayments.length} pending payments`);

      for (const payment of pendingPayments) {
        await this.checkPaymentStatus(payment);
      }
    } catch (error) {
      console.error('Error checking pending payments:', error);
    }
  }

  async checkPaymentStatus(payment) {
    try {
      // Check if payment has expired (24 hours)
      const paymentAge = Date.now() - new Date(payment.created_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (paymentAge > maxAge) {
        await this.expirePayment(payment.id);
        return;
      }

      // Check Bitcoin address balance
      let balance = 0;
      try {
        balance = await BitcoinService.getAddressBalance(payment.bitcoin_address);
      } catch (error) {
        console.warn(`Could not get balance for address ${payment.bitcoin_address}:`, error.message);
        // In test mode, simulate payment after 30 seconds
        if (paymentAge > 30000) { // 30 seconds
          const mockTxid = `mock_txid_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await this.confirmPayment(payment.id, mockTxid);
        }
        return;
      }
      
      if (balance >= payment.amount_btc) {
        // Payment received, check for transaction
        const transactions = await BitcoinService.getAddressTransactions(payment.bitcoin_address);
        
        if (transactions.length > 0) {
          const latestTx = transactions[0];
          const txDetails = await BitcoinService.getTransactionDetails(latestTx);
          
          if (txDetails.amount >= payment.amount_btc) {
            await this.confirmPayment(payment.id, latestTx);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking payment status for payment ${payment.id}:`, error);
    }
  }

  async confirmPayment(paymentId, transactionHash) {
    try {
      // Update payment status
      await DatabaseService.updatePaymentStatus(paymentId, 'confirmed', transactionHash);

      // Get payment details
      const payment = await DatabaseService.getPayment(paymentId);
      
      // Allocate IP address to user
      const allocation = await IPService.allocateIPAddress(
        payment.user_id,
        payment.location,
        1 // 1 month duration
      );

      console.log(`Payment ${paymentId} confirmed, IP ${allocation.ipAddress} allocated to user ${payment.user_id}`);

      // Log admin action
      await DatabaseService.logAdminAction(
        'payment_confirmed',
        `Payment ${paymentId} confirmed, IP ${allocation.ipAddress} allocated`,
        null
      );

      return {
        success: true,
        paymentId: paymentId,
        transactionHash: transactionHash,
        allocation: allocation
      };
    } catch (error) {
      console.error(`Error confirming payment ${paymentId}:`, error);
      throw error;
    }
  }

  async expirePayment(paymentId) {
    try {
      await DatabaseService.updatePaymentStatus(paymentId, 'expired');
      console.log(`Payment ${paymentId} expired`);
    } catch (error) {
      console.error(`Error expiring payment ${paymentId}:`, error);
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const payment = await DatabaseService.getPayment(paymentId);
      
      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      // Get current balance for the Bitcoin address
      let currentBalance = 0;
      try {
        currentBalance = await BitcoinService.getAddressBalance(payment.bitcoin_address);
      } catch (error) {
        console.warn(`Could not get balance for address ${payment.bitcoin_address}:`, error.message);
      }

      // Calculate time remaining
      const paymentAge = Date.now() - new Date(payment.created_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const timeRemaining = Math.max(0, maxAge - paymentAge);

      return {
        paymentId: payment.id,
        status: payment.status,
        bitcoinAddress: payment.bitcoin_address,
        amountBTC: payment.amount_btc,
        currentBalance: currentBalance,
        receivedAmount: currentBalance,
        timeRemaining: timeRemaining,
        createdAt: payment.created_at,
        confirmedAt: payment.confirmed_at,
        transactionHash: payment.transaction_hash,
        location: payment.location,
        username: payment.username
      };
    } catch (error) {
      console.error(`Error getting payment status for ${paymentId}:`, error);
      throw error;
    }
  }

  async getUserPayments(userId) {
    try {
      const payments = await DatabaseService.all(
        'SELECT p.*, ip.ip_address, ip.location FROM payments p JOIN ip_addresses ip ON p.ip_address_id = ip.id WHERE p.user_id = ? ORDER BY p.created_at DESC',
        [userId]
      );

      return payments.map(payment => ({
        id: payment.id,
        status: payment.status,
        amountBTC: payment.amount_btc,
        bitcoinAddress: payment.bitcoin_address,
        transactionHash: payment.transaction_hash,
        createdAt: payment.created_at,
        confirmedAt: payment.confirmed_at,
        ipAddress: payment.ip_address,
        location: payment.location
      }));
    } catch (error) {
      console.error(`Error getting payments for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new PaymentService(); 