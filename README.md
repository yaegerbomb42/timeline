# Ultra 3D Timeline with Gemini AI

A beautiful, interactive 3D timeline application with AI integration powered by Google's Gemini AI.

## Features

- 🎨 Ultra-modern 3D glassmorphism design
- 🤖 AI-powered timeline insights using Gemini AI
- 📝 Add, search, and manage timeline notes
- 🔍 Real-time search functionality
- 🔐 Admin panel for advanced management
- 📱 Fully responsive design
- 💾 Local storage persistence
- 📤 Export/Import timeline data

## Live Demo

Deploy this project on Vercel for instant hosting.

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Replace the placeholder in the `CONFIG.GEMINI_API_KEY` field in `index.html`

2. **Deploy to Vercel**:
   - Fork this repository
   - Connect your GitHub account to Vercel
   - Import this project
   - Deploy automatically

## Usage

### Adding Notes
- Switch to "Note Mode" and type your note
- Press Enter or click Send to add to timeline

### AI Assistant
- Switch to "AI Mode" to ask questions about your timeline
- The AI can provide insights and answer questions based on your notes

### Admin Features
- Click the admin button (shield icon)
- Login with default credentials: `admin` / `Zawe1234!`
- Access advanced features like bulk delete, export/import

## Configuration

The app can be configured by modifying the `CONFIG` object in `index.html`:

```javascript
const CONFIG = {
    STORAGE_KEY: 'ultra3d_notes',
    ADMIN_CREDENTIALS: { username: 'admin', password: 'Zawe1234!' },
    GEMINI_API_KEY: 'YOUR_API_KEY_HERE',
    GEMINI_API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
};
```

## Security Notes

- Change the default admin credentials before deployment
- Keep your Gemini API key secure
- The app uses client-side storage only

## Technologies Used

- HTML5
- CSS3 (Advanced animations & 3D transforms)
- Vanilla JavaScript
- Tailwind CSS
- Font Awesome Icons
- Google Gemini AI API

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to use and modify as needed.
