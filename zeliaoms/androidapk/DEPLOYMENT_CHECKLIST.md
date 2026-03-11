# 🚀 Deployment Checklist

## Pre-Deployment Tasks

### Development Environment
- [ ] All tests passing locally
- [ ] No database errors or warnings
- [ ] API endpoints tested with sample data
- [ ] Token authentication verified
- [ ] Error handling tested

### Code Quality
- [ ] Code formatted and linted
- [ ] No hardcoded credentials
- [ ] All imports organized
- [ ] Documentation complete
- [ ] comments added where necessary

### Database
- [ ] All migrations applied
- [ ] Data integrity verified
- [ ] Backup created before migration
- [ ] Rollback plan documented

---

## Production Environment Setup

### Server Configuration
- [ ] Server provisioned (Linux/Ubuntu recommended)
- [ ] Python 3.8+ installed
- [ ] PostgreSQL database installed
- [ ] Redis cache installed (optional)
- [ ] SSL certificate obtained (Let's Encrypt)

### Django Configuration
- [ ] `DEBUG = False` in settings
- [ ] `ALLOWED_HOSTS` configured
- [ ] `SECRET_KEY` changed to strong key
- [ ] `DATABASES` configured for PostgreSQL
- [ ] `STATIC_ROOT` and `MEDIA_ROOT` set

### Security
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] CSRF protection enabled
- [ ] Security headers set
- [ ] Rate limiting configured

### Performance
- [ ] Static files collected
- [ ] Cache backend configured
- [ ] Database indexes created
- [ ] Query optimization verified
- [ ] CDN setup for media (optional)

---

## Deployment Steps

### Step 1: Environment Setup
```bash
# SSH into server
ssh user@your-domain.com

# Create application directory
mkdir -p /var/www/zeliaoms
cd /var/www/zeliaoms

# Clone or upload code
git clone <repo-url> .
# or
scp -r zeliaoms user@server:/var/www/

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
```

### Step 2: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
pip install psycopg2-binary  # For PostgreSQL
```

### Step 3: Configure Settings
```bash
# Create .env file
cp .env.example .env
nano .env  # Edit with production values
```

### Step 4: Database Migration
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

### Step 5: Configure Gunicorn
Create `/etc/systemd/system/zeliaoms.service`:
```ini
[Unit]
Description=ZELIA OMS Application
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/zeliaoms
Environment="PATH=/var/www/zeliaoms/venv/bin"
ExecStart=/var/www/zeliaoms/venv/bin/gunicorn \
    --workers 3 \
    --worker-class sync \
    --bind unix:/var/run/zeliaoms.sock \
    zelia.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Step 6: Configure Nginx
Create `/etc/nginx/sites-available/zeliaoms`:
```nginx
upstream zeliaoms {
    server unix:/var/run/zeliaoms.sock fail_timeout=0;
}

server {
    listen 80;
    server_name zeliaoms.mcdave.co.ke;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name zeliaoms.mcdave.co.ke;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/zeliaoms.mcdave.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zeliaoms.mcdave.co.ke/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    
    # Client upload size
    client_max_body_size 10M;
    
    # Location configuration
    location /api/ {
        proxy_pass http://zeliaoms;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /static/ {
        alias /var/www/zeliaoms/staticfiles/;
        expires 30d;
    }
    
    location /media/ {
        alias /var/www/zeliaoms/media/;
        expires 7d;
    }
}
```

### Step 7: Enable and Start Services
```bash
# Nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# Zeliaoms Application
sudo systemctl enable zeliaoms
sudo systemctl start zeliaoms
sudo systemctl status zeliaoms
```

### Step 8: Verify Deployment
```bash
# Check if API is running
curl -X GET https://zeliaoms.mcdave.co.ke/api/auth/login/

# Check server logs
sudo journalctl -u zeliaoms -f

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## Post-Deployment

### Monitoring
- [ ] Set up application monitoring (Sentry, New Relic)
- [ ] Configure log aggregation (ELK, Splunk)
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring

### Backups
- [ ] Daily database backups configured
- [ ] Backup retention policy set
- [ ] Restore procedure documented
- [ ] Test restore process

### Analytics & Logging
- [ ] Request logging configured
- [ ] Error tracking setup
- [ ] Performance metrics collected
- [ ] API usage analytics tracked

### Team Communication
- [ ] Deployment documented
- [ ] API endpoint shared with mobile team
- [ ] Access credentials securely shared
- [ ] Support contact information provided

---

## Troubleshooting

### Issue: 502 Bad Gateway
```
Check Gunicorn status:
sudo systemctl status zeliaoms
sudo journalctl -u zeliaoms -n 50

Check if socket exists:
ls -la /var/run/zeliaoms.sock
```

### Issue: 404 on API endpoints
```
Check URL configuration:
python manage.py show_urls | grep api

Verify Nginx configuration:
sudo nginx -t
```

### Issue: Database connection error
```
Check PostgreSQL status:
sudo systemctl status postgresql

Verify credentials in settings:
echo $DATABASE_URL
```

### Issue: Static files not loading
```
Recollect static files:
python manage.py collectstatic --clear --noinput

Check Nginx configuration:
sudo nginx -t && sudo systemctl reload nginx
```

---

## Performance Optimization

### Database
```bash
# Create indexes
python manage.py shell
from django.db import connection
connection.queries  # Monitor queries
```

### Caching
```python
# Configure Redis cache in settings
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### API Response Caching
```python
@cache_page(60)  # Cache for 60 seconds
def expensive_endpoint(request):
    pass
```

---

## Security Hardening

### Before Going Live
1. [ ] Set `DEBUG = False`
2. [ ] Change `SECRET_KEY`
3. [ ] Review `ALLOWED_HOSTS`
4. [ ] Enable HTTPS everywhere
5. [ ] Set security headers
6. [ ] Configure CORS properly
7. [ ] Enable CSRF protection
8. [ ] Set up rate limiting
9. [ ] Configure authentication token expiration
10. [ ] Regularly update dependencies

### Regular Maintenance
```bash
# Update packages
pip install --upgrade pip
pip list --outdated
pip install -r requirements.txt --upgrade

# Run security checks
python manage.py check --deploy

# Check for vulnerable dependencies
pip install safety
safety check
```

---

## Rollback Procedure

If deployment fails:

```bash
# Revert to previous version
git revert HEAD

# Restore database from backup
pg_restore -d zeliaoms backup.dump

# Restart application
sudo systemctl restart zeliaoms

# Verify
curl https://zeliaoms.mcdave.co.ke/api/products/
```

---

## Documentation & Knowledge Transfer

- [ ] API documentation updated
- [ ] Deployment process documented
- [ ] Troubleshooting guide created
- [ ] Team trained on maintenance
- [ ] Incident response plan documented
- [ ] On-call rotation established

---

## Monitoring Alert Setup

```
- [ ] CPU usage > 80%
- [ ] Memory usage > 85%
- [ ] Disk usage > 90%
- [ ] API response time > 2s
- [ ] Error rate > 1%
- [ ] Database connection pool exhausted
- [ ] Service unavailability
```

---

## Sign-Off

- [ ] Developer: _________________ Date: _______
- [ ] QA: _________________ Date: _______
- [ ] DevOps: _________________ Date: _______
- [ ] Project Manager: _________________ Date: _______

---

**Deployment Checklist Version:** 1.0  
**Last Updated:** March 10, 2026
