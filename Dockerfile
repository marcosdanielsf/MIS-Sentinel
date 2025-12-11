version: '3.8'

services:
dashboard:
build: .
ports:
- "3000:3000"
environment:
- NEXT_PUBLIC_API_URL=${API_URL:-http://localhost:3001/api}
restart: unless-stopped