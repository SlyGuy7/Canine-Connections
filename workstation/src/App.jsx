import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import BrowseDogs from "./pages/BrowseDogs";
import Shelters from "./pages/Shelters"; // Import your new file
import MyDogs from "./pages/MyDogs";
import Settings from "./pages/Settings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Home />} />
        <Route path="/browse-dogs" element={<BrowseDogs />} />
        <Route path="/shelters" element={<Shelters />} /> {/* ADD THIS LINE */}
        <Route path="/my-dogs" element={<MyDogs />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Fallback route - this is why you were being sent home */}
        <Route path="*" element={<Home />} /> 
      </Routes>
    </Router>
  );
}

export default App;