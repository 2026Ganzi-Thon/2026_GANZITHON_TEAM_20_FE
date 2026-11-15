
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./layouts/Layout";
import Home from "./pages/fe1/Home";
import Settings from "./pages/fe1/Settings";
import Records from "./pages/fe2/Records";
import Fe2Layout from './features/fe2/Layout.jsx';
import Vault from './features/fe2/Vault.jsx';
import Detail from './features/fe2/Detail.jsx';
import EditSummary from './features/fe2/EditSummary.jsx';
import { ActionPage, RestPage, EmpathyPage, ShredPage, ResultPage, ActivityLink } from './features/fe2/Activities.jsx';
import { RecordDetail } from './features/fe2/Records.jsx';
import Demo from './features/fe2/Demo.jsx';
import NotFound from './features/fe2/NotFound.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<Fe2Layout />}>
          <Route path="/vault" element={<Vault />} />
          <Route path="/worries/:worryId" element={<Detail />} />
          <Route path="/worries/:worryId/edit" element={<EditSummary />} />
          <Route path="/worries/:worryId/shred" element={<ShredPage />} />
          <Route path="/worries/:worryId/action" element={<ActionPage />} />
          <Route path="/worries/:worryId/rest" element={<RestPage />} />
          <Route path="/worries/:worryId/empathy" element={<EmpathyPage />} />
          <Route path="/activities/:activityId" element={<ActivityLink />} />
          <Route path="/activities/:activityId/result" element={<ResultPage />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:worryId" element={<RecordDetail />} />
          <Route path="/demo" element={<Demo />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
