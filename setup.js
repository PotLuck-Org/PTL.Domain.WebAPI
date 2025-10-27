const fs = require('fs');
const path = require('path');

// Create .env file from template
const envContent = `PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Date.now()}
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://postgres:XXXXXX@metro.proxy.rlwy.net:47685/railway
`;

const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
} else {
  console.log('⚠️  .env file already exists. Skipping creation.');
}

console.log('\n📝 Next steps:');
console.log('1. Review the .env file and update if needed');
console.log('2. Run: npm install (if not already done)');
console.log('3. Run: npm start (to start the server)');
console.log('4. Server will be available at http://localhost:3000');
console.log('5. API endpoints: http://localhost:3000/api');
console.log('\n📚 Documentation:');
console.log('- API_DOCUMENTATION.md - Full API reference');
console.log('- SETUP_GUIDE.md - Setup and testing instructions');

