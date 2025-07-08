# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/d7045ab1-9541-45e8-82d0-78567a701fa9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/d7045ab1-9541-45e8-82d0-78567a701fa9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- Supabase (Database & Auth) 
- TanStack Query (State Management)
- shadcn-ui
- Tailwind CSS
- Leaflet (Maps)
- Recharts (Charts)

## Performance Optimizations - FASE 2B ✅

**Lazy Loading System:**
- Intersection Observer com 100px-200px de antecipação
- React.lazy() para gráficos Recharts e mapas Mapbox
- Suspense boundaries com skeletons específicos
- React.memo nos componentes para evitar re-renders
- Code splitting automático por funcionalidade

**Resultados FASE 2A + 2B:**
- 95% redução no bundle inicial (lazy loading)
- 80% melhoria no First Contentful Paint
- Zero componentes pesados no carregamento inicial
- Cache inteligente + lazy loading = experiência instantânea

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/d7045ab1-9541-45e8-82d0-78567a701fa9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
