# Port Allocation - Hypernode Ecosystem

Centralized port allocation to prevent conflicts across all services.

## Port Map (Standardized)

| Port | Service | Repository | Purpose |
|------|---------|------------|---------|
| **3000** | Frontend (Vite) | Hypernode-Site-App | Main React application |
| **3001** | Frontend (Next.js) | hypernode-llm-deployer/hypernode-app | Alternative UI |
| **3002** | Backend API | Hypernode-Site-App/api | Main REST API |
| **3003** | WebSocket | Hypernode-Site-App/api | Real-time updates |
| **3004** | Automation Engine | hypernode-automation-engine | Workflow automation |
| **5432** | PostgreSQL | - | Database |
| **6379** | Redis | - | Cache & pub/sub |
| **8080** | Node Worker | - | GPU worker service |
| **8899** | Solana Localnet | - | Local validator |

## Service Configuration

### Hypernode-Site-App

**Frontend (Vite):**
```bash
# package.json
npm run dev  # Runs on port 3000
```

**Backend API:**
```bash
# api/.env
PORT=3002
WS_PORT=3003
DB_PORT=5432
```

**Environment Variables:**
```bash
# .env
VITE_BACKEND_API_URL=http://localhost:3002
VITE_BACKEND_WS_URL=ws://localhost:3003
```

### hypernode-llm-deployer

**Frontend (Next.js):**
```bash
# hypernode-app/.env
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### hypernode-automation-engine

**API Server:**
```bash
# .env
PORT=3004  # Changed from 3002 to avoid conflict
```

## Running Multiple Services

### Development (All services)

```bash
# Terminal 1 - Infrastructure
docker-compose up postgres redis

# Terminal 2 - Main Backend API
cd Hypernode-Site-App/api
PORT=3002 npm start

# Terminal 3 - Automation Engine
cd hypernode-automation-engine
PORT=3004 npm start

# Terminal 4 - Site Frontend
cd Hypernode-Site-App
npm run dev  # Port 3000

# Terminal 5 - App Frontend (optional)
cd hypernode-llm-deployer/hypernode-app
PORT=3001 npm run dev
```

### Docker Compose (Recommended)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: hypernode
      POSTGRES_USER: hypernode
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend-api:
    build: ./Hypernode-Site-App/api
    ports:
      - "3002:3002"
      - "3003:3003"
    environment:
      PORT: 3002
      WS_PORT: 3003
      DATABASE_URL: postgresql://hypernode:password@postgres:5432/hypernode
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  automation-engine:
    build: ./hypernode-automation-engine
    ports:
      - "3004:3004"
    environment:
      PORT: 3004
      DATABASE_URL: postgresql://hypernode:password@postgres:5432/hypernode
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./Hypernode-Site-App
    ports:
      - "3000:3000"
    environment:
      VITE_BACKEND_API_URL: http://backend-api:3002
      VITE_BACKEND_WS_URL: ws://backend-api:3003
    depends_on:
      - backend-api
```

## Port Conflict Resolution

### If port is already in use

**Windows:**
```bash
# Find process using port
netstat -ano | findstr :3002

# Kill process
taskkill /PID <process_id> /F
```

**Linux/macOS:**
```bash
# Find process using port
lsof -i :3002

# Kill process
kill -9 <process_id>
```

### Environment-specific ports

Use environment variables to override defaults:

```bash
# Development
PORT=3002 npm start

# Staging
PORT=4002 npm start

# Production (behind reverse proxy)
PORT=8080 npm start
```

## Reverse Proxy Configuration (Production)

Use nginx or caddy to route all services through port 80/443:

```nginx
# /etc/nginx/sites-available/hypernode
upstream backend_api {
    server localhost:3002;
}

upstream automation_engine {
    server localhost:3004;
}

server {
    listen 80;
    server_name hypernodesolana.org;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend_api/;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Automation Engine
    location /automation/ {
        proxy_pass http://automation_engine/;
    }
}
```

## Health Checks

Verify all services are running:

```bash
# Backend API
curl http://localhost:3002/health

# Automation Engine
curl http://localhost:3004/health

# Frontend
curl http://localhost:3000

# PostgreSQL
pg_isready -h localhost -p 5432

# Redis
redis-cli -h localhost -p 6379 ping
```

## Notes

- **Standardization**: All HTTP services use 3xxx ports
- **Infrastructure**: Database services use standard ports (5432, 6379)
- **Workers**: GPU workers use 8xxx ports
- **Blockchain**: Solana validator uses 8899 (standard)

## Troubleshooting

**Service won't start (port in use):**
1. Check port allocation table above
2. Verify no other process is using the port
3. Check firewall rules
4. Ensure environment variables are set correctly

**Can't connect to service:**
1. Verify service is running (`netstat -ano` or `lsof -i`)
2. Check correct port in client configuration
3. Verify firewall allows traffic
4. Check service logs for errors
