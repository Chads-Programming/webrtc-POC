import { useState } from "react";
import { RTCView } from "./RTCView";

function App() {
  const [callStarted, setCallStarted] = useState(false);

  return (
    <div>
      <button onClick={() => setCallStarted(true)}>Start call</button>
      {callStarted && <RTCView />}
    </div>
  );
}

export default App;
