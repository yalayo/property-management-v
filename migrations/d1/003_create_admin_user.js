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
      'eda877d0afa8d0daf7cf429cec69af27853128b67c6c33a8661a5fb880a1e62b',
      'admin@landlordpro.app',
      'System Administrator',
      1,
      1,
      1,
      'c6deaded6ea2fc5a9234f90eec2a39ba',
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