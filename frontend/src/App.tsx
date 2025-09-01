import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';

// My components
import { WelcomePage } from "./components/Welcome";
import { EnginePage } from "./components/Engine";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomePage/>}></Route>
        <Route path="/engine" element={<EnginePage width={600} height={400}/>}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
