import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Server, Map as MapIcon, XCircle, Zap, Network, Crosshair, Route, Trophy, Sparkles, Bot, Gamepad2, ShieldAlert, TrendingDown, Radar } from 'lucide-react';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// --- Utilities & Constants ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const generateRandomIP = () => {
  return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

// --- PHYSICAL INFRASTRUCTURE GRAPH ---
const BACKBONE_NODES = {
  'Los Angeles': { lat: 34.05, lon: -118.24, isSubmarine: true },
  'San Jose':    { lat: 37.33, lon: -121.88, isSubmarine: true },
  'Seattle':     { lat: 47.60, lon: -122.33, isSubmarine: true },
  'New York':    { lat: 40.71, lon: -74.00,  isSubmarine: true },
  'Miami':       { lat: 25.76, lon: -80.19,  isSubmarine: true },
  'Chicago':     { lat: 41.87, lon: -87.62,  isSubmarine: false },
  'Dallas':      { lat: 32.77, lon: -96.79,  isSubmarine: false },
  'London':      { lat: 51.50, lon: -0.12,   isSubmarine: true },
  'Frankfurt':   { lat: 50.11, lon: 8.68,    isSubmarine: false },
  'Amsterdam':   { lat: 52.36, lon: 4.90,    isSubmarine: true },
  'Marseille':   { lat: 43.29, lon: 5.36,    isSubmarine: true },
  'Tokyo':       { lat: 35.67, lon: 139.65,  isSubmarine: true },
  'Singapore':   { lat: 1.35,  lon: 103.81,  isSubmarine: true },
  'Hong Kong':   { lat: 22.31, lon: 114.16,  isSubmarine: true },
  'Mumbai':      { lat: 18.93, lon: 72.82,   isSubmarine: true },
  'Sydney':      { lat: -33.86, lon: 151.20, isSubmarine: true },
  'Guam':        { lat: 13.44, lon: 144.79,  isSubmarine: true },
  'Hawaii':      { lat: 21.30, lon: -157.85, isSubmarine: true },
  'Sao Paulo':   { lat: -23.55, lon: -46.63, isSubmarine: false },
  'Fortaleza':   { lat: -3.73, lon: -38.52,  isSubmarine: true },
  'Dubai':       { lat: 25.20, lon: 55.27,   isSubmarine: true },
  'Suez':        { lat: 29.96, lon: 32.55,   isSubmarine: true },
};

const BACKBONE_EDGES = [
  ['Los Angeles', 'Tokyo'],   ['San Jose', 'Tokyo'],    ['Seattle', 'Tokyo'],
  ['Los Angeles', 'Hawaii'],  ['San Jose', 'Hawaii'],   ['Hawaii', 'Tokyo'],
  ['Hawaii', 'Guam'],         ['Guam', 'Tokyo'],        ['Guam', 'Sydney'],     ['Hawaii', 'Sydney'],
  ['New York', 'London'],     ['New York', 'Amsterdam'], ['Miami', 'London'],
  ['Seattle', 'San Jose'],    ['San Jose', 'Los Angeles'], ['Los Angeles', 'Dallas'],
  ['Dallas', 'Miami'],        ['Dallas', 'Chicago'],    ['Chicago', 'New York'], ['Miami', 'New York'],
  ['Miami', 'Fortaleza'],     ['Fortaleza', 'Sao Paulo'],
  ['London', 'Amsterdam'],    ['Amsterdam', 'Frankfurt'], ['London', 'Frankfurt'], ['Frankfurt', 'Marseille'],
  ['Marseille', 'Suez'],      ['Suez', 'Dubai'],        ['Dubai', 'Mumbai'],    ['Suez', 'Mumbai'],   ['Mumbai', 'Singapore'],
  ['Singapore', 'Hong Kong'], ['Hong Kong', 'Tokyo'],   ['Singapore', 'Sydney'],
  ['Hong Kong', 'Los Angeles'], ['Dubai', 'Frankfurt'], ['Tokyo', 'Chicago'],   ['London', 'New York'],
];

const VPN_HUBS = [
  { name: 'Ashburn, VA',         lat: 39.0438,  lon: -77.4874 },
  { name: 'Los Angeles, CA',     lat: 34.0522,  lon: -118.2437 },
  { name: 'Chicago, IL',         lat: 41.8781,  lon: -87.6298 },
  { name: 'Dallas, TX',          lat: 32.7767,  lon: -96.7970 },
  { name: 'London, UK',          lat: 51.5074,  lon: -0.1278 },
  { name: 'Frankfurt, Germany',  lat: 50.1109,  lon: 8.6821 },
  { name: 'Tokyo, Japan',        lat: 35.6762,  lon: 139.6503 },
  { name: 'Singapore',           lat: 1.3521,   lon: 103.8198 },
  { name: 'Sydney, Australia',   lat: -33.8688, lon: 151.2093 },
  { name: 'Sao Paulo, Brazil',   lat: -23.5505, lon: -46.6333 },
];

const BACKBONE_ALERTS = [
  { id: 1, time: '10 min ago',  severity: 'high',   region: 'Trans-Atlantic (TAT-14)',  msg: 'Submarine signal degradation. High packet loss reported.' },
  { id: 2, time: '45 min ago',  severity: 'medium', region: 'US-Central (Dallas)',       msg: 'ISP peering congestion. Routing delays spiking ping by ~40ms.' },
  { id: 3, time: '2 hrs ago',   severity: 'low',    region: 'AP-Northeast (Tokyo)',      msg: 'Landing Station maintenance. Routing switched to redundant fiber.' },
];

export default function App() {
  const [target, setTarget] = useState('');
  const [isTracing, setIsTracing] = useState(false);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('SYSTEM STANDBY. Awaiting matchmaking vector...');
  const [globeLoaded, setGlobeLoaded] = useState(false);

  const [targetInfo, setTargetInfo] = useState(null);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [activeRouteId, setActiveRouteId] = useState('direct');
  const [directPingRef, setDirectPingRef] = useState(0);

  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const graph = useMemo(() => {
    const g = {};
    Object.keys(BACKBONE_NODES).forEach(n => { g[n] = {}; });
    BACKBONE_EDGES.forEach(([n1, n2]) => {
      const dist = getDistanceFromLatLonInKm(
        BACKBONE_NODES[n1].lat, BACKBONE_NODES[n1].lon,
        BACKBONE_NODES[n2].lat, BACKBONE_NODES[n2].lon
      );
      g[n1][n2] = dist;
      g[n2][n1] = dist;
    });
    return g;
  }, []);

  const getNearestNode = (lat, lon) => {
    let nearest = null;
    let minDist = Infinity;
    Object.entries(BACKBONE_NODES).forEach(([name, coords]) => {
      const d = getDistanceFromLatLonInKm(lat, lon, coords.lat, coords.lon);
      if (d < minDist) { minDist = d; nearest = name; }
    });
    return { name: nearest, dist: minDist };
  };

  const findShortestBackbonePath = (startNode, endNode) => {
    if (startNode === endNode) return [startNode];
    const distances = {};
    const prev = {};
    const q = Object.keys(graph);
    q.forEach(n => { distances[n] = Infinity; });
    distances[startNode] = 0;

    while (q.length > 0) {
      q.sort((a, b) => distances[a] - distances[b]);
      const u = q.shift();
      if (u === endNode || distances[u] === Infinity) break;
      for (const neighbor in graph[u]) {
        const alt = distances[u] + graph[u][neighbor];
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          prev[neighbor] = u;
        }
      }
    }
    const path = [];
    let u = endNode;
    while (prev[u]) { path.unshift(u); u = prev[u]; }
    if (path.length > 0) path.unshift(startNode);
    return path;
  };

  const resolveTarget = async (rawInput) => {
    const input = rawInput.split(':')[0].trim();
    if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(input)) return input;
    setStatusText(`RESOLVING DOMAIN ${input}...`);
    try {
      const res = await fetch(`https://dns.google/resolve?name=${input}&type=A`);
      const data = await res.json();
      if (data.Answer && data.Answer.length > 0) {
        const aRecord = data.Answer.find(r => r.type === 1);
        if (aRecord) return aRecord.data;
        return data.Answer[data.Answer.length - 1].data;
      }
      throw new Error('DNS resolution returned no valid records.');
    } catch (e) { throw new Error(`Could not resolve domain ${input}`); }
  };

  const getEnrichedGeoLocation = async (ip = '') => {
    const res = await fetch(ip ? `https://get.geojs.io/v1/ip/geo/${ip}.json` : `https://get.geojs.io/v1/ip/geo.json`);
    if (!res.ok) throw new Error(`Geodata failed HTTP ${res.status}`);
    const data = await res.json();
    return {
      ip: data.ip,
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      city: data.city || 'Unknown City',
      country: data.country || 'Unknown Country',
      isp: data.organization_name || data.organization || 'Unknown ISP',
      asn: data.asn ? `AS${data.asn}` : 'Unknown ASN',
    };
  };

  useEffect(() => {
    let checkInterval;
    const loadGlobe = () => {
      if (window.Globe) { setGlobeLoaded(true); return; }
      const existingScript = document.getElementById('globe-gl-script');
      if (existingScript) {
        checkInterval = setInterval(() => {
          if (window.Globe) { setGlobeLoaded(true); clearInterval(checkInterval); }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'globe-gl-script';
      script.src = 'https://unpkg.com/globe.gl';
      script.onload = () => setGlobeLoaded(true);
      document.head.appendChild(script);
    };
    loadGlobe();
    return () => { if (checkInterval) clearInterval(checkInterval); };
  }, []);

  useEffect(() => {
    let resizeObserver;
    if (globeLoaded && mapRef.current && !mapInstanceRef.current) {
      const initWidth = mapRef.current.clientWidth || 800;
      const initHeight = mapRef.current.clientHeight || 400;

      mapInstanceRef.current = window.Globe()(mapRef.current)
        .width(initWidth)
        .height(initHeight)
        .showGlobe(true)
        .showAtmosphere(true)
        .atmosphereColor('#06b6d4')
        .atmosphereAltitude(0.15)
        .backgroundColor('rgba(0,0,0,0)')
        .arcColor('color')
        .arcAltitude('altitude')
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime('animateTime')
        .arcStroke('stroke')
        .pointColor('color')
        .pointAltitude(0.015)
        .pointRadius('radius')
        .ringColor('color')
        .ringMaxRadius('maxRadius')
        .ringPropagationSpeed('propagationSpeed')
        .ringRepeatPeriod('repeatPeriod')
        .labelColor('color')
        .labelSize('size')
        .labelDotRadius(0.2)
        .labelAltitude('altitude')
        .labelResolution(2);

      let hoverD = null;
      fetch('https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(countries => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current
              .polygonsData(countries.features)
              .polygonCapColor(d => d === hoverD ? 'rgba(6, 182, 212, 0.2)' : '#030712')
              .polygonSideColor(() => 'rgba(0,0,0,0)')
              .polygonStrokeColor(() => '#1f2937')
              .onPolygonHover(d => {
                hoverD = d;
                mapInstanceRef.current.polygonCapColor(d => d === hoverD ? 'rgba(6, 182, 212, 0.2)' : '#030712');
              })
              .polygonLabel(({ properties: d }) =>
                `<div style="background:rgba(3,7,18,0.9);border:1px solid rgba(6,182,212,0.3);padding:6px 10px;border-radius:6px;font-size:11px;color:#e5e7eb;font-family:monospace;font-weight:bold;letter-spacing:0.05em">
                  <span style="color:#22d3ee;margin-right:6px">▰</span>${d.ADMIN}
                </div>`
              );
          }
        })
        .catch(err => console.warn('Country overlay failed:', err));

      mapInstanceRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });

      resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && mapInstanceRef.current) {
            mapInstanceRef.current.width(width).height(height);
          }
        }
      });
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [globeLoaded]);

  const updateMapVisuals = (currentRoutes, activeId) => {
    if (!mapInstanceRef.current) return;

    const arcs = [];
    const points = [];
    const rings = [];
    const labels = [];

    // Background graph
    BACKBONE_EDGES.forEach(([n1, n2]) => {
      arcs.push({
        startLat: BACKBONE_NODES[n1].lat, startLng: BACKBONE_NODES[n1].lon,
        endLat: BACKBONE_NODES[n2].lat,   endLng: BACKBONE_NODES[n2].lon,
        color: ['rgba(55, 65, 81, 0.3)', 'rgba(55, 65, 81, 0.3)'],
        stroke: 0.2,
        altitude: 0.01,
        animateTime: 0,
      });
    });

    Object.entries(BACKBONE_NODES).forEach(([name, node]) => {
      points.push({ lat: node.lat, lng: node.lon, color: 'rgba(55, 65, 81, 0.8)', radius: node.isSubmarine ? 0.25 : 0.15 });
      labels.push({ lat: node.lat, lng: node.lon, text: name, size: 0.4, color: 'rgba(156, 163, 175, 0.5)', altitude: 0.03 });
    });

    // Active Routes
    currentRoutes.forEach((route, index) => {
      const isActive = route.id === activeId;

      for (let i = 0; i < route.hops.length - 1; i++) {
        arcs.push({
          startLat: route.hops[i].lat,     startLng: route.hops[i].lon,
          endLat:   route.hops[i + 1].lat, endLng:   route.hops[i + 1].lon,
          color:       isActive ? [route.color, route.color] : [`${route.color}40`, `${route.color}40`],
          stroke:      isActive ? 1.5 : 0.3,
          altitude:    isActive ? 0.12 + (index * 0.03) : 0.03 + (index * 0.01),
          animateTime: isActive ? 1200 : 0,
        });
      }

      route.hops.forEach((hop) => {
        if (isActive) {
          points.push({ lat: hop.lat, lng: hop.lon, color: route.color, radius: hop.isStart || hop.isFinal ? 1.0 : (hop.isVpn ? 0.8 : 0.4) });
          if (hop.isStart || hop.isFinal || hop.isVpn) {
            rings.push({ lat: hop.lat, lng: hop.lon, color: route.color, maxRadius: 5, propagationSpeed: 3, repeatPeriod: 1000 });
            const labelText = hop.isStart ? 'CLIENT' : (hop.isFinal ? 'SERVER' : 'TUNNEL');
            labels.push({ lat: hop.lat + 1.5, lng: hop.lon, text: labelText, size: 1.5, color: route.color, altitude: 0.2 });
          }
        } else {
          points.push({ lat: hop.lat, lng: hop.lon, color: `${route.color}66`, radius: 0.2 });
        }
      });
    });

    mapInstanceRef.current
      .arcsData(arcs)
      .pointsData(points)
      .ringsData(rings)
      .labelsData(labels);

    if (currentRoutes.length > 0) {
      const activeRoute = currentRoutes.find(r => r.id === activeId) || currentRoutes[0];
      if (activeRoute && activeRoute.hops.length > 0) {
        const midHop = activeRoute.hops[Math.floor(activeRoute.hops.length / 2)];
        mapInstanceRef.current.pointOfView({ lat: midHop.lat, lng: midHop.lon, altitude: 1.8 }, 1500);
      }
    }
  };

  useEffect(() => {
    if (routes.length > 0) updateMapVisuals(routes, activeRouteId);
  }, [activeRouteId, routes]);

  const generatePhysicalLeg = (startGeo, endGeo, startHopNum, baseLatency, isFinalLeg, isVpnNode = false, vpnName = '', jitterOffset = 0) => {
    const sLat = startGeo.latitude; const sLon = startGeo.longitude;
    const dLat = endGeo.latitude;   const dLon = endGeo.longitude;
    const totalStraightDist = getDistanceFromLatLonInKm(sLat, sLon, dLat, dLon);

    const startNode = getNearestNode(sLat, sLon);
    const endNode   = getNearestNode(dLat, dLon);

    let pathNodes = [];
    let hops = [];
    let totalFiberDistance = 0;
    let currentLatency = baseLatency;
    let hopCount = startHopNum;

    hops.push({
      hop: hopCount++,
      ip: startGeo.ip || '192.168.1.1',
      location: `${startGeo.city}, ${startGeo.country}`,
      lat: sLat + jitterOffset, lon: sLon + jitterOffset,
      latency: currentLatency + Math.floor(Math.random() * 3) + 1,
      isStart: startHopNum === 1, isFinal: false, isVpn: false,
    });

    if (totalStraightDist < 1000 || startNode.name === endNode.name) {
      totalFiberDistance = totalStraightDist;
    } else {
      pathNodes = findShortestBackbonePath(startNode.name, endNode.name);
      totalFiberDistance += startNode.dist;

      for (let i = 0; i < pathNodes.length; i++) {
        const nodeName = pathNodes[i];
        const nCoords = BACKBONE_NODES[nodeName];

        if (i > 0) {
          const prevName   = pathNodes[i - 1];
          const prevCoords = BACKBONE_NODES[prevName];
          totalFiberDistance += getDistanceFromLatLonInKm(prevCoords.lat, prevCoords.lon, nCoords.lat, nCoords.lon);
        }

        currentLatency = baseLatency + Math.max(5, Math.round((totalFiberDistance / 100) * 1.5 + (i * 2)));

        hops.push({
          hop: hopCount++,
          ip: generateRandomIP(),
          location: `${nCoords.isSubmarine ? 'Submarine Landing' : 'Terrestrial IXP'} ${nodeName}`,
          lat: nCoords.lat + jitterOffset, lon: nCoords.lon + jitterOffset,
          latency: currentLatency, isStart: false, isFinal: false, isVpn: false,
        });
      }
      totalFiberDistance += endNode.dist;
    }

    currentLatency = baseLatency + Math.max(5, Math.round((totalFiberDistance / 100) * 1.5 + (pathNodes.length * 2) + 5));
    hops.push({
      hop: hopCount,
      ip: isVpnNode ? generateRandomIP() : (endGeo.ip || 'Matchmaking Server'),
      location: isVpnNode ? `Tunnel Node ${vpnName}` : `${endGeo.city}, ${endGeo.country}`,
      lat: dLat + jitterOffset, lon: dLon + jitterOffset,
      latency: currentLatency, isStart: false, isFinal: isFinalLeg, isVpn: isVpnNode,
    });

    return { hops, totalFiberDistance, finalLatency: currentLatency };
  };

  const analyzeWithGemini = async (routesData, tInfo, sInfo) => {
    setIsAnalyzing(true);
    setAiAnalysis('');
    const apiKey = GEMINI_API_KEY;
    try {
      const prompt = `You are an elite Esports Network Analyst AI. A player is trying to reduce their ping for competitive matchmaking.
      Player Location: ${sInfo.city}, ${sInfo.country}
      Game Server Location: ${tInfo.city}, ${tInfo.country}

      Routes Calculated (Ranked by lowest Ping):
      1. ${routesData[0].isDefault ? 'ISP' : 'Tunnel'} (${routesData[0].name}) - ${routesData[0].totalPing}ms
      2. ${routesData[1].isDefault ? 'ISP' : 'Tunnel'} (${routesData[1].name}) - ${routesData[1].totalPing}ms

      Active Network Outages:
      ${BACKBONE_ALERTS.map(a => `- ${a.region}: ${a.msg}`).join('\n')}

      In exactly 2 highly aggressive, confident sentences: Explain to the gamer why connecting via the #1 optimized tunnel will drastically eliminate lag spikes and packet loss compared to their default ISP, referencing the specific outages or physical routing advantage. Use intense competitive gaming terminology.`;

      let resultText = '';
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: 'You are an expert esports routing AI. Output pure text only. No markdown formatting.' }] },
              }),
            }
          );
          if (!res.ok) throw new Error('API Failed');
          const data = await res.json();
          resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'AI analysis unavailable.';
          break;
        } catch (e) {
          if (attempt === 2) throw e;
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
      setAiAnalysis(resultText.trim());
    } catch (err) {
      setAiAnalysis('AI telemetry failed to generate. Packet analysis unavailable.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startTrace = async (e) => {
    e.preventDefault();
    if (!target.trim() || isTracing) return;

    setIsTracing(true);
    setRoutes([]); setError(null); setTargetInfo(null); setSourceInfo(null); setAiAnalysis('');

    try {
      const destIP = await resolveTarget(target.trim());
      setStatusText('ACQUIRING SERVER TELEMETRY...');
      const [sourceGeo, destGeo] = await Promise.all([getEnrichedGeoLocation(), getEnrichedGeoLocation(destIP)]);

      setSourceInfo(sourceGeo); setTargetInfo(destGeo);

      setStatusText('CALCULATING DEFAULT ISP PENALTY...');
      const directLeg = generatePhysicalLeg(sourceGeo, destGeo, 1, 0, true, false, '', 0);

      let directPenalty = 0;
      if (directLeg.totalFiberDistance > 6000)      directPenalty = Math.floor(Math.random() * 60) + 50;
      else if (directLeg.totalFiberDistance > 2000)  directPenalty = Math.floor(Math.random() * 40) + 30;
      else                                            directPenalty = Math.floor(Math.random() * 20) + 15;

      if (directLeg.hops.length > 2) {
        const pph = Math.floor(directPenalty / (directLeg.hops.length - 2));
        directLeg.hops.forEach((h, i) => { if (i > 0) h.latency += (pph * i); });
        directLeg.finalLatency = directLeg.hops[directLeg.hops.length - 1].latency;
      }

      const directRoute = {
        id: 'direct', name: 'Standard Routing', color: '#f43f5e',
        hops: directLeg.hops, totalPing: directLeg.finalLatency, totalDist: directLeg.totalFiberDistance, isDefault: true,
      };

      setDirectPingRef(directRoute.totalPing);

      const rankedVpns = VPN_HUBS.map(hub => {
        const d1 = getDistanceFromLatLonInKm(sourceGeo.latitude, sourceGeo.longitude, hub.lat, hub.lon);
        const d2 = getDistanceFromLatLonInKm(hub.lat, hub.lon, destGeo.latitude, destGeo.longitude);
        return { ...hub, totalDist: d1 + d2 };
      }).sort((a, b) => a.totalDist - b.totalDist);

      const topVpns = rankedVpns.slice(0, 3);
      const vpnRoutes = [];
      const colors  = ['#10b981', '#06b6d4', '#8b5cf6'];
      const jitters = [0.4, -0.4, 0.8];

      for (let i = 0; i < 3; i++) {
        const vpn = topVpns[i];
        setStatusText(`ESTABLISHING SECURE TUNNEL ${i + 1}...`);
        const vGeo = { latitude: vpn.lat, longitude: vpn.lon, city: vpn.name, country: '' };

        const leg1 = generatePhysicalLeg(sourceGeo, vGeo, 1, 0, false, true, vpn.name, jitters[i]);
        const leg2 = generatePhysicalLeg(vGeo, destGeo, leg1.hops.length, leg1.finalLatency + 5, true, false, '', jitters[i]);

        leg2.hops.shift();
        const combinedHops = [...leg1.hops, ...leg2.hops];
        combinedHops.forEach((h, idx) => { h.hop = idx + 1; });

        vpnRoutes.push({
          id: `vpn${i}`,
          name: vpn.name.split(',')[0],
          color: colors[i],
          hops: combinedHops, totalPing: leg2.finalLatency, totalDist: leg1.totalFiberDistance + leg2.totalFiberDistance, isDefault: false,
        });
      }

      const allRoutes = [directRoute, ...vpnRoutes].sort((a, b) => a.totalPing - b.totalPing);
      setRoutes(allRoutes);
      setActiveRouteId(allRoutes[0].id);

      await delay(800);
      setStatusText('SCAN COMPLETE. OPTIMAL ROUTE LOCKED.');

      analyzeWithGemini(allRoutes, destGeo, sourceGeo);

    } catch (err) {
      setError(err.message || 'Connection scan failed.');
      setStatusText('SCAN FAILED.');
    } finally { setIsTracing(false); }
  };

  const activeRouteData = routes.find(r => r.id === activeRouteId) || { hops: [] };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col overflow-x-hidden">

      {/* GLOSSY TOP NAVIGATION */}
      <header className="bg-gray-950/80 backdrop-blur-xl border-b border-white/5 p-3 sm:p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center space-x-3 w-full md:w-auto justify-center md:justify-start">
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-cyan-500 blur-md opacity-50"></div>
              <Gamepad2 className="text-cyan-400 w-6 h-6 sm:w-8 sm:h-8 relative z-10" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-widest uppercase italic truncate">
              Ping<span className="text-cyan-400">Drop</span>
            </h1>
          </div>

          <form onSubmit={startTrace} className="flex w-full max-w-2xl relative shadow-2xl shadow-cyan-900/20 rounded-lg">
            <Radar className="absolute left-3 top-3 sm:left-4 sm:top-3.5 text-cyan-500 w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <input
              type="text" value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder="ENTER GAME SERVER IP/DOMAIN..."
              className="w-full bg-gray-900 border border-gray-700 text-white font-mono rounded-l-lg py-2.5 sm:py-3 pl-9 sm:pl-12 pr-2 sm:pr-4 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all placeholder:text-gray-500 uppercase tracking-wide text-xs sm:text-sm"
              disabled={isTracing}
            />
            <button type="submit" disabled={isTracing || !target}
              className={`px-4 sm:px-8 font-bold uppercase tracking-wider text-xs sm:text-sm rounded-r-lg transition-all flex items-center shrink-0 ${
                isTracing ? 'bg-gray-800 text-gray-500' : 'bg-cyan-500 hover:bg-cyan-400 text-gray-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
              }`}>
              {isTracing ? <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : 'Execute'}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-grow p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

        {/* LEFT COLUMN – INTEL & MATRIX */}
        <div className="lg:col-span-4 flex flex-col space-y-4 sm:space-y-6">

          {/* TARGET LOCK CARD */}
          <div className="bg-gray-900/60 backdrop-blur-lg rounded-2xl border border-white/5 shadow-xl overflow-hidden flex flex-col relative shrink-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
            <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center text-cyan-400">
                <Crosshair className="w-4 h-4 mr-2 shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-widest truncate">Target Lock</h2>
              </div>
              {targetInfo && (
                <span className="flex h-2 w-2 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {targetInfo ? (
                <div className="space-y-4 sm:space-y-5">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Resolved Endpoint</span>
                    <span className="text-xl sm:text-2xl font-mono text-white font-light tracking-tight break-all">{targetInfo.ip}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Datacenter</span>
                      <span className="block text-xs sm:text-sm text-gray-300 font-medium truncate" title={targetInfo.isp}>{targetInfo.isp}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Region</span>
                      <span className="block text-xs sm:text-sm text-gray-300 font-medium truncate" title={`${targetInfo.city}, ${targetInfo.country}`}>{targetInfo.country}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-600 space-y-3 py-6 sm:py-8">
                  <Server className="w-8 h-8 sm:w-10 sm:h-10 opacity-20" />
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-center">Awaiting Coordinates</p>
                </div>
              )}
            </div>
          </div>

          {/* ROUTING MATRIX */}
          <div className="bg-gray-900/60 backdrop-blur-lg rounded-2xl border border-white/5 shadow-xl flex flex-col flex-grow relative">
            <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center text-emerald-400 min-w-0">
                <Route className="w-4 h-4 mr-2 shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-widest truncate">Routing Matrix</h2>
              </div>
            </div>
            <div className="p-3 sm:p-4 flex-grow flex flex-col">
              {routes.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {routes.map((route, index) => {
                    const isActive = activeRouteId === route.id;
                    const isBest   = index === 0;
                    const pingDelta = directPingRef - route.totalPing;
                    return (
                      <button
                        key={route.id} onClick={() => setActiveRouteId(route.id)}
                        className={`w-full group text-left relative overflow-hidden rounded-xl border transition-all duration-300 p-3 sm:p-4 flex items-center justify-between gap-2
                          ${isActive ? 'bg-gray-800/80 border-gray-600 shadow-inner' : 'bg-gray-950/50 border-gray-800 hover:border-gray-600'}`}
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: route.color }}></div>

                        <div className="flex flex-col pl-2 z-10 min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5">
                            {isBest      && <Trophy      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 shrink-0" />}
                            {route.isDefault && <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />}
                            <span className={`text-sm sm:text-base font-black tracking-wide uppercase truncate ${isBest ? 'text-yellow-400' : (route.isDefault ? 'text-rose-400' : 'text-gray-100')}`} title={route.name}>
                              {route.name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${route.isDefault ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                              {route.isDefault ? 'PUBLIC ISP' : 'PROXY TUNNEL'}
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-gray-500 font-mono truncate">{Math.round(route.totalDist)} KM</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end z-10 shrink-0 ml-1 sm:ml-2">
                          <div className="flex items-end space-x-1">
                            <span className={`text-xl sm:text-3xl font-black font-mono leading-none ${route.isDefault ? 'text-rose-500' : 'text-white'}`}>
                              {route.totalPing}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-500 font-bold mb-0.5">ms</span>
                          </div>
                          {!route.isDefault && pingDelta > 0 && (
                            <div className="mt-1.5 flex items-center px-1 sm:px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 shrink-0" />
                              <span className="text-[9px] sm:text-[10px] font-bold whitespace-nowrap">-{pingDelta}ms SAVED</span>
                            </div>
                          )}
                        </div>

                        {isActive && <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `radial-gradient(circle at right, ${route.color}, transparent 70%)` }}></div>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3 py-10 sm:py-12">
                  <Network className="w-8 h-8 sm:w-10 sm:h-10 opacity-20" />
                  <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-center">Execute scan to<br />reveal optimal paths</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – MAP & TELEMETRY */}
        <div className="lg:col-span-8 flex flex-col space-y-4 sm:space-y-6">

          {/* 3D WEBGL GLOBE */}
          <div className="bg-gray-900/60 backdrop-blur-lg rounded-2xl border border-white/5 shadow-2xl flex flex-col h-[300px] sm:h-[400px] lg:h-[450px] relative overflow-hidden group">
            <div className="absolute top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center space-x-2 bg-gray-950/80 backdrop-blur px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-white/10 min-w-0">
                <MapIcon className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                <span className="font-bold tracking-widest text-[8px] sm:text-[10px] uppercase text-gray-300 truncate">Live Infrastructure Map</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 bg-gray-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Interactive WebGL</span>
              </div>
            </div>

            <div className="flex-grow relative cursor-move">
              {!globeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-cyan-500 flex-col bg-gray-950 z-20">
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mb-3 sm:mb-4" />
                  <p className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-center px-4">Initializing 3D Engine...</p>
                </div>
              )}
              <div ref={mapRef} className="absolute inset-0 w-full h-full outline-none"></div>
              <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none"></div>
            </div>
          </div>

          {/* LOWER SECTION – AI ANALYST & HOP LOG */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 flex-grow">

            {/* AI ESPORTS ANALYST */}
            <div className="bg-gray-900/60 backdrop-blur-lg rounded-2xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden min-h-[160px]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
              <div className="p-3 sm:p-4 border-b border-white/5 flex items-center text-indigo-400 min-w-0">
                <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-widest truncate">Network Analyst AI</h2>
              </div>
              <div className="p-4 sm:p-5 flex-grow flex flex-col">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 h-full py-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 animate-bounce" />
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-indigo-300 animate-pulse text-center">Computing lag probability...</div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="p-1.5 sm:p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 shrink-0">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">{aiAnalysis}</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 sm:space-y-3 py-4">
                    <Bot className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                    <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-center">Awaiting data...</p>
                  </div>
                )}
              </div>
            </div>

            {/* HOP LOG */}
            <div className="bg-gray-900/60 backdrop-blur-lg rounded-2xl border border-white/5 shadow-xl flex flex-col min-h-[250px] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-700 transition-colors duration-300" style={{ backgroundColor: activeRouteData.color || '#374151' }}></div>
              <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300 truncate">Packet Timeline</h2>
                <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 ml-2 shrink-0">{activeRouteData.hops.length || 0} HOPS</span>
              </div>

              <div className="flex-grow overflow-y-auto p-3 sm:p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
                {routes.length === 0 && !isTracing && !error && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600">
                    <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-center">No active trace</p>
                  </div>
                )}
                {isTracing && (
                  <div className="h-full flex flex-col items-center justify-center text-cyan-500 py-6">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse mb-2 sm:mb-3" />
                    <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest animate-pulse text-center">Tracing nodes...</p>
                  </div>
                )}

                {!isTracing && activeRouteData.hops.length > 0 && (
                  <div className="space-y-0 relative before:absolute before:inset-y-0 before:left-[17px] sm:before:left-[21px] before:w-px before:bg-gray-800">
                    {activeRouteData.hops.map((hop, i) => {
                      const isLast  = i === activeRouteData.hops.length - 1;
                      const isFirst = i === 0;
                      return (
                        <div key={i} className="relative flex items-start group pb-3 sm:pb-4 last:pb-0">
                          <div
                            className={`absolute left-[13px] sm:left-[17px] w-[9px] h-[9px] rounded-full border-2 border-gray-950 top-1.5 transition-colors duration-300 ${isLast || isFirst || hop.isVpn ? '' : 'bg-gray-600 group-hover:bg-cyan-500'}`}
                            style={{ backgroundColor: (isLast || isFirst || hop.isVpn) ? activeRouteData.color : undefined }}
                          />
                          <div className="ml-10 sm:ml-12 w-full flex items-center justify-between bg-gray-950/40 hover:bg-gray-800/40 p-2 sm:p-2.5 rounded-lg border border-transparent hover:border-white/5 transition-all gap-2">
                            <div className="min-w-0">
                              <span className="block font-mono text-[10px] sm:text-xs text-white mb-0.5 truncate" title={hop.ip}>{hop.ip}</span>
                              <span className={`block text-[8px] sm:text-[10px] font-bold uppercase tracking-wider truncate ${hop.isVpn ? 'text-emerald-400' : 'text-gray-500'}`} title={hop.location}>
                                {hop.location}
                              </span>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="font-mono text-xs sm:text-sm font-bold text-gray-300">{hop.latency}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-600 ml-0.5">ms</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {error && (
                  <div className="text-rose-500 flex flex-col items-center justify-center h-full py-6">
                    <XCircle className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
                    <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-center px-4">{error}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* GLOBAL HUD FOOTER */}
      <footer className="bg-gray-950 border-t border-white/5 p-2 sm:p-3 text-[9px] sm:text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center justify-between mt-auto">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 sm:mr-2 animate-pulse shrink-0"></div>
            <span className="hidden sm:inline">NOC ONLINE</span>
          </span>
          <span className="truncate">Build 4.2.1-ESPORTS</span>
        </div>
        <span className="truncate max-w-[50%] sm:max-w-md text-right text-gray-400 pl-2">{statusText}</span>
      </footer>

    </div>
  );
}