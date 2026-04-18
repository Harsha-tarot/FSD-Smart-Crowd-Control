import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [zones, setZones] = useState([]);
  const [alert, setAlert] = useState('');

  useEffect(() => {
    socket.on('zoneUpdate', setZones);
    socket.on('alert', (data) => {
      setAlert(data.message);
      setTimeout(() => setAlert(''), 3000);
    });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Smart Crowd Dashboard</h1>

      {alert && <p style={{ color: 'red' }}>{alert}</p>}

      {zones.map((z, i) => (
        <div key={i}>
          <h3>{z.name}</h3>
          <p>{z.count}</p>
        </div>
      ))}
    </div>
  );
}

export default App;
