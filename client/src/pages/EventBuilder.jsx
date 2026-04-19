import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { PolygonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Pencil, RotateCcw, Check, X, PlusCircle } from 'lucide-react';

const EventBuilder = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEditMode = !!eventId;

  const [formData, setFormData] = useState({ name: 'Operation Alpha', location: 'City Center', maxCapacity: 5000, guardsCount: 15 });
  const [zones, setZones] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  
  // Drawing state
  const [drawMode, setDrawMode] = useState(null);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [currentRoutePath, setCurrentRoutePath] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [zoneCap, setZoneCap] = useState(1000);
  const [routeName, setRouteName] = useState('');

  const [viewState, setViewState] = useState({
    longitude: 72.8778,
    latitude: 19.0765,
    zoom: 16.5,
    pitch: 0,
    bearing: 0
  });

  const getToken = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return userInfo.token;
  };

  // Load existing event data in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    const loadEvent = async () => {
      try {
        const token = getToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const evRes = await fetch(`http://localhost:5000/api/events`, { headers });
        const events = await evRes.json();
        const event = events.find(e => e._id === eventId);
        if (event) {
          setFormData({ name: event.name, location: event.location, maxCapacity: event.maxCapacity, guardsCount: event.guardsCount });
        }

        const zRes = await fetch(`http://localhost:5000/api/events/${eventId}/zones`, { headers });
        const zData = await zRes.json();
        setZones(zData.map(z => ({ id: z.zoneId, name: z.name, maxCapacity: z.maxCapacity, coordinates: z.coordinates })));

        const rRes = await fetch(`http://localhost:5000/api/events/${eventId}/routes`, { headers });
        const rData = await rRes.json();
        setRoutes(rData.map(r => ({ id: r.routeId, name: r.name, path: r.path })));

        // Fly camera to loaded zones
        if (zData.length > 0) {
          const allCoords = zData.flatMap(z => z.coordinates);
          const lngAvg = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
          const latAvg = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
          setViewState(v => ({ ...v, longitude: lngAvg, latitude: latAvg, zoom: 16.5 }));
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    loadEvent();
  }, [eventId]);

  const handleMapClick = (info) => {
    if (!info.coordinate) return;
    if (drawMode === 'zone') {
      setCurrentPolygon([...currentPolygon, info.coordinate]);
    } else if (drawMode === 'route') {
      setCurrentRoutePath([...currentRoutePath, info.coordinate]);
    }
  };

  const finishZone = () => {
    if (currentPolygon.length < 3) return alert('A zone needs at least 3 points.');
    if (!zoneName) return alert('Name the zone.');
    if (redrawTarget && redrawTarget.type === 'zone') {
      // Replace existing zone geometry
      const updated = [...zones];
      updated[redrawTarget.index] = { ...updated[redrawTarget.index], coordinates: currentPolygon, name: zoneName, maxCapacity: parseInt(zoneCap) || updated[redrawTarget.index].maxCapacity };
      setZones(updated);
      setRedrawTarget(null);
    } else {
      setZones([...zones, { id: zoneName.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now(), name: zoneName, maxCapacity: parseInt(zoneCap) || 1000, coordinates: currentPolygon }]);
    }
    setDrawMode(null); setCurrentPolygon([]); setZoneName('');
  };

  const finishRoute = () => {
    if (currentRoutePath.length < 2) return alert('A route needs at least 2 points.');
    if (!routeName) return alert('Name the route.');
    if (redrawTarget && redrawTarget.type === 'route') {
      const updated = [...routes];
      updated[redrawTarget.index] = { ...updated[redrawTarget.index], path: currentRoutePath, name: routeName };
      setRoutes(updated);
      setRedrawTarget(null);
    } else {
      setRoutes([...routes, { id: routeName.toUpperCase().replace(/\s+/g, '_') + '_' + Date.now(), name: routeName, path: currentRoutePath }]);
    }
    setDrawMode(null); setCurrentRoutePath([]); setRouteName('');
  };

  const cancelDraw = () => { setDrawMode(null); setCurrentPolygon([]); setCurrentRoutePath([]); setRedrawTarget(null); };
  const removeZone = (i) => setZones(zones.filter((_, idx) => idx !== i));
  const removeRoute = (i) => setRoutes(routes.filter((_, idx) => idx !== i));

  // Editing state
  const [editingZone, setEditingZone] = useState(null); // index
  const [editingRoute, setEditingRoute] = useState(null); // index
  const [editZoneName, setEditZoneName] = useState('');
  const [editZoneCap, setEditZoneCap] = useState(0);
  const [editRouteName, setEditRouteName] = useState('');
  const [redrawTarget, setRedrawTarget] = useState(null); // { type: 'zone'|'route', index: number }

  const startEditZone = (i) => {
    setEditingZone(i); setEditingRoute(null);
    setEditZoneName(zones[i].name);
    setEditZoneCap(zones[i].maxCapacity);
  };
  const saveEditZone = (i) => {
    const updated = [...zones];
    updated[i] = { ...updated[i], name: editZoneName, maxCapacity: parseInt(editZoneCap) || updated[i].maxCapacity };
    setZones(updated); setEditingZone(null);
  };

  const startEditRoute = (i) => {
    setEditingRoute(i); setEditingZone(null);
    setEditRouteName(routes[i].name);
  };
  const saveEditRoute = (i) => {
    const updated = [...routes];
    updated[i] = { ...updated[i], name: editRouteName };
    setRoutes(updated); setEditingRoute(null);
  };

  const startRedrawZone = (i) => {
    setRedrawTarget({ type: 'zone', index: i });
    setDrawMode('zone');
    setCurrentPolygon([]);
    setZoneName(zones[i].name);
    setZoneCap(zones[i].maxCapacity);
  };
  const startRedrawRoute = (i) => {
    setRedrawTarget({ type: 'route', index: i });
    setDrawMode('route');
    setCurrentRoutePath([]);
    setRouteName(routes[i].name);
  };

  const submitEvent = async () => {
    if (zones.length === 0) return alert('You must draw at least 1 zone.');
    const token = getToken();
    const payload = { ...formData, zones, routes };

    try {
      const url = isEditMode
        ? `http://localhost:5000/api/events/${eventId}/update`
        : 'http://localhost:5000/api/events/launch';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/');
      } else {
        alert(`Failed: ${data.message || res.statusText}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const centroid = (coords) => {
    if (!coords || coords.length === 0) return [0, 0];
    return [coords.reduce((s, c) => s + c[0], 0) / coords.length, coords.reduce((s, c) => s + c[1], 0) / coords.length];
  };

  const layers = [
    new PolygonLayer({ id: 'completed-zones', data: zones, getPolygon: d => d.coordinates, getFillColor: [14, 165, 233, 100], getLineColor: [14, 165, 233, 255], lineWidthMinPixels: 2, stroked: true, wireframe: true }),
    new PolygonLayer({ id: 'drawing-zone', data: currentPolygon.length > 0 ? [{ polygon: currentPolygon }] : [], getPolygon: d => d.polygon, getFillColor: [239, 68, 68, 100], getLineColor: [239, 68, 68, 255], lineWidthMinPixels: 3, stroked: true }),
    new ScatterplotLayer({ id: 'zone-vtx', data: currentPolygon.map(c => ({ position: c })), getPosition: d => d.position, getFillColor: [239, 68, 68, 255], getRadius: 4, radiusUnits: 'pixels', stroked: true, getLineColor: [255, 255, 255, 255], lineWidthMinPixels: 2 }),
    new PathLayer({ id: 'completed-routes', data: routes, getPath: d => d.path, getColor: [234, 179, 8, 220], getWidth: 4, widthUnits: 'pixels', capRounded: true, jointRounded: true }),
    new PathLayer({ id: 'drawing-route', data: currentRoutePath.length >= 2 ? [{ path: currentRoutePath }] : [], getPath: d => d.path, getColor: [239, 68, 68, 255], getWidth: 4, widthUnits: 'pixels', capRounded: true, jointRounded: true }),
    new ScatterplotLayer({ id: 'route-vtx', data: currentRoutePath.map(c => ({ position: c })), getPosition: d => d.position, getFillColor: [234, 179, 8, 255], getRadius: 5, radiusUnits: 'pixels', stroked: true, getLineColor: [255, 255, 255, 255], lineWidthMinPixels: 2 }),
    new ScatterplotLayer({ id: 'zone-centroids', data: zones.map(z => ({ position: centroid(z.coordinates) })), getPosition: d => d.position, getFillColor: [14, 165, 233, 255], getRadius: 6, radiusUnits: 'pixels', stroked: true, getLineColor: [255, 255, 255, 200], lineWidthMinPixels: 2 })
  ];

  if (loading) return <div className="flex h-screen bg-background text-white items-center justify-center"><p className="text-xl text-slate-400">Loading event data...</p></div>;

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col relative w-full">
        <TopBar alertActive={false} />
        <main className="flex-1 p-6 lg:p-10 flex gap-6 min-h-0">
          {/* Left Panel — entire column scrolls */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2" style={{maxHeight:'calc(100vh - 120px)'}}>
            <div className="shrink-0">
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">{isEditMode ? 'Edit Operation' : 'Operation Builder'}</h1>
              <p className="text-slate-400 text-sm">{isEditMode ? 'Modify zones, routes, and parameters for this event.' : 'Designate security perimeters, capacity thresholds, and crowd routes.'}</p>
            </div>

            <div className="shrink-0 bg-slate-900/60 border border-slate-700/50 p-6 rounded-xl flex flex-col gap-4 shadow-xl">
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation Name</label>
                 <input type="text" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mt-1" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location / Venue</label>
                 <input type="text" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mt-1" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
               </div>
               <div className="flex gap-4">
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Capacity</label>
                   <input type="number" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mt-1" value={formData.maxCapacity} onChange={e => setFormData({...formData, maxCapacity: parseInt(e.target.value)})} />
                 </div>
                 <div className="flex-1">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Guard Deployment</label>
                   <input type="number" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white mt-1" value={formData.guardsCount} onChange={e => setFormData({...formData, guardsCount: parseInt(e.target.value)})} />
                 </div>
               </div>
            </div>

            <div className="shrink-0 flex justify-between items-center border-b border-white/5 pb-2">
               <h3 className="font-bold text-lg text-primary/90">Asset Manifest <span className="text-slate-500 font-normal">({zones.length} Zones, {routes.length} Routes)</span></h3>
            </div>

            {/* Action Panel - Sticky at top of manifest */}
            {!drawMode ? (
              <div className="shrink-0 flex gap-2">
                <button className="flex-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2" onClick={() => setDrawMode('zone')}>
                  <PlusCircle size={18} /> New Zone
                </button>
                <button className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2" onClick={() => setDrawMode('route')}>
                  <PlusCircle size={18} /> New Route
                </button>
              </div>
            ) : (
              <div className={`shrink-0 p-4 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-300 ${drawMode === 'zone' ? 'bg-blue-900/20 border-blue-500/40' : 'bg-yellow-900/20 border-yellow-500/40'}`}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-bold uppercase tracking-wider text-white">
                    {redrawTarget ? `Redrawing ${redrawTarget.type}` : `New ${drawMode}`}
                  </p>
                  <button onClick={cancelDraw} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="flex flex-col gap-3">
                  <input type="text" placeholder={`${drawMode === 'zone' ? 'Zone' : 'Route'} Name`} className="bg-slate-900/50 border border-slate-700 p-2.5 rounded text-white text-sm" value={drawMode === 'zone' ? zoneName : routeName} onChange={e => drawMode === 'zone' ? setZoneName(e.target.value) : setRouteName(e.target.value)} />
                  {drawMode === 'zone' && (
                    <input type="number" placeholder="Capacity" className="bg-slate-900/50 border border-slate-700 p-2.5 rounded text-white text-sm" value={zoneCap} onChange={e => setZoneCap(e.target.value)} />
                  )}
                  <div className="flex gap-2 mt-1">
                     <button className={`flex-1 ${drawMode === 'zone' ? 'bg-primary' : 'bg-yellow-600'} hover:opacity-90 text-white rounded-lg py-2.5 text-sm font-bold shadow-lg`} onClick={drawMode === 'zone' ? finishZone : finishRoute}>
                       Confirm Data
                     </button>
                     <button className="bg-slate-700 hover:bg-slate-600 text-white rounded-lg px-4 py-2.5 text-sm font-bold" onClick={cancelDraw}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

               {zones.map((z, i) => (
                  <div key={`zone-${i}`} className={`bg-slate-900/40 backdrop-blur-sm rounded-xl border transition-all duration-200 ${editingZone === i ? 'border-primary ring-1 ring-primary/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]' : 'border-slate-700'} group`}>
                     <div className="p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                             {z.name}
                          </span>
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Cap: {z.maxCapacity}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editingZone === i ? setEditingZone(null) : startEditZone(i)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all" title="Edit Metadata"><Pencil size={14} /></button>
                          <button onClick={() => startRedrawZone(i)} className="p-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-all" title="Redraw Shape"><RotateCcw size={14} /></button>
                          <button onClick={() => removeZone(i)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all" title="Delete Zone"><Trash2 size={14} /></button>
                        </div>
                     </div>
                     {editingZone === i && (
                       <div className="px-4 pb-4 flex flex-col gap-2 border-t border-slate-700/50 pt-3 animate-in slide-in-from-top-1">
                         <div className="grid grid-cols-2 gap-2">
                           <input type="text" className="bg-slate-800 border border-slate-700 p-2 rounded text-white text-xs" value={editZoneName} onChange={e => setEditZoneName(e.target.value)} placeholder="Zone Name" />
                           <input type="number" className="bg-slate-800 border border-slate-700 p-2 rounded text-white text-xs" value={editZoneCap} onChange={e => setEditZoneCap(e.target.value)} placeholder="Max Capacity" />
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => saveEditZone(i)} className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 rounded py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"><Check size={14} /> Update</button>
                           <button onClick={() => setEditingZone(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded py-2 text-xs font-bold transition-all">Cancel</button>
                         </div>
                       </div>
                     )}
                  </div>
               ))}

               {routes.map((r, i) => (
                  <div key={`route-${i}`} className={`bg-slate-900/40 backdrop-blur-sm rounded-xl border transition-all duration-200 ${editingRoute === i ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-yellow-700/20'} group`}>
                     <div className="p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-yellow-500 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-yellow-500" />
                             {r.name}
                          </span>
                          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">{r.path.length} Waypoints</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => editingRoute === i ? setEditingRoute(null) : startEditRoute(i)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all" title="Edit Metadata"><Pencil size={14} /></button>
                          <button onClick={() => startRedrawRoute(i)} className="p-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-all" title="Redraw Path"><RotateCcw size={14} /></button>
                          <button onClick={() => removeRoute(i)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all" title="Delete Route"><Trash2 size={14} /></button>
                        </div>
                     </div>
                     {editingRoute === i && (
                       <div className="px-4 pb-4 flex flex-col gap-2 border-t border-slate-700/50 pt-3 animate-in slide-in-from-top-1">
                         <input type="text" className="bg-slate-800 border border-slate-700 p-2 rounded text-white text-xs" value={editRouteName} onChange={e => setEditRouteName(e.target.value)} placeholder="Route Name" />
                         <div className="flex gap-2">
                           <button onClick={() => saveEditRoute(i)} className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border border-yellow-500/20 rounded py-2 text-xs font-bold flex items-center justify-center gap-1 transition-all"><Check size={14} /> Update</button>
                           <button onClick={() => setEditingRoute(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded py-2 text-xs font-bold transition-all">Cancel</button>
                         </div>
                       </div>
                     )}
                  </div>
               ))}

            <div className="pt-4 mt-2 border-t border-white/5">
              <button 
                className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-4 rounded-xl text-lg shadow-[0_0_25px_rgba(14,165,233,0.3)] hover:shadow-[0_0_35px_rgba(14,165,233,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0" 
                onClick={submitEvent}
              >
                {isEditMode ? 'SAVE OPERATIONAL CHANGES' : 'INITIALIZE OPERATION'}
              </button>
            </div>
          </div>

          <div className={`flex-1 rounded-3xl overflow-hidden border-2 transition-all duration-300 relative ${drawMode ? 'border-primary/80 shadow-[0_0_50px_rgba(14,165,233,0.3)]' : 'border-slate-700/50 shadow-2xl'}`}>
            {drawMode && (
               <div className={`absolute top-6 left-6 z-20 px-6 py-3 rounded-2xl backdrop-blur-xl border-2 shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-none flex flex-col gap-1 ${drawMode === 'zone' ? 'bg-primary/20 border-primary/50 text-white' : 'bg-yellow-500/20 border-yellow-500/50 text-white'}`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Tactical Overlay Active</span>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span className="text-sm font-black tracking-wider">
                      {redrawTarget ? `REDRAWING ${redrawTarget.type.toUpperCase()}` : `${drawMode.toUpperCase()} CAPTURE MODE`}
                    </span>
                  </div>
                  <span className="text-xs opacity-80 font-medium">Click map to plot vertices. Hit 'Confirm Data' to save.</span>
               </div>
            )}
            <DeckGL viewState={viewState} onViewStateChange={e => setViewState(e.viewState)} controller={true} layers={layers} onClick={handleMapClick} getCursor={() => drawMode ? 'crosshair' : 'grab'}>
              <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
            </DeckGL>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EventBuilder;
