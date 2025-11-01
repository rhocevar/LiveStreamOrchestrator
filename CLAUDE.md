# CLAUDE.md

## Project Overview

**Favorited** is a React-based web application built with Vite and TypeScript. The project integrates LiveKit for real-time communication capabilities.

## Tech Stack

- **Frontend Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Language**: TypeScript 5.9.3
- **Real-time Communication**: LiveKit Server SDK 2.14.0
- **Linting**: ESLint 9.36.0

## Project Structure

```
favorited/
├── src/
│   ├── assets/          # Static assets (images, icons, etc.)
│   ├── App.tsx          # Main application component
│   ├── App.css          # Application styles
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── public/              # Public static files
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── eslint.config.js     # ESLint configuration
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Development Guidelines

### TypeScript
- Use strict TypeScript configuration
- Prefer type inference where possible
- Define explicit types for function parameters and return values
- Use interfaces for object shapes

### React Best Practices
- Use functional components with hooks
- Prefer `const` for component declarations
- Use React 19 features when appropriate
- Keep components small and focused on a single responsibility

### Code Style
- Follow ESLint rules configured in the project
- Use meaningful variable and function names
- Keep files under 300 lines when possible
- Extract reusable logic into custom hooks

### File Organization
- Components should be in `src/components/` (when created)
- Custom hooks should be in `src/hooks/` (when created)
- Utilities should be in `src/utils/` (when created)
- Types should be co-located with their usage or in `src/types/` for shared types

## LiveKit Integration

The project includes `livekit-server-sdk` for real-time communication features. When implementing LiveKit functionality:

- Use environment variables for LiveKit API credentials
- Implement proper error handling for connection failures
- Consider connection state management
- Handle cleanup on component unmount

## Git Workflow

- **Main Branch**: `main`
- Commit messages should be clear and descriptive
- Keep commits atomic and focused

## Key Considerations for AI Assistance

### When Adding Features
1. Check if similar functionality already exists
2. Follow the established project structure
3. Add TypeScript types for all new code
4. Consider responsive design for UI components
5. Test in development mode before building

### When Refactoring
1. Maintain backward compatibility unless explicitly asked to break it
2. Preserve existing functionality
3. Update related documentation and comments
4. Consider performance implications

### When Debugging
1. Check the browser console for errors
2. Verify TypeScript compilation issues
3. Check ESLint warnings
4. Review React DevTools for component issues

## Environment Setup

This project runs on:
- **Platform**: Windows (win32)
- **Node.js**: Required for development
- **Package Manager**: npm

## Future Considerations

As the project grows, consider:
- Adding a component library or design system
- Implementing state management (Context API, Zustand, or Redux)
- Adding routing (React Router)
- Implementing testing (Vitest, React Testing Library)
- Adding CI/CD pipelines
- Implementing proper LiveKit room and participant management

## Notes for AI

- This is an early-stage project with basic Vite + React template structure
- LiveKit has been installed but not yet integrated into the application
- The project uses React 19, which includes the latest React features
- Always maintain TypeScript type safety
- Prefer modern React patterns (hooks, functional components)
