# VPN IP Server

A secure VPN IP address hosting service with Bitcoin payment integration. Users can purchase and manage IP addresses from 50+ global locations with cryptocurrency payments.

## Features

- 🔐 **Secure Authentication** - User registration and login system
- 🌍 **Global IP Locations** - 50+ locations worldwide
- ₿ **Bitcoin Payments** - Secure cryptocurrency transactions
- 📱 **Modern UI** - Responsive web interface
- 🔄 **Real-time Status** - Payment and IP allocation tracking
- 👤 **User Profiles** - Account management and settings

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Authentication:** JWT, bcrypt
- **Payments:** Bitcoin Core integration
- **Frontend:** HTML5, CSS3, JavaScript
- **Security:** Helmet, CORS, Rate limiting

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd vpn-ip-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Health Check: http://localhost:3000/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get user profile
- `POST /api/auth/logout` - User logout

### Payments
- `POST /api/payment/initiate` - Create payment
- `GET /api/payment/status/:id` - Check payment status

### IP Management
- `GET /api/ip/locations` - Get available locations
- `GET /api/ip/my-ips` - Get user's allocated IPs

## Deployment

### Railway (Recommended)

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Deploy**
   ```bash
   railway up
   ```

### Environment Variables

Set these in your Railway dashboard:

- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key`
- `BITCOIN_RPC_URL=your-bitcoin-node-url` (optional)

## Project Structure

```
├── public/           # Frontend files
│   ├── index.html    # Main HTML file
│   ├── styles.css    # Styles
│   └── script.js     # Frontend JavaScript
├── routes/           # API routes
│   ├── auth.js       # Authentication routes
│   ├── payment.js    # Payment routes
│   └── ip.js         # IP management routes
├── services/         # Business logic
│   ├── database.js   # Database operations
│   ├── bitcoin.js    # Bitcoin integration
│   ├── payment.js    # Payment processing
│   └── ip.js         # IP management
├── server.js         # Main server file
└── package.json      # Dependencies
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@vpn-ip-server.com or create an issue in the repository. 