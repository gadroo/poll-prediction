# Deployment Guide

## 🚀 Frontend Deployment on Vercel

### **Step 1: Prepare Repository**
1. **Push all changes to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

### **Step 2: Deploy to Vercel**
1. **Go to [vercel.com](https://vercel.com)**
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Import your repository**
5. **Configure project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

### **Step 3: Set Environment Variables**
In Vercel dashboard, go to **Settings > Environment Variables** and add:

```
NEXT_PUBLIC_API_URL = https://poll-prediction-production.up.railway.app
NEXT_PUBLIC_WS_URL = wss://poll-prediction-production.up.railway.app
```

### **Step 4: Deploy**
1. **Click "Deploy"**
2. **Wait for build to complete**
3. **Test your deployed frontend!**

## 🎯 **What Should Work After Deployment:**

### **✅ Poll Management:**
- Create new polls
- View all polls
- Edit poll details
- Delete polls

### **✅ Voting System:**
- Vote on polls
- See real-time vote counts
- View poll results

### **✅ User Features:**
- User registration
- User login
- Bookmark polls
- User profile

### **✅ Real-time Features:**
- Live vote updates
- Real-time poll creation
- WebSocket connections

## 🔍 **Testing Checklist:**

### **Frontend Tests:**
- [ ] Frontend loads without errors
- [ ] Can create a new poll
- [ ] Can vote on polls
- [ ] Can bookmark polls
- [ ] User registration works
- [ ] User login works

### **Backend Tests:**
- [ ] Railway API responds: `https://poll-prediction-production.up.railway.app/health`
- [ ] Polls API works: `https://poll-prediction-production.up.railway.app/api/polls`
- [ ] Database persists data
- [ ] WebSocket connections work

### **Integration Tests:**
- [ ] Frontend ↔ Railway API communication
- [ ] Data persists between page refreshes
- [ ] Real-time updates work
- [ ] Error handling works

## 🚨 **Troubleshooting:**

### **If Frontend Won't Load:**
1. Check Vercel build logs
2. Verify environment variables are set
3. Check if Railway API is accessible

### **If API Calls Fail:**
1. Check Railway API health: `https://poll-prediction-production.up.railway.app/health`
2. Verify CORS settings in backend
3. Check browser console for errors

### **If Database Issues:**
1. Check Railway database connection
2. Verify data is persisting
3. Check Railway logs

## 🎉 **Success Indicators:**

- **Frontend loads** ✅
- **Can create polls** ✅
- **Can vote on polls** ✅
- **Data persists** ✅
- **Real-time updates work** ✅
- **User accounts work** ✅

## 📱 **Your Deployed App:**

Once deployed, your app will be available at:
- **Frontend:** `https://your-app-name.vercel.app`
- **Backend API:** `https://poll-prediction-production.up.railway.app`
- **API Docs:** `https://poll-prediction-production.up.railway.app/docs`

**Everything should work exactly like it does locally, but with real data persistence!** 🚀
