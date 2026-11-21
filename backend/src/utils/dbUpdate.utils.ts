import prisma from './prisma';

export interface PartialUpdateResult {
  success: boolean;
  affectedRows: number;
  updatedFields: string[];
  message: string;
}

/**
 * Executes a partial / selective column update on any MySQL table by ID.
 * Only the keys provided in `updates` (whose value is NOT undefined) will be modified.
 * All other columns in the table row will remain completely unchanged.
 *
 * @param tableName Name of the MySQL table (e.g. 'Events', 'Blogs', 'Sliders')
 * @param id The record ID (primary key)
 * @param updates Key-value pairs of columns to be updated
 * @returns PartialUpdateResult with affected rows and list of updated columns
 */
export const executePartialTableUpdate = async (
  tableName: string,
  id: number | string,
  updates: Record<string, any>
): Promise<PartialUpdateResult> => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (!numericId || isNaN(numericId)) {
    throw new Error(`Invalid record ID: ${id}`);
  }

  const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  if (!safeTableName) {
    throw new Error('Invalid table name');
  }

  // Filter keys: only include fields that are explicitly provided (not undefined)
  const validKeys = Object.keys(updates).filter((key) => {
    return updates[key] !== undefined;
  });

  if (validKeys.length === 0) {
    return {
      success: true,
      affectedRows: 0,
      updatedFields: [],
      message: 'No fields provided to update',
    };
  }

  const setClauses: string[] = [];
  const params: any[] = [];

  for (const key of validKeys) {
    const safeCol = key.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeCol) continue;

    setClauses.push(`\`${safeCol}\` = ?`);
    params.push(updates[key]);
  }

  // Automatically touch updatedAt if not explicitly passed
  if (!validKeys.includes('updatedAt')) {
    setClauses.push('`updatedAt` = NOW()');
  }

  params.push(numericId);

  const sql = `UPDATE \`${safeTableName}\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`;
  let affected: any;

  try {
    affected = await prisma.$executeRawUnsafe(sql, ...params);
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    if (
      errMsg.includes('Connection') ||
      errMsg.includes('closed') ||
      errMsg.includes('ECONNRESET') ||
      errMsg.includes('ETIMEDOUT') ||
      errMsg.includes('PROTOCOL_CONNECTION_LOST') ||
      errMsg.includes("Can't reach database server")
    ) {
      console.warn(`[executePartialTableUpdate] Reconnecting to MySQL for ${safeTableName}...`);
      try {
        await prisma.$disconnect();
        await prisma.$connect();
      } catch (_) {}
      affected = await prisma.$executeRawUnsafe(sql, ...params);
    } else {
      throw err;
    }
  }

  return {
    success: true,
    affectedRows: Number(affected),
    updatedFields: validKeys,
    message: `Successfully updated ${validKeys.length} column(s)`,
  };
};
