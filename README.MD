# PingDrop Optimizer 🎮

PingDrop Optimizer is an elite, NOC-grade Network Route Visualizer and lag compensation simulator designed specifically for competitive gamers. It demonstrates the conceptual power of gaming VPNs by visually calculating and rendering optimal physical infrastructure routes (submarine and terrestrial cables) to reduce matchmaking packet loss and ping.

## ✨ Core Features

* **Interactive 3D WebGL Globe**: Powered by `globe.gl`, featuring a highly detailed vector-based map, glowing atmosphere, interactive country tooltips, and animated physical fiber-optic cables.

* **Physical Infrastructure Pathfinding**: Utilizes Dijkstra's algorithm over a hardcoded spatial graph of the world's major Internet Exchange Points (IXPs) and Submarine Landing Stations.

* **Live Telemetry Simulation**: Resolves game server domains to IP addresses, geolocates them, and simulates base latency, backbone penalties, and geographic "ping drop" savings.

* **AI Network Analyst**: Integrates with Google's Gemini API to provide competitive, esports-focused lag probability reports and dynamic route analysis.

* **Esports UI/UX**: Built with a responsive, glassmorphism design system utilizing Tailwind CSS, featuring packet hop timelines and dynamic routing matrices.

## 🚀 Tech Stack

* **Frontend**: React (Hooks, state management, useMemo)

* **Styling**: Tailwind CSS (Glassmorphism, responsive flex/grid layouts)

* **3D Rendering**: `globe.gl` (Three.js wrapper)

* **Icons**: `lucide-react`

* **APIs**:

  * Google DNS (`dns.google/resolve`) for server IP resolution.

  * GeoJS (`get.geojs.io`) for coordinate geolocation.

  * Google Gemini API (`generativelanguage.googleapis.com`) for AI analysis.

## 🛠️ Installation & Setup

Because this is a Single Page Application (SPA), it requires zero backend infrastructure to run.

1. **Initialize a new React project** (Vite recommended):

   ```bash
   npm create vite@latest pingdrop-optimizer -- --template react
   cd pingdrop-optimizer
   ```

2. **Install Dependencies**:

   ```bash
   npm install lucide-react globe.gl
   ```

3. **Install Tailwind CSS**:
   Follow the [official Tailwind CSS installation guide for Vite](https://tailwindcss.com/docs/guides/vite).

4. **Add the Code**:
   Replace the contents of `src/App.jsx` with the PingDrop Optimizer code.

5. **Configure API Keys**:
   Locate the `analyzeWithGemini` function in `App.jsx` and insert your Gemini API Key:

   ```javascript
   const apiKey = "YOUR_GEMINI_API_KEY_HERE"; 
   ```

6. **Run the App**:

   ```bash
   npm run dev
   ```

## 🧠 How the Engine Works

Since modern web browsers restrict raw ICMP (`ping`) or UDP traceroute packets, PingDrop Optimizer uses an advanced mathematical simulation engine:

1. **Target Acquisition**: The app takes a domain (e.g., `matchmaking.game.com`), pings Google DNS for the A-Record, and hits a Geo-IP service to find the physical latitude/longitude of the server.

2. **Dijkstra's Routing**: It calculates the Haversine distance from the user's IP to the nearest known physical backbone node, then runs Dijkstra's algorithm across our custom array of Submarine/Terrestrial edges (`BACKBONE_EDGES`) to find the shortest physical path to the target.

3. **Diversity Filtering**: The engine deliberately selects geographically diverse VPN proxy hubs to ensure parallel routing visualizations.

4. **Jitter & Rendering**: The routes are mapped to WebGL arcs. `jitterOffsets` are applied so cables sharing the same physical submarine trench are drawn side-by-side rather than overlapping (Z-fighting).

## 🔮 Future Roadmap

To transition this from a marketing prototype to a live telemetry application:

* **Desktop App Wrapper**: Wrap the React SPA in **Tauri** or **Electron** to bypass the browser sandbox, enabling the execution of native OS `ping` and `tracert` commands.

* **Serverless Edge Functions**: Alternatively, deploy cloud workers (e.g., Cloudflare Workers) at major global IXPs to perform raw latency checks on behalf of the browser.

* **Game Server Database**: Implement an autocomplete JSON dictionary mapping popular games (Valorant, CS2, Apex Legends) directly to known regional IP blocks.

*Built for optimal hit registration.*