import 'dotenv/config';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { prisma, prismaRoot } from '../api/prisma';
import { runInWorkspaceTransaction } from '../api/context/workspace-context';

const workspaceId = process.env.WORKSPACE_ID;
if (!workspaceId) throw new Error('WORKSPACE_ID must identify the workspace to clear');

const modelNames = ['responses', 'prompts', 'competitors', 'sources', 'scrapes'] as const;
type ClearableModel = (typeof modelNames)[number];

async function confirm(message: string) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${message} (yes/no): `);
  rl.close();
  return ['yes', 'y'].includes(answer.toLowerCase());
}

async function clearModel(model: ClearableModel, daysOld?: number) {
  const delegate = prisma[model];
  const cutoff = daysOld ? new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000) : undefined;
  const where = {
    workspace_id: workspaceId,
    ...(cutoff ? { ...(model === 'scrapes' ? { created_at: { lt: cutoff } } : { created_at: { lt: cutoff } }) } : {}),
  };
  const count = await delegate.count({ where } as never);
  if (!count) return console.log(`No ${model} data to clear.`);
  if (!await confirm(`Clear ${count} ${model} rows for workspace ${workspaceId}?`)) return console.log('Cancelled.');
  const result = await delegate.deleteMany({ where } as never);
  console.log(`Cleared ${result.count} ${model} rows.`);
}

async function clearAll() {
  if (!await confirm(`Clear all tenant data for workspace ${workspaceId}?`)) return console.log('Cancelled.');
  if (!await confirm('This action cannot be undone. Continue?')) return console.log('Cancelled.');
  for (const model of ['responses', 'prompts', 'competitors', 'sources', 'scrapes'] as const) await models[model].deleteMany({ where: { workspace_id: workspaceId } } as never);
  for (const model of ['topics', 'analytics', 'alert_history', 'alert_rules', 'brand_config'] as const) await prisma[model].deleteMany({ where: { workspace_id: workspaceId } } as never);
  console.log('Workspace data cleared.');
}

async function main() {
  const command = process.argv[2]?.toLowerCase();
  const days = process.argv[3] ? Number.parseInt(process.argv[3], 10) : undefined;
  await runInWorkspaceTransaction(prismaRoot, workspaceId, async () => {
    if (command === 'all') return clearAll();
    if (command && modelNames.includes(command as ClearableModel)) return clearModel(command as ClearableModel, days);
    throw new Error('Usage: npx tsx scripts/clear-cache.ts [responses|prompts|competitors|sources|scrapes|all] [days]');
  });
}

main().finally(() => prismaRoot.$disconnect());
