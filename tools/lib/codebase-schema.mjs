import { existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { readSafe, makeRelPath } from './codebase-walk.mjs';


export function extractSchema(files, stack, projectDir) {
  const relPath = makeRelPath(projectDir);
  const tables = [];

  // Drizzle
  if (stack.orms.includes('drizzle')) tables.push(...extractDrizzleSchema(files, relPath));
  // Prisma
  if (stack.orms.includes('prisma')) tables.push(...extractPrismaSchema(projectDir));
  // Mongoose
  if (stack.orms.includes('mongoose')) tables.push(...extractMongooseSchema(files, relPath));
  // Sequelize
  if (stack.orms.includes('sequelize')) tables.push(...extractSequelizeSchema(files, relPath));
  // TypeORM
  if (stack.orms.includes('typeorm')) tables.push(...extractTypeORMSchema(files, relPath));
  // SQLAlchemy
  if (stack.orms.includes('sqlalchemy')) tables.push(...extractSQLAlchemySchema(files, relPath));
  // Django ORM
  if (stack.orms.includes('django-orm')) tables.push(...extractDjangoSchema(files, relPath));
  // GORM (Go)
  if (stack.orms.includes('gorm')) tables.push(...extractGORMSchema(files, relPath));
  // ActiveRecord (Rails)
  if (stack.orms.includes('activerecord')) tables.push(...extractActiveRecordSchema(projectDir));
  // Eloquent (Laravel)
  if (stack.orms.includes('eloquent')) tables.push(...extractEloquentSchema(files, relPath));

  // Fallback: raw SQL migrations (if no ORM detected or ORM missed some)
  if (tables.length === 0) tables.push(...extractRawSQLSchema(files, relPath));

  return tables;
}

function extractRawSQLSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (extname(file) !== '.sql') continue;
    const rel = relPath(file);
    if (!rel.includes('migration') && !rel.includes('schema') && !rel.includes('sql')) continue;

    const content = readSafe(file);
    const createPattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = createPattern.exec(content)) !== null) {
      const tableName = match[1];
      const columns = [];
      for (const line of match[2].split('\n')) {
        const colMatch = line.trim().match(/^["`]?(\w+)["`]?\s+(VARCHAR|TEXT|INT|INTEGER|BIGINT|SERIAL|BOOLEAN|BOOL|TIMESTAMP|DATE|JSON|JSONB|UUID|FLOAT|DOUBLE|DECIMAL|NUMERIC|CHAR|BLOB|REAL|SMALLINT)\b/i);
        if (!colMatch) continue;
        if (AUDIT_FIELDS.has(colMatch[1])) continue;
        const flags = [];
        if (/PRIMARY\s+KEY/i.test(line)) flags.push('PK');
        if (/UNIQUE/i.test(line)) flags.push('UQ');
        if (/NOT\s+NULL/i.test(line)) flags.push('NN');
        if (/REFERENCES/i.test(line)) flags.push('FK');
        if (/DEFAULT/i.test(line)) flags.push('DEF');
        columns.push({ name: colMatch[1], type: colMatch[2].toLowerCase(), flags });
      }
      if (columns.length > 0) {
        tables.push({ table: tableName, file: rel, columns });
      }
    }
  }
  return tables;
}

const AUDIT_FIELDS = new Set([
  'createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at',
  'CreatedAt', 'UpdatedAt', 'DeletedAt',
]);

function extractDrizzleSchema(files, relPath) {
  const tables = [];
  const tablePattern = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`](\w+)['"`]/g;
  const columnPattern = /(\w+)\s*:\s*(text|varchar|integer|serial|boolean|timestamp|json|jsonb|uuid|bigint|smallint|real|doublePrecision|numeric|date|time|interval|char|citext)\s*\(/g;

  for (const file of files) {
    if (!['.ts', '.js'].includes(extname(file))) continue;
    const content = readSafe(file);
    if (!content.includes('Table(')) continue;

    tablePattern.lastIndex = 0;
    let match;
    while ((match = tablePattern.exec(content)) !== null) {
      const startIdx = match.index;
      let depth = 0;
      let blockEnd = startIdx;
      for (let i = content.indexOf('(', startIdx); i < content.length; i++) {
        if (content[i] === '(') depth++;
        if (content[i] === ')') { depth--; if (depth === 0) { blockEnd = i; break; } }
      }

      const block = content.slice(startIdx, blockEnd);
      const columns = [];
      columnPattern.lastIndex = 0;
      let colMatch;
      while ((colMatch = columnPattern.exec(block)) !== null) {
        if (AUDIT_FIELDS.has(colMatch[1])) continue;
        const afterCol = block.slice(colMatch.index, colMatch.index + 200);
        const flags = [];
        if (/primaryKey|\.pk\(\)/.test(afterCol)) flags.push('PK');
        if (/\.unique\(\)/.test(afterCol)) flags.push('UQ');
        if (/\.notNull\(\)/.test(afterCol)) flags.push('NN');
        if (/\.default\(/.test(afterCol)) flags.push('DEF');
        if (/references\s*\(/.test(afterCol)) flags.push('FK');
        columns.push({ name: colMatch[1], type: colMatch[2], flags });
      }

      tables.push({ table: match[2], file: relPath(file), columns });
    }
  }
  return tables;
}

function extractPrismaSchema(projectDir) {
  const tables = [];
  for (const loc of ['prisma/schema.prisma', 'schema.prisma', 'prisma/schema']) {
    const schemaPath = join(projectDir, loc);
    if (!existsSync(schemaPath)) continue;

    const content = readSafe(schemaPath);
    const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;
    while ((match = modelPattern.exec(content)) !== null) {
      const columns = [];
      for (const line of match[2].split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
        const colMatch = trimmed.match(/^(\w+)\s+(\w+)(\[\])?\s*(.*)/);
        if (!colMatch) continue;
        if (AUDIT_FIELDS.has(colMatch[1])) continue;
        const flags = [];
        if (colMatch[4].includes('@id')) flags.push('PK');
        if (colMatch[4].includes('@unique')) flags.push('UQ');
        if (colMatch[4].includes('@relation')) flags.push('FK');
        if (colMatch[4].includes('@default')) flags.push('DEF');
        if (!colMatch[4].includes('?') && !colMatch[3]) flags.push('NN');
        columns.push({ name: colMatch[1], type: colMatch[3] ? `${colMatch[2]}[]` : colMatch[2], flags });
      }
      tables.push({ table: match[1], file: relative(projectDir, schemaPath), columns });
    }
    break;
  }
  return tables;
}

function extractMongooseSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (!['.ts', '.js'].includes(extname(file))) continue;
    const content = readSafe(file);
    if (!content.includes('Schema(')) continue;

    // new Schema({ field: Type }) or mongoose.Schema({...})
    const schemaMatch = content.match(/(?:const|let)\s+(\w+)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(/);
    if (!schemaMatch) continue;

    // Extract model name: mongoose.model('Name', schema)
    const modelMatch = content.match(/model\s*\(\s*['"](\w+)['"]/);
    const tableName = modelMatch ? modelMatch[1] : schemaMatch[1].replace(/Schema$/, '');

    // Simple field extraction from schema definition
    const columns = [];
    const fieldPattern = /(\w+)\s*:\s*\{?\s*type\s*:\s*(\w+)/g;
    let match;
    while ((match = fieldPattern.exec(content)) !== null) {
      if (AUDIT_FIELDS.has(match[1])) continue;
      const flags = [];
      const lineCtx = content.slice(match.index, match.index + 200);
      if (/required\s*:\s*true/.test(lineCtx)) flags.push('NN');
      if (/unique\s*:\s*true/.test(lineCtx)) flags.push('UQ');
      if (/ref\s*:/.test(lineCtx)) flags.push('FK');
      if (/index\s*:\s*true/.test(lineCtx)) flags.push('IDX');
      columns.push({ name: match[1], type: match[2], flags });
    }

    if (columns.length > 0) {
      tables.push({ table: tableName, file: relPath(file), columns });
    }
  }
  return tables;
}

function extractSequelizeSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (!['.ts', '.js'].includes(extname(file))) continue;
    const content = readSafe(file);
    if (!content.includes('define(') && !content.includes('init(')) continue;

    // sequelize.define('ModelName', { fields }) or Model.init({ fields })
    const defineMatch = content.match(/\.define\s*\(\s*['"](\w+)['"]/) ||
                        content.match(/class\s+(\w+)\s+extends\s+Model/);
    if (!defineMatch) continue;

    const columns = [];
    const fieldPattern = /(\w+)\s*:\s*\{[\s\S]*?type\s*:\s*DataTypes\.(\w+)/g;
    let match;
    while ((match = fieldPattern.exec(content)) !== null) {
      if (AUDIT_FIELDS.has(match[1])) continue;
      columns.push({ name: match[1], type: match[2], flags: [] });
    }

    if (columns.length > 0) {
      tables.push({ table: defineMatch[1], file: relPath(file), columns });
    }
  }
  return tables;
}

function extractTypeORMSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (!['.ts', '.js'].includes(extname(file))) continue;
    const content = readSafe(file);
    if (!content.includes('@Entity')) continue;

    const entityMatch = content.match(/@Entity\s*\(.*?\)\s*(?:export\s+)?class\s+(\w+)/);
    if (!entityMatch) continue;

    const columns = [];
    const colPattern = /@(?:Column|PrimaryColumn|PrimaryGeneratedColumn|CreateDateColumn|UpdateDateColumn)\s*\(([^)]*)\)\s*(\w+)/g;
    let match;
    while ((match = colPattern.exec(content)) !== null) {
      if (AUDIT_FIELDS.has(match[2])) continue;
      const flags = [];
      if (match[0].includes('Primary')) flags.push('PK');
      if (match[1].includes('unique: true')) flags.push('UQ');
      columns.push({ name: match[2], type: 'col', flags });
    }

    // Relations
    const relPattern = /@(?:ManyToOne|OneToMany|OneToOne|ManyToMany)\s*\([^)]*\)\s*(\w+)/g;
    while ((match = relPattern.exec(content)) !== null) {
      columns.push({ name: match[1], type: 'relation', flags: ['FK'] });
    }

    if (columns.length > 0) {
      tables.push({ table: entityMatch[1], file: relPath(file), columns });
    }
  }
  return tables;
}

function extractSQLAlchemySchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (extname(file) !== '.py') continue;
    const content = readSafe(file);
    if (!content.includes('Column(') && !content.includes('mapped_column(')) continue;

    const classMatch = content.match(/class\s+(\w+)\s*\(.*(?:Base|Model|db\.Model)/);
    if (!classMatch) continue;

    const columns = [];
    // SQLAlchemy: field = Column(Type, ...)
    const colPattern = /(\w+)\s*=\s*(?:Column|mapped_column)\s*\(\s*(\w+)/g;
    let match;
    while ((match = colPattern.exec(content)) !== null) {
      if (AUDIT_FIELDS.has(match[1]) || match[1] === '__tablename__') continue;
      const lineCtx = content.slice(match.index, match.index + 200);
      const flags = [];
      if (/primary_key\s*=\s*True/.test(lineCtx)) flags.push('PK');
      if (/unique\s*=\s*True/.test(lineCtx)) flags.push('UQ');
      if (/nullable\s*=\s*False/.test(lineCtx)) flags.push('NN');
      if (/ForeignKey/.test(lineCtx)) flags.push('FK');
      columns.push({ name: match[1], type: match[2], flags });
    }

    if (columns.length > 0) {
      tables.push({ table: classMatch[1], file: relPath(file), columns });
    }
  }
  return tables;
}

function extractDjangoSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (extname(file) !== '.py' || !basename(file).match(/^models?\.py$/)) continue;
    const content = readSafe(file);
    if (!content.includes('models.Model')) continue;

    const classPattern = /class\s+(\w+)\s*\(\s*models\.Model\s*\)\s*:([\s\S]*?)(?=\nclass\s|\n[^\s]|$)/g;
    let match;
    while ((match = classPattern.exec(content)) !== null) {
      const columns = [];
      const fieldPattern = /(\w+)\s*=\s*models\.(\w+Field)\s*\(([^)]*)\)/g;
      let fMatch;
      while ((fMatch = fieldPattern.exec(match[2])) !== null) {
        if (AUDIT_FIELDS.has(fMatch[1])) continue;
        const flags = [];
        if (fMatch[2] === 'AutoField' || fMatch[2] === 'BigAutoField') flags.push('PK');
        if (/unique\s*=\s*True/.test(fMatch[3])) flags.push('UQ');
        if (fMatch[2].includes('ForeignKey') || fMatch[2].includes('OneToOne')) flags.push('FK');
        if (!/null\s*=\s*True/.test(fMatch[3]) && !fMatch[2].includes('Boolean')) flags.push('NN');
        columns.push({ name: fMatch[1], type: fMatch[2].replace('Field', ''), flags });
      }

      if (columns.length > 0) {
        tables.push({ table: match[1], file: relPath(file), columns });
      }
    }
  }
  return tables;
}

function extractGORMSchema(files, relPath) {
  const tables = [];
  for (const file of files) {
    if (extname(file) !== '.go') continue;
    const content = readSafe(file);
    if (!content.includes('gorm')) continue;

    const structPattern = /type\s+(\w+)\s+struct\s*\{([^}]+)\}/g;
    let match;
    while ((match = structPattern.exec(content)) !== null) {
      if (!match[2].includes('gorm')) continue;
      const columns = [];
      for (const line of match[2].split('\n')) {
        const fieldMatch = line.trim().match(/^(\w+)\s+(\S+)\s+`.*gorm:"([^"]*)".*`/);
        if (!fieldMatch) continue;
        if (AUDIT_FIELDS.has(fieldMatch[1])) continue;
        const flags = [];
        if (fieldMatch[3].includes('primaryKey')) flags.push('PK');
        if (fieldMatch[3].includes('unique')) flags.push('UQ');
        if (fieldMatch[3].includes('not null')) flags.push('NN');
        if (fieldMatch[3].includes('foreignKey')) flags.push('FK');
        columns.push({ name: fieldMatch[1], type: fieldMatch[2], flags });
      }
      if (columns.length > 0) {
        tables.push({ table: match[1], file: relPath(file), columns });
      }
    }
  }
  return tables;
}

function extractActiveRecordSchema(projectDir) {
  const tables = [];
  // Parse db/schema.rb
  const schemaPath = join(projectDir, 'db', 'schema.rb');
  if (!existsSync(schemaPath)) return tables;

  const content = readSafe(schemaPath);
  const tablePattern = /create_table\s+"(\w+)".*?do\s*\|t\|([\s\S]*?)end/g;
  let match;
  while ((match = tablePattern.exec(content)) !== null) {
    const columns = [];
    const colPattern = /t\.(\w+)\s+"(\w+)"(.*)/g;
    let colMatch;
    while ((colMatch = colPattern.exec(match[2])) !== null) {
      if (AUDIT_FIELDS.has(colMatch[2])) continue;
      const flags = [];
      if (colMatch[3].includes('null: false')) flags.push('NN');
      if (colMatch[3].includes('index')) flags.push('IDX');
      columns.push({ name: colMatch[2], type: colMatch[1], flags });
    }
    if (columns.length > 0) {
      tables.push({ table: match[1], file: 'db/schema.rb', columns });
    }
  }
  return tables;
}

function extractEloquentSchema(files, relPath) {
  const tables = [];
  // Parse migrations
  for (const file of files) {
    if (extname(file) !== '.php' || !relPath(file).includes('migrations')) continue;
    const content = readSafe(file);
    const tableMatch = content.match(/Schema::create\s*\(\s*['"](\w+)['"]/);
    if (!tableMatch) continue;

    const columns = [];
    const colPattern = /\$table->(\w+)\s*\(\s*['"](\w+)['"]/g;
    let match;
    while ((match = colPattern.exec(content)) !== null) {
      if (AUDIT_FIELDS.has(match[2])) continue;
      const flags = [];
      const lineCtx = content.slice(match.index, match.index + 200);
      if (match[1] === 'id' || match[1] === 'bigIncrements') flags.push('PK');
      if (/->unique\(\)/.test(lineCtx)) flags.push('UQ');
      if (match[1].includes('foreign') || /->references\(/.test(lineCtx)) flags.push('FK');
      if (!/->nullable\(\)/.test(lineCtx)) flags.push('NN');
      columns.push({ name: match[2], type: match[1], flags });
    }

    if (columns.length > 0) {
      tables.push({ table: tableMatch[1], file: relPath(file), columns });
    }
  }
  return tables;
}

// ── Component Extraction ──
