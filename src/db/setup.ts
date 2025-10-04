import { db } from './index'

export async function setupDatabase() {
  // Create admin user if doesn't exist
  const adminUser = await db.users.where('username').equals('admin').first()
  if (!adminUser) {
    await db.users.add({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      permissions: JSON.stringify({})
    })
  }
  
  // Create cashier user if doesn't exist
  const cashierUser = await db.users.where('username').equals('cashier').first()
  if (!cashierUser) {
    await db.users.add({
      username: 'cashier',
      password: 'cashier123',
      role: 'cashier',
      permissions: JSON.stringify({})
    })
  }
}

// Run setup when app starts
setupDatabase()