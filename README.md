# Resume Updater - AI Powered

An AI-powered resume optimization application that tailors your resume to specific job descriptions using Google Gemini AI.

## Features

- 🎨 **Multiple Templates**: Choose from Modern, Classic, Creative, and Minimal resume templates
- 🤖 **AI Optimization**: Uses Google Gemini AI to optimize your resume for specific job descriptions
- 📊 **Match Analysis**: Get a match score and see which skills you have vs. which are missing
- 🔄 **Real-time Preview**: See your resume update in real-time
- 📄 **Print/Download**: Print or download your optimized resume as PDF
- 🎯 **Keyword Optimization**: Automatically incorporates relevant keywords from job descriptions

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A Google Gemini API key (get one free at [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation

1. Clone the repository:
```bash
cd resume_updater
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Usage

1. **Enter your Gemini API Key**: Click on the API key input field and paste your Google Gemini API key
2. **Choose a Template**: Select from one of the four available resume templates
3. **Paste Job Description**: Copy and paste the job description you want to target
4. **Optimize**: Click "Optimize Resume with AI" to have Gemini tailor your resume
5. **Review & Download**: Review the changes and print/download your optimized resume

## Project Structure

```
resume_updater/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ActionButtons.jsx      # Download/Print/Reset buttons
│   │   ├── ApiKeyInput.jsx        # Gemini API key input
│   │   ├── JobDescriptionInput.jsx # Job description textarea
│   │   ├── MatchAnalysis.jsx      # Match score and analysis
│   │   ├── ResumePreview.jsx      # Resume template renderer
│   │   └── TemplateSelector.jsx   # Template selection UI
│   ├── data/
│   │   └── defaultResume.js       # Default resume data structure
│   ├── services/
│   │   └── geminiService.js       # Gemini AI integration
│   ├── templates/
│   │   └── index.js               # Template definitions
│   ├── App.jsx                    # Main application component
│   ├── index.css                  # Global styles
│   └── main.jsx                   # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

## Customizing Your Resume

Edit the `src/data/defaultResume.js` file to use your own resume data. The structure supports:

- Personal information (name, title, contact, links)
- Professional summary
- Work experience with highlights
- Education
- Technical skills (languages, frameworks, tools, databases)
- Projects
- Certifications

## Adding New Templates

Add new templates in `src/templates/index.js`:

```javascript
export const templates = {
  // ... existing templates
  newTemplate: {
    id: 'newTemplate',
    name: 'New Template Name',
    description: 'Description of the template',
    styles: {
      headerBg: 'bg-color-class',
      headerText: 'text-color-class',
      sectionTitle: 'text-color-class border-color-class',
      accentColor: 'color-name',
    }
  }
};
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Google Gemini AI** - AI-powered resume optimization
- **Lucide React** - Icons

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
