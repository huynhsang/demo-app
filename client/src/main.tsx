import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import IssueList from './pages/IssueList';
import IssueDetail from './pages/IssueDetail';
import NewIssue from './pages/NewIssue';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<IssueList />} />
          <Route path="issues/new" element={<NewIssue />} />
          <Route path="issues/:id" element={<IssueDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
