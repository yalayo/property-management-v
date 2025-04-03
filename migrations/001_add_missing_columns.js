// Migration to add missing columns to the users table

export async function addMissingColumnsToUsers(client) {
  try {
    console.log('Running migration to add missing columns to users table...');
    
    // Add the columns needed for password management
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password_salt TEXT,
      ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT,
      ADD COLUMN IF NOT EXISTS is_crowdfunding_contributor BOOLEAN DEFAULT false;
    `);
    
    console.log('✅ Successfully added missing columns to users table');
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

export default addMissingColumnsToUsers;