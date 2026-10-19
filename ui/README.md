# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Authentication API

Authentication is backed by the Express/MongoDB service in `../api`. Follow [the API setup guide](../api/README.md) to configure MongoDB, run the API, and set the Google OAuth client ID. The frontend uses `VITE_API_URL` (default `http://localhost:4000`) and `VITE_GOOGLE_CLIENT_ID` from its local `.env` file.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
