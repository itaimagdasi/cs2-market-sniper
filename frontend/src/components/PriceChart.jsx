import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const PriceChart = ({ selectedSkin }) => {
  return (
    <div className="chart-container">
      <h3>Trend: {selectedSkin?.name || 'Select a skin'}</h3>
      <div style={{ width: '100%', height: 350 }}>
        <ResponsiveContainer>
          <LineChart data={selectedSkin?.priceHistory || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" hide />
            <YAxis domain={['auto', 'auto']} stroke="#888" />
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }} />
            <Legend verticalAlign="top" height={36}/>
            <Line type="monotone" dataKey="price" name="Price ($)" stroke="#4caf50" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="sma" name="SMA (Trend)" stroke="#ff9800" strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;