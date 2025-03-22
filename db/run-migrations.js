const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('Running database migrations...');
  
  // Get all migration files
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  // Check if we have a migrations table
  const { data: migrationTableExists } = await supabase.rpc('table_exists', { table_name: 'migrations' });
  
  // Create migrations table if it doesn't exist
  if (!migrationTableExists) {
    console.log('Creating migrations table...');
    const createMigrationsTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `;
    
    await supabase.rpc('run_sql', { sql: createMigrationsTableSQL });
  }
  
  // Get already applied migrations
  const { data: appliedMigrations, error } = await supabase
    .from('migrations')
    .select('name');
  
  if (error) {
    console.error('Error getting applied migrations:', error);
    return;
  }
  
  const appliedMigrationNames = appliedMigrations.map(m => m.name);
  
  // Run each migration that hasn't been applied yet
  for (const file of migrationFiles) {
    if (appliedMigrationNames.includes(file)) {
      console.log(`Migration ${file} already applied, skipping...`);
      continue;
    }
    
    console.log(`Applying migration: ${file}`);
    
    // Read migration SQL
    const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      // Execute migration
      await supabase.rpc('run_sql', { sql: migrationSQL });
      
      // Record that migration was applied
      await supabase
        .from('migrations')
        .insert({ name: file });
      
      console.log(`Migration ${file} applied successfully.`);
    } catch (error) {
      console.error(`Error applying migration ${file}:`, error);
      // Stop migration process on first error
      return;
    }
  }
  
  console.log('All migrations applied successfully!');
}

// Run migrations
runMigrations().catch(console.error); 