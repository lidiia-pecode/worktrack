/**
 * What a migration does to a database that running code depends on, read
 * from the SQL in its `up()`. Decides the order it may be applied in
 * (docs/workflow.md, "Database changes"): an additive one goes before the
 * merge, a destructive one only after Render serves the new code.
 */
export type MigrationRisk = 'additive' | 'data' | 'destructive';

export interface MigrationReview {
  risk: MigrationRisk;
  /** The statements `up()` runs, in order, as written in the file. */
  statements: string[];
  /** Why it is not plainly additive, one line per matching rule. */
  reasons: string[];
}

interface RiskRule {
  pattern: RegExp;
  reason: string;
}

/** Breaks code that still names the old shape, so it waits for the deploy. */
const DESTRUCTIVE_RULES: RiskRule[] = [
  {
    pattern: /\bDROP\b/i,
    reason: 'drops a table, column, index or constraint',
  },
  {
    pattern: /\bRENAME\b/i,
    reason: 'renames something the running code still names',
  },
  {
    pattern: /\bALTER\s+COLUMN\b.*\bTYPE\b/is,
    reason: "changes a column's type",
  },
  {
    pattern: /\bSET\s+NOT\s+NULL\b/i,
    reason: 'makes an existing column NOT NULL',
  },
  { pattern: /\bTRUNCATE\b/i, reason: 'empties a table' },
];

/** Leaves the schema alone, so the old code keeps working, but cannot be undone. */
const DATA_RULES: RiskRule[] = [
  // A foreign key's `ON UPDATE` action is part of the constraint, not a write.
  { pattern: /(?<!\bON\s+)\bUPDATE\b/i, reason: 'changes existing rows' },
  { pattern: /\bDELETE\s+FROM\b/i, reason: 'deletes rows' },
  { pattern: /\bINSERT\s+INTO\b/i, reason: 'inserts rows' },
];

const UP_METHOD = /\bup\s*\(/;
const DOWN_METHOD = /\n\s*(?:public\s+)?async\s+down\s*\(/;
const BACKTICK_STRING = /`([^`]*)`/g;
const QUERY_CALL = /\.query\s*\(/g;

/** The source of `up()` alone: from its signature to `down()` or the end. */
const upSource = (source: string): string => {
  const start = source.search(UP_METHOD);
  if (start === -1) return '';

  const rest = source.slice(start);
  const end = rest.search(DOWN_METHOD);
  return end === -1 ? rest : rest.slice(0, end);
};

const squash = (sql: string) => sql.replace(/\s+/g, ' ').trim();

/** Reviews a migration file's text: its `up()` statements and how risky they are. */
export const reviewMigrationSource = (source: string): MigrationReview => {
  const up = upSource(source);
  const statements = [...up.matchAll(BACKTICK_STRING)]
    .map((match) => squash(match[1]))
    .filter(Boolean);
  const queryCalls = up.match(QUERY_CALL)?.length ?? 0;

  const reasons: string[] = [];
  let risk: MigrationRisk = 'additive';

  const apply = (rules: RiskRule[], ruleRisk: MigrationRisk) => {
    for (const statement of statements) {
      for (const { pattern, reason } of rules) {
        if (pattern.test(statement) && !reasons.includes(reason)) {
          reasons.push(reason);
          if (ruleRisk === 'destructive' || risk === 'additive')
            risk = ruleRisk;
        }
      }
    }
  };

  apply(DESTRUCTIVE_RULES, 'destructive');
  apply(DATA_RULES, 'data');

  // A query whose SQL isn't a plain string here cannot be reviewed, so it is
  // treated as the riskiest kind rather than waved through.
  if (queryCalls > statements.length) {
    reasons.push('runs SQL this review could not read; check the file by hand');
    risk = 'destructive';
  }

  return { risk, statements, reasons };
};
