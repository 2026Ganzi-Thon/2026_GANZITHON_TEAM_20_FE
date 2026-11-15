
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "./layouts/Layout";
import Home from "./pages/fe1/Home";
import Settings from "./pages/fe1/Settings";
import Records from "./pages/fe2/Records";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/records" element={<Records />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
