import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardView from './views/DashboardView';
import DecisionMakerView from './views/DecisionMakerView';
import PublicProfileView from './views/PublicProfileView';
import DataEditorView from './views/DataEditorView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardView />} />
          <Route path="decision-maker" element={<DecisionMakerView />} />
          <Route path="public-profile" element={<PublicProfileView />} />
          <Route path="data-editor" element={<DataEditorView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
