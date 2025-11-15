# IELTS Vocabulary Extractor - Docker Setup

## 🐳 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Docker CLI

```bash
# Build image
docker build -t ielts-vocab-app .

# Run container
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/vocabulary_files:/app/vocabulary_files \
  -e GEMINI_API_KEY=your_api_key_here \
  --name ielts-vocab-extractor \
  ielts-vocab-app

# View logs
docker logs -f ielts-vocab-extractor

# Stop and remove
docker stop ielts-vocab-extractor
docker rm ielts-vocab-extractor
```

## 📦 What's Included

- **Base Image**: Node.js 20 Alpine (lightweight)
- **Port**: 3000 (configurable)
- **Volumes**: `vocabulary_files/` persisted outside container
- **Health Check**: Automatic health monitoring
- **Auto-restart**: Container restarts on failure

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=production
```

### Custom Port

Change port in `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"  # Host:Container
```

Or with Docker CLI:

```bash
docker run -p 8080:3000 ...
```

## 📂 Data Persistence

Vocabulary files are stored in `./vocabulary_files` on your host machine and synced with the container. This ensures:
- ✅ Data survives container restarts
- ✅ Easy backup
- ✅ Can be accessed directly from host

## 🔍 Troubleshooting

### Check container status
```bash
docker ps -a
```

### View logs
```bash
docker logs ielts-vocab-extractor
```

### Restart container
```bash
docker restart ielts-vocab-extractor
```

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## 🚀 Access the Application

Once running, open your browser:
- **Extraction Page**: http://localhost:3000
- **Flashcard Page**: http://localhost:3000/hoc-flashcard
- **Study Schedule**: http://localhost:3000/hoc-theo-lich

## 📊 Container Stats

```bash
# CPU and memory usage
docker stats ielts-vocab-extractor
```

## 🛑 Clean Up

```bash
# Stop and remove container
docker-compose down

# Remove image
docker rmi ielts-vocab-app

# Remove all unused Docker resources
docker system prune -a
```
