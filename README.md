# Potluck Web API

Backend API for Potluck - a community platform for organizing events, seminars, and get-togethers for professionals.

## Features

- 🔐 JWT Authentication
- 👤 User Management with Profiles, Socials, and Addresses
- 🎉 Event Management
- 📝 Blog Management
- 🔒 Dynamic Role-Based Access Control
- 📖 Swagger UI Documentation

## Quick Start

```bash
# Create environment file
node setup.js

# Install dependencies
npm install

# Start server
npm start
```

**Access:**
- API: http://localhost:3000/api
- Docs: http://localhost:3000/api-docs
- Health: http://localhost:3000/health

## Database Reset

If you need to reset the database:

```bash
npm run reset-db
```

This will drop all tables and recreate them with the correct schema.

## Environment Variables

Update `.env` file with your configuration:

```env
PORT=3000
JWT_SECRET=your-secret-key
DATABASE_URL=your-railway-postgres-url
```

## API Endpoints

### Authentication
- `POST /api/signup` - Register new user
- `POST /api/signin` - Login
- `GET /api/me` - Get current user

### Profile
- `GET /api/profile/:username` - View profile
- `POST /api/profile` - Create profile
- `PUT /api/profile/:username` - Update profile

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event (Admin/Secretary)
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Blogs
- `GET /api/blogs` - List blogs
- `POST /api/blogs` - Create blog (Admin/Secretary)
- `PUT /api/blogs/:id` - Update blog
- `DELETE /api/blogs/:id` - Delete blog

### Admin
- `PUT /api/admin/users/:id/role` - Change user role
- `GET /api/admin/users` - List all users
- `PUT /api/admin/blogs/:id/approve` - Approve blog

## Roles

- **Admin**: Full access
- **President**: View private profiles
- **Secretary**: Manage events and blogs
- **Member**: Basic access

## Deployment to Railway

### Prerequisites
- GitHub account
- Railway account (https://railway.app)

### Steps to Deploy

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect Node.js

3. **Configure Environment Variables:**
   - In Railway dashboard, go to your project → Variables
   - Add these variables:
     - `JWT_SECRET`: A strong random string (e.g., `openssl rand -hex 32`)
     - `PORT`: Will be set automatically by Railway
     - `DATABASE_URL`: Will be set automatically when you add PostgreSQL

4. **Add PostgreSQL Database:**
   - In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`

5. **Initialize Database:**
   - Once deployed, your app will auto-initialize the database on first start
   - Or manually run: `railway run npm run reset-db`

6. **Create First Admin User:**
   - Use Railway console: `railway run node -e "require('./src/models/User').create(...)"`
   - Or use Swagger UI at `https://your-app.railway.app/api-docs`

### Important Notes
- Never commit `.env` file (already in `.gitignore`)
- First user to register gets `is_active=false` - use Railway console to activate
- Only Admin role can activate users and manage roles

## Tech Stack

- Node.js + Express
- PostgreSQL
- JWT Authentication
- Swagger UI
- bcryptjs for password hashing
