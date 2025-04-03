// D1 Migration: Create admin user
module.exports = async function(db) {
  // Check if admin user exists
  const adminExists = await db.prepare("SELECT id FROM users WHERE username = 'admin'").first();
  
  if (!adminExists) {
    // Create admin user with secure password
    await db.prepare(`
      INSERT INTO users (
        username, 
        password, 
        email, 
        full_name, 
        is_admin, 
        is_active, 
        onboarding_completed, 
        password_salt, 
        password_change_required
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      'admin',
      '68eb2e12b5f73503e2f9d364738c415508643e378ae7e79eda99bac8d80e0f8a',
      'admin@landlordpro.app',
      'System Administrator',
      1,
      1,
      1,
      '0277a0781f77a1b818270f49fa9bda81',
      1
    ).run();
    
    console.log('✅ Created admin user');
    console.log('Username: admin');
    console.log('Password: admin123 (change on first login)');
  } else {
    console.log('Admin user already exists');
  }
  
  // Create test admin in development environments
  if (process.env.NODE_ENV === 'development') {
    const testAdminExists = await db.prepare("SELECT id FROM users WHERE username = 'testadmin'").first();
    
    if (!testAdminExists) {
      const testSalt = await crypto.randomBytes(16).toString('hex');
      const testPassword = 'admin123';
      const testHashedPassword = await crypto.createHash('sha256').update(testPassword + testSalt).digest('hex');
      
      await db.prepare(`
        INSERT INTO users (
          username, 
          password, 
          email, 
          full_name, 
          is_admin, 
          is_active, 
          onboarding_completed, 
          password_salt, 
          password_change_required
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        'testadmin',
        testHashedPassword,
        'testadmin@landlordpro.app',
        'Test Administrator',
        1,
        1,
        1,
        testSalt,
        0
      ).run();
      
      console.log('✅ Created test admin user');
      console.log('Username: testadmin');
      console.log('Password: admin123');
    } else {
      console.log('Test admin user already exists');
    }
  }
};