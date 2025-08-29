# Palwal Reunion - Professional Network

A web application connecting professionals from the Palwal district.

## Setup Instructions
1. Install Python 3.9 or higher
2. Install requirements: `pip install -r requirements.txt`
3. Set up MySQL database using `database/schema.sql`
4. Configure environment variables in `.env`
5. Run: `python wsgi.py`

## Environment Variables Required
- MYSQL_HOST
- MYSQL_USER
- MYSQL_PASSWORD
- MYSQL_DB
- SECRET_KEY
- MAIL_USERNAME
- MAIL_PASSWORD
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER