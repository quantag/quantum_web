## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm (comes with Node.js)
- Angular CLI (`npm install -g @angular/cli`)

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   
   The application will be available at `http://localhost:4200`

## Building for Production

To build the Angular application for production deployment:

### Standard Production Build

```bash
npm run build
```

or

```bash
ng build --configuration=production
```

This command will:
- Create an optimized build in the `dist/` folder
- Enable ahead-of-time (AOT) compilation
- Minify CSS and JavaScript files
- Enable tree-shaking to remove unused code
- Apply build optimizations for better performance

### Build Output

The production build generates the following optimized files in `dist/`:
- `index.html` - The main HTML file
- `main.[hash].js` - Main application bundle
- `polyfills.[hash].js` - Browser compatibility polyfills
- `styles.[hash].css` - Compiled and minified styles
- Static assets from the `src/assets/` folder

## Deployment

After building for production:

1. Upload the contents of the `dist/` folder to your web server
2. Configure your web server to serve `index.html` for all routes (for Angular routing to work)
3. Ensure your server supports HTTPS for production deployments

## Project Structure

- `src/app/components/` - Reusable UI components
- `src/app/pages/` - Page components and routing
- `src/app/services/` - Business logic and API services
- `src/app/interfaces/` - TypeScript interfaces
- `src/app/types/` - Type definitions
- `src/assets/` - Static assets (images, styles)