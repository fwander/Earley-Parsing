import {useState} from 'react';
import {parse, tokenize} from './parse_concrete';
import './App.css';

function App() {
  return (
    <ParseInput/>
  );
}

function ParseInput() {
  const [tokens, setTokens] = useState("");
  return (
    <div>
      <input onChange={(e)=>setTokens(e.target.value)} type="text"/>
      <button onClick={()=>parse(tokenize(tokens))}>submit</button>
    </div>
  )
}

export default App;
