#!/bin/bash
echo "🧪 Testando API de criação de issue..."
curl -X POST 'https://admin-dashboard-3n6in34ch-marcosdanielsfs-projects.vercel.app/api/issues/create' \
  -H 'x-vercel-protection-bypass: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH' \
  -H 'Content-Type: application/json' \
  -d '{"issue_type":"test_automation","customer_name":"Cliente Teste Automação","customer_phone":"+5511999999999","priority":"critical"}' | jq '.'