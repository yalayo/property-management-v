import { seedAdminUser, seedTestAdmin } from "../server/utils/seed-admin";

/**
 * This migration creates an admin user if none exists and 
 * configures it to require a password change on first login
 */
async function createAdminUserMigration() {
  try {
    console.log('Running admin user migration...');
    const { username, password, isFirstAdmin } = await seedAdminUser();
    
    if (isFirstAdmin) {
      console.log('✅ Created admin user successfully');
      console.log(`Username: ${username}`);
      console.log(`Password: ${password}`);
      console.log('Note: You will be prompted to change this password on first login');
    } else {
      console.log('Admin user already exists, skipping creation');
    }
    
    // In development mode, also create a test admin
    if (process.env.NODE_ENV === 'development') {
      try {
        const testAdmin = await seedTestAdmin();
        console.log('✅ Created test admin user');
        console.log(`Username: ${testAdmin.username}`);
        console.log(`Password: ${testAdmin.password}`);
      } catch (error) {
        console.log('Test admin already exists or could not be created');
      }
    }
    
    return { success: true, message: 'Admin user migration completed' };
  } catch (error) {
    console.error('Admin user migration failed:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Export the migration function
export default createAdminUserMigration;

// Run the migration if this script is executed directly
if (require.main === module) {
  createAdminUserMigration()
    .then((result) => {
      if (result.success) {
        console.log(result.message);
        process.exit(0);
      } else {
        console.error(result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unhandled error in migration:', error);
      process.exit(1);
    });
}