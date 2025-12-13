// ============================================
// NODE: Detectar Prospecção do Lucas
// Adicionar DEPOIS do "Salvar Supabase" no workflow grupo-bposs
// ============================================

// Pegar dados da mensagem processada
const messageData = $input.first().json;

// Verificar se é mensagem do Lucas
const senderName = (messageData.group_sender_name || messageData.sender_name || '').toLowerCase();
const isLucas = senderName.includes('lucas');

if (!isLucas) {
  return [{ json: { skip: true, reason: 'Not from Lucas' } }];
}

// Pegar conteúdo da mensagem
const content = messageData.message_body || '';

// Patterns para detectar dados de prospecção
// Ex: "Marina 12 novos seguidores"
// Ex: "Cliente X: 25 prospecções"
// Ex: "Cliente Y - 30"
// Ex: "Tech Solutions: 15"

const reports = [];

// Pattern 1: "Nome X novos seguidores" ou "Nome X seguidores"
const seguidoresPattern = /([A-Za-zÀ-ú\s]+?)\s+(\d+)\s+(?:novos?\s+)?seguidores?/gi;
let match;

while ((match = seguidoresPattern.exec(content)) !== null) {
  const clientName = match[1].trim();
  const count = parseInt(match[2]);

  if (clientName.length > 1 && count > 0) {
    reports.push({
      client_name: clientName,
      prospections_count: count,
      metric_type: 'seguidores'
    });
  }
}

// Pattern 2: "Nome: X prospecções" ou "Nome: X"
const prospeccaoPattern = /([A-Za-zÀ-ú\s]+?)\s*[:|-]\s*(\d+)\s*(?:prospec|contato)?/gi;

while ((match = prospeccaoPattern.exec(content)) !== null) {
  const clientName = match[1].trim();
  const count = parseInt(match[2]);

  // Evitar duplicatas e palavras inválidas
  const ignoreWords = ['total', 'novos', 'seguidores', 'hoje', 'dia'];
  const alreadyExists = reports.some(r =>
    r.client_name.toLowerCase() === clientName.toLowerCase()
  );

  if (clientName.length > 1 &&
      count > 0 &&
      !alreadyExists &&
      !ignoreWords.includes(clientName.toLowerCase())) {
    reports.push({
      client_name: clientName,
      prospections_count: count,
      metric_type: 'prospeccao'
    });
  }
}

// Se não encontrou dados de prospecção
if (reports.length === 0) {
  return [{ json: { skip: true, reason: 'No prospection data found in Lucas message' } }];
}

// Retornar dados para inserção
const today = new Date().toISOString().split('T')[0];

return reports.map(report => ({
  json: {
    skip: false,
    client_name: report.client_name,
    prospections_count: report.prospections_count,
    metric_type: report.metric_type,
    reported_by: 'Lucas',
    report_date: today,
    source_group: messageData.group_name || 'Mottivme | Suporte BDRs',
    raw_message: content
  }
}));
