# Production Deployment Guide - OtakuShelf

## 📋 Pre-Deployment Checklist

### Security
- [ ] All environment variables set (no fallbacks)
- [ ] JWT_SECRET minimum 32 characters
- [ ] SESSION_SECRET minimum 32 characters
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting enabled
- [ ] Helmet security headers configured
- [ ] MongoDB sanitization enabled
- [ ] File upload validation implemented
- [ ] HTTPS enforced (secure cookies)

### Performance
- [ ] Redis cache configured
- [ ] Database indexes created
- [ ] Connection pooling optimized
- [ ] Compression enabled
- [ ] Static assets served via CDN
- [ ] Image optimization implemented
- [ ] Lazy loading configured

### Monitoring
- [ ] Health check endpoint working
- [ ] Error logging configured
- [ ] Performance monitoring set up
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured

---

## 🚀 Deployment Steps

### 1. Environment Setup

```bash
# Required environment variables
NODE_ENV=production
PORT=5000

# Secrets (generate strong random strings)
JWT_SECRET=<64-char-random-string>
SESSION_SECRET=<64-char-random-string>

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/otakushelf?retryWrites=true&w=majority

# Redis (recommended for production)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI (if using)
OPENROUTER_API_KEY=your-api-key
```

### 2. Generate Strong Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Install Production Dependencies

```bash
cd otakushelf/src/Backend
npm install --production

# Install security packages
npm install helmet express-rate-limit express-mongo-sanitize connect-timeout

# Install Redis (if using)
npm install ioredis connect-redis
```

### 4. Database Setup

```bash
# Create indexes
CREATE_INDEXES=true node server.js

# Or manually in MongoDB shell:
use otakushelf

# User indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ googleId: 1 }, { sparse: true })
db.users.createIndex({ createdAt: -1 })

# AnimeList indexes
db.animelists.createIndex({ userId: 1 })
db.animelists.createIndex({ userId: 1, "watching.animeId": 1 })
db.animelists.createIndex({ userId: 1, "completed.animeId": 1 })

# Session indexes
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 })
```

### 5. Redis Setup (Recommended)

**Option A: Docker**
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:alpine \
  redis-server --requirepass your-password
```

**Option B: Managed Service**
- Redis Cloud (free tier available)
- AWS ElastiCache
- Azure Cache for Redis
- Google Cloud Memorystore

### 6. Build Frontend

```bash
cd otakushelf/src/Frontend
npm install
npm run build

# Output will be in dist/ folder
```

### 7. Nginx Configuration

```nginx
# /etc/nginx/sites-available/otakushelf

upstream backend {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;  # If running multiple instances
    server 127.0.0.1:5002;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
    
    # Frontend (static files)
    location / {
        root /var/www/otakushelf/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Auth endpoints (stricter rate limit)
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Health check (no rate limit)
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

### 8. PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'otakushelf-backend',
    script: './server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs

# Reload without downtime
pm2 reload otakushelf-backend
```

### 9. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

### 10. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Deny direct access to backend port
sudo ufw deny 5000/tcp
```

---

## 📊 Monitoring Setup

### Application Monitoring

**Option 1: PM2 Plus (Recommended)**
```bash
pm2 link <secret> <public>
```

**Option 2: New Relic**
```bash
npm install newrelic
# Configure newrelic.js
```

**Option 3: DataDog**
```bash
npm install dd-trace
# Configure in server.js
```

### Uptime Monitoring

- UptimeRobot (free)
- Pingdom
- StatusCake

### Log Management

**Centralized Logging:**
```bash
# Install Winston
npm install winston winston-daily-rotate-file

# Configure in server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d'
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d'
    })
  ]
});
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd otakushelf/src/Backend
        npm ci --production
        cd ../Frontend
        npm ci
    
    - name: Run tests
      run: |
        cd otakushelf/src/Backend
        npm test
    
    - name: Build frontend
      run: |
        cd otakushelf/src/Frontend
        npm run build
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /var/www/otakushelf
          git pull origin main
          cd src/Backend
          npm ci --production
          cd ../Frontend
          npm ci
          npm run build
          pm2 reload otakushelf-backend
```

---

## 🎯 Performance Optimization

### CDN Setup (Cloudflare)

1. Add your domain to Cloudflare
2. Update nameservers
3. Enable:
   - Auto Minify (JS, CSS, HTML)
   - Brotli compression
   - HTTP/2
   - Rocket Loader
4. Set cache rules for static assets

### Image Optimization

```bash
# Use sharp for image processing
npm install sharp

# Resize and optimize uploads
import sharp from 'sharp';

await sharp(inputPath)
  .resize(800, 800, { fit: 'inside' })
  .webp({ quality: 80 })
  .toFile(outputPath);
```

---

## 🚨 Disaster Recovery

### Backup Strategy

**Automated Backups:**
```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGO_URI" --out="/backups/mongo_$DATE"
tar -czf "/backups/mongo_$DATE.tar.gz" "/backups/mongo_$DATE"
rm -rf "/backups/mongo_$DATE"

# Upload to S3
aws s3 cp "/backups/mongo_$DATE.tar.gz" s3://your-bucket/backups/

# Keep only last 30 days
find /backups -name "mongo_*.tar.gz" -mtime +30 -delete
```

**Cron job:**
```bash
0 2 * * * /path/to/backup-script.sh
```

### Recovery Plan

1. **Database Restore:**
   ```bash
   mongorestore --uri="$MONGO_URI" --drop /path/to/backup
   ```

2. **Application Rollback:**
   ```bash
   git checkout <previous-commit>
   pm2 reload otakushelf-backend
   ```

---

## 📈 Scaling Strategy

### Horizontal Scaling

1. **Load Balancer:** nginx or AWS ALB
2. **Multiple App Instances:** PM2 cluster mode
3. **Shared Session Store:** Redis
4. **Shared Cache:** Redis
5. **Database Replication:** MongoDB replica set

### Vertical Scaling

- Start: 2 CPU, 4GB RAM
- Medium: 4 CPU, 8GB RAM
- Large: 8 CPU, 16GB RAM

### Auto-Scaling (AWS)

- Use Auto Scaling Groups
- Scale based on CPU/Memory metrics
- Min: 2 instances
- Max: 10 instances

---

## ✅ Post-Deployment Verification

```bash
# Health check
curl https://yourdomain.com/health

# API test
curl https://yourdomain.com/api/anime/anime-sections

# SSL test
curl -I https://yourdomain.com

# Load test
npm install -g loadtest
loadtest -c 100 -t 60 https://yourdomain.com/api/anime/anime-sections
```

---

## 📞 Support & Maintenance

### Regular Tasks

- [ ] Weekly: Review error logs
- [ ] Weekly: Check disk space
- [ ] Monthly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Monthly: Test backup restore
- [ ] Quarterly: Security audit
- [ ] Quarterly: Load testing

### Alerts to Configure

- Server down
- High error rate (>1%)
- High response time (>2s)
- Database connection issues
- Disk space <20%
- Memory usage >80%
- CPU usage >80%

---

## 🎉 You're Production Ready!

Your OtakuShelf application is now optimized for millions of users with:
- ✅ Enterprise-grade security
- ✅ Horizontal scalability
- ✅ High performance caching
- ✅ Comprehensive monitoring
- ✅ Automated backups
- ✅ Zero-downtime deployments
