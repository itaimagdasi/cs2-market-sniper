import React from 'react';
import { useSkins } from './hooks/useSkins.js';
import Header from './components/Header.jsx';
import InputGroup from './components/InputGroup.jsx';
import SkinTable from './components/SkinTable.jsx';
import PriceChart from './components/PriceChart.jsx';
import './App.css';

function App() {
  const {
    skins,
    selectedSkin,
    addSkin,
    updateTarget,
    deleteSkin,
    selectSkin
  } = useSkins();

  return (
    <div className="container">
      <Header />

      <InputGroup onAddSkin={addSkin} />

      <div className="dashboard-grid">
        <SkinTable
          skins={skins}
          selectedSkin={selectedSkin}
          onSelectSkin={selectSkin}
          onUpdateTarget={updateTarget}
          onDeleteSkin={deleteSkin}
        />

        <PriceChart selectedSkin={selectedSkin} />
      </div>
    </div>
  );
}

export default App;