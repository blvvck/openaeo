import 'dotenv/config';
import { prisma, prismaRoot } from '../api/prisma';
import { runInWorkspaceTransaction } from '../api/context/workspace-context';

const workspaceId = process.env.WORKSPACE_ID;
if (!workspaceId) throw new Error('WORKSPACE_ID must identify the workspace to inspect');

const labels = ['topics', 'prompts', 'responses', 'competitors', 'sources', 'scrape_attempts'] as const;
const command = process.argv[2]?.toLowerCase() ?? 'stats';

async function main() {
  await runInWorkspaceTransaction(prismaRoot, workspaceId, async () => {
    const counts = await Promise.all([
      prisma.topics.count({ where: { workspace_id: workspaceId } }),
      prisma.prompts.count({ where: { workspace_id: workspaceId } }),
      prisma.responses.count({ where: { workspace_id: workspaceId } }),
      prisma.competitors.count({ where: { workspace_id: workspaceId } }),
      prisma.sources.count({ where: { workspace_id: workspaceId } }),
      prisma.scrape_attempts.count({ where: { workspace_id: workspaceId } }),
    ]);
    const countsByLabel = Object.fromEntries(labels.map((label, index) => [label, counts[index]]));
    if (command === 'stats' || command === 'all') console.table(countsByLabel);
    else if (labels.includes(command as (typeof labels)[number])) {
      const model = command as (typeof labels)[number];
      const rows = await prisma[model].findMany({
        where: { workspace_id: workspaceId },
        orderBy: { id: 'desc' },
        take: 20,
      } as never);
      console.dir(rows, { depth: 4 });
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
  });
}

main().finally(() => prismaRoot.$disconnect());
