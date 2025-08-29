// District Growth Application - Main JavaScript File

// Utility Functions
function showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alert to the top of container
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function showLoading(element) {
    element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

function hideLoading(element, originalContent) {
    element.innerHTML = originalContent;
}

// API Functions
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// User Authentication Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const result = await apiRequest('/api/login', 'POST', loginData);
        
        if (result.success) {
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/profile';
            }, 1500);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Login failed. Please try again.', 'error');
    }
}

// OTP Verification Variables
let otpCountdown = 0;
let otpVerified = false;

// OTP Functions
async function sendOTP() {
    const email = document.getElementById('email').value;
    const mobile = document.getElementById('mobile').value;
    
    if (!email || !mobile) {
        showMessage('Please enter both email and mobile number first.', 'error');
        return;
    }
    
    // Validate mobile format
    const mobileRegex = /^\+[1-9]\d{10,13}$/;
    if (!mobileRegex.test(mobile)) {
        showMessage('Please enter mobile in correct format: +91xxxxxxxxxx', 'error');
        return;
    }
    
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const originalBtnText = sendOtpBtn.innerHTML;
    sendOtpBtn.innerHTML = 'Sending...';
    sendOtpBtn.disabled = true;
    
    try {
        const result = await apiRequest('/api/send-otp', 'POST', {
            email: email,
            mobile: mobile,
            type: 'both'
        });
        
        if (result.success) {
            showMessage('OTP sent to your email and mobile!', 'success');
            document.getElementById('otpSection').style.display = 'block';
            document.getElementById('verifyOtpBtn').style.display = 'inline-block';
            startOtpCountdown();
        } else {
            showMessage(result.message, 'error');
            sendOtpBtn.innerHTML = originalBtnText;
            sendOtpBtn.disabled = false;
        }
    } catch (error) {
        showMessage('Failed to send OTP. Please try again.', 'error');
        sendOtpBtn.innerHTML = originalBtnText;
        sendOtpBtn.disabled = false;
    }
}

async function verifyOTP() {
    const email = document.getElementById('email').value;
    const mobile = document.getElementById('mobile').value;
    const otp = document.getElementById('otp').value;
    
    if (!otp || otp.length !== 6) {
        showMessage('Please enter a valid 6-digit OTP.', 'error');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyOtpBtn');
    const originalBtnText = verifyBtn.innerHTML;
    verifyBtn.innerHTML = 'Verifying...';
    verifyBtn.disabled = true;
    
    try {
        const result = await apiRequest('/api/verify-otp', 'POST', {
            email: email,
            mobile: mobile,
            otp: otp
        });
        
        if (result.success) {
            showMessage('OTP verified successfully!', 'success');
            document.getElementById('otpVerified').style.display = 'block';
            document.getElementById('otpTimer').style.display = 'none';
            verifyBtn.style.display = 'none';
            document.getElementById('sendOtpBtn').style.display = 'none';
            document.getElementById('otp').disabled = true;
            otpVerified = true;
        } else {
            showMessage(result.message, 'error');
            verifyBtn.innerHTML = originalBtnText;
            verifyBtn.disabled = false;
        }
    } catch (error) {
        showMessage('OTP verification failed. Please try again.', 'error');
        verifyBtn.innerHTML = originalBtnText;
        verifyBtn.disabled = false;
    }
}

function startOtpCountdown() {
    otpCountdown = 60;
    const countdownElement = document.getElementById('countdown');
    const otpTimer = document.getElementById('otpTimer');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    
    otpTimer.style.display = 'block';
    sendOtpBtn.disabled = true;
    sendOtpBtn.innerHTML = 'Resend OTP';
    
    const interval = setInterval(() => {
        otpCountdown--;
        countdownElement.textContent = otpCountdown;
        
        if (otpCountdown <= 0) {
            clearInterval(interval);
            otpTimer.style.display = 'none';
            sendOtpBtn.disabled = false;
            sendOtpBtn.innerHTML = 'Resend OTP';
        }
    }, 1000);
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const otp = formData.get('otp');
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    if (!otpVerified || !otp) {
        showMessage('Please verify your OTP first!', 'error');
        return;
    }
    
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        mobile: formData.get('mobile'),
        password: password,
        otp: otp
    };
    
    try {
        const result = await apiRequest('/api/register', 'POST', registerData);
        
        if (result.success) {
            showMessage('Registration successful! Please login.', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Registration failed. Please try again.', 'error');
    }
}

// Profile Management Functions
async function handleProfileSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
        full_name: formData.get('full_name'),
        profile_email: formData.get('profile_email'),
        profession: formData.get('profession'),
        education: formData.get('education'),
        experience: parseInt(formData.get('experience')),
        skills: formData.get('skills'),
        current_location: formData.get('current_location'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        salary_range: formData.get('salary_range'),
        availability: formData.get('availability')
    };
    
    try {
        const result = await apiRequest('/api/profile', 'POST', profileData);
        
        if (result.success) {
            showMessage('Profile updated successfully!', 'success');
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Profile update failed. Please try again.', 'error');
    }
}

// Search Functions
async function handleSearch() {
    const profession = document.getElementById('searchProfession').value;
    const location = document.getElementById('searchLocation').value;
    const education = document.getElementById('searchEducation').value;
    const experience = document.getElementById('searchExperience').value;
    
    const params = new URLSearchParams();
    if (profession) params.append('profession', profession);
    if (location) params.append('location', location);
    if (education) params.append('education', education);
    if (experience) params.append('experience', experience);
    
    const resultsContainer = document.getElementById('searchResults');
    showLoading(resultsContainer);
    
    try {
        const result = await apiRequest(`/api/search?${params.toString()}`);
        
        if (result.success) {
            displaySearchResults(result.data);
        } else {
            showMessage(result.message, 'error');
            resultsContainer.innerHTML = '<p class="text-center">No results found.</p>';
        }
    } catch (error) {
        showMessage('Search failed. Please try again.', 'error');
        resultsContainer.innerHTML = '<p class="text-center">Search failed.</p>';
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="text-center">No professionals found matching your criteria.</p>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(person => `
        <div class="result-card">
            <div class="result-header">
                <div>
                    <div class="result-name">${person.full_name}</div>
                    <div class="result-profession">${person.profession}</div>
                </div>
                <span class="availability-badge ${getBadgeClass(person.availability)}">
                    ${person.availability}
                </span>
            </div>
            <div class="result-details">
                <div><strong>Education:</strong> ${person.education}</div>
                <div><strong>Experience:</strong> ${person.experience} years</div>
                <div><strong>Location:</strong> ${person.current_location}</div>
                ${person.company ? `<div><strong>Company:</strong> ${person.company}</div>` : ''}
                ${person.skills ? `<div><strong>Skills:</strong> ${person.skills}</div>` : ''}
                ${person.salary_range ? `<div><strong>Salary Range:</strong> ${person.salary_range}</div>` : ''}
            </div>
            <div class="text-center mt-2">
                <button class="btn btn-primary" onclick="connectWithProfessional('${person.username}')">
                    Connect
                </button>
            </div>
        </div>
    `).join('');
}

function getBadgeClass(availability) {
    switch (availability) {
        case 'Available':
            return 'badge-available';
        case 'Not Available':
            return 'badge-not-available';
        case 'Open to Opportunities':
            return 'badge-open';
        default:
            return 'badge-available';
    }
}

function connectWithProfessional(username) {
    showMessage(`Connection request sent to ${username}!`, 'success');
    // Here you would implement the actual connection logic
}

// Analytics Functions
async function loadAnalytics() {
    const analyticsContainer = document.getElementById('analyticsContent');
    showLoading(analyticsContainer);
    
    try {
        const result = await apiRequest('/api/analytics');
        
        if (result.success) {
            displayAnalytics(result.data);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Failed to load analytics.', 'error');
    }
}

function displayAnalytics(data) {
    const analyticsContainer = document.getElementById('analyticsContent');
    
    const totalProfessionals = data.profession_stats.reduce((sum, item) => sum + item.count, 0);
    const totalLocations = data.location_stats.length;
    const topProfession = data.profession_stats[0]?.profession || 'N/A';
    const topLocation = data.location_stats[0]?.current_location || 'N/A';
    
    analyticsContainer.innerHTML = `
        <div class="analytics-grid">
            <div class="stat-card">
                <div class="stat-number">${totalProfessionals}</div>
                <div class="stat-label">Total Professionals</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalLocations}</div>
                <div class="stat-label">Locations Covered</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.profession_stats.length}</div>
                <div class="stat-label">Different Professions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${topProfession}</div>
                <div class="stat-label">Top Profession</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Top Professions</h3>
            <div id="professionChart">${createBarChart(data.profession_stats.slice(0, 10))}</div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Top Locations</h3>
            <div id="locationChart">${createBarChart(data.location_stats.slice(0, 10))}</div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Experience Distribution</h3>
            <div id="experienceChart">${createBarChart(data.experience_stats)}</div>
        </div>
        
        <div class="chart-container">
            <h3 class="chart-title">Education Distribution</h3>
            <div id="educationChart">${createBarChart(data.education_stats.slice(0, 10))}</div>
        </div>
    `;
}

function createBarChart(data) {
    if (!data || data.length === 0) {
        return '<p class="text-center">No data available</p>';
    }
    
    const maxValue = Math.max(...data.map(item => item.count));
    
    return `
        <div class="chart-bars">
            ${data.map(item => `
                <div class="chart-bar-item">
                    <div class="chart-bar-label">${item.profession || item.current_location || item.education || item.experience_level}</div>
                    <div class="chart-bar">
                        <div class="chart-bar-fill" style="width: ${(item.count / maxValue) * 100}%"></div>
                        <span class="chart-bar-value">${item.count}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Form Validation
function validateForm(formElement) {
    const requiredFields = formElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            field.style.borderColor = '#e1e5e9';
        }
    });
    
    return isValid;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // OTP functionality for registration
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', sendOTP);
    }
    
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', verifyOTP);
    }
    
    // Show OTP section when email and mobile are filled
    const emailField = document.getElementById('email');
    const mobileField = document.getElementById('mobile');
    if (emailField && mobileField) {
        const checkFields = () => {
            if (emailField.value && mobileField.value) {
                document.getElementById('otpSection').style.display = 'block';
            }
        };
        emailField.addEventListener('blur', checkFields);
        mobileField.addEventListener('blur', checkFields);
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Search functionality
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
    }
    
    // Search on enter key
    const searchInputs = document.querySelectorAll('.search-filters input, .search-filters select');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    });
    
    // Load analytics if on analytics page
    if (document.getElementById('analyticsContent')) {
        loadAnalytics();
    }
    
    // Clear search functionality
    const clearSearchButton = document.getElementById('clearSearch');
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', function() {
            document.getElementById('searchProfession').value = '';
            document.getElementById('searchLocation').value = '';
            document.getElementById('searchEducation').value = '';
            document.getElementById('searchExperience').value = '';
            document.getElementById('searchResults').innerHTML = '<p class="text-center">Enter search criteria above to find professionals.</p>';
        });
    }
});

// CSS for charts (to be added to the head dynamically)
if (!document.getElementById('chart-styles')) {
    const chartStyles = document.createElement('style');
    chartStyles.id = 'chart-styles';
    chartStyles.textContent = `
        .chart-bars {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .chart-bar-item {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        
        .chart-bar-label {
            min-width: 200px;
            font-weight: 600;
            color: #333;
        }
        
        .chart-bar {
            flex: 1;
            background-color: #f8f9fa;
            border-radius: 4px;
            position: relative;
            height: 30px;
            display: flex;
            align-items: center;
        }
        
        .chart-bar-fill {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        
        .chart-bar-value {
            position: absolute;
            right: 10px;
            font-weight: 600;
            color: #333;
            font-size: 0.9rem;
        }
    `;
    document.head.appendChild(chartStyles);
}
