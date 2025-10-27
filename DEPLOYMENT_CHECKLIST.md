# Deployment Checklist

## ✅ Pre-Deployment Checklist

- [x] All features implemented (Auth, Profiles, Events, Blogs, Timeline, Polls, Admin)
- [x] `.gitignore` configured (excludes `.env`, `node_modules`, etc.)
- [x] `package.json` has proper start script
- [x] Environment variables properly configured
- [x] Database initialization handled
- [x] Swagger UI documentation ready
- [x] README updated with deployment instructions

## 🚀 GitHub Repository Setup

### 1. Initialize Git Repository
```bash
git init
git branch -M main
```

### 2. Add All Files
```bash
git add .
```

### 3. Initial Commit
```bash
git commit -m "Initial commit: Potluck Web API with JWT auth, events, blogs, timeline, polls"
```

### 4. Create New Repository on GitHub
- Go to https://github.com/new
- Name it: `Potluck.WebAPI` (or your preferred name)
- Click "Create repository"

### 5. Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/Potluck.WebAPI.git
git push -u origin main
```

## 🚂 Railway Deployment

### 1. Create Railway Account
- Go to https://railway.app
- Sign up with GitHub account

### 2. Create New Project
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your `Potluck.WebAPI` repository

### 3. Add PostgreSQL Database
- In Railway dashboard, click "New"
- Select "Database" → "PostgreSQL"
- Railway will automatically create `DATABASE_URL` environment variable

### 4. Configure Environment Variables
Go to your project → Variables tab and add:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Generate with: `openssl rand -hex 32` |
| `PORT` | Auto-set by Railway |
| `DATABASE_URL` | Auto-set by Railway |

### 5. Deploy
- Railway will automatically deploy when you push to GitHub
- Monitor logs in Railway dashboard

## 🔧 Post-Deployment Setup

### 1. Initialize Database
The app will auto-initialize on first start, but you can manually run:
```bash
railway run npm run reset-db
```

### 2. Create First Admin User
You have two options:

#### Option A: Via Swagger UI
1. Go to `https://your-app.railway.app/api-docs`
2. Register a new user via `/api/signup`
3. Use Railway console to activate and make them admin:
   ```sql
   UPDATE users SET is_active = true, role = 'Admin' WHERE email = 'your@email.com';
   ```

#### Option B: Via Railway Console
```bash
railway run node
# Then in Node console:
> const User = require('./src/models/User');
> const bcrypt = require('bcryptjs');
> const hashed = await bcrypt.hash('password123', 10);
> const admin = await User.create({ email: 'admin@example.com', password: hashed, username: 'admin', role: 'Admin', is_active: true });
```

### 3. Verify Deployment
- Health Check: `https://your-app.railway.app/health`
- API Docs: `https://your-app.railway.app/api-docs`
- Test endpoints via Swagger UI

## 🔐 Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Change JWT_SECRET** - Use a strong random string
3. **User Activation** - New users are inactive by default
4. **Admin Only** - Only Admin can activate users and change roles

## 📊 API Endpoints Available

### Authentication
- `POST /api/signup` - Register (returns inactive user)
- `POST /api/signin` - Login (requires activation)
- `GET /api/me` - Get current user

### Profile
- `GET /api/profile/:username` - View public profile
- `POST /api/profile` - Create profile
- `PUT /api/profile/:username` - Update profile

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create (Admin/Secretary)
- `PUT /api/events/:id` - Update (Admin/Secretary)
- `DELETE /api/events/:id` - Delete (Admin/Secretary)

### Blogs
- `GET /api/blogs` - List blogs
- `POST /api/blogs` - Create (Admin/Secretary)
- `PUT /api/blogs/:id` - Update (Admin/Secretary)
- `DELETE /api/blogs/:id` - Delete (Admin/Secretary)

### Timeline
- `GET /api/timeline` - View timeline (Auth required)
- `POST /api/timeline` - Create post (Admin/President)
- `PUT /api/timeline/:id` - Update (Admin/President)
- `DELETE /api/timeline/:id` - Delete (Admin/President)

### Polls
- `GET /api/polls` - List polls
- `GET /api/polls/:id` - Get poll results
- `POST /api/polls` - Create poll (Auth users)
- `POST /api/polls/:id/vote` - Vote (Auth users)

### Admin
- `GET /api/admin/users` - List users (Admin)
- `PUT /api/admin/users/:id/role` - Change role (Admin)
- `PUT /api/admin/users/:id/activate` - Activate/deactivate (Admin)
- `PUT /api/admin/blogs/:id/approve` - Approve blog (Admin)

## 🎯 User Roles

- **Admin**: Full access, can activate users and manage roles
- **President**: Can post/update timeline, view private profiles
- **Secretary**: Can create/update events and blogs
- **Member**: Basic access, view-only

## 🆘 Troubleshooting

### Server Won't Start
- Check Railway logs
- Verify `DATABASE_URL` is set
- Check `JWT_SECRET` is set

### Database Errors
- Run `railway run npm run reset-db`
- Check Railway PostgreSQL service is running

### 401 Unauthorized
- Check JWT token is valid
- Verify user is activated
- Check user role has required permissions

