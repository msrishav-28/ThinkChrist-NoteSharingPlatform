# ThinkChrist Note Sharing Platform

> Think notes, ThinkChrist — A community-driven platform for Christ University students to share and discover academic resources.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/thinkchrist-note-sharing)

## ✨ Features

- 📚 **Smart Resource Repository** — Upload and download notes, papers, and study materials
- 🏆 **Gamification System** — Earn points and badges for contributions
- 👥 **Community Driven** — Upvote/downvote system for quality control
- 🔍 **Advanced Search** — Filter by department, semester, subject, and more
- 📊 **Leaderboards** — Track top contributors
- 🌓 **Dark Mode** — Toggle between light and dark themes
- 🔔 **Smart Notifications** — Stay updated with relevant activities
- 👨‍💼 **Admin Panel** — Comprehensive administration tools

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Hosting | Vercel |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Christ University email (@christuniversity.in)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/thinkchrist-note-sharing.git
cd thinkchrist-note-sharing

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npm run setup-db

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router (routes & API)
├── features/               # Feature modules (self-contained)
│   ├── auth/               # Authentication
│   ├── resources/          # Resource management
│   ├── gamification/       # Points & badges
│   ├── notifications/      # Notification system
│   └── admin/              # Admin features
├── shared/                 # Shared components, hooks, utils
├── lib/                    # External service integrations
│   ├── supabase/           # Database client
│   ├── services/           # Business logic services
│   └── logger.ts           # Centralized logging
└── types/                  # TypeScript definitions
```

### Architecture Principles

- **Feature Isolation** — Each feature is self-contained with its own components, hooks, and types
- **Shared Resources** — Common functionality centralized in `shared/`
- **Clean Separation** — Clear boundaries between features and infrastructure
- **Type Safety** — Comprehensive TypeScript coverage with explicit interfaces

## 🔒 Security Features

- Server-side authentication enforcement
- CORS restricted to production domain
- ESLint validation during builds
- Environment-aware logging (no sensitive data in production)

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](./DEVELOPMENT_GUIDE.md) | Feature development workflow & best practices |
| [Deployment Guide](./DEPLOYMENT_GUIDE.md) | Vercel deployment instructions |

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User profiles with points and badge levels |
| `resources` | Uploaded study materials |
| `votes` | Upvote/downvote tracking |
| `contributions` | Activity tracking for gamification |
| `user_interactions` | Analytics and recommendations |

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy!

See [Deployment Guide](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔮 Roadmap

- 📱 Mobile app (React Native)
- 💬 Real-time chat system
- 📝 Collaborative note-taking
- 🤖 AI-powered content recommendations
- 👥 Study group formation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [Development Guide](./DEVELOPMENT_GUIDE.md) for architecture guidelines
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Christ University community
- Built with ❤️ for students, by students

---

**Need Help?** Check the [Development Guide](./DEVELOPMENT_GUIDE.md) or open an issue.
