# 🎯 GETTING STARTED - Simple Step-by-Step Guide

You've extracted the project to your Desktop. Here's exactly what to do next!

---

## 📍 Step 1: Open Terminal/Command Prompt

### On Windows:
1. Press `Windows + R`
2. Type `cmd` and press Enter
3. **OR** Press `Windows + X` and select "Windows PowerShell"

### On Mac:
1. Press `Command + Space`
2. Type `Terminal`
3. Press Enter

### On Linux:
1. Press `Ctrl + Alt + T`

---

## 📂 Step 2: Navigate to Your Project Folder

Type this command (adjust the folder name if it's different):

### On Windows:
```bash
cd Desktop\costplus100-ecommerce
```

### On Mac/Linux:
```bash
cd ~/Desktop/costplus100-ecommerce
```

**How to check if you're in the right folder:**
```bash
# Type this:
dir      # On Windows
ls       # On Mac/Linux

# You should see files like:
# - package.json
# - README.md
# - src/
# - supabase/
```

---

## ✅ Step 3: Install Node.js (if you haven't)

### Check if you have Node.js:
```bash
node --version
```

**If you see a version number (like v18.x.x or v20.x.x):** ✅ You're good! Skip to Step 4.

**If you see an error:** You need to install Node.js:

1. Go to: https://nodejs.org/
2. Download the **LTS version** (left button)
3. Install it (just click Next, Next, Install)
4. Close and reopen your terminal
5. Run `node --version` again

---

## 📦 Step 4: Install pnpm (Package Manager)

```bash
npm install -g pnpm
```

**Wait for it to finish...**

Verify it worked:
```bash
pnpm --version
```

You should see a version number like `9.x.x`

---

## 🔧 Step 5: Install Project Dependencies

**This downloads all the code libraries the project needs:**

```bash
pnpm install
```

**⏳ This will take 2-5 minutes.** You'll see lots of text scrolling. That's normal!

**When it's done, you'll see:**
```
Done in 2.5s
```

---

## 🚀 Step 6: Start the Development Server

```bash
pnpm dev
```

**You should see:**
```
VITE v6.3.5  ready in 532 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**✅ SUCCESS!** Your server is running!

---

## 🌐 Step 7: Open the Website

1. Open your web browser (Chrome, Firefox, Safari, Edge)
2. Go to: **http://localhost:5173**

**You should see the Costplus100 homepage!** 🎉

---

## 🎯 What You Can Do Now

### Browse the Store:
- **Homepage:** http://localhost:5173
- **Products:** http://localhost:5173/products
- **Cart:** http://localhost:5173/cart

### Login to Admin Panel:
- **URL:** http://localhost:5173/admin/login
- **Email:** admin@costplus100.com.au
- **Password:** Ask your team, or check your Supabase Dashboard

### Test Database Connection:
- **URL:** http://localhost:5173/db-diagnostic

---

## ⚠️ Common Issues & Solutions

### Issue 1: "pnpm: command not found"

**Solution:**
```bash
# Install pnpm first:
npm install -g pnpm

# Close and reopen terminal, then try again
```

---

### Issue 2: "figma:asset import error"

**Solution:**
This error happens because the project uses `figma:asset` imports that only work in Figma Make.

✅ **Already Fixed!** I've created a Vite plugin that handles these imports for localhost.

Just **restart the dev server:**
```bash
# Press Ctrl+C to stop
# Then start again:
pnpm dev
```

The plugin will automatically replace Figma assets with placeholder images.

---

### Issue 3: "node: command not found"

**Solution:**
- Install Node.js from https://nodejs.org/
- Choose the LTS version (left button)
- After installing, close and reopen terminal

---

### Issue 4: "Port 5173 already in use"

**Solution:**

**On Windows:**
```bash
# Kill the process using port 5173
netstat -ano | findstr :5173
# Note the PID (last number)
taskkill /PID <that_number> /F

# Then try pnpm dev again
```

**On Mac/Linux:**
```bash
# Kill the process
lsof -ti:5173 | xargs kill -9

# Then try pnpm dev again
```

---

### Issue 5: "Cannot connect to database"

**Solution:**
- Your .env file is already configured
- The backend might not be deployed yet
- Visit: http://localhost:5173/db-diagnostic to check

---

### Issue 6: Admin login not working

**Solution:**
You need to create an admin user in Supabase:

1. Go to: https://app.supabase.com
2. Open your project: `bqtzxoteoucvioxqgfpc`
3. Click **Authentication** → **Users**
4. Click **Add User** (green button)
5. Fill in:
   - Email: `admin@costplus100.com.au`
   - Password: (choose a password)
   - Confirm email: ✅ Check this box
6. Click **Create User**

Now you can login with that email and password!

---

## 🛑 How to Stop the Server

When you're done working:

1. Go to the terminal where the server is running
2. Press: `Ctrl + C`
3. The server will stop

**To start again later:**
```bash
cd ~/Desktop/costplus100-ecommerce   # Navigate to folder
pnpm dev                              # Start server
```

---

## 📋 Quick Command Reference

```bash
# Navigate to project
cd ~/Desktop/costplus100-ecommerce

# Start development server
pnpm dev

# Stop server
Ctrl + C

# Check if server is running
# Go to: http://localhost:5173
```

---

## 🎯 Your Typical Workflow

**Every time you want to work on the project:**

1. Open Terminal
2. Navigate to project:
   ```bash
   cd ~/Desktop/costplus100-ecommerce
   ```
3. Start server:
   ```bash
   pnpm dev
   ```
4. Open browser: http://localhost:5173
5. Make your changes
6. See them live in the browser! (auto-refreshes)
7. When done: Press `Ctrl + C` to stop

---

## 📁 Project Structure (What's in the Folder)

```
costplus100-ecommerce/
│
├── 📖 Documentation Files
│   ├── GETTING-STARTED.md     ← YOU ARE HERE!
│   ├── START-HERE.md          ← Read this next
│   ├── LOCALHOST-SETUP.md     ← Detailed setup
│   ├── ENV-SETUP.md           ← Environment variables
│   ├── COMMANDS.md            ← All commands
│   └── README.md              ← Full docs
│
├── 📂 Source Code
│   ├── src/                   ← Frontend code
│   ├── supabase/              ← Backend code
│   └── utils/                 ← Utilities
│
├── 📦 Configuration
│   ├── package.json           ← Dependencies
│   ├── .env                   ← Your settings (already set up!)
│   └── vite.config.ts         ← Build config
│
└── 📁 Other Folders
    ├── node_modules/          ← Installed packages (created by pnpm install)
    └── dist/                  ← Build output (created by pnpm build)
```

---

## ✅ Verification Checklist

Make sure everything works:

- [ ] Node.js installed (`node --version` shows v18+)
- [ ] pnpm installed (`pnpm --version` works)
- [ ] Dependencies installed (`pnpm install` completed)
- [ ] Server starts (`pnpm dev` runs without errors)
- [ ] Homepage loads (http://localhost:5173 works)
- [ ] Can see products (http://localhost:5173/products)
- [ ] Admin panel accessible (http://localhost:5173/admin/login)

---

## 🎓 What to Learn Next

Now that you have it running:

### Beginner:
1. ✅ **You are here!** Server is running
2. 📖 Read **START-HERE.md** for project overview
3. 🧪 Browse the site and test features
4. 🔧 Try editing a file in `src/` and watch it update!

### Intermediate:
1. 📖 Read **LOCALHOST-SETUP.md** for complete setup
2. 🎨 Configure company settings in admin panel
3. 📧 Set up email (optional)
4. 💳 Set up payments (optional)

### Advanced:
1. 📖 Read **README.md** for full documentation
2. 🚀 Follow **DEPLOYMENT.md** to go live
3. ✅ Complete **TESTING-CHECKLIST.md**

---

## 🆘 Still Stuck?

### Check These:

1. **Are you in the right folder?**
   ```bash
   pwd     # Mac/Linux
   cd      # Windows
   # Should show: /Users/you/Desktop/costplus100-ecommerce
   ```

2. **Is Node.js installed?**
   ```bash
   node --version
   # Should show: v18.x.x or v20.x.x
   ```

3. **Did pnpm install finish?**
   ```bash
   # You should see a node_modules folder:
   ls node_modules     # Mac/Linux
   dir node_modules    # Windows
   ```

4. **Is the server actually running?**
   ```bash
   # You should see "VITE" in the terminal
   # If not, run: pnpm dev
   ```

5. **Can you access the URL?**
   - Open: http://localhost:5173
   - If it doesn't load, check the terminal for errors

### Need More Help?

**Check these files:**
- `START-HERE.md` - Project overview
- `LOCALHOST-SETUP.md` - Detailed setup
- `README.md` - Complete documentation

---

## 🎉 Success!

If you can see the Costplus100 website at http://localhost:5173, you're all set!

**Next steps:**
1. Browse the site
2. Login to admin panel
3. Read `START-HERE.md`
4. Start building! 🚀

---

## 📝 Quick Copy-Paste Commands

**Complete setup in one go:**

```bash
# 1. Navigate to project (Mac/Linux)
cd ~/Desktop/costplus100-ecommerce

# 1. Navigate to project (Windows)
cd Desktop\costplus100-ecommerce

# 2. Install pnpm (if needed)
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Start server
pnpm dev

# 5. Open browser: http://localhost:5173
```

**That's it! You're ready to go! 🚀**

---

**Having issues?** Read the "Common Issues & Solutions" section above, or check `LOCALHOST-SETUP.md` for more details.