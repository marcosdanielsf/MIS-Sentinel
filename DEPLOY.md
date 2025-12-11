# Guia de Deploy - Admin Dashboard

## 🚀 Opções de Deploy

### 1. Desenvolvimento Local

```bash
cd /Users/marcosdaniels/admin-dashboard
npm run dev
```

Acesse: http://localhost:3000

---

### 2. Deploy na Vercel (Recomendado - Gratuito)

#### Via CLI:

```bash
# Instalar CLI da Vercel
npm i -g vercel

# Fazer deploy
cd /Users/marcosdaniels/admin-dashboard
vercel
```

#### Via GitHub (Automático):

1. Crie um repositório no GitHub
2. Faça push do código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/admin-dashboard.git
   git push -u origin main
   ```
3. Acesse https://vercel.com
4. Clique em "New Project"
5. Importe seu repositório
6. Configure a variável de ambiente:
   - `NEXT_PUBLIC_API_URL` = URL da sua API em produção
7. Deploy automático! ✅

**Vantagens da Vercel:**
- Deploy automático a cada push
- HTTPS gratuito
- CDN global
- Otimizado para Next.js
- Gratuito para projetos pessoais

---

### 3. Deploy com Docker

#### Construir e rodar:

```bash
cd /Users/marcosdaniels/admin-dashboard

# Build da imagem
docker build -t admin-dashboard .

# Rodar container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://sua-api.com/api \
  admin-dashboard
```

#### Usando Docker Compose (Mais fácil):

```bash
# Criar arquivo .env (opcional)
echo "API_URL=http://sua-api.com/api" > .env

# Rodar com docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

**Acesse:** http://localhost:3000

---

### 4. Deploy em Cloud (AWS, Google Cloud, Azure)

#### AWS (EC2):

```bash
# 1. Conectar via SSH
ssh -i sua-chave.pem ec2-user@seu-ip

# 2. Instalar Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 3. Clonar projeto
git clone https://github.com/seu-usuario/admin-dashboard.git
cd admin-dashboard

# 4. Instalar e buildar
npm install
npm run build

# 5. Rodar com PM2
npm install -g pm2
pm2 start npm --name "dashboard" -- start
pm2 save
pm2 startup
```

#### Google Cloud Run:

```bash
# 1. Construir imagem
gcloud builds submit --tag gcr.io/SEU-PROJETO/dashboard

# 2. Deploy
gcloud run deploy dashboard \
  --image gcr.io/SEU-PROJETO/dashboard \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NEXT_PUBLIC_API_URL=http://sua-api.com/api
```

---

### 5. Deploy em VPS (DigitalOcean, Linode, etc)

```bash
# 1. Conectar via SSH
ssh root@seu-ip

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar Nginx
sudo apt install nginx -y

# 4. Clonar e configurar projeto
git clone https://github.com/seu-usuario/admin-dashboard.git
cd admin-dashboard
npm install
npm run build

# 5. Rodar com PM2
npm install -g pm2
pm2 start npm --name "dashboard" -- start
pm2 startup
pm2 save

# 6. Configurar Nginx como proxy reverso
sudo nano /etc/nginx/sites-available/dashboard
```

Arquivo Nginx:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

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

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configurar SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com
```

---

## 🔧 Configurações Importantes

### Variáveis de Ambiente

Em produção, configure:
```env
NEXT_PUBLIC_API_URL=https://sua-api-producao.com/api
```

### Build de Produção Local

```bash
npm run build
npm start
```

---

## 📊 Monitoramento

Após o deploy, monitore:
- Logs de erro
- Tempo de resposta
- Uso de memória
- Taxa de erro da API

---

## 🔒 Segurança

Antes do deploy em produção:
- [ ] Configure CORS na API
- [ ] Use HTTPS
- [ ] Configure rate limiting
- [ ] Valide variáveis de ambiente
- [ ] Configure CSP headers
- [ ] Habilite autenticação na API

---

## 📝 Checklist de Deploy

- [ ] Build funciona localmente (`npm run build`)
- [ ] Variáveis de ambiente configuradas
- [ ] API acessível de produção
- [ ] CORS configurado na API
- [ ] HTTPS configurado
- [ ] Domínio configurado (se aplicável)
- [ ] Monitoramento ativo

---

Escolha a opção que melhor se adequa às suas necessidades! 🚀