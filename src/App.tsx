import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import DashboardView from './views/DashboardView';
import DecisionMakerView from './views/DecisionMakerView';
import KnowledgeBaseView from './views/KnowledgeBaseView';
import PublicProfileView from './views/PublicProfileView';
import DataEditorView from './views/DataEditorView';
import ConversationListView from './views/ConversationListView';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardView />} />
              <Route path="decision-maker" element={<DecisionMakerView />} />
              <Route path="knowledge-base" element={<KnowledgeBaseView />} />
              <Route path="public-profile" element={<PublicProfileView />} />
              <Route path="data-editor" element={<DataEditorView />} />
              <Route path="conversations" element={<ConversationListView />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
