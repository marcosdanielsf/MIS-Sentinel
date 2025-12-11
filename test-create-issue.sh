#!/bin/bash
curl -X POST 'https://admin-dashboard-c1s5tcgyu-marcosdanielsfs-projects.vercel.app/api/issues/create' \
  -H 'x-vercel-protection-bypass: k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH' \
  -H 'Content-Type: application/json' \
  -d '{"issue_type":"test_automation","customer_name":"Cliente Teste","customer_phone":"+5511999999999","priority":"critical"}' | jq '.'