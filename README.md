# ThinkUni Note Sharing Platform

> Think notes, ThinkUni — A community-driven platform for university students to share and discover academic resources.
> Currently configured for: **ThinkChrist** (Christ University)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-Latest-black?style=flat-square&logo=framer)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=flat-square&logo=supabase)
![Radix UI](https://img.shields.io/badge/Radix_UI-Latest-black?style=flat-square&logo=radix-ui)
![Recharts](https://img.shields.io/badge/Recharts-Analytics-22b5bf?style=flat-square)
![Zod](https://img.shields.io/badge/Zod-Validation-3068b7?style=flat-square&logo=zod)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/thinkchrist-note-sharing)

## Features

### Core Platform
- **Premium UI/UX** — Modern Glassmorphism design with fluid Framer Motion animations
- **Bento Grid Layouts** — Responsive, data-dense dashboards and visualizations
- **Smart Resource Repository** — Upload and download notes, papers, and study materials
- **Advanced Search** — Filter by department, semester, subject, resource type
- **Collections** — Organize resources into custom collections

### Gamification & Community
- **Gamification System** — Earn points and badges for contributions
- **Community Driven** — Upvote/downvote system for quality control
- **Leaderboards** — Track top contributors

### User Experience
- **Dark Mode** — Premium "Deep Space" dark theme
- **Smart Notifications** — Real-time updates with caregiver alerts
- **Analytics Dashboard** — Privacy-first usage insights

### Administration
- **Admin Panel** — Comprehensive user and content management
- **User Management** — Role-based access control, user tracking

## Quick Start

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

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Remove build artifacts |
| `npm run setup-db` | Initialize database |

## Project Structure

```
src/
├── app/                    # Next.js App Router (routes & API)
│   ├── (auth)/             # Authentication routes
│   ├── (dashboard)/        # Dashboard routes
│   ├── admin/              # Admin panel
│   └── api/                # API routes
├── features/               # Feature modules (self-contained)
│   ├── admin/              # Administrative tools
│   ├── analytics/          # Usage analytics
│   ├── auth/               # Authentication
│   ├── collections/        # Resource collections
│   ├── dashboard/          # Main dashboard
│   ├── gamification/       # Points & badges
│   ├── notifications/      # Notification system
│   ├── resources/          # Resource management
│   ├── search/             # Search functionality
│   ├── settings/           # User settings
│   └── user-management/    # User administration
├── shared/                 # Shared components, hooks, utils
├── lib/                    # External service integrations
│   ├── supabase/           # Database client
│   ├── services/           # Business logic services
│   └── logger.ts           # Centralized logging
├── components/             # Global UI components
├── context/                # React context providers
├── hooks/                  # Global custom hooks
└── types/                  # TypeScript definitions
```

### Architecture Principles

- **Feature Isolation** — Each feature is self-contained with its own components, hooks, and types
- **Shared Resources** — Common functionality centralized in `shared/`
- **Clean Separation** — Clear boundaries between features and infrastructure
- **Type Safety** — Comprehensive TypeScript coverage with explicit interfaces

## Documentation

| Document | Description |
|----------|-------------|
| [Development Guide](./DEVELOPMENT_GUIDE.md) | Feature development workflow & best practices |
| [Deployment Guide](./DEPLOYMENT_GUIDE.md) | Vercel deployment instructions |

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | User profiles with role-based access control |
| `resources` | Uploaded study materials |
| `votes` | Upvote/downvote tracking |
| `contributions` | Activity tracking for gamification |
| `analytics_events` | Privacy-first anonymous usage tracking |
| `user_interactions` | Recommendation engine data |
| `notifications` | User notification records |

## Deployment

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [Development Guide](./DEVELOPMENT_GUIDE.md) for architecture guidelines
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Christ University community
- Built with ❤️ for students, by students

---

**Need Help?** Check the [Development Guide](./DEVELOPMENT_GUIDE.md) or open an issue.
