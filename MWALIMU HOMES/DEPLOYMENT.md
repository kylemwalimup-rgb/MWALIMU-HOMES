# Deployment Guide

This guide provides detailed instructions for deploying the Rental Property Admin System to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- A MySQL-compatible database (MySQL, MariaDB, TiDB, PlanetScale, etc.)
- Node.js 22.x or higher installed locally for building
- Git installed for version control

## Environment Variables

The application requires the following environment variables:

### Required Variables

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### Database URL Format

The `DATABASE_URL` should follow this format:
```
mysql://username:password@host:port/database
```

Examples:
- **Local MySQL**: `mysql://root:password@localhost:3306/rental_admin`
- **TiDB Cloud**: `mysql://user.root:password@gateway.tidbcloud.com:4000/rental_admin`
- **PlanetScale**: `mysql://user:password@aws.connect.psdb.cloud/rental_admin?ssl={"rejectUnauthorized":true}`

### Generating JWT Secret

Generate a secure random string for `JWT_SECRET`:
```bash
openssl rand -base64 32
```

## Database Setup

### Option 1: TiDB Cloud (Recommended for Serverless)

1. Sign up at https://tidbcloud.com
2. Create a new serverless cluster
3. Copy the connection string
4. Run migrations:
```bash
DATABASE_URL="your-connection-string" pnpm db:push
```

### Option 2: PlanetScale

1. Sign up at https://planetscale.com
2. Create a new database
3. Create a production branch
4. Copy the connection string
5. Run migrations:
```bash
DATABASE_URL="your-connection-string" pnpm db:push
```

### Option 3: Traditional MySQL

1. Install MySQL 8.0+ on your server
2. Create a database:
```sql
CREATE DATABASE rental_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
3. Create a user and grant permissions:
```sql
CREATE USER 'rental_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON rental_admin.* TO 'rental_user'@'%';
FLUSH PRIVILEGES;
```
4. Run migrations:
```bash
DATABASE_URL="mysql://rental_user:secure_password@localhost:3306/rental_admin" pnpm db:push
```

## Deployment Platforms

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Build the project:
```bash
pnpm build
```

3. Deploy:
```bash
vercel --prod
```

4. Set environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`

5. Redeploy after setting variables

**Note**: Vercel has a 50MB deployment size limit. This project should fit within that limit.

### Netlify Deployment

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Build the project:
```bash
pnpm build
```

3. Deploy:
```bash
netlify deploy --prod --dir=dist
```

4. Set environment variables:
```bash
netlify env:set DATABASE_URL "your-database-url"
netlify env:set JWT_SECRET "your-jwt-secret"
netlify env:set NODE_ENV "production"
```

### Railway Deployment

1. Sign up at https://railway.app
2. Create a new project
3. Connect your GitHub repository
4. Add environment variables in the Railway dashboard
5. Railway will automatically build and deploy

**Advantages**: Railway provides built-in MySQL databases if needed.

### Render Deployment

1. Sign up at https://render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Set build command: `pnpm install && pnpm build`
5. Set start command: `pnpm start`
6. Add environment variables in the Render dashboard

**Advantages**: Render offers free PostgreSQL databases (requires schema adaptation).

### DigitalOcean App Platform

1. Sign up at https://www.digitalocean.com
2. Create a new App
3. Connect your GitHub repository
4. Configure build settings:
   - Build Command: `pnpm install && pnpm build`
   - Run Command: `pnpm start`
5. Add environment variables
6. Deploy

### Traditional VPS (Ubuntu/Debian)

1. SSH into your server:
```bash
ssh user@your-server-ip
```

2. Install Node.js 22.x:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Install pnpm:
```bash
npm install -g pnpm
```

4. Clone the repository:
```bash
git clone <repository-url>
cd rental-property-admin
```

5. Install dependencies:
```bash
pnpm install
```

6. Create `.env` file with production variables

7. Run migrations:
```bash
pnpm db:push
```

8. Build the application:
```bash
pnpm build
```

9. Install PM2 for process management:
```bash
npm install -g pm2
```

10. Start the application:
```bash
pm2 start npm --name "rental-admin" -- start
pm2 save
pm2 startup
```

11. Set up Nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

12. Enable SSL with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Post-Deployment Checklist

- [ ] Verify database connection
- [ ] Test user authentication
- [ ] Create a test property and unit
- [ ] Create a test tenant
- [ ] Create a test lease
- [ ] Record a test payment
- [ ] Verify dashboard statistics
- [ ] Check all navigation links
- [ ] Test on mobile devices
- [ ] Set up database backups
- [ ] Configure monitoring/logging

## Backup Strategy

### Database Backups

Set up automated daily backups:

```bash
# Create backup script
cat > /usr/local/bin/backup-rental-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/rental-admin"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -h your-host -u your-user -p'your-password' rental_admin | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-rental-db.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-rental-db.sh") | crontab -
```

## Monitoring

### Health Check Endpoint

The application runs on the configured port (default 3000). Monitor:
- HTTP 200 response on the root path
- Database connectivity
- Response time

### Recommended Monitoring Tools

- **Uptime monitoring**: UptimeRobot, Pingdom
- **Application monitoring**: New Relic, DataDog
- **Error tracking**: Sentry
- **Log aggregation**: Papertrail, Logtail

## Scaling Considerations

### Horizontal Scaling

The application is stateless and can be horizontally scaled:
1. Use a load balancer (Nginx, HAProxy, or cloud load balancer)
2. Run multiple instances of the application
3. Ensure database can handle concurrent connections
4. Use Redis for session storage if needed

### Database Scaling

- Use connection pooling (already configured in Drizzle)
- Add read replicas for read-heavy workloads
- Consider database sharding for very large deployments
- Use database-level caching

## Troubleshooting

### Application Won't Start

1. Check environment variables are set correctly
2. Verify database connectivity: `mysql -h host -u user -p database`
3. Check logs: `pm2 logs rental-admin` (if using PM2)
4. Verify Node.js version: `node --version` (should be 22.x)

### Database Connection Errors

1. Verify `DATABASE_URL` format
2. Check firewall rules allow database connections
3. Ensure database user has correct permissions
4. Test connection: `mysql -h host -u user -p`

### Build Failures

1. Clear dependencies: `rm -rf node_modules && pnpm install`
2. Clear build cache: `rm -rf dist`
3. Check Node.js version compatibility
4. Verify all dependencies are installed

## Security Best Practices

1. **Use HTTPS**: Always use SSL/TLS in production
2. **Secure JWT_SECRET**: Use a long, random string
3. **Database Security**: Use strong passwords, limit access by IP
4. **Regular Updates**: Keep dependencies updated
5. **Environment Variables**: Never commit `.env` files
6. **Firewall**: Only expose necessary ports
7. **Backups**: Maintain regular encrypted backups
8. **Monitoring**: Set up alerts for suspicious activity

## Maintenance

### Updating the Application

1. Pull latest changes:
```bash
git pull origin main
```

2. Install new dependencies:
```bash
pnpm install
```

3. Run migrations:
```bash
pnpm db:push
```

4. Rebuild:
```bash
pnpm build
```

5. Restart:
```bash
pm2 restart rental-admin
```

### Database Migrations

When schema changes are made:
```bash
pnpm db:push
```

This will generate and apply migrations automatically.

## Support

For deployment issues or questions, refer to:
- Project README.md
- Platform-specific documentation
- Database provider documentation

---

**Last Updated**: December 2024
