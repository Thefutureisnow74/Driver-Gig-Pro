# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  password: '',
  primary_vehicle: '',
  primary_market: '',
  created_at: new Date().toISOString()
});
db.settings.insertOne({
  id: 'settings_' + Date.now(),
  user_id: userId,
  key: 'handlers',
  value: ['King Solomon', 'Sarah', 'Unassigned']
});
print('User ID: ' + userId);
print('Session token: ' + sessionToken);
"
```

## Step 2: Get JWT Token
Use email/password auth:
```bash
# Register
curl -X POST "$API_URL/api/auth/register" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test123!"}'
```

## Step 3: Browser Testing
```javascript
// Store token and navigate
await page.evaluate((token) => {
  localStorage.setItem('dgcrm_token', token);
}, 'YOUR_TOKEN');
await page.goto("https://your-app.com/dashboard");
```
