from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_mysqldb import MySQL
from flask_mail import Mail, Message
import MySQLdb.cursors
import re
import hashlib
from datetime import datetime, timedelta
import random
import string
from twilio.rest import Client
import os
from dotenv import load_dotenv
import json
import pyotp

app = Flask(__name__)

# Load environment variables
load_dotenv()

# Secret key for session management
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# MySQL Configuration
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'district_growth')

# Email Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')  # Set in .env file
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')  # Set in .env file

# Twilio Configuration for SMS
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

mysql = MySQL(app)
mail = Mail(app)

@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('index.html')

@app.route('/register')
def register():
    """User registration page"""
    return render_template('register.html')

@app.route('/login')
def login():
    """User login page"""
    return render_template('login.html')

@app.route('/profile')
def profile():
    """User profile page for data input"""
    if 'loggedin' in session:
        return render_template('profile.html')
    return redirect(url_for('login'))

@app.route('/search')
def search():
    """Professional search page"""
    return render_template('search.html')

@app.route('/analytics')
def analytics():
    """District growth analytics page"""
    return render_template('analytics.html')

@app.route('/vision')
def mla_vision():
    """Vision page - Shri Gaurav Gautam's ideas"""
    return render_template('vision.html')

@app.route('/developers')
def developers():
    """Developers page - About the development team"""
    return render_template('developers.html')

@app.route('/feedback')
def feedback():
    """Feedback and suggestions page"""
    return render_template('feedback.html')

# Admin Routes
@app.route('/admin/login')
def admin_login():
    """Admin login page"""
    return render_template('admin_login.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    """Admin dashboard page"""
    if 'admin_loggedin' in session:
        return render_template('admin_dashboard.html')
    return redirect(url_for('admin_login'))

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_loggedin', None)
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    session.pop('admin_role', None)
    return redirect(url_for('admin_login'))

# Helper Functions
def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_email_otp(email, otp):
    """Send OTP via email"""
    try:
        msg = Message('District Growth - Email Verification', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.html = f'''
        <html>
        <body>
            <h2>Email Verification - District Growth Platform</h2>
            <p>Your OTP for email verification is: <strong>{otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </body>
        </html>
        '''
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email error: {str(e)}")
        return False

def send_sms_otp(mobile, otp):
    """Send OTP via SMS using Twilio"""
    try:
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=f"Your District Growth verification OTP is: {otp}. Valid for 10 minutes.",
                from_=TWILIO_PHONE_NUMBER,
                to=mobile
            )
            return True
        return False
    except Exception as e:
        print(f"SMS error: {str(e)}")
        return False

# API Routes
@app.route('/api/send-otp', methods=['POST'])
def api_send_otp():
    """Send OTP for registration verification"""
    try:
        data = request.get_json()
        email = data.get('email')
        mobile = data.get('mobile')
        otp_type = data.get('type', 'both')  # 'email', 'mobile', or 'both'
        
        if not email and not mobile:
            return jsonify({'success': False, 'message': 'Email or mobile number required'})
        
        # Generate OTP
        otp = generate_otp()
        expires_at = datetime.now() + timedelta(minutes=10)
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Clean up expired OTPs
        cursor.execute('DELETE FROM otp_verifications WHERE expires_at < %s', (datetime.now(),))
        
        # Store OTP in database
        cursor.execute('''INSERT INTO otp_verifications 
                        (email, mobile, otp_code, otp_type, expires_at) 
                        VALUES (%s, %s, %s, %s, %s)''',
                     (email, mobile, otp, otp_type, expires_at))
        mysql.connection.commit()
        
        # Send OTP
        email_sent = False
        sms_sent = False
        
        if email and (otp_type in ['email', 'both']):
            email_sent = send_email_otp(email, otp)
        
        if mobile and (otp_type in ['mobile', 'both']):
            sms_sent = send_sms_otp(mobile, otp)
        
        cursor.close()
        
        if email_sent or sms_sent:
            return jsonify({'success': True, 'message': 'OTP sent successfully!'})
        else:
            return jsonify({'success': False, 'message': 'Failed to send OTP. Please try again.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/verify-otp', methods=['POST'])
def api_verify_otp():
    """Verify OTP for registration"""
    try:
        data = request.get_json()
        email = data.get('email')
        mobile = data.get('mobile')
        otp_code = data.get('otp')
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Find valid OTP
        query = '''SELECT * FROM otp_verifications 
                  WHERE otp_code = %s AND expires_at > %s AND is_verified = FALSE'''
        params = [otp_code, datetime.now()]
        
        if email:
            query += ' AND email = %s'
            params.append(email)
        if mobile:
            query += ' AND mobile = %s'
            params.append(mobile)
        
        cursor.execute(query, params)
        otp_record = cursor.fetchone()
        
        if otp_record:
            # Update OTP as verified
            cursor.execute('UPDATE otp_verifications SET is_verified = TRUE WHERE id = %s', 
                         (otp_record['id'],))
            mysql.connection.commit()
            cursor.close()
            return jsonify({'success': True, 'message': 'OTP verified successfully!'})
        else:
            # Increment attempts
            cursor.execute('''UPDATE otp_verifications SET attempts = attempts + 1 
                            WHERE otp_code = %s''', (otp_code,))
            mysql.connection.commit()
            cursor.close()
            return jsonify({'success': False, 'message': 'Invalid or expired OTP!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/register', methods=['POST'])
def api_register():
    """Handle user registration with OTP verification"""
    try:
        data = request.get_json()
        username = data['username']
        email = data['email']
        mobile = data.get('mobile')
        password = data['password']
        otp_code = data.get('otp')
        
        # Verify OTP first
        if otp_code:
            cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute('''SELECT * FROM otp_verifications 
                            WHERE otp_code = %s AND email = %s AND is_verified = TRUE 
                            AND expires_at > %s''',
                         (otp_code, email, datetime.now()))
            otp_verified = cursor.fetchone()
            
            if not otp_verified:
                return jsonify({'success': False, 'message': 'Please verify your OTP first!'})
        
        # Hash password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', (username, email))
        account = cursor.fetchone()
        
        if account:
            return jsonify({'success': False, 'message': 'Account already exists!'})
        else:
            # Create user account
            cursor.execute('''INSERT INTO users 
                            (username, email, mobile, password, email_verified, mobile_verified, status, created_at) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''', 
                         (username, email, mobile, hashed_password, True, bool(mobile), 'active', datetime.now()))
            mysql.connection.commit()
            
            # Clean up verified OTP
            if otp_code:
                cursor.execute('DELETE FROM otp_verifications WHERE otp_code = %s', (otp_code,))
                mysql.connection.commit()
            
            cursor.close()
            return jsonify({'success': True, 'message': 'Registration successful!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/login', methods=['POST'])
def api_login():
    """Handle user login"""
    try:
        data = request.get_json()
        username = data['username']
        password = data['password']
        
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM users WHERE username = %s AND password = %s', (username, hashed_password))
        account = cursor.fetchone()
        cursor.close()
        
        if account:
            session['loggedin'] = True
            session['id'] = account['id']
            session['username'] = account['username']
            return jsonify({'success': True, 'message': 'Login successful!'})
        else:
            return jsonify({'success': False, 'message': 'Incorrect username/password!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/profile', methods=['POST'])
def api_profile():
    """Handle professional profile data submission"""
    if 'loggedin' not in session:
        return jsonify({'success': False, 'message': 'Please login first'})
    
    try:
        data = request.get_json()
        user_id = session['id']
        
        # Extract profile data
        full_name = data['full_name']
        profile_email = data.get('profile_email', '')
        profession = data['profession']
        education = data['education']
        experience = data['experience']
        skills = data['skills']
        current_location = data['current_location']
        phone = data['phone']
        company = data.get('company', '')
        salary_range = data.get('salary_range', '')
        availability = data.get('availability', '')
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if profile exists
        cursor.execute('SELECT * FROM professional_profiles WHERE user_id = %s', (user_id,))
        existing = cursor.fetchone()
        
        if existing:
            # Update existing profile
            cursor.execute('''UPDATE professional_profiles SET 
                            full_name=%s, profession=%s, education=%s, experience=%s, 
                            skills=%s, current_location=%s, phone=%s, email=%s, company=%s, 
                            salary_range=%s, availability=%s, updated_at=%s 
                            WHERE user_id=%s''',
                         (full_name, profession, education, experience, skills, 
                          current_location, phone, profile_email, company, salary_range, 
                          availability, datetime.now(), user_id))
        else:
            # Insert new profile
            cursor.execute('''INSERT INTO professional_profiles 
                            (user_id, full_name, profession, education, experience, 
                             skills, current_location, phone, email, company, salary_range, 
                             availability, created_at, updated_at) 
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                         (user_id, full_name, profession, education, experience, 
                          skills, current_location, phone, profile_email, company, salary_range, 
                          availability, datetime.now(), datetime.now()))
        
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({'success': True, 'message': 'Profile updated successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/search', methods=['GET'])
def api_search():
    """Handle professional search queries"""
    try:
        profession = request.args.get('profession', '')
        location = request.args.get('location', '')
        education = request.args.get('education', '')
        experience = request.args.get('experience', '')
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Build dynamic query
        query = '''SELECT pp.*, u.username FROM professional_profiles pp 
                  JOIN users u ON pp.user_id = u.id WHERE 1=1'''
        params = []
        
        if profession:
            query += ' AND pp.profession LIKE %s'
            params.append(f'%{profession}%')
        if location:
            query += ' AND pp.current_location LIKE %s'
            params.append(f'%{location}%')
        if education:
            query += ' AND pp.education LIKE %s'
            params.append(f'%{education}%')
        if experience:
            query += ' AND pp.experience >= %s'
            params.append(experience)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()
        
        return jsonify({'success': True, 'data': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/analytics', methods=['GET'])
def api_analytics():
    """Get district growth analytics data"""
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Get profession distribution
        cursor.execute('''SELECT profession, COUNT(*) as count 
                         FROM professional_profiles 
                         GROUP BY profession 
                         ORDER BY count DESC''')
        profession_stats = cursor.fetchall()
        
        # Get location distribution
        cursor.execute('''SELECT current_location, COUNT(*) as count 
                         FROM professional_profiles 
                         GROUP BY current_location 
                         ORDER BY count DESC''')
        location_stats = cursor.fetchall()
        
        # Get education distribution
        cursor.execute('''SELECT education, COUNT(*) as count 
                         FROM professional_profiles 
                         GROUP BY education 
                         ORDER BY count DESC''')
        education_stats = cursor.fetchall()
        
        # Get experience distribution
        cursor.execute('''SELECT 
                         CASE 
                         WHEN experience < 2 THEN 'Fresher (0-2 years)'
                         WHEN experience < 5 THEN 'Mid-level (2-5 years)'
                         WHEN experience < 10 THEN 'Senior (5-10 years)'
                         ELSE 'Expert (10+ years)'
                         END as experience_level,
                         COUNT(*) as count
                         FROM professional_profiles 
                         GROUP BY experience_level 
                         ORDER BY count DESC''')
        experience_stats = cursor.fetchall()
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'data': {
                'profession_stats': profession_stats,
                'location_stats': location_stats,
                'education_stats': education_stats,
                'experience_stats': experience_stats
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/feedback', methods=['POST'])
def api_feedback():
    """Handle feedback and suggestions submission"""
    try:
        data = request.get_json()
        name = data['name']
        email = data['email']
        feedback_type = data['feedback_type']
        subject = data['subject']
        message = data['message']
        rating = data.get('rating', 0)
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('''INSERT INTO feedback 
                        (name, email, feedback_type, subject, message, rating, 
                         user_id, created_at) 
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
                     (name, email, feedback_type, subject, message, rating, 
                      session.get('id'), datetime.now()))
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({'success': True, 'message': 'Thank you for your feedback! We appreciate your input.'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# Admin API Routes
@app.route('/api/admin-login', methods=['POST'])
def api_admin_login():
    """Handle admin login"""
    try:
        data = request.get_json()
        username = data['username']
        password = data['password']
        
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM admin_users WHERE username = %s AND password = %s AND is_active = TRUE', 
                     (username, hashed_password))
        admin = cursor.fetchone()
        
        if admin:
            # Update last login
            cursor.execute('UPDATE admin_users SET last_login = %s WHERE id = %s', 
                         (datetime.now(), admin['id']))
            mysql.connection.commit()
            
            # Set session
            session['admin_loggedin'] = True
            session['admin_id'] = admin['id']
            session['admin_username'] = admin['username']
            session['admin_role'] = admin['role']
            
            cursor.close()
            return jsonify({'success': True, 'message': 'Admin login successful!'})
        else:
            cursor.close()
            return jsonify({'success': False, 'message': 'Invalid credentials!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-session', methods=['GET'])
def api_admin_session():
    """Check admin session"""
    if 'admin_loggedin' in session:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT * FROM admin_users WHERE id = %s', (session['admin_id'],))
        admin = cursor.fetchone()
        cursor.close()
        
        if admin:
            return jsonify({
                'success': True,
                'admin': {
                    'id': admin['id'],
                    'username': admin['username'],
                    'full_name': admin['full_name'],
                    'role': admin['role']
                }
            })
    
    return jsonify({'success': False, 'message': 'Not authenticated'})

@app.route('/api/admin-stats', methods=['GET'])
def api_admin_stats():
    """Get admin dashboard statistics"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Total users
        cursor.execute('SELECT COUNT(*) as count FROM users')
        total_users = cursor.fetchone()['count']
        
        # Total profiles
        cursor.execute('SELECT COUNT(*) as count FROM professional_profiles')
        total_profiles = cursor.fetchone()['count']
        
        # Today's registrations
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()')
        today_registrations = cursor.fetchone()['count']
        
        # Total feedback
        cursor.execute('SELECT COUNT(*) as count FROM feedback')
        total_feedback = cursor.fetchone()['count']
        
        cursor.close()
        
        return jsonify({
            'success': True,
            'data': {
                'total_users': total_users,
                'total_profiles': total_profiles,
                'today_registrations': today_registrations,
                'total_feedback': total_feedback
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-users', methods=['GET'])
def api_admin_users():
    """Get users data for admin dashboard"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        page = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        filter_status = request.args.get('filter', '')
        limit = 20
        offset = (page - 1) * limit
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Build query
        where_clause = 'WHERE 1=1'
        params = []
        
        if search:
            where_clause += ' AND (username LIKE %s OR email LIKE %s)'
            params.extend([f'%{search}%', f'%{search}%'])
        
        if filter_status:
            where_clause += ' AND status = %s'
            params.append(filter_status)
        
        # Get total count
        count_query = f'SELECT COUNT(*) as total FROM users {where_clause}'
        cursor.execute(count_query, params)
        total_items = cursor.fetchone()['total']
        
        # Get users data
        query = f'''SELECT * FROM users {where_clause} 
                   ORDER BY created_at DESC LIMIT %s OFFSET %s'''
        cursor.execute(query, params + [limit, offset])
        users = cursor.fetchall()
        
        cursor.close()
        
        # Calculate pagination
        total_pages = (total_items + limit - 1) // limit
        
        return jsonify({
            'success': True,
            'data': {
                'users': users,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_items': total_items,
                    'start_item': offset + 1,
                    'end_item': min(offset + limit, total_items)
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-profiles', methods=['GET'])
def api_admin_profiles():
    """Get professional profiles data for admin dashboard"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        page = int(request.args.get('page', 1))
        search = request.args.get('search', '')
        profession_filter = request.args.get('profession', '')
        limit = 20
        offset = (page - 1) * limit
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Build query
        where_clause = 'WHERE 1=1'
        params = []
        
        if search:
            where_clause += ' AND (full_name LIKE %s OR email LIKE %s OR company LIKE %s)'
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        if profession_filter:
            where_clause += ' AND profession = %s'
            params.append(profession_filter)
        
        # Get total count
        count_query = f'SELECT COUNT(*) as total FROM professional_profiles {where_clause}'
        cursor.execute(count_query, params)
        total_items = cursor.fetchone()['total']
        
        # Get profiles data
        query = f'''SELECT * FROM professional_profiles {where_clause} 
                   ORDER BY updated_at DESC LIMIT %s OFFSET %s'''
        cursor.execute(query, params + [limit, offset])
        profiles = cursor.fetchall()
        
        # Get profession statistics for filter
        cursor.execute('''SELECT profession, COUNT(*) as count 
                         FROM professional_profiles 
                         GROUP BY profession 
                         ORDER BY count DESC''')
        professions = cursor.fetchall()
        
        cursor.close()
        
        # Calculate pagination
        total_pages = (total_items + limit - 1) // limit
        
        return jsonify({
            'success': True,
            'data': {
                'profiles': profiles,
                'professions': professions,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_items': total_items,
                    'start_item': offset + 1,
                    'end_item': min(offset + limit, total_items)
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-feedback', methods=['GET'])
def api_admin_feedback():
    """Get feedback data for admin dashboard"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        page = int(request.args.get('page', 1))
        limit = 20
        offset = (page - 1) * limit
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Get total count
        cursor.execute('SELECT COUNT(*) as total FROM feedback')
        total_items = cursor.fetchone()['total']
        
        # Get feedback data
        cursor.execute('''SELECT * FROM feedback 
                         ORDER BY created_at DESC LIMIT %s OFFSET %s''',
                     (limit, offset))
        feedback = cursor.fetchall()
        
        cursor.close()
        
        # Calculate pagination
        total_pages = (total_items + limit - 1) // limit
        
        return jsonify({
            'success': True,
            'data': {
                'feedback': feedback,
                'pagination': {
                    'current_page': page,
                    'total_pages': total_pages,
                    'total_items': total_items,
                    'start_item': offset + 1,
                    'end_item': min(offset + limit, total_items)
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-update-user-status', methods=['POST'])
def api_admin_update_user_status():
    """Update user status"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        data = request.get_json()
        user_id = data['user_id']
        status = data['status']
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('UPDATE users SET status = %s WHERE id = %s', (status, user_id))
        mysql.connection.commit()
        
        # Log admin activity
        cursor.execute('''INSERT INTO admin_activity_log 
                        (admin_id, action, target_type, target_id, description, created_at) 
                        VALUES (%s, %s, %s, %s, %s, %s)''',
                     (session['admin_id'], f'update_user_status_{status}', 'user', user_id, 
                      f'Changed user status to {status}', datetime.now()))
        mysql.connection.commit()
        cursor.close()
        
        return jsonify({'success': True, 'message': 'User status updated successfully!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/admin-export/<data_type>', methods=['GET'])
def api_admin_export(data_type):
    """Export data as CSV"""
    if 'admin_loggedin' not in session:
        return jsonify({'success': False, 'message': 'Not authorized'})
    
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        if data_type == 'users':
            cursor.execute('''SELECT id, username, email, mobile, status, email_verified, 
                            mobile_verified, created_at FROM users ORDER BY created_at DESC''')
        elif data_type == 'profiles':
            cursor.execute('''SELECT pp.*, u.username, u.email as user_email 
                            FROM professional_profiles pp 
                            JOIN users u ON pp.user_id = u.id 
                            ORDER BY pp.updated_at DESC''')
        elif data_type == 'feedback':
            cursor.execute('''SELECT * FROM feedback ORDER BY created_at DESC''')
        else:
            return jsonify({'success': False, 'message': 'Invalid data type'})
        
        data = cursor.fetchall()
        cursor.close()
        
        # Convert to CSV
        import io
        import csv
        
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        
        csv_data = output.getvalue()
        output.close()
        
        # Log admin activity
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('''INSERT INTO admin_activity_log 
                        (admin_id, action, target_type, description, created_at) 
                        VALUES (%s, %s, %s, %s, %s)''',
                     (session['admin_id'], f'export_{data_type}', 'system', 
                      f'Exported {data_type} data', datetime.now()))
        mysql.connection.commit()
        cursor.close()
        
        from flask import Response
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename=district_growth_{data_type}_{datetime.now().strftime("%Y%m%d")}.csv'
            }
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/logout')
def logout():
    """Handle user logout"""
    session.pop('loggedin', None)
    session.pop('id', None)
    session.pop('username', None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
