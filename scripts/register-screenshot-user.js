require('dotenv').config({ path: '.env.local' })

// Manual registration for user from screenshot
const registrationData = {
  telegramId: '1758787398',  // From screenshot
  userId: 'cmfz267qd0000pdmkgzo8e5td', // Existing user ID
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZ6MjY3cWQwMDAwcGRta2d6bzhlNXRkIiwiaWF0IjoxNzU4Nzg5MTAxLCJleHAiOjE3NTkzOTM5MDF9.tfHm-45rZ2aup41BfpFhJjegAm9AH5HvZjY2mhCgOA0'
}

console.log('📋 User registration data from screenshot:')
console.log('Telegram ID:', registrationData.telegramId)
console.log('User ID:', registrationData.userId)
console.log('Token valid until:', new Date(1759393901 * 1000))

// Create SQL insert statement
const sqlInsert = `
INSERT INTO "public"."telegram_users" 
("id", "telegramId", "userId", "token", "isActive", "createdAt", "updatedAt") 
VALUES (
  'cmfz3telegram${registrationData.telegramId}',
  '${registrationData.telegramId}',
  '${registrationData.userId}',
  '${registrationData.token}',
  true,
  NOW(),
  NOW()
);`

console.log('\n📝 SQL to run in your database:')
console.log(sqlInsert)

// Also create test for webhook
console.log('\n🧪 Test webhook with this data:')
const testWebhookPayload = {
  message: {
    chat: {
      id: parseInt(registrationData.telegramId)
    },
    text: '7'
  }
}

console.log('Test payload:', JSON.stringify(testWebhookPayload, null, 2))