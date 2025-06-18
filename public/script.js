// Global variables
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// API base URL
const API_BASE = 'http://localhost:3000/api';

// DOM elements
const nav = document.getElementById('nav');
const sections = document.querySelectorAll('.section');
const authStatus = document.getElementById('authStatus');
const paymentResult = document.getElementById('paymentResult');
const statusResult = document.getElementById('statusResult');
const qrModal = document.getElementById('qrModal');
const closeModal = document.querySelector('.close');
const confirmModal = document.getElementById('confirmModal');

// Custom confirmation dialog function
function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmModal.style.display = 'block';
    
    // Handle confirm button
    document.getElementById('confirmYes').onclick = function() {
        confirmModal.style.display = 'none';
        onConfirm();
    };
    
    // Handle cancel button
    document.getElementById('confirmNo').onclick = function() {
        confirmModal.style.display = 'none';
    };
    
    // Handle clicking outside modal
    confirmModal.onclick = function(e) {
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    };
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    setupForms();
    setupModal();
    setupAuthTabs();
    checkAuthStatus();
    loadLocations();
    showDefaultSection();

    // Email action toggle
    const emailAction = document.getElementById('emailAction');
    const emailStatement = emailAction.querySelector('.action-statement');
    const emailForm = document.getElementById('editEmailForm');
    
    emailStatement.addEventListener('click', function() {
        emailStatement.classList.toggle('active');
        emailForm.classList.toggle('hidden');
    });

    // Password action toggle
    const passwordAction = document.getElementById('passwordAction');
    const passwordStatement = passwordAction.querySelector('.action-statement');
    const passwordForm = document.getElementById('changePasswordForm');
    
    passwordStatement.addEventListener('click', function() {
        passwordStatement.classList.toggle('active');
        passwordForm.classList.toggle('hidden');
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', function() {
        showConfirmDialog('Logout Confirmation', 'Are you sure you want to logout?', function() {
            // Clear authentication data
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            authToken = null;
            currentUser = null;
            
            // Immediately reset UI and show homepage
            const header = document.querySelector('.header p');
            header.textContent = 'Secure IP addresses with Bitcoin payments';
            
            // Show login/signup tabs immediately
            document.querySelector('.nav-btn[data-section="login"]').style.display = 'inline-block';
            document.querySelector('.nav-btn[data-section="signup"]').style.display = 'inline-block';
            
            // Disable payment and IP sections
            const navBtns = document.querySelectorAll('.nav-btn');
            navBtns.forEach(btn => {
                if (btn.dataset.section === 'payment' || btn.dataset.section === 'my-ips') {
                    btn.disabled = true;
                }
            });
            
            // Simple approach: remove all active classes, then add to intro
            const allSections = document.querySelectorAll('.section');
            allSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // Add active class to intro section
            const introSection = document.getElementById('intro');
            introSection.classList.add('active');
            
            // Update navigation
            navBtns.forEach(b => b.classList.remove('active'));
            document.querySelector('.nav-btn[data-section="intro"]').classList.add('active');
            
            // Reset profile section
            const profileInfo = document.getElementById('profileInfo');
            profileInfo.innerHTML = '<div class="info">You are logged out.</div>';
            
            // Hide logout button
            logoutBtn.style.display = 'none';
            
            // Show success message
            showMessage(document.body, 'Logged out successfully', 'success');
            
            // Debug: log the current state
            console.log('Logout completed. Intro section active:', introSection.classList.contains('active'));
            console.log('Intro section display:', window.getComputedStyle(introSection).display);
        });
    });
});

// Navigation setup
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showSection(btn.dataset.section);
        });
    });
}

function showSection(sectionId) {
    const allSections = document.querySelectorAll('.section');
    const targetSection = document.getElementById(sectionId);
    
    // Remove active class from all sections
    allSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Add active class to target section
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Load section-specific data
    if (sectionId === 'locations') {
        loadLocations();
    } else if (sectionId === 'my-ips' && authToken) {
        loadMyIPs();
    } else if (sectionId === 'profile' && authToken) {
        loadProfile();
    } else if (sectionId === 'profile' && !authToken) {
        document.getElementById('profileInfo').innerHTML = '<div class="error">You must be logged in to view your profile.</div>';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

// Form setup
function setupForms() {
    // Registration form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Payment form
    document.getElementById('paymentForm').addEventListener('submit', handlePayment);
    
    // Status form
    document.getElementById('statusForm').addEventListener('submit', handleStatusCheck);

    // Email update form
    document.getElementById('editEmailForm').addEventListener('submit', handleEditEmail);

    // Password change form
    document.getElementById('changePasswordForm').addEventListener('submit', handleChangePassword);
}

// Authentication functions
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
    };
    
    const statusDiv = document.getElementById('registerStatus');
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Automatically log in after successful registration
            await autoLoginAfterRegister(formData.username, formData.password, statusDiv);
        } else {
            showMessage(statusDiv, data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Network error. Please try again.', 'error');
    }
}

async function autoLoginAfterRegister(username, password, statusDiv) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = username;
            showMessage(statusDiv, 'Registration successful! You are now logged in.', 'success');
            document.getElementById('registerForm').reset();
            updateUIForAuth();
            loadMyIPs();
            handleLoginSuccess();
        } else {
            showMessage(statusDiv, 'Registration succeeded but auto-login failed. Please login manually.', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Registration succeeded but auto-login failed. Please login manually.', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = {
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value
    };
    
    const statusDiv = document.getElementById('loginStatus');
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = formData.username;
            
            showMessage(statusDiv, 'Login successful!', 'success');
            document.getElementById('loginForm').reset();
            
            // Update UI for logged-in user
            updateUIForAuth();
            
            // Load user's IPs
            loadMyIPs();
            handleLoginSuccess();
        } else {
            showMessage(statusDiv, data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Network error. Please try again.', 'error');
    }
}

function updateUIForAuth() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    if (authToken && currentUser) {
        // User is logged in
        // Show user info in header
        const header = document.querySelector('.header p');
        header.textContent = `Welcome, ${currentUser}!`;
        
        // Hide login/signup tabs
        document.querySelector('.nav-btn[data-section="login"]').style.display = 'none';
        document.querySelector('.nav-btn[data-section="signup"]').style.display = 'none';
        
        // Enable payment and IP sections
        navBtns.forEach(btn => {
            if (btn.dataset.section === 'payment' || btn.dataset.section === 'my-ips') {
                btn.disabled = false;
            }
        });
    } else {
        // User is not logged in
        const header = document.querySelector('.header p');
        header.textContent = 'Secure IP addresses with Bitcoin payments';
        
        // Show login/signup tabs
        document.querySelector('.nav-btn[data-section="login"]').style.display = 'inline-block';
        document.querySelector('.nav-btn[data-section="signup"]').style.display = 'inline-block';
        
        // Disable payment and IP sections
        navBtns.forEach(btn => {
            if (btn.dataset.section === 'payment' || btn.dataset.section === 'my-ips') {
                btn.disabled = true;
            }
        });
    }
}

function checkAuthStatus() {
    if (authToken) {
        // Verify token is still valid
        fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Invalid token');
            }
        })
        .then(data => {
            currentUser = data.user.username;
            updateUIForAuth();
        })
        .catch(() => {
            // Token is invalid, clear it
            authToken = null;
            localStorage.removeItem('authToken');
            currentUser = null;
        });
    }
}

// Location functions
async function loadLocations() {
    const locationsGrid = document.getElementById('locationsGrid');
    locationsGrid.innerHTML = '<div class="loading">Loading locations...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/ip/locations`);
        const locations = await response.json();
        
        if (response.ok) {
            displayLocations(locations);
            populateLocationSelect(locations);
        } else {
            locationsGrid.innerHTML = '<div class="error">Failed to load locations</div>';
        }
    } catch (error) {
        locationsGrid.innerHTML = '<div class="error">Network error loading locations</div>';
    }
}

function displayLocations(locations) {
    const locationsGrid = document.getElementById('locationsGrid');
    
    if (locations.length === 0) {
        locationsGrid.innerHTML = '<div class="info">No locations available</div>';
        return;
    }
    
    locationsGrid.innerHTML = locations.map(location => `
        <div class="location-card">
            <h3>${location.name}</h3>
            <p class="available">${location.availableIPs} IPs available</p>
        </div>
    `).join('');
}

function populateLocationSelect(locations) {
    const select = document.getElementById('paymentLocation');
    select.innerHTML = '<option value="">Select Location</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = `${location.name} (${location.availableIPs} available)`;
        select.appendChild(option);
    });
}

// Payment functions
async function handlePayment(e) {
    e.preventDefault();
    
    if (!authToken) {
        showMessage(paymentResult, 'Please login first', 'error');
        return;
    }
    
    const formData = {
        location: document.getElementById('paymentLocation').value,
        durationMonths: parseInt(document.getElementById('paymentDuration').value)
    };
    
    try {
        const response = await fetch(`${API_BASE}/payment/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showPaymentModal(data);
            showMessage(paymentResult, 'Payment created successfully!', 'success');
        } else {
            showMessage(paymentResult, data.error || 'Payment creation failed', 'error');
        }
    } catch (error) {
        showMessage(paymentResult, 'Network error. Please try again.', 'error');
    }
}

function showPaymentModal(paymentData) {
    const qrContainer = document.getElementById('qrCodeContainer');
    const detailsContainer = document.getElementById('paymentDetails');
    
    // Display QR code
    if (paymentData.qrCode) {
        qrContainer.innerHTML = `<img src="${paymentData.qrCode}" alt="Bitcoin QR Code">`;
    } else {
        qrContainer.innerHTML = '<p>QR code not available</p>';
    }
    
    // Display payment details
    detailsContainer.innerHTML = `
        <p><strong>Payment ID:</strong> ${paymentData.paymentId}</p>
        <p><strong>Bitcoin Address:</strong> ${paymentData.bitcoinAddress}</p>
        <p><strong>Amount:</strong> ${paymentData.amountBTC} BTC ($${paymentData.amountUSD})</p>
        <p><strong>Location:</strong> ${paymentData.location}</p>
        <p><strong>Duration:</strong> ${paymentData.durationMonths} month(s)</p>
        <p><strong>Expires:</strong> ${new Date(paymentData.expiresAt).toLocaleString()}</p>
    `;
    
    qrModal.style.display = 'block';
}

// Status check functions
async function handleStatusCheck(e) {
    e.preventDefault();
    
    const paymentId = document.getElementById('paymentId').value;
    
    try {
        const response = await fetch(`${API_BASE}/payment/status/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayPaymentStatus(data);
        } else {
            showMessage(statusResult, data.error || 'Failed to check status', 'error');
        }
    } catch (error) {
        showMessage(statusResult, 'Network error. Please try again.', 'error');
    }
}

function displayPaymentStatus(statusData) {
    const statusHtml = `
        <div class="status-info">
            <h3>Payment Status: ${statusData.status.toUpperCase()}</h3>
            <p><strong>Payment ID:</strong> ${statusData.paymentId}</p>
            <p><strong>Bitcoin Address:</strong> ${statusData.bitcoinAddress}</p>
            <p><strong>Amount:</strong> ${statusData.amountBTC} BTC</p>
            <p><strong>Received:</strong> ${statusData.receivedAmount} BTC</p>
            <p><strong>Time Remaining:</strong> ${Math.floor(statusData.timeRemaining / 60000)} minutes</p>
            <p><strong>Created:</strong> ${new Date(statusData.createdAt).toLocaleString()}</p>
            ${statusData.confirmedAt ? `<p><strong>Confirmed:</strong> ${new Date(statusData.confirmedAt).toLocaleString()}</p>` : ''}
            ${statusData.transactionHash ? `<p><strong>Transaction:</strong> ${statusData.transactionHash}</p>` : ''}
        </div>
    `;
    
    statusResult.innerHTML = statusHtml;
    statusResult.className = `status-result ${statusData.status}`;
}

// My IPs functions
async function loadMyIPs() {
    if (!authToken) return;
    
    const ipsList = document.getElementById('myIPsList');
    ipsList.innerHTML = '<div class="loading">Loading your IPs...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/ip/my`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const ips = await response.json();
        
        if (response.ok) {
            displayMyIPs(ips);
        } else {
            ipsList.innerHTML = '<div class="error">Failed to load your IPs</div>';
        }
    } catch (error) {
        ipsList.innerHTML = '<div class="error">Network error loading your IPs</div>';
    }
}

function displayMyIPs(ips) {
    const ipsList = document.getElementById('myIPsList');
    
    if (ips.length === 0) {
        ipsList.innerHTML = '<div class="info">You have no allocated IPs yet. Make a payment to get started!</div>';
        return;
    }
    
    ipsList.innerHTML = ips.map(ip => `
        <div class="ip-card">
            <h3>IP Address: ${ip.ipAddress}</h3>
            <div class="ip-details">
                <div class="ip-detail">
                    <strong>Location:</strong> ${ip.location}
                </div>
                <div class="ip-detail">
                    <strong>Allocated:</strong> ${new Date(ip.allocatedAt).toLocaleDateString()}
                </div>
                <div class="ip-detail">
                    <strong>Expires:</strong> ${new Date(ip.expiresAt).toLocaleDateString()}
                </div>
                <div class="ip-detail">
                    <strong>VPN Username:</strong> ${ip.vpnConfig.credentials.username}
                </div>
            </div>
        </div>
    `).join('');
}

// Modal setup
function setupModal() {
    closeModal.addEventListener('click', function() {
        qrModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === qrModal) {
            qrModal.style.display = 'none';
        }
    });
}

function setupAuthTabs() {
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    const tabPanels = document.querySelectorAll('.auth-tab-panel');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(tab + 'Panel').classList.add('active');
        });
    });
}

// Utility functions
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
    
    // Clear message after 5 seconds
    setTimeout(() => {
        element.textContent = '';
        element.className = 'status-message';
    }, 5000);
}

// Auto-refresh payment status for pending payments
setInterval(() => {
    if (authToken && document.getElementById('status').classList.contains('active')) {
        const paymentId = document.getElementById('paymentId').value;
        if (paymentId) {
            handleStatusCheck(new Event('submit'));
        }
    }
}, 10000); // Check every 10 seconds

// Profile functions
async function loadProfile() {
    const profileInfo = document.getElementById('profileInfo');
    const logoutBtn = document.getElementById('logoutBtn');
    profileInfo.classList.add('loading');
    profileInfo.innerHTML = 'Loading profile...';
    logoutBtn.style.display = 'block';
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            profileInfo.classList.remove('loading');
            profileInfo.innerHTML = `
                <p><strong>Username:</strong> ${data.user.username}</p>
                <p><strong>Email:</strong> ${data.user.email || 'N/A'}</p>
                <p><strong>Registered:</strong> ${data.user.created_at ? new Date(data.user.created_at).toLocaleString() : 'N/A'}</p>
            `;
        } else {
            profileInfo.innerHTML = `<div class="error">${data.error || 'Failed to load profile.'}</div>`;
            logoutBtn.style.display = 'none';
        }
    } catch (error) {
        profileInfo.innerHTML = '<div class="error">Network error loading profile.</div>';
        logoutBtn.style.display = 'none';
    }
}

// Email update function
async function handleEditEmail(e) {
    e.preventDefault();
    const email = document.getElementById('editEmail').value;
    const statusDiv = document.getElementById('editEmailStatus');
    statusDiv.textContent = '';
    if (!authToken) return;
    try {
        const response = await fetch(`${API_BASE}/auth/update-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(statusDiv, 'Email updated successfully!', 'success');
            loadProfile();
        } else {
            showMessage(statusDiv, data.error || 'Failed to update email', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Network error. Please try again.', 'error');
    }
}

// Password change function
async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const statusDiv = document.getElementById('changePasswordStatus');
    statusDiv.textContent = '';
    if (!authToken) return;
    if (newPassword !== confirmNewPassword) {
        showMessage(statusDiv, 'New passwords do not match.', 'error');
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            showMessage(statusDiv, 'Password changed successfully!', 'success');
            document.getElementById('changePasswordForm').reset();
        } else {
            showMessage(statusDiv, data.error || 'Failed to change password', 'error');
        }
    } catch (error) {
        showMessage(statusDiv, 'Network error. Please try again.', 'error');
    }
}

// Show intro by default if not logged in
function showDefaultSection() {
    const navBtns = document.querySelectorAll('.nav-btn');
    if (!localStorage.getItem('authToken')) {
        showSection('intro');
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-btn[data-section="intro"]').classList.add('active');
        // Show login/signup tabs when not authenticated
        document.querySelector('.nav-btn[data-section="login"]').style.display = 'inline-block';
        document.querySelector('.nav-btn[data-section="signup"]').style.display = 'inline-block';
    } else {
        showSection('locations');
        navBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('.nav-btn[data-section="locations"]').classList.add('active');
        // Hide login/signup tabs when authenticated
        document.querySelector('.nav-btn[data-section="login"]').style.display = 'none';
        document.querySelector('.nav-btn[data-section="signup"]').style.display = 'none';
    }
}

// After login/signup, hide intro and show app
function handleLoginSuccess() {
    const navBtns = document.querySelectorAll('.nav-btn');
    showSection('intro');
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-section="intro"]').classList.add('active');
    // Hide login/signup tabs after successful authentication
    document.querySelector('.nav-btn[data-section="login"]').style.display = 'none';
    document.querySelector('.nav-btn[data-section="signup"]').style.display = 'none';
    // ...existing login success logic...
} 