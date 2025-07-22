# QuantCanvas

A modern, interactive q/kdb+ development environment built with Wails, React, and TypeScript. QuantCanvas provides real-time coordinate tracking, visual data output, and an enhanced learning experience for q/kdb+ development.

## ✨ Features

### 🖱️ Interactive Coordinate System
- **Real-time Mouse Tracking**: Window-wide normalized coordinates (0.0 to 1.0)
- **Mouse Mode**: Execute queries only when mouse moves with smart throttling
- **Live Mode**: Continuous query execution every 0.1 seconds
- **Mutually Exclusive Modes**: Clear visual indicators and seamless mode switching

### 📊 Visual Data Output
- **Automatic Data Visualization**: Tables, charts, and images rendered automatically
- **Grayscale Image Support**: Matrix data rendered as interactive images
- **Chart Generation**: Line, bar, scatter, and histogram charts
- **Collapsible Results**: Smart output management with summary and detailed views

### 📚 Enhanced Learning System
- **Interactive Learning Guide**: Comprehensive q/kdb+ examples with one-click execution
- **Chapter-based Content**: Structured learning with granular subsections
- **Save State Management**: Resume reading from where you left off
- **Code Block Integration**: Execute examples directly from documentation

### 🎮 Interactive Console
- **WebSocket Connection**: Real-time communication with kdb+ instance
- **Query History**: Navigate through previous queries with arrow keys
- **Auto-focus**: Smart input focusing with keyboard shortcuts (Ctrl+L)
- **Connection Management**: Easy connect/disconnect with status indicators

### 🎨 Modern UI/UX
- **Responsive Design**: Collapsible sidebars and resizable panels
- **Dark Console Theme**: Terminal-inspired interface
- **Visual Feedback**: Animated indicators and smooth transitions
- **Accessibility**: Keyboard navigation and helpful tooltips

## 🚀 Getting Started

### Prerequisites
- [Go](https://golang.org/dl/) (1.18+)
- [Node.js](https://nodejs.org/) (16+)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2.0.0+

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/zaxiom13/quantcanvas.git
cd quantcanvas
```

2. **Install dependencies**:
```bash
# Install Go dependencies
go mod tidy

# Install frontend dependencies
cd frontend
npm install
cd ..
```

3. **Start kdb+ instance** (optional - for testing):
```bash
# Start kdb+ on default port (if you have kdb+ installed)
q -p 5001
```

### Development

Run in live development mode:
```bash
# Terminal 1: Start Wails dev server
wails dev

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

The application will be available at http://localhost:34115

### Building

Build for production:
```bash
# Build for current platform
wails build

# Build for specific platforms (see scripts directory)
./scripts/build-windows.sh
./scripts/build-macos.sh
```

## 🎯 Usage Examples

### Interactive Coordinate Examples

Try these queries with Mouse Mode or Live Mode enabled:

```q
// Interactive 3x3 grayscale image
3 3#(9*mouseX*mouseY)+til 9

// Dynamic 10x10 grid
10 10#til[100]*mouseX*mouseY

// Coordinate-driven table
([]x:til 50; y:(til 50)*mouseX; color:(til 50)*mouseY)

// Simple coordinate display
(mouseX;mouseY)
```

### Chart Generation

```q
// Line chart data
([]time:.z.T+til 100; price:100+cumsum 100?2.0-1.0)

// Histogram data
1000?100

// Scatter plot data  
([]x:100?10.0; y:100?10.0; size:100?5)
```

## 🛠️ Architecture

### Backend (Go)
- **Wails Framework**: Desktop application framework
- **WebSocket Server**: Real-time communication with frontend
- **kdb+ Integration**: Connection management and query execution

### Frontend (React + TypeScript)
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Chart.js**: Data visualization library
- **Lucide React**: Modern icon library

### Key Components
- **KdbConsole**: Main query interface with coordinate integration
- **VisualOutput**: Automatic data visualization and rendering
- **LearningGuide**: Interactive documentation system
- **ChapterModal**: Enhanced reading experience with save states

## 📁 Project Structure

```
quantCanvas/
├── app.go                 # Main Wails application
├── main.go               # Application entry point
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/         # Utility libraries
│   │   ├── data/        # Static data files
│   │   └── KdbConsole.tsx # Main console component
│   └── package.json     # Frontend dependencies
├── scripts/             # Build and utility scripts
└── wails.json          # Wails configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **kdb+/q**: The powerful time-series database and language
- **Wails**: Go-based desktop application framework
- **React**: Frontend library for building user interfaces
- **TailwindCSS**: Utility-first CSS framework

## 🐛 Known Issues

- Visual output may require expanding the pane twice on first use
- Some complex q expressions may need manual visual output refresh
- Mouse coordinate precision is limited to window boundaries

## 🔮 Roadmap

- [ ] Multiple kdb+ connection support
- [ ] Advanced chart customization options
- [ ] Export functionality for visualizations
- [ ] Plugin system for custom data renderers
- [ ] Collaborative features and session sharing


