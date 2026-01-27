\# AWS App Integration Strategy

\*\*Status:\*\* Planning  
\*\*Last Updated:\*\* January 2026  
\*\*Visibility:\*\* Private (git-ignored)

\---

\#\# Overview

This document outlines the strategy for integrating the standalone GitHub Pages site (Instagram Reels-style food discovery) with the AWS-hosted Django application that handles user accounts, storage, and venue collection.

\---

\#\# Architecture Diagram

\`\`\`  
┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐  
│   STANDALONE SITE                   │         │   AWS APP (Django)                  │  
│   (GitHub Pages)                    │         │   (Your existing app)               │  
│                                     │         │                                     │  
│   https://buddila-samarakoon.       │         │   https://your-aws-app.com          │  
│   github.io/insta\_reelstyle\_htmlfile│         │                                     │  
│                                     │         │                                     │  
│   Features:                         │   API   │   Features:                         │  
│   \- Reels-style video feed          │  ◄────► │   \- User accounts                   │  
│   \- Venue discovery                 │  Calls  │   \- Database/storage                │  
│   \- Collect button                  │         │   \- Venue collection                │  
│   \- Login/Register modals           │         │   \- Venue data (source of truth)    │  
│   \- My Collection page              │         │   \- Password reset                  │  
│                                     │         │                                     │  
│   Data: Google Sheets (videos)      │         │   Data: PostgreSQL/MySQL            │  
│   \+ Django API (venues/auth)        │         │   (users, venues, collections)      │  
└─────────────────────────────────────┘         └─────────────────────────────────────┘  
\`\`\`

\---

\#\# Data Flow Summary

| Data Type | Source | Notes |  
|-----------|--------|-------|  
| Video URLs (YouTube) | Google Sheets | Standalone manages video content |  
| Venue details | Django API | Django is source of truth for venue data |  
| User accounts | Django API | All auth handled by Django |  
| Collections | Django API | User's collected venues stored in Django |  
| Venue mapping | \`redirect\_url\` column in Sheets | Links to Django venue URL |

\---

\#\# API Endpoints Required

\#\#\# Authentication Endpoints

\#\#\#\# 1\. Register Endpoint

\*\*Purpose:\*\* Create a new user account

\`\`\`  
POST /api/auth/register  
Content-Type: application/json

Request Body:  
{  
  "email": "user@example.com",  
  "password": "securepassword123",  
  "name": "John Doe",  
  "phone": "+81-90-1234-5678",  
  "address": "123 Main St, Tokyo, Japan"  
}

Success Response (201):  
{  
  "success": true,  
  "message": "Account created successfully",  
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  
  "user": {  
    "id": "user\_123",  
    "name": "John Doe",  
    "email": "user@example.com"  
  }  
}

Error Response (400 \- Validation):  
{  
  "success": false,  
  "error": "validation\_error",  
  "details": {  
    "email": "Email already registered",  
    "phone": "Invalid phone format"  
  }  
}

Error Response (409 \- Already Exists):  
{  
  "success": false,  
  "error": "Email already registered"  
}  
\`\`\`

\*\*Validation Rules:\*\*  
\- Email: Valid format, unique in database  
\- Password: Minimum 8 characters (match existing Django rules)  
\- Name: Required, non-empty  
\- Phone: Required, valid format  
\- Address: Required, non-empty

\---

\#\#\#\# 2\. Login Endpoint

\*\*Purpose:\*\* Authenticate user and return JWT token

\`\`\`  
POST /api/auth/login  
Content-Type: application/json

Request Body:  
{  
  "email": "user@example.com",  
  "password": "userpassword",  
  "remember\_me": true  
}

Success Response (200):  
{  
  "success": true,  
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  
  "expires\_in": 2592000,  
  "user": {  
    "id": "user\_123",  
    "name": "John Doe",  
    "email": "user@example.com"  
  }  
}

Error Response (401):  
{  
  "success": false,  
  "error": "Invalid email or password"  
}  
\`\`\`

\*\*Remember Me Behavior:\*\*  
\- \`remember\_me: true\` → Long-lived token (e.g., 30 days)  
\- \`remember\_me: false\` → Short-lived token (e.g., 24 hours or session)

\> \*\*Note for Dev Team:\*\* Please confirm how "Keep me logged in" is currently implemented in the Django app (longer token expiry? refresh token?) so standalone can match the behavior.

\---

\#\#\#\# 3\. Validate Token Endpoint

\*\*Purpose:\*\* Check if token is still valid (for page refresh/app reopen)

\`\`\`  
GET /api/auth/validate  
Authorization: Bearer \<token\>

Success Response (200):  
{  
  "valid": true,  
  "user": {  
    "id": "user\_123",  
    "name": "John Doe",  
    "email": "user@example.com"  
  }  
}

Error Response (401):  
{  
  "valid": false,  
  "error": "Token expired"  
}  
\`\`\`

\---

\#\#\#\# 4\. Logout Endpoint

\*\*Purpose:\*\* Invalidate the current token (server-side logout)

\`\`\`  
POST /api/auth/logout  
Authorization: Bearer \<token\>

Success Response (200):  
{  
  "success": true,  
  "message": "Logged out successfully"  
}  
\`\`\`

\*\*Note:\*\* Even if Django uses stateless JWT, this endpoint can be useful for:  
\- Adding token to a blacklist  
\- Audit logging  
\- Future refresh token invalidation

\---

\#\#\#\# 5\. Forgot Password Endpoint

\*\*Purpose:\*\* Request password reset email

\`\`\`  
POST /api/auth/forgot-password  
Content-Type: application/json

Request Body:  
{  
  "email": "user@example.com"  
}

Success Response (200):  
{  
  "success": true,  
  "message": "If this email exists, a reset link has been sent"  
}

Note: Always return success to prevent email enumeration attacks  
\`\`\`

\*\*Behavior:\*\*  
\- Send password reset email with unique token/link  
\- Link should point to Django's password reset page (or a page that works for standalone)  
\- Token expires after reasonable time (e.g., 1 hour)

\---

\#\#\#\# 6\. Reset Password Endpoint

\*\*Purpose:\*\* Set new password using reset token

\`\`\`  
POST /api/auth/reset-password  
Content-Type: application/json

Request Body:  
{  
  "token": "reset\_token\_from\_email",  
  "new\_password": "newSecurePassword123"  
}

Success Response (200):  
{  
  "success": true,  
  "message": "Password reset successfully"  
}

Error Response (400):  
{  
  "success": false,  
  "error": "Invalid or expired reset token"  
}  
\`\`\`

\---

\#\#\# Venue Endpoints

\#\#\#\# 7\. Collect Venue Endpoint

\*\*Purpose:\*\* Add a venue to user's collection

\`\`\`  
POST /api/venues/collect  
Authorization: Bearer \<token\>  
Content-Type: application/json

Request Body:  
{  
  "venue\_slug": "sushi-nakazawa"  
}

Alternative \- using full URL:  
{  
  "venue\_url": "https://your-aws-app.com/venue/sushi-nakazawa/"  
}

Success Response (201):  
{  
  "success": true,  
  "message": "Venue added to collection",  
  "collection": {  
    "id": "col\_789",  
    "venue\_slug": "sushi-nakazawa",  
    "collected\_at": "2026-01-22T10:30:00Z"  
  }  
}

Error Response (404):  
{  
  "success": false,  
  "error": "Venue not found"  
}

Error Response (409):  
{  
  "success": false,  
  "error": "Venue already in collection",  
  "collection": {  
    "id": "col\_789",  
    "collected\_at": "2026-01-20T15:45:00Z"  
  }  
}  
\`\`\`

\*\*Note:\*\* The standalone app will extract the venue slug from the \`redirect\_url\` column in Google Sheets.

\---

\#\#\#\# 8\. Get My Collection Endpoint

\*\*Purpose:\*\* Fetch all venues the authenticated user has collected

\`\`\`  
GET /api/venues/mine  
Authorization: Bearer \<token\>

Optional Query Parameters:  
\- page: Page number (default: 1\)  
\- per\_page: Items per page (default: 10, max: 50\)  
\- category: Filter by category/genre (optional)  
\- sort: Sort order \- "newest" | "oldest" | "name" (default: "newest")

Example: GET /api/venues/mine?page=1\&per\_page=10\&sort=newest

Success Response (200):  
{  
  "success": true,  
  "venues": \[  
    {  
      "collection\_id": "col\_789",  
      "venue\_slug": "sushi-nakazawa",  
      "venue\_name": "Sushi Nakazawa",  
      "category": "Japanese",  
      "address": "23 Commerce St, NYC",  
      "phone": "+1-212-924-2212",  
      "website": "https://sushinakazawa.com",  
      "description": "Omakase sushi restaurant by Chef Daisuke Nakazawa",  
      "hours": "Mon-Sat 5:30PM-10:30PM",  
      "price\_range": "$$$$",  
      "images": \[  
        "https://your-aws-app.com/media/venues/sushi-nakazawa-1.jpg",  
        "https://your-aws-app.com/media/venues/sushi-nakazawa-2.jpg"  
      \],  
      "collected\_at": "2026-01-21T10:30:00Z"  
    },  
    {  
      "collection\_id": "col\_790",  
      "venue\_slug": "joes-pizza",  
      "venue\_name": "Joe's Pizza",  
      "category": "Italian",  
      "address": "7 Carmine St, NYC",  
      "phone": "+1-212-366-1182",  
      "website": null,  
      "description": "Classic New York slice pizza since 1975",  
      "hours": "Open 24 hours",  
      "price\_range": "$",  
      "images": \[  
        "https://your-aws-app.com/media/venues/joes-pizza-1.jpg"  
      \],  
      "collected\_at": "2026-01-20T15:45:00Z"  
    }  
  \],  
  "pagination": {  
    "current\_page": 1,  
    "per\_page": 10,  
    "total\_items": 25,  
    "total\_pages": 3,  
    "has\_next": true,  
    "has\_prev": false  
  }  
}

Empty Collection Response (200):  
{  
  "success": true,  
  "venues": \[\],  
  "pagination": {  
    "current\_page": 1,  
    "per\_page": 10,  
    "total\_items": 0,  
    "total\_pages": 0,  
    "has\_next": false,  
    "has\_prev": false  
  }  
}  
\`\`\`

\---

\#\#\#\# 9\. Get Single Venue Details Endpoint

\*\*Purpose:\*\* Fetch details for a specific venue (for display in standalone app)

\`\`\`  
GET /api/venues/{slug}  
Authorization: Bearer \<token\> (optional \- may allow public access)

Example: GET /api/venues/sushi-nakazawa

Success Response (200):  
{  
  "success": true,  
  "venue": {  
    "slug": "sushi-nakazawa",  
    "name": "Sushi Nakazawa",  
    "category": "Japanese",  
    "address": "23 Commerce St, NYC",  
    "phone": "+1-212-924-2212",  
    "website": "https://sushinakazawa.com",  
    "description": "Omakase sushi restaurant by Chef Daisuke Nakazawa, known for his appearance on Jiro Dreams of Sushi.",  
    "hours": "Mon-Sat 5:30PM-10:30PM",  
    "price\_range": "$$$$",  
    "images": \[  
      "https://your-aws-app.com/media/venues/sushi-nakazawa-1.jpg",  
      "https://your-aws-app.com/media/venues/sushi-nakazawa-2.jpg"  
    \],  
    "is\_collected": true,  
    "collected\_at": "2026-01-21T10:30:00Z"  
  }  
}

Error Response (404):  
{  
  "success": false,  
  "error": "Venue not found"  
}  
\`\`\`

\*\*Note:\*\* If user is authenticated, include \`is\_collected\` and \`collected\_at\` fields.

\---

\#\# Authentication Flow

\#\#\# Complete User Flow Diagram

\`\`\`  
┌──────────────────────────────────────────────────────────────────────────────┐  
│                         USER AUTHENTICATION FLOW                              │  
└──────────────────────────────────────────────────────────────────────────────┘

1\. User on standalone site clicks "Collect"  
                    │  
                    ▼  
2\. Check localStorage for token  
                    │  
        ┌───────────┴───────────┐  
        │                       │  
   Token exists            No token  
        │                       │  
        ▼                       ▼  
3a. GET /api/auth/validate  3b. Show login/register modal  
        │                       │  
   ┌────┴────┐                  │  
   │         │                  │  
 Valid    Invalid               │  
   │         │                  │  
   │         ▼                  │  
   │    Clear token             │  
   │    Show modal ─────────────┤  
   │                            │  
   │         ┌──────────────────┤  
   │         │                  │  
   │      Login             Register  
   │         │                  │  
   │         ▼                  ▼  
   │    POST /api/auth/    POST /api/auth/  
   │    login              register  
   │         │                  │  
   │         └────────┬─────────┘  
   │                  │  
   │                  ▼  
   │         Store token in localStorage  
   │         (respect remember\_me setting)  
   │                  │  
   └──────────────────┤  
                      ▼  
4\. POST /api/venues/collect with token  
                      │  
                      ▼  
5\. Show success message ("Venue saved\!")  
\`\`\`

\#\#\# Password Reset Flow

\`\`\`  
1\. User clicks "Forgot Password"  
                │  
                ▼  
2\. POST /api/auth/forgot-password  
   { "email": "user@example.com" }  
                │  
                ▼  
3\. User receives email with reset link  
   (Link goes to Django reset page or standalone page)  
                │  
                ▼  
4\. User clicks link, enters new password  
                │  
                ▼  
5\. POST /api/auth/reset-password  
   { "token": "...", "new\_password": "..." }  
                │  
                ▼  
6\. Redirect to login with success message  
\`\`\`

\---

\#\# JWT Token Structure

\`\`\`javascript  
// JWT Payload Example  
{  
  "sub": "user\_123",           // User ID  
  "email": "user@example.com",  
  "name": "John Doe",  
  "iat": 1705833600,           // Issued at  
  "exp": 1708425600            // Expires (30 days if remember\_me, else 24h)  
}  
\`\`\`

\---

\#\# CORS Configuration Required

The Django app MUST configure CORS to allow requests from the standalone site:

\`\`\`python  
\# Django settings.py

CORS\_ALLOWED\_ORIGINS \= \[  
    'https://buddila-samarakoon.github.io',  
    \# Add any custom domain if used later  
\]

CORS\_ALLOW\_METHODS \= \[  
    'GET',  
    'POST',  
    'OPTIONS',  
\]

CORS\_ALLOW\_HEADERS \= \[  
    'Authorization',  
    'Content-Type',  
\]

CORS\_ALLOW\_CREDENTIALS \= True  
\`\`\`

\---

\#\# Security Considerations

\> \*\*Important:\*\* The standalone site code (including API client) will be publicly visible on GitHub. This is normal and expected. Security relies on proper backend implementation, not code obscurity.

\---

\#\#\# 1\. Authentication Security

\#\#\#\# Password Requirements  
\`\`\`python  
\# Django settings.py  
AUTH\_PASSWORD\_VALIDATORS \= \[  
    {'NAME': 'django.contrib.auth.password\_validation.MinimumLengthValidator',  
     'OPTIONS': {'min\_length': 8}},  
    {'NAME': 'django.contrib.auth.password\_validation.CommonPasswordValidator'},  
    {'NAME': 'django.contrib.auth.password\_validation.NumericPasswordValidator'},  
\]  
\`\`\`

\#\#\#\# Password Hashing  
\- Use Django's default PBKDF2 or upgrade to Argon2  
\- \*\*NEVER\*\* store plain text passwords  
\- \*\*NEVER\*\* log passwords in any form

\`\`\`python  
\# If upgrading to Argon2 (recommended)  
PASSWORD\_HASHERS \= \[  
    'django.contrib.auth.hashers.Argon2PasswordHasher',  
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',  
\]  
\`\`\`

\---

\#\#\# 2\. JWT Token Security

\#\#\#\# Token Best Practices  
| Practice | Implementation |  
|----------|----------------|  
| Short expiry for normal login | 24 hours |  
| Longer expiry for "remember me" | 30 days max |  
| Include minimal claims | Only user ID, email, name |  
| Sign with strong secret | 256+ bit random key |  
| Use HTTPS only | Tokens transmitted encrypted |

\#\#\#\# JWT Secret Key  
\`\`\`python  
\# settings.py \- NEVER commit this to git  
import os  
JWT\_SECRET\_KEY \= os.environ.get('JWT\_SECRET\_KEY')

\# Generate a strong secret (run once):  
\# python \-c "import secrets; print(secrets.token\_hex(32))"  
\`\`\`

\#\#\#\# Token Blacklisting (for logout)  
\`\`\`python  
\# Consider using django-rest-framework-simplejwt with blacklist  
INSTALLED\_APPS \= \[  
    ...  
    'rest\_framework\_simplejwt.token\_blacklist',  
\]  
\`\`\`

\---

\#\#\# 3\. Rate Limiting (Highly Recommended)

Protect against brute force attacks:

\`\`\`python  
\# Using django-ratelimit or DRF throttling  
REST\_FRAMEWORK \= {  
    'DEFAULT\_THROTTLE\_CLASSES': \[  
        'rest\_framework.throttling.AnonRateThrottle',  
        'rest\_framework.throttling.UserRateThrottle'  
    \],  
    'DEFAULT\_THROTTLE\_RATES': {  
        'anon': '20/minute',      \# Unauthenticated requests  
        'user': '100/minute',     \# Authenticated requests  
        'login': '5/minute',      \# Login attempts (custom)  
        'register': '3/minute',   \# Registration attempts (custom)  
        'password\_reset': '3/hour' \# Password reset requests  
    }  
}  
\`\`\`

\#\#\#\# Critical Endpoints to Rate Limit

| Endpoint | Recommended Limit | Reason |  
|----------|-------------------|--------|  
| \`/api/auth/login\` | 5/minute per IP | Prevent brute force |  
| \`/api/auth/register\` | 3/minute per IP | Prevent spam accounts |  
| \`/api/auth/forgot-password\` | 3/hour per email | Prevent email spam |  
| \`/api/venues/collect\` | 30/minute per user | Prevent abuse |

\---

\#\#\# 4\. Input Validation & Sanitization

\#\#\#\# All Endpoints Must Validate  
\`\`\`python  
\# Example using DRF serializers  
from rest\_framework import serializers

class RegisterSerializer(serializers.Serializer):  
    email \= serializers.EmailField(max\_length=255)  
    password \= serializers.CharField(min\_length=8, max\_length=128, write\_only=True)  
    name \= serializers.CharField(min\_length=1, max\_length=100)  
    phone \= serializers.RegexField(regex=r'^\\+?\[\\d\\s-\]{10,20}$')  
    address \= serializers.CharField(min\_length=1, max\_length=500)

    def validate\_email(self, value):  
        if User.objects.filter(email=value.lower()).exists():  
            raise serializers.ValidationError("Email already registered")  
        return value.lower()  
\`\`\`

\#\#\#\# SQL Injection Prevention  
\- Always use Django ORM (parameterized queries)  
\- Never use raw SQL with user input  
\- Use \`django.utils.html.escape()\` for any user content displayed

\`\`\`python  
\# GOOD \- parameterized  
User.objects.filter(email=user\_email)

\# BAD \- vulnerable to SQL injection  
User.objects.raw(f"SELECT \* FROM users WHERE email \= '{user\_email}'")  
\`\`\`

\---

\#\#\# 5\. CORS Configuration (Strict)

\`\`\`python  
\# settings.py

\# Only allow your specific frontend domain  
CORS\_ALLOWED\_ORIGINS \= \[  
    'https://buddila-samarakoon.github.io',  
\]

\# Do NOT use these in production:  
\# CORS\_ALLOW\_ALL\_ORIGINS \= True  \# DANGEROUS  
\# CORS\_ALLOWED\_ORIGIN\_REGEXES \= \[r".\*"\]  \# DANGEROUS

CORS\_ALLOW\_METHODS \= \[  
    'GET',  
    'POST',  
    'OPTIONS',  
\]

CORS\_ALLOW\_HEADERS \= \[  
    'authorization',  
    'content-type',  
\]

\# Only if needed for cookies (JWT in header doesn't need this)  
CORS\_ALLOW\_CREDENTIALS \= True

\# Expose headers if frontend needs to read them  
CORS\_EXPOSE\_HEADERS \= \[  
    'X-Request-Id',  
\]  
\`\`\`

\---

\#\#\# 6\. HTTPS Enforcement

\`\`\`python  
\# settings.py (production)  
SECURE\_SSL\_REDIRECT \= True  
SECURE\_PROXY\_SSL\_HEADER \= ('HTTP\_X\_FORWARDED\_PROTO', 'https')  
SESSION\_COOKIE\_SECURE \= True  
CSRF\_COOKIE\_SECURE \= True

\# HSTS (HTTP Strict Transport Security)  
SECURE\_HSTS\_SECONDS \= 31536000  \# 1 year  
SECURE\_HSTS\_INCLUDE\_SUBDOMAINS \= True  
SECURE\_HSTS\_PRELOAD \= True  
\`\`\`

\---

\#\#\# 7\. Error Handling (Information Disclosure Prevention)

\#\#\#\# Do NOT Expose Internal Errors  
\`\`\`python  
\# BAD \- exposes internal details  
{  
    "error": "IntegrityError: duplicate key value violates unique constraint",  
    "traceback": "..."  
}

\# GOOD \- generic message  
{  
    "success": false,  
    "error": "Email already registered"  
}  
\`\`\`

\#\#\#\# Login/Auth Errors (Prevent User Enumeration)  
\`\`\`python  
\# BAD \- reveals whether email exists  
"error": "User not found"  \# Attacker knows email doesn't exist  
"error": "Wrong password"  \# Attacker knows email DOES exist

\# GOOD \- generic for both cases  
"error": "Invalid email or password"  
\`\`\`

\#\#\#\# Forgot Password (Always Same Response)  
\`\`\`python  
\# Always return success, regardless of whether email exists  
{  
    "success": true,  
    "message": "If this email exists, a reset link has been sent"  
}  
\`\`\`

\---

\#\#\# 8\. Logging & Monitoring

\#\#\#\# What to Log  
\`\`\`python  
import logging  
logger \= logging.getLogger('security')

\# Log these events:  
logger.info(f"Login success: user\_id={user.id}, ip={request.META.get('REMOTE\_ADDR')}")  
logger.warning(f"Login failed: email={email}, ip={ip}")  
logger.warning(f"Rate limit exceeded: ip={ip}, endpoint={path}")  
logger.info(f"Password reset requested: email={email}")  
logger.warning(f"Invalid token used: ip={ip}")  
\`\`\`

\#\#\#\# What NOT to Log  
\`\`\`python  
\# NEVER log these:  
logger.info(f"Login attempt: password={password}")  \# NEVER  
logger.info(f"Token: {jwt\_token}")  \# NEVER  
\`\`\`

\#\#\#\# Monitor For  
\- Multiple failed login attempts (same IP or email)  
\- Unusual API call patterns  
\- Requests from unexpected origins  
\- Token validation failures

\---

\#\#\# 9\. Token Storage (Frontend)

| Storage Method | Recommendation |  
|----------------|----------------|  
| localStorage | ✅ Use this (acceptable for JWT) |  
| sessionStorage | ⚠️ Lost on tab close |  
| Cookies | ⚠️ Complex CORS, but more secure |

\#\#\#\# localStorage Considerations  
\- Vulnerable to XSS attacks  
\- Mitigate by: sanitizing all user input displayed on page  
\- Clear token on logout  
\- Validate token on app load

\---

\#\#\# 10\. Additional Security Headers

\`\`\`python  
\# settings.py or middleware  
SECURE\_CONTENT\_TYPE\_NOSNIFF \= True  
SECURE\_BROWSER\_XSS\_FILTER \= True  
X\_FRAME\_OPTIONS \= 'DENY'

\# Content Security Policy (if using django-csp)  
CSP\_DEFAULT\_SRC \= ("'self'",)  
CSP\_SCRIPT\_SRC \= ("'self'",)  
CSP\_STYLE\_SRC \= ("'self'", "'unsafe-inline'")  
\`\`\`

\---

\#\#\# Security Checklist for Dev Team

\- \[ \] JWT secret stored in environment variable (not in code)  
\- \[ \] Password hashing using PBKDF2 or Argon2  
\- \[ \] Rate limiting on login/register/forgot-password  
\- \[ \] Input validation on all endpoints  
\- \[ \] Generic error messages for auth failures  
\- \[ \] CORS restricted to specific origin  
\- \[ \] HTTPS enforced in production  
\- \[ \] Security headers configured  
\- \[ \] Logging for security events  
\- \[ \] No sensitive data in logs  
\- \[ \] SQL injection prevention (using ORM)  
\- \[ \] Token expiry configured appropriately

\---

\#\# Implementation Checklist

\#\#\# Django/AWS App Changes

\- \[ \] Configure CORS for GitHub Pages domain  
\- \[ \] Create \`POST /api/auth/register\` endpoint  
\- \[ \] Create \`POST /api/auth/login\` endpoint (with remember\_me support)  
\- \[ \] Create \`GET /api/auth/validate\` endpoint  
\- \[ \] Create \`POST /api/auth/logout\` endpoint  
\- \[ \] Create \`POST /api/auth/forgot-password\` endpoint  
\- \[ \] Create \`POST /api/auth/reset-password\` endpoint  
\- \[ \] Create \`POST /api/venues/collect\` endpoint  
\- \[ \] Create \`GET /api/venues/mine\` endpoint (with pagination)  
\- \[ \] Create \`GET /api/venues/{slug}\` endpoint  
\- \[ \] Test all endpoints with Postman/curl  
\- \[ \] Deploy to production

\#\#\# Standalone Site Changes

\- \[ \] Create \`js/api-client.js\` with API functions  
\- \[ \] Create login modal component  
\- \[ \] Create register modal component  
\- \[ \] Create forgot password modal/flow  
\- \[ \] Update Collect button to check auth  
\- \[ \] Create "My Collection" page  
\- \[ \] Add logout functionality  
\- \[ \] Handle token storage and validation  
\- \[ \] Test full flow on GitHub Pages

\---

\#\# Dev Team Workload Estimate

\#\#\# Summary

| Priority | Endpoint | Effort | Notes |  
|----------|----------|--------|-------|  
| P0 | CORS Configuration | 0.5h | Required for any API calls |  
| P0 | POST /api/auth/login | 2-3h | May leverage existing Django auth |  
| P0 | POST /api/auth/register | 3-4h | Form validation, user creation |  
| P0 | GET /api/auth/validate | 1h | Simple token check |  
| P0 | POST /api/venues/collect | 2-3h | Core feature |  
| P0 | GET /api/venues/mine | 3-4h | Pagination, filtering |  
| P1 | GET /api/venues/{slug} | 1-2h | Single venue details |  
| P1 | POST /api/auth/logout | 0.5-1h | Token invalidation |  
| P1 | POST /api/auth/forgot-password | 2-3h | Email integration |  
| P1 | POST /api/auth/reset-password | 1-2h | Token validation, password update |

\#\#\# Detailed Breakdown

\#\#\#\# Phase 1: Core (Must Have) \- P0 Endpoints  
\*\*Estimated Total: 12-16 hours (1.5-2 dev days)\*\*

| Task | Estimate | Details |  
|------|----------|---------|  
| CORS setup | 0.5h | Add django-cors-headers, configure allowed origins |  
| Login endpoint | 2-3h | JWT generation, remember\_me logic, error handling |  
| Register endpoint | 3-4h | Validation, user creation, auto-login after register |  
| Validate token | 1h | Decode JWT, check expiry, return user info |  
| Collect venue | 2-3h | Check venue exists, check not duplicate, create collection record |  
| Get my venues | 3-4h | Query collections, join venue data, pagination logic |

\#\#\#\# Phase 2: Enhanced Features \- P1 Endpoints  
\*\*Estimated Total: 5-8 hours (0.5-1 dev day)\*\*

| Task | Estimate | Details |  
|------|----------|---------|  
| Get venue details | 1-2h | Fetch venue, add is\_collected if authenticated |  
| Logout | 0.5-1h | Optional token blacklist, audit log |  
| Forgot password | 2-3h | Generate reset token, send email, store token |  
| Reset password | 1-2h | Validate token, update password, invalidate token |

\#\#\#\# Phase 3: Testing & Documentation  
\*\*Estimated Total: 3-4 hours\*\*

| Task | Estimate |  
|------|----------|  
| Unit tests for endpoints | 2h |  
| Integration testing | 1h |  
| API documentation (Swagger/OpenAPI) | 1h |

\#\#\#\# Phase 4: Security Implementation  
\*\*Estimated Total: 4-6 hours (0.5 dev day)\*\*

| Task | Estimate | Details |  
|------|----------|---------|  
| Rate limiting setup | 1-2h | Install django-ratelimit or configure DRF throttling |  
| Security headers | 0.5h | Configure in settings.py |  
| Logging setup | 1h | Security event logging |  
| CORS hardening | 0.5h | Strict origin configuration |  
| Token blacklist (logout) | 1-2h | If using simplejwt blacklist feature |

\#\#\# Total Estimated Workload

| Phase | Hours | Dev Days |  
|-------|-------|----------|  
| Phase 1 (Core) | 12-16h | 1.5-2 days |  
| Phase 2 (Enhanced) | 5-8h | 0.5-1 day |  
| Phase 3 (Testing) | 3-4h | 0.5 day |  
| Phase 4 (Security) | 4-6h | 0.5 day |  
| \*\*Total\*\* | \*\*24-34h\*\* | \*\*3-4.5 days\*\* |

\#\#\# Factors That May Affect Estimate

\*\*Could reduce time:\*\*  
\- If Django REST Framework is already set up  
\- If JWT authentication is already implemented  
\- If similar endpoints already exist (can copy patterns)

\*\*Could increase time:\*\*  
\- If no existing API layer (need to set up DRF from scratch)  
\- Complex existing user model  
\- Need for additional security features (rate limiting, etc.)  
\- Email service configuration for password reset

\---

\#\# Questions for Dev Team

Before implementation, please clarify:

1\. \*\*JWT Implementation:\*\* How is "Keep me logged in" currently implemented? (Longer token expiry? Refresh tokens?)

2\. \*\*Existing API:\*\* Are there any existing API endpoints we can leverage or extend?

3\. \*\*Django REST Framework:\*\* Is DRF already installed and configured?

4\. \*\*User Model:\*\* What fields exist on the User model? Any custom fields beyond email, name, phone, address?

5\. \*\*Venue Model:\*\* Can you share the venue model fields? (Need to confirm what data is available)

6\. \*\*Email Service:\*\* What email service is configured for password reset emails?

7\. \*\*Deployment:\*\* What's the deployment process for Django changes?

\---

\#\# Next Steps

1\. Share this document with dev team  
2\. Get answers to "Questions for Dev Team" section  
3\. Dev team implements Phase 1 endpoints  
4\. Standalone site implements API client  
5\. Integration testing  
6\. Deploy and monitor

\---

\#\# Appendix: Standalone Site API Client (Reference)

\`\`\`javascript  
// js/api-client.js \- For standalone site implementation

const API\_BASE \= 'https://your-aws-app.com/api';

// Token management  
const TokenManager \= {  
  get: () \=\> localStorage.getItem('auth\_token'),  
  set: (token, rememberMe) \=\> {  
    localStorage.setItem('auth\_token', token);  
    localStorage.setItem('remember\_me', rememberMe);  
  },  
  clear: () \=\> {  
    localStorage.removeItem('auth\_token');  
    localStorage.removeItem('remember\_me');  
  },  
  isLoggedIn: () \=\> \!\!localStorage.getItem('auth\_token')  
};

// API Functions  
async function apiRegister(email, password, name, phone, address) {  
  const response \= await fetch(\`${API\_BASE}/auth/register\`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ email, password, name, phone, address })  
  });  
  const data \= await response.json();  
  if (data.success) {  
    TokenManager.set(data.token, true);  
  }  
  return data;  
}

async function apiLogin(email, password, rememberMe \= false) {  
  const response \= await fetch(\`${API\_BASE}/auth/login\`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ email, password, remember\_me: rememberMe })  
  });  
  const data \= await response.json();  
  if (data.success) {  
    TokenManager.set(data.token, rememberMe);  
  }  
  return data;  
}

async function apiValidateToken() {  
  const token \= TokenManager.get();  
  if (\!token) return { valid: false };

  try {  
    const response \= await fetch(\`${API\_BASE}/auth/validate\`, {  
      headers: { 'Authorization': \`Bearer ${token}\` }  
    });  
    if (\!response.ok) {  
      TokenManager.clear();  
      return { valid: false };  
    }  
    return await response.json();  
  } catch (error) {  
    return { valid: false };  
  }  
}

async function apiLogout() {  
  const token \= TokenManager.get();  
  if (token) {  
    await fetch(\`${API\_BASE}/auth/logout\`, {  
      method: 'POST',  
      headers: { 'Authorization': \`Bearer ${token}\` }  
    });  
  }  
  TokenManager.clear();  
}

async function apiForgotPassword(email) {  
  const response \= await fetch(\`${API\_BASE}/auth/forgot-password\`, {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ email })  
  });  
  return await response.json();  
}

async function apiCollectVenue(venueSlug) {  
  const token \= TokenManager.get();  
  if (\!token) throw new Error('Not authenticated');

  const response \= await fetch(\`${API\_BASE}/venues/collect\`, {  
    method: 'POST',  
    headers: {  
      'Authorization': \`Bearer ${token}\`,  
      'Content-Type': 'application/json'  
    },  
    body: JSON.stringify({ venue\_slug: venueSlug })  
  });  
  return await response.json();  
}

async function apiGetMyVenues(page \= 1, perPage \= 10, sort \= 'newest') {  
  const token \= TokenManager.get();  
  if (\!token) throw new Error('Not authenticated');

  const params \= new URLSearchParams({ page, per\_page: perPage, sort });  
  const response \= await fetch(\`${API\_BASE}/venues/mine?${params}\`, {  
    headers: { 'Authorization': \`Bearer ${token}\` }  
  });  
  return await response.json();  
}

async function apiGetVenue(slug) {  
  const token \= TokenManager.get();  
  const headers \= token ? { 'Authorization': \`Bearer ${token}\` } : {};

  const response \= await fetch(\`${API\_BASE}/venues/${slug}\`, { headers });  
  return await response.json();  
}

// Helper: Extract venue slug from redirect\_url  
function extractVenueSlug(redirectUrl) {  
  // Example: "https://your-app.com/venue/sushi-nakazawa/" → "sushi-nakazawa"  
  const match \= redirectUrl.match(/\\/venue\\/(\[^\\/\]+)\\/?$/);  
  return match ? match\[1\] : null;  
}  
\`\`\`

\---

\*\*Document Version:\*\* 2.0  
\*\*Last Updated:\*\* 2026-01-22  
