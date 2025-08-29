// Admin Dashboard JavaScript

// Global variables
let currentUsersPage = 1;
let currentProfilesPage = 1;
let currentFeedbackPage = 1;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadAdminStats();
    loadUsers();
    setupTabNavigation();
    
    // Check admin session
    checkAdminSession();
});

// Tab Navigation
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
            
            // Load data for the active tab
            switch(targetTab) {
                case 'users':
                    loadUsers();
                    break;
                case 'profiles':
                    loadProfiles();
                    break;
                case 'feedback':
                    loadFeedback();
                    break;
                case 'analytics':
                    loadAdminAnalytics();
                    break;
                case 'export':
                    // Export tab doesn't need data loading
                    break;
            }
        });
    });
}

// Admin session check
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin-session');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('adminWelcome').textContent = `Welcome, ${result.admin.full_name} (${result.admin.role})`;
        } else {
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Session check failed:', error);
        window.location.href = '/admin/login';
    }
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin-stats');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalUsers').textContent = result.data.total_users;
            document.getElementById('totalProfiles').textContent = result.data.total_profiles;
            document.getElementById('todayRegistrations').textContent = result.data.today_registrations;
            document.getElementById('totalFeedback').textContent = result.data.total_feedback;
        }
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

// Load users data
async function loadUsers(page = 1, search = '', filter = '') {
    const container = document.getElementById('usersTable');
    container.innerHTML = '<div class="loading-placeholder">Loading users...</div>';
    
    try {
        const params = new URLSearchParams({
            page: page,
            search: search,
            filter: filter
        });
        
        const response = await fetch(`/api/admin-users?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayUsers(result.data.users, result.data.pagination);
        } else {
            container.innerHTML = '<div class="loading-placeholder">Failed to load users.</div>';
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        container.innerHTML = '<div class="loading-placeholder">Failed to load users.</div>';
    }
}

function displayUsers(users, pagination) {
    const container = document.getElementById('usersTable');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No users found.</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Email Verified</th>
                    <th>Mobile Verified</th>
                    <th>Registered</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.mobile || 'N/A'}</td>
                <td><span class="status-badge status-${user.status}">${user.status}</span></td>
                <td>${user.email_verified ? '✅' : '❌'}</td>
                <td>${user.mobile_verified ? '✅' : '❌'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewUserDetails(${user.id})">View</button>
                    <button class="btn btn-sm btn-warning" onclick="toggleUserStatus(${user.id}, '${user.status}')">
                        ${user.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    // Add pagination
    if (pagination.total_pages > 1) {
        html += createPagination(pagination, 'loadUsers');
    }
    
    container.innerHTML = html;
}

// Load profiles data
async function loadProfiles(page = 1, search = '', profession = '') {
    const container = document.getElementById('profilesTable');
    container.innerHTML = '<div class="loading-placeholder">Loading profiles...</div>';
    
    try {
        const params = new URLSearchParams({
            page: page,
            search: search,
            profession: profession
        });
        
        const response = await fetch(`/api/admin-profiles?${params}`);
        const result = await response.json();
        
        if (result.success) {
            displayProfiles(result.data.profiles, result.data.pagination);
            // Populate profession filter
            populateProfessionFilter(result.data.professions);
        } else {
            container.innerHTML = '<div class="loading-placeholder">Failed to load profiles.</div>';
        }
    } catch (error) {
        console.error('Failed to load profiles:', error);
        container.innerHTML = '<div class="loading-placeholder">Failed to load profiles.</div>';
    }
}

function displayProfiles(profiles, pagination) {
    const container = document.getElementById('profilesTable');
    
    if (profiles.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No profiles found.</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Profession</th>
                    <th>Location</th>
                    <th>Experience</th>
                    <th>Company</th>
                    <th>Updated</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    profiles.forEach(profile => {
        html += `
            <tr>
                <td>${profile.id}</td>
                <td>${profile.full_name}</td>
                <td>${profile.email || 'N/A'}</td>
                <td>${profile.profession}</td>
                <td>${profile.current_location}</td>
                <td>${profile.experience} years</td>
                <td>${profile.company || 'N/A'}</td>
                <td>${new Date(profile.updated_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewProfileDetails(${profile.id})">View</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    // Add pagination
    if (pagination.total_pages > 1) {
        html += createPagination(pagination, 'loadProfiles');
    }
    
    container.innerHTML = html;
}

function populateProfessionFilter(professions) {
    const select = document.getElementById('professionFilter');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">All Professions</option>';
    professions.forEach(profession => {
        select.innerHTML += `<option value="${profession.profession}">${profession.profession} (${profession.count})</option>`;
    });
    
    select.value = currentValue;
}

// Load feedback data
async function loadFeedback(page = 1) {
    const container = document.getElementById('feedbackTable');
    container.innerHTML = '<div class="loading-placeholder">Loading feedback...</div>';
    
    try {
        const response = await fetch(`/api/admin-feedback?page=${page}`);
        const result = await response.json();
        
        if (result.success) {
            displayFeedback(result.data.feedback, result.data.pagination);
        } else {
            container.innerHTML = '<div class="loading-placeholder">Failed to load feedback.</div>';
        }
    } catch (error) {
        console.error('Failed to load feedback:', error);
        container.innerHTML = '<div class="loading-placeholder">Failed to load feedback.</div>';
    }
}

function displayFeedback(feedback, pagination) {
    const container = document.getElementById('feedbackTable');
    
    if (feedback.length === 0) {
        container.innerHTML = '<div class="loading-placeholder">No feedback found.</div>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    feedback.forEach(item => {
        html += `
            <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.email}</td>
                <td>${item.feedback_type}</td>
                <td>${item.subject}</td>
                <td>${item.rating ? '⭐'.repeat(item.rating) : 'N/A'}</td>
                <td><span class="status-badge status-${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewFeedbackDetails(${item.id})">View</button>
                    <button class="btn btn-sm btn-success" onclick="respondToFeedback(${item.id})">Respond</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    // Add pagination
    if (pagination.total_pages > 1) {
        html += createPagination(pagination, 'loadFeedback');
    }
    
    container.innerHTML = html;
}

// Load admin analytics
async function loadAdminAnalytics() {
    const container = document.getElementById('adminAnalytics');
    container.innerHTML = '<div class="loading-placeholder">Loading analytics...</div>';
    
    try {
        const response = await fetch('/api/admin-analytics');
        const result = await response.json();
        
        if (result.success) {
            displayAnalytics(result.data);
        } else {
            container.innerHTML = '<div class="loading-placeholder">Failed to load analytics.</div>';
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
        container.innerHTML = '<div class="loading-placeholder">Failed to load analytics.</div>';
    }
}

function displayAnalytics(data) {
    const container = document.getElementById('adminAnalytics');
    
    let html = `
        <div class="analytics-grid">
            <div class="stat-card">
                <div class="stat-number">${data.growth_stats.weekly_registrations}</div>
                <div class="stat-label">This Week's Registrations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.growth_stats.monthly_registrations}</div>
                <div class="stat-label">This Month's Registrations</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.growth_stats.profile_completion_rate}%</div>
                <div class="stat-label">Profile Completion Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.growth_stats.avg_rating.toFixed(1)}</div>
                <div class="stat-label">Average User Rating</div>
            </div>
        </div>
    `;
    
    // Add charts
    html += createAnalyticsCharts(data);
    
    container.innerHTML = html;
}

function createAnalyticsCharts(data) {
    let html = `
        <div class="chart-container">
            <h4>Registration Trends (Last 30 Days)</h4>
            <div class="chart-bars">
    `;
    
    const maxValue = Math.max(...data.registration_trends.map(item => item.count));
    
    data.registration_trends.forEach(item => {
        html += `
            <div class="chart-bar-item">
                <div class="chart-bar-label">${item.date}</div>
                <div class="chart-bar">
                    <div class="chart-bar-fill" style="width: ${(item.count / maxValue) * 100}%"></div>
                    <span class="chart-bar-value">${item.count}</span>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

// Create pagination
function createPagination(pagination, functionName) {
    let html = '<div class="pagination" style="margin-top: 1rem; text-align: center;">';
    
    if (pagination.current_page > 1) {
        html += `<button class="btn btn-sm btn-secondary" onclick="${functionName}(${pagination.current_page - 1})">Previous</button> `;
    }
    
    for (let i = Math.max(1, pagination.current_page - 2); 
         i <= Math.min(pagination.total_pages, pagination.current_page + 2); 
         i++) {
        const activeClass = i === pagination.current_page ? ' btn-primary' : ' btn-secondary';
        html += `<button class="btn btn-sm${activeClass}" onclick="${functionName}(${i})">${i}</button> `;
    }
    
    if (pagination.current_page < pagination.total_pages) {
        html += `<button class="btn btn-sm btn-secondary" onclick="${functionName}(${pagination.current_page + 1})">Next</button>`;
    }
    
    html += `<div style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">
        Showing ${pagination.start_item}-${pagination.end_item} of ${pagination.total_items} items
    </div>`;
    
    html += '</div>';
    return html;
}

// Search functions
function searchUsers() {
    const search = document.getElementById('userSearch').value;
    const filter = document.getElementById('userFilter').value;
    loadUsers(1, search, filter);
}

function searchProfiles() {
    const search = document.getElementById('profileSearch').value;
    const profession = document.getElementById('professionFilter').value;
    loadProfiles(1, search, profession);
}

// Action functions
function viewUserDetails(userId) {
    // Open modal or new page with user details
    alert(`View user details for ID: ${userId}`);
}

function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'suspend';
    
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        // API call to update user status
        updateUserStatus(userId, newStatus);
    }
}

async function updateUserStatus(userId, status) {
    try {
        const response = await fetch('/api/admin-update-user-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                status: status
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`User status updated successfully!`, 'success');
            loadUsers(); // Reload users
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        showMessage('Failed to update user status.', 'error');
    }
}

function viewProfileDetails(profileId) {
    alert(`View profile details for ID: ${profileId}`);
}

function viewFeedbackDetails(feedbackId) {
    alert(`View feedback details for ID: ${feedbackId}`);
}

function respondToFeedback(feedbackId) {
    const response = prompt('Enter your response:');
    if (response) {
        // API call to respond to feedback
        alert(`Response sent for feedback ID: ${feedbackId}`);
    }
}

// Export functions
async function exportData(type) {
    try {
        const response = await fetch(`/api/admin-export/${type}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `district_growth_${type}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`, 'success');
        } else {
            showMessage('Export failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Export failed. Please try again.', 'error');
    }
}

// Utility functions
function showMessage(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}
