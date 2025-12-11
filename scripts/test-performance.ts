#!/usr/bin/env ts-node

/**
 * SCRIPT DE TESTE AUTOMATIZADO DE PERFORMANCE
 *
 * Este script:
 * 1. Cria múltiplos issues de teste
 * 2. Monitora processamento em tempo real
 * 3. Calcula TTFR real
 * 4. Valida que workflows estão funcionando
 * 5. Gera relatório de performance
 *
 * Uso:
 * npm run test:performance
 * ou
 * ts-node scripts/test-performance.ts
 */

const API_BASE = 'https://admin-dashboard-hjxcvchgb-marcosdanielsfs-projects.vercel.app';
const BYPASS_TOKEN = 'k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH';

interface TestIssue {
    id: string;
    created_at: number;
    first_response_at: number | null;
    resolved_at: number | null;
    ttfr: number | null; // in seconds
    ttr: number | null; // in seconds
}

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function createTestIssue(index: number): Promise<string> {
    const response = await fetch(`${API_BASE}/api/issues/create`, {
        method: 'POST',
        headers: {
            'x-vercel-protection-bypass': BYPASS_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            issue_type: 'payment_failed',
            customer_name: `Test Performance ${index}`,
            customer_phone: `+551199999${String(index).padStart(4, '0')}`,
            priority: 'critical',
            metadata: {
                test: true,
                test_run_id: `perf-test-${Date.now()}`,
                test_index: index,
            },
        }),
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Failed to create issue: ${data.error}`);
    }

    return data.issue.id;
}

async function getIssue(issueId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/api/issues/open?priority=all&limit=100`, {
        headers: {
            'x-vercel-protection-bypass': BYPASS_TOKEN,
        },
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Failed to fetch issues: ${data.error}`);
    }

    return data.issues.find((i: any) => i.id === issueId);
}

async function monitorIssue(issueId: string, index: number): Promise<TestIssue> {
    const createdAt = Date.now();
    let firstResponseAt: number | null = null;
    let resolvedAt: number | null = null;

    log(`[Issue ${index}] Monitorando... (ID: ${issueId.substring(0, 8)})`, colors.cyan);

    // Monitor for up to 5 minutes
    const timeout = Date.now() + 5 * 60 * 1000;

    while (Date.now() < timeout) {
        const issue = await getIssue(issueId);

        if (!issue) {
            log(`[Issue ${index}] ❌ Issue não encontrado!`, colors.red);
            break;
        }

        // Check first response
        if (issue.first_response_at && !firstResponseAt) {
            firstResponseAt = new Date(issue.first_response_at).getTime();
            const ttfr = Math.floor((firstResponseAt - createdAt) / 1000);
            log(`[Issue ${index}] ✅ Primeira resposta em ${ttfr}s (${(ttfr / 60).toFixed(1)}min)`, colors.green);
        }

        // Check resolution
        if (issue.resolved_at && !resolvedAt) {
            resolvedAt = new Date(issue.resolved_at).getTime();
            const ttr = Math.floor((resolvedAt - createdAt) / 1000);
            log(`[Issue ${index}] 🎯 Resolvido em ${ttr}s (${(ttr / 60).toFixed(1)}min)`, colors.green);
            break;
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return {
        id: issueId,
        created_at: createdAt,
        first_response_at: firstResponseAt,
        resolved_at: resolvedAt,
        ttfr: firstResponseAt ? Math.floor((firstResponseAt - createdAt) / 1000) : null,
        ttr: resolvedAt ? Math.floor((resolvedAt - createdAt) / 1000) : null,
    };
}

async function runTest(numIssues: number = 5) {
    log('\n' + '='.repeat(60), colors.bright);
    log('🧪 INICIANDO TESTE DE PERFORMANCE', colors.bright + colors.blue);
    log('='.repeat(60) + '\n', colors.bright);

    log(`📊 Configuração do teste:`, colors.cyan);
    log(`   - Número de issues: ${numIssues}`);
    log(`   - API Base: ${API_BASE}`);
    log(`   - Timeout: 5 minutos por issue\n`);

    // Step 1: Create all issues
    log('📝 FASE 1: Criando issues...', colors.bright);
    const issueIds: string[] = [];

    for (let i = 1; i <= numIssues; i++) {
        try {
            const issueId = await createTestIssue(i);
            issueIds.push(issueId);
            log(`✅ Issue ${i}/${numIssues} criado: ${issueId.substring(0, 8)}...`, colors.green);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            log(`❌ Erro ao criar issue ${i}: ${error}`, colors.red);
        }
    }

    log(`\n✅ ${issueIds.length} issues criados com sucesso!\n`, colors.green);

    // Step 2: Monitor all issues in parallel
    log('👀 FASE 2: Monitorando processamento...', colors.bright);
    log('⏱️  Aguardando workflows n8n processarem...\n', colors.yellow);

    const results = await Promise.all(
        issueIds.map((id, index) => monitorIssue(id, index + 1))
    );

    // Step 3: Generate report
    log('\n' + '='.repeat(60), colors.bright);
    log('📊 RELATÓRIO DE PERFORMANCE', colors.bright + colors.blue);
    log('='.repeat(60) + '\n', colors.bright);

    const withResponse = results.filter(r => r.ttfr !== null);
    const withResolution = results.filter(r => r.ttr !== null);

    if (withResponse.length === 0) {
        log('❌ NENHUM ISSUE FOI PROCESSADO!', colors.red);
        log('   Verifique se os workflows n8n estão ativos.\n', colors.yellow);
        return;
    }

    // TTFR Stats
    const ttfrValues = withResponse.map(r => r.ttfr!);
    const avgTTFR = ttfrValues.reduce((a, b) => a + b, 0) / ttfrValues.length;
    const minTTFR = Math.min(...ttfrValues);
    const maxTTFR = Math.max(...ttfrValues);

    log('⏱️  TIME TO FIRST RESPONSE (TTFR):', colors.cyan);
    log(`   - Média: ${(avgTTFR / 60).toFixed(2)} min (${avgTTFR}s)`);
    log(`   - Mínimo: ${(minTTFR / 60).toFixed(2)} min (${minTTFR}s)`);
    log(`   - Máximo: ${(maxTTFR / 60).toFixed(2)} min (${maxTTFR}s)`);
    log(`   - Taxa de resposta: ${(withResponse.length / results.length * 100).toFixed(0)}% (${withResponse.length}/${results.length})`);

    // Goal assessment
    if (avgTTFR <= 120) {
        log(`   🎯 META ATINGIDA! TTFR < 2min`, colors.green);
    } else if (avgTTFR <= 300) {
        log(`   ⚠️  Próximo da meta (meta: <2min)`, colors.yellow);
    } else {
        log(`   ❌ Acima da meta (meta: <2min)`, colors.red);
    }

    // TTR Stats (if any)
    if (withResolution.length > 0) {
        const ttrValues = withResolution.map(r => r.ttr!);
        const avgTTR = ttrValues.reduce((a, b) => a + b, 0) / ttrValues.length;

        log(`\n🎯 TIME TO RESOLUTION (TTR):`, colors.cyan);
        log(`   - Média: ${(avgTTR / 3600).toFixed(2)} horas (${(avgTTR / 60).toFixed(1)}min)`);
        log(`   - Taxa de resolução: ${(withResolution.length / results.length * 100).toFixed(0)}% (${withResolution.length}/${results.length})`);
    }

    // Detailed results
    log(`\n📋 RESULTADOS DETALHADOS:`, colors.cyan);
    results.forEach((result, idx) => {
        const status = result.ttfr
            ? result.ttr
                ? '✅ Respondido e Resolvido'
                : '⏳ Respondido (aguardando resolução)'
            : '❌ Sem resposta';

        log(`\n   Issue ${idx + 1} (${result.id.substring(0, 8)}):`, colors.bright);
        log(`   - Status: ${status}`);
        if (result.ttfr) {
            log(`   - TTFR: ${(result.ttfr / 60).toFixed(2)}min (${result.ttfr}s)`);
        }
        if (result.ttr) {
            log(`   - TTR: ${(result.ttr / 60).toFixed(2)}min (${result.ttr}s)`);
        }
    });

    // Performance grade
    log(`\n${'='.repeat(60)}`, colors.bright);
    log('🏆 AVALIAÇÃO FINAL:', colors.bright + colors.blue);

    let grade = 'F';
    let gradeColor = colors.red;

    if (avgTTFR <= 60) {
        grade = 'A+ 🚀 MUSK LEVEL!';
        gradeColor = colors.green + colors.bright;
    } else if (avgTTFR <= 120) {
        grade = 'A 🎯';
        gradeColor = colors.green;
    } else if (avgTTFR <= 180) {
        grade = 'B ⚡';
        gradeColor = colors.green;
    } else if (avgTTFR <= 300) {
        grade = 'C ⚠️';
        gradeColor = colors.yellow;
    } else if (avgTTFR <= 420) {
        grade = 'D 📉';
        gradeColor = colors.yellow;
    }

    log(`   NOTA: ${grade}`, gradeColor);
    log(`${'='.repeat(60)}\n`, colors.bright);

    // Recommendations
    if (avgTTFR > 120) {
        log('💡 RECOMENDAÇÕES:', colors.cyan);
        if (avgTTFR > 300) {
            log('   - Verifique se workflows n8n estão ATIVOS', colors.yellow);
            log('   - Confirme intervalo de polling (deve ser 1min)', colors.yellow);
        } else {
            log('   - Considerar implementar webhooks (FASE 2)', colors.yellow);
            log('   - Validar rate limiting do Gemini', colors.yellow);
        }
        log('');
    }
}

// Run the test
const numIssues = parseInt(process.argv[2] || '5', 10);
runTest(numIssues).catch(error => {
    log(`\n❌ ERRO FATAL: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
});