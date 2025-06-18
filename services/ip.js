const logger = require('./logger');
const DatabaseService = require('./database');

class IPService {
  constructor() {
    this.isInitialized = false;
    this.vpnConfigs = new Map();
  }

  async initialize() {
    try {
      // Initialize VPN configurations for different locations
      await this.initializeVPNConfigs();
      this.isInitialized = true;
      logger.info('IP service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize IP service:', error);
      throw error;
    }
  }

  async initializeVPNConfigs() {
    // Define VPN configurations for different locations
    const locations = [
      { name: 'New York, USA', country: 'US', city: 'New York' },
      { name: 'London, UK', country: 'GB', city: 'London' },
      { name: 'Tokyo, Japan', country: 'JP', city: 'Tokyo' },
      { name: 'Sydney, Australia', country: 'AU', city: 'Sydney' },
      { name: 'Frankfurt, Germany', country: 'DE', city: 'Frankfurt' },
      { name: 'Singapore', country: 'SG', city: 'Singapore' },
      { name: 'Toronto, Canada', country: 'CA', city: 'Toronto' },
      { name: 'Amsterdam, Netherlands', country: 'NL', city: 'Amsterdam' },
      { name: 'Paris, France', country: 'FR', city: 'Paris' },
      { name: 'Mumbai, India', country: 'IN', city: 'Mumbai' },
      { name: 'São Paulo, Brazil', country: 'BR', city: 'São Paulo' },
      { name: 'Seoul, South Korea', country: 'KR', city: 'Seoul' },
      { name: 'Moscow, Russia', country: 'RU', city: 'Moscow' },
      { name: 'Mexico City, Mexico', country: 'MX', city: 'Mexico City' },
      { name: 'Cairo, Egypt', country: 'EG', city: 'Cairo' },
      { name: 'Bangkok, Thailand', country: 'TH', city: 'Bangkok' },
      { name: 'Istanbul, Turkey', country: 'TR', city: 'Istanbul' },
      { name: 'Jakarta, Indonesia', country: 'ID', city: 'Jakarta' },
      { name: 'Lagos, Nigeria', country: 'NG', city: 'Lagos' },
      { name: 'Buenos Aires, Argentina', country: 'AR', city: 'Buenos Aires' }
    ];

    for (const location of locations) {
      this.vpnConfigs.set(location.name, {
        ...location,
        config: await this.generateVPNConfig(location)
      });
    }

    logger.info(`Initialized ${this.vpnConfigs.size} VPN configurations`);
  }

  async generateVPNConfig(location) {
    // This would generate actual VPN configuration files
    // For now, we'll create placeholder configurations
    return {
      server: `${location.city.toLowerCase()}.vpn.example.com`,
      port: 1194,
      protocol: 'udp',
      cipher: 'AES-256-CBC',
      auth: 'SHA256',
      keyDirection: 1,
      remoteCertTls: 'server',
      verifyX509Name: location.city,
      persistKey: true,
      persistTun: true,
      verb: 3,
      mute: 20,
      keepalive: '10 120',
      compLzo: 'no',
      authUserPass: true
    };
  }

  async allocateIPAddress(userId, location, durationMonths = 1) {
    try {
      if (!this.isInitialized) {
        throw new Error('IP service not initialized');
      }

      // Get available IP addresses for the requested location
      const availableIPs = await DatabaseService.getAvailableIPs();
      const locationIPs = availableIPs.filter(ip => ip.location === location);

      if (locationIPs.length === 0) {
        throw new Error(`No available IP addresses for location: ${location}`);
      }

      // Select the first available IP
      const selectedIP = locationIPs[0];

      // Allocate the IP address
      await DatabaseService.allocateIP(selectedIP.id, userId, durationMonths);

      // Generate VPN configuration for the user
      const vpnConfig = await this.generateUserVPNConfig(selectedIP, userId);

      logger.info(`Allocated IP ${selectedIP.ip_address} to user ${userId} for location ${location}`);

      return {
        ipAddress: selectedIP.ip_address,
        location: selectedIP.location,
        expiresAt: new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000),
        vpnConfig: vpnConfig
      };
    } catch (error) {
      logger.error('Error allocating IP address:', error);
      throw error;
    }
  }

  async generateUserVPNConfig(ipAddress, userId) {
    try {
      const vpnConfig = this.vpnConfigs.get(ipAddress.location);
      if (!vpnConfig) {
        throw new Error(`No VPN configuration found for location: ${ipAddress.location}`);
      }

      // Generate unique credentials for the user
      const username = `user_${userId}_${Date.now()}`;
      const password = this.generateSecurePassword();

      // Create user-specific configuration
      const userConfig = {
        ...vpnConfig.config,
        username: username,
        password: password,
        remote: vpnConfig.config.server,
        dev: 'tun',
        resolvRetry: 'infinite',
        nobind: true,
        user: 'nobody',
        group: 'nobody',
        remoteRandom: true,
        cipher: vpnConfig.config.cipher,
        auth: vpnConfig.config.auth,
        keyDirection: vpnConfig.config.keyDirection,
        remoteCertTls: vpnConfig.config.remoteCertTls,
        verifyX509Name: vpnConfig.config.verifyX509Name,
        persistKey: vpnConfig.config.persistKey,
        persistTun: vpnConfig.config.persistTun,
        verb: vpnConfig.config.verb,
        mute: vpnConfig.config.mute,
        keepalive: vpnConfig.config.keepalive,
        compLzo: vpnConfig.config.compLzo,
        authUserPass: vpnConfig.config.authUserPass
      };

      // Save user credentials to database (you might want to add a credentials table)
      await this.saveUserCredentials(userId, username, password);

      return {
        config: userConfig,
        credentials: {
          username: username,
          password: password
        }
      };
    } catch (error) {
      logger.error('Error generating user VPN config:', error);
      throw error;
    }
  }

  async saveUserCredentials(userId, username, password) {
    // This would save credentials to a secure database
    // For now, we'll just log them (in production, use proper encryption)
    logger.info(`Generated credentials for user ${userId}: ${username}`);
  }

  generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async deallocateIPAddress(ipId) {
    try {
      if (!this.isInitialized) {
        throw new Error('IP service not initialized');
      }

      // Get IP address details before deallocation
      const ipAddress = await DatabaseService.get(`SELECT * FROM ip_addresses WHERE id = ?`, [ipId]);
      
      if (!ipAddress) {
        throw new Error(`IP address with ID ${ipId} not found`);
      }

      // Deallocate the IP address
      await DatabaseService.deallocateIP(ipId);

      // Clean up user credentials
      await this.cleanupUserCredentials(ipAddress.allocated_to_user_id);

      logger.info(`Deallocated IP ${ipAddress.ip_address}`);
      return true;
    } catch (error) {
      logger.error('Error deallocating IP address:', error);
      throw error;
    }
  }

  async cleanupUserCredentials(userId) {
    // This would remove user credentials from the database
    logger.info(`Cleaned up credentials for user ${userId}`);
  }

  async getUserIPAddresses(userId) {
    try {
      const userIPs = await DatabaseService.getUserIPs(userId);
      
      const result = await Promise.all(userIPs.map(async (ip) => {
        const vpnConfig = await this.generateUserVPNConfig(ip, userId);
        return {
          id: ip.id,
          ipAddress: ip.ip_address,
          location: ip.location,
          allocatedAt: ip.allocated_at,
          expiresAt: ip.expires_at,
          vpnConfig: vpnConfig
        };
      }));

      return result;
    } catch (error) {
      logger.error('Error getting user IP addresses:', error);
      throw error;
    }
  }

  async getAvailableLocations() {
    try {
      const availableIPs = await DatabaseService.getAvailableIPs();
      const locations = [...new Set(availableIPs.map(ip => ip.location))];
      
      return locations.map(location => ({
        name: location,
        availableIPs: availableIPs.filter(ip => ip.location === location).length
      }));
    } catch (error) {
      logger.error('Error getting available locations:', error);
      throw error;
    }
  }

  async getAllocatedIPs() {
    try {
      const allocatedIPs = await DatabaseService.getAllocatedIPs();
      
      return allocatedIPs.map(ip => ({
        id: ip.id,
        ipAddress: ip.ip_address,
        location: ip.location,
        username: ip.username,
        email: ip.email,
        allocatedAt: ip.allocated_at,
        expiresAt: ip.expires_at
      }));
    } catch (error) {
      logger.error('Error getting allocated IPs:', error);
      throw error;
    }
  }
}

module.exports = new IPService(); 